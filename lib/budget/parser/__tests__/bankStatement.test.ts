import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectStatementPeriod, parseBankStatement } from '../bankStatement';

const PERIOD = { start: '2026-01-01', end: '2026-01-31' };
const PERIOD_HEADER = 'STATEMENT PERIOD\nMay 1 - May 31, 2026';

test('parses a single-line transaction under an account header', () => {
  const page = ['360 Checking - 1234', 'Jan 5 STARBUCKS COFFEE #123 -$6.75 Debit'].join('\n');

  const { transactions, gaps } = parseBankStatement([page], { period: PERIOD });

  assert.equal(gaps.length, 0);
  assert.equal(transactions.length, 1);
  assert.deepEqual(transactions[0], {
    account: '360 Checking',
    date: '2026-01-05',
    descriptionRaw: 'STARBUCKS COFFEE #123 -$6.75 Debit',
    descriptionClean: 'STARBUCKS COFFEE #123',
    amount: '-6.75',
    runningBalance: null,
    sourcePage: 1,
    sequence: 0,
  });
});

test('reassembles a wrapped description across lines and separates balance from signed amount', () => {
  const page = [
    '360 Checking - 1234',
    'Jan 6 SOME LONG MERCHANT NAME THAT WRAPS',
    'TO A SECOND LINE $1,234.56',
    '-$42.19 Debit',
  ].join('\n');

  const { transactions, gaps } = parseBankStatement([page], { period: PERIOD });

  assert.equal(gaps.length, 0);
  assert.equal(transactions.length, 1);
  const [txn] = transactions;
  assert.equal(txn.amount, '-42.19');
  assert.equal(txn.runningBalance, '1234.56');
  assert.equal(txn.descriptionClean, 'SOME LONG MERCHANT NAME THAT WRAPS TO A SECOND LINE');
});

test('tracks which account section each transaction belongs to across multiple sections', () => {
  const page = [
    '360 Checking - 1234',
    'Jan 5 STARBUCKS COFFEE #123 -$6.75 Debit',
    'Personal - 5678',
    'Jan 7 VENMO PAYMENT TO FRIEND -$25.00 Debit',
  ].join('\n');

  const { transactions } = parseBankStatement([page], { period: PERIOD });

  assert.equal(transactions.length, 2);
  assert.equal(transactions[0].account, '360 Checking');
  assert.equal(transactions[1].account, 'Personal');
});

test('resolves the correct year for a period that spans a calendar year boundary', () => {
  const page = ['360 Checking - 1234', 'Dec 20 HOLIDAY SHOPPING -$50.00 Debit', 'Jan 3 NEW YEAR PURCHASE -$10.00 Debit'].join(
    '\n',
  );

  const { transactions } = parseBankStatement([page], { period: { start: '2025-12-15', end: '2026-01-14' } });

  assert.equal(transactions[0].date, '2025-12-20');
  assert.equal(transactions[1].date, '2026-01-03');
});

test('surfaces a transaction that never finds a signed amount as a gap, not a fabricated row', () => {
  const page = ['360 Checking - 1234', 'Jan 8 MYSTERY CHARGE NEVER GETS AN AMOUNT'].join('\n');

  const { transactions, gaps } = parseBankStatement([page], { period: PERIOD });

  assert.equal(transactions.length, 0);
  assert.equal(gaps.length, 1);
  assert.match(gaps[0].reason, /signed amount/);
});

test('flags a transaction closed before any account header instead of guessing the account', () => {
  const page = ['Jan 5 STARBUCKS COFFEE #123 -$6.75 Debit'].join('\n');

  const { transactions, gaps } = parseBankStatement([page], { period: PERIOD });

  assert.equal(transactions.length, 0);
  assert.equal(gaps.length, 1);
  assert.match(gaps[0].reason, /account is unknown/);
});

test('tracks source page across a multi-page statement', () => {
  const page1 = ['360 Checking - 1234', 'Jan 5 STARBUCKS COFFEE #123 -$6.75 Debit'].join('\n');
  const page2 = ['Jan 9 SECOND PAGE PURCHASE -$12.00 Debit'].join('\n');

  const { transactions } = parseBankStatement([page1, page2], { period: PERIOD });

  assert.equal(transactions.length, 2);
  assert.equal(transactions[0].sourcePage, 1);
  assert.equal(transactions[1].sourcePage, 2);
  assert.equal(transactions[1].account, '360 Checking');
});

