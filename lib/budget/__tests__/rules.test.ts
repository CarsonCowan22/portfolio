import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categorize } from '../rules';

test('matches a keyword rule case-insensitively as a substring', () => {
  const match = categorize('STARBUCKS COFFEE #123', [
    { id: 1, category: 'Dining/Fast Food', matchType: 'keyword', pattern: 'starbucks', priority: 180 },
  ]);
  assert.deepEqual(match, { category: 'Dining/Fast Food', ruleId: 1 });
});

test('first match wins by priority order, not array order', () => {
  const rules = [
    { id: 2, category: 'Groceries', matchType: 'keyword' as const, pattern: 'WALMART', priority: 190 },
    { id: 1, category: 'INTERNAL_TRANSFER', matchType: 'keyword' as const, pattern: 'WALMART', priority: 10 },
  ];
  const match = categorize('WALMART SUPERCENTER', rules);
  assert.equal(match?.category, 'INTERNAL_TRANSFER');
});

test('supports a regex rule requiring two terms to both appear (Bank Interest)', () => {
  const rules = [{ id: 5, category: 'Bank Interest', matchType: 'regex' as const, pattern: '(?=.*INTEREST)(?=.*PAID)', priority: 290 }];
  assert.equal(categorize('INTEREST PAID THIS PERIOD', rules)?.category, 'Bank Interest');
  assert.equal(categorize('INTEREST PENDING', rules), null);
});

test('returns null (needs_review) when nothing matches -- never guesses', () => {
  const match = categorize('SOME UNKNOWN MERCHANT XYZ', [
    { id: 1, category: 'Dining/Fast Food', matchType: 'keyword', pattern: 'STARBUCKS', priority: 180 },
  ]);
  assert.equal(match, null);
});

test('a malformed regex rule never throws and never matches', () => {
  const match = categorize('ANYTHING', [
    { id: 1, category: 'Broken', matchType: 'regex', pattern: '(unclosed', priority: 10 },
  ]);
  assert.equal(match, null);
});
