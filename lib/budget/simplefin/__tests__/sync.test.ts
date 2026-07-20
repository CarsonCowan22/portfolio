import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToIsoDate,
  computeSimpleFinTransactionId,
  computeSyncStartDate,
  normalizeSimpleFinTransaction,
  readAccountMap,
} from '../sync';

test('addDaysToIsoDate advances a date by N days, including across month boundaries', () => {
  assert.equal(addDaysToIsoDate('2026-06-30', 1), '2026-07-01');
  assert.equal(addDaysToIsoDate('2026-01-01', -1), '2025-12-31');
});

test('computeSyncStartDate starts the day after the latest statement period end', () => {
  const start = computeSyncStartDate({
    latestStatementPeriodEnd: '2026-06-30',
    latestTransactionDate: '2026-06-15',
  });
  assert.equal(start, '2026-07-01');
});

test('computeSyncStartDate starts the day after the latest transaction when it is newer than the last statement', () => {
  // e.g. a previous SimpleFIN sync already pulled through 7/10, past the last PDF statement.
  const start = computeSyncStartDate({
    latestStatementPeriodEnd: '2026-06-30',
    latestTransactionDate: '2026-07-10',
  });
  assert.equal(start, '2026-07-11');
});

test('computeSyncStartDate falls back to a fixed lookback window for a brand-new account with no history', () => {
  const start = computeSyncStartDate({
    latestStatementPeriodEnd: null,
    latestTransactionDate: null,
    lookbackDays: 30,
    now: new Date('2026-07-20T12:00:00Z'),
  });
  assert.equal(start, '2026-06-20');
});

test('computeSimpleFinTransactionId is stable for the same account+txn id and differs across accounts', () => {
  const idA = computeSimpleFinTransactionId('ACT-1', 'TXN-1');
  const idA2 = computeSimpleFinTransactionId('ACT-1', 'TXN-1');
  const idB = computeSimpleFinTransactionId('ACT-2', 'TXN-1');
  assert.equal(idA, idA2);
  assert.notEqual(idA, idB);
});

test('normalizeSimpleFinTransaction maps posted unix seconds to an ISO date and cleans whitespace', () => {
  const row = normalizeSimpleFinTransaction('ACT-1', '360 Checking', {
    id: 'TXN-1',
    posted: 1782000000, // 2026-06-21T02:40:00Z
    amount: '-12.34',
    description: 'STARBUCKS   COFFEE   #123',
  });
  assert.equal(row.account, '360 Checking');
  assert.equal(row.amount, '-12.34');
  assert.equal(row.descriptionClean, 'STARBUCKS COFFEE #123');
  assert.equal(row.sourceFile, 'simplefin:ACT-1');
  assert.equal(row.sourcePage, 0);
  assert.match(row.date, /^\d{4}-\d{2}-\d{2}$/);
});

test('normalizeSimpleFinTransaction refuses to fabricate a date for a still-pending transaction', () => {
  assert.throws(
    () => normalizeSimpleFinTransaction('ACT-1', '360 Checking', { id: 'TXN-1', posted: 0, amount: '-1.00', description: 'X' }),
    /no posted date/,
  );
});

test('readAccountMap throws (does not guess) when SIMPLEFIN_ACCOUNT_MAP is missing or malformed', () => {
  const prev = process.env.SIMPLEFIN_ACCOUNT_MAP;
  try {
    delete process.env.SIMPLEFIN_ACCOUNT_MAP;
    assert.throws(() => readAccountMap(), /not set/);

    process.env.SIMPLEFIN_ACCOUNT_MAP = '{not json';
    assert.throws(() => readAccountMap(), /not valid JSON/);

    process.env.SIMPLEFIN_ACCOUNT_MAP = '{"ACT-1":"360 Checking"}';
    assert.deepEqual(readAccountMap(), { 'ACT-1': '360 Checking' });
  } finally {
    if (prev === undefined) delete process.env.SIMPLEFIN_ACCOUNT_MAP;
    else process.env.SIMPLEFIN_ACCOUNT_MAP = prev;
  }
});