test('detects the statement period from the repeated "STATEMENT PERIOD" header', () => {
  const period = detectStatementPeriod([`Here's your bank statement.May 2026 ${PERIOD_HEADER}`]);
  assert.deepEqual(period, { start: '2026-05-01', end: '2026-05-31' });
});

test('resolves a statement period header that spans a calendar year boundary', () => {
  const period = detectStatementPeriod(['STATEMENT PERIOD\nDec 15 - Jan 14, 2025']);
  assert.deepEqual(period, { start: '2025-12-15', end: '2026-01-14' });
});

test('auto-detects the period from the header when none is passed in', () => {
  const page = [
    PERIOD_HEADER,
    '360 Checking - 36120269601',
    'May 5 STARBUCKS COFFEE #123 -$6.75 Debit',
  ].join('\n');

  const { transactions, period } = parseBankStatement([page]);

  assert.deepEqual(period, { start: '2026-05-01', end: '2026-05-31' });
  assert.equal(transactions[0].date, '2026-05-05');
});

test('returns a gap and no transactions when the statement period header is missing entirely', () => {
  const page = ['360 Checking - 36120269601', 'May 5 STARBUCKS COFFEE #123 -$6.75 Debit'].join('\n');

  const { transactions, gaps, period } = parseBankStatement([page]);

  assert.equal(period, null);
  assert.equal(transactions.length, 0);
  assert.equal(gaps.length, 1);
  assert.match(gaps[0].reason, /STATEMENT PERIOD/);
});

test('reads Opening Balance / Closing Balance lines into accountSummaries instead of flagging them as gaps', () => {
  const page = [
    '360 Checking - 36120269601',
    'May 1 Opening Balance $145.24',
    'May 5 STARBUCKS COFFEE #123 -$6.75 Debit',
    'May 31 Closing Balance $138.49',
  ].join('\n');

  const { transactions, gaps, accountSummaries } = parseBankStatement([page], { period: PERIOD });

  assert.equal(transactions.length, 1);
  assert.equal(gaps.length, 0);
  assert.deepEqual(accountSummaries, [
    { account: '360 Checking', openingBalance: '145.24', closingBalance: '138.49' },
  ]);
});

test('skips "was Rejected" withdrawal attempts without flagging a gap (no balance impact)', () => {
  const page = [
    '360 Checking - 36120269601',
    'May 1 Opening Balance $0.03',
    'May 4 Withdrawal for $64.46 was Rejected $0.03',
    'May 31 Closing Balance $0.03',
  ].join('\n');

  const { transactions, gaps } = parseBankStatement([page], { period: PERIOD });

  assert.equal(transactions.length, 0);
  assert.equal(gaps.length, 0);
});

test('keeps the sign on a negative (overdrawn) running balance', () => {
  const page = [
    '360 Checking - 36120269601',
    'May 5 Digital Card Purchase - TARGET SAN DIEGO CA Debit - $55.53 - $26.33',
  ].join('\n');

  const { transactions } = parseBankStatement([page], { period: PERIOD });

  assert.equal(transactions[0].amount, '-55.53');
  assert.equal(transactions[0].runningBalance, '-26.33');
});

test('assigns a distinct sequence to two genuinely identical-looking transactions (same date/amount/merchant)', () => {
  const page = [
    '360 Checking - 36120269601',
    'May 5 STARBUCKS COFFEE #123 -$6.75 Debit',
    'May 5 STARBUCKS COFFEE #123 -$6.75 Debit',
  ].join('\n');

  const { transactions } = parseBankStatement([page], { period: PERIOD });

  assert.equal(transactions.length, 2);
  assert.notEqual(transactions[0].sequence, transactions[1].sequence);
});

test('skips an "Interest Rate Change" APY notice without flagging a gap', () => {
  const page = [
    '360 Performance Savings - 36187362671',
    'May 1 Opening Balance $0.01',
    'May 15 Interest Rate Change from 3.154% to 3.057% $0.01',
    'May 31 Closing Balance $0.01',
  ].join('\n');

  const { transactions, gaps } = parseBankStatement([page], { period: PERIOD });

  assert.equal(transactions.length, 0);
  assert.equal(gaps.length, 0);
});
