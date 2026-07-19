import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatSignedDollars } from '../format';

test('formats a negative amount as -$X.XX, not $-X.XX', () => {
  assert.equal(formatSignedDollars('-266.13'), '-$266.13');
});

test('formats a positive amount as $X.XX by default (no plus sign)', () => {
  assert.equal(formatSignedDollars('266.13'), '$266.13');
});

test('adds a plus sign for positive amounts when showPlus is true', () => {
  assert.equal(formatSignedDollars('266.13', true), '+$266.13');
  assert.equal(formatSignedDollars('-266.13', true), '-$266.13');
});
