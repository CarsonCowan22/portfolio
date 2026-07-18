import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileStatement } from '../reconcile';

test('reconciles when opening + transactions == closing exactly', () => {
  const result = reconcileStatement('1000.00', '900.00', ['-50.00', '-50.00']);
  assert.equal(result.reconciled, true);
  assert.equal(result.diff, '0.00');
  assert.equal(result.parsedSum, '-100.00');
});

test('reconciles within a half-cent float-rounding case using integer-cent math', () => {
  const result = reconcileStatement('0.10', '0.30', ['0.10', '0.10']);
  assert.equal(result.reconciled, true);
  assert.equal(result.diff, '0.00');
});

test('flags a mismatch and reports the exact diff, e.g. from a dropped transaction', () => {
  // opening 1000.00 + sum(-50.00) = 950.00, but closing says 900.00 -- a $50 transaction is missing.
  const result = reconcileStatement('1000.00', '900.00', ['-50.00']);
  assert.equal(result.reconciled, false);
  assert.equal(result.diff, '50.00');
});

test('treats a diff of exactly one cent as reconciled (rounding tolerance)', () => {
  const result = reconcileStatement('100.00', '99.99', ['-0.02']);
  assert.equal(result.reconciled, true);
});

test('treats a diff of two cents as not reconciled', () => {
  const result = reconcileStatement('100.00', '99.96', ['-0.02']);
  assert.equal(result.reconciled, false);
  assert.equal(result.diff, '0.02');
});
