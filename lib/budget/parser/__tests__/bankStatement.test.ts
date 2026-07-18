import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBankStatement } from '../bankStatement';

const PERIOD = { start: '2026-01-01', end: '2026-01-31' };

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
