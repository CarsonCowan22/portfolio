import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromCents, toCents } from '../money';

test('toCents parses positive and negative decimals without float error', () => {
  assert.equal(toCents('12.34'), 1234);
  assert.equal(toCents('-12.34'), -1234);
  assert.equal(toCents('0.10') + toCents('0.20'), 30);
});

test('fromCents round-trips back to the original decimal string', () => {
  assert.equal(fromCents(1234), '12.34');
  assert.equal(fromCents(-1234), '-12.34');
  assert.equal(fromCents(0), '0.00');
});
