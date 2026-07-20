import './budgetLoadEnv';
import { getBudgetDataSource } from '../lib/budget/dataSource';
import { categorize, matchRule } from '../lib/budget/rules';
import type { CategoryRule } from '../lib/budget/entities/CategoryRule';
import type { Transaction } from '../lib/budget/entities/Transaction';

/**
 * Cleans up ~30 carson-authored priority-500 rules that use Capital One's generic
 * transaction-type prefixes (DIGITAL CARD, CARD PURCHASE, DEPOSIT FROM, WITHDRAWAL FROM,
 * INSTANT TRANSFER) instead of a merchant name -- see the Round 2 improvement guide. These match
 * nearly every transaction regardless of category; only the lowest-id rule at a given priority
 * ever fires, so most of them are already unreachable dead weight, and the ones that do fire
 * risk mis-categorizing unrelated future transactions.
 *
 * Defaults to a dry run -- prints exactly what would change without writing anything. Pass
 * --apply to actually execute the DELETE/INSERT/UPDATE.
 */

const GENERIC_PATTERNS = ['DIGITAL CARD', 'CARD PURCHASE', 'DEPOSIT FROM', 'WITHDRAWAL FROM', 'INSTANT TRANSFER'];

const GENERIC_PREFIXES = [
  'digital card purchase -',
  'card purchase -',
  'withdrawal from',
  'deposit from',
  'instant transfer received from',
];

function suggestMerchantToken(descriptionClean: string): string {
  const trimmed = descriptionClean.trim();
  const lower = trimmed.toLowerCase();
  const prefix = GENERIC_PREFIXES.find((p) => lower.startsWith(p));
  const merchantText = prefix ? trimmed.slice(prefix.length).trim() : trimmed;
  return merchantText.split(/\s+/).slice(0, 2).join(' ').toUpperCase();
}

interface ProposedRule {
  category: string;
  pattern: string;
  priority: number;
}

async function main() {
  const apply = process.argv.includes('--apply');

  const dataSource = await getBudgetDataSource();
  const ruleRepo = dataSource.getRepository<CategoryRule>('CategoryRule');
  const txnRepo = dataSource.getRepository<Transaction>('Transaction');

  const allRules = await ruleRepo.find();
  const genericRules = allRules.filter(
    (r) => r.createdBy === 'carson' && r.priority === 500 && GENERIC_PATTERNS.includes(r.pattern.toUpperCase()),
  );

  if (genericRules.length === 0) {
    console.log('No generic-prefix rules found -- nothing to clean up.');
    await dataSource.destroy();
    return;
  }

  const rulesToDeleteIds = new Set(genericRules.map((r) => r.id));
  const survivingRules = allRules.filter((r) => !rulesToDeleteIds.has(r.id));

  const proposedByKey = new Map<string, ProposedRule>();

  for (const genericRule of genericRules) {
    const txns = await txnRepo.find({ where: { categoryRule: { id: genericRule.id } } });

    const byCategory = new Map<string, Set<string>>();
    for (const t of txns) {
      if (!t.category) continue;
      if (!byCategory.has(t.category)) byCategory.set(t.category, new Set());
      byCategory.get(t.category)!.add(t.descriptionClean);
    }

    for (const [category, descriptions] of Array.from(byCategory.entries())) {
      for (const desc of Array.from(descriptions)) {
        // Already covered by some other surviving rule? Nothing to add.
        if (survivingRules.some((r) => matchRule(desc, r))) continue;

        const candidate = suggestMerchantToken(desc);
        if (!candidate) continue;

        // Ambiguous: does this merchant token appear on transactions in more than one distinct
        // category overall? If so, don't fabricate a rule -- let it fall to needs_review, same
        // as any other unmatched line.
        const conflicting: { category: string }[] = await dataSource.query(
          `SELECT DISTINCT category FROM transactions WHERE description_clean ILIKE $1 AND category IS NOT NULL`,
          [`%${candidate}%`],
        );
        const distinctCats = new Set(conflicting.map((r) => r.category));
        if (distinctCats.size > 1) continue;

        const key = `${candidate}|${category}`;
        if (!proposedByKey.has(key)) {
          proposedByKey.set(key, { category, pattern: candidate, priority: genericRule.priority });
        }
      }
    }
  }

  const rulesToAdd = Array.from(proposedByKey.values());

  console.log(`\n${apply ? 'APPLYING' : 'DRY RUN'} -- generic rule cleanup\n`);
  console.log(`Rules to delete (${genericRules.length}):`);
  for (const r of genericRules.sort((a, b) => a.pattern.localeCompare(b.pattern) || a.category.localeCompare(b.category))) {
    console.log(`  #${r.id}  priority=${r.priority}  "${r.pattern}"  -> ${r.category}`);
  }

  console.log(`\nMerchant-specific replacement rules to add (${rulesToAdd.length}):`);
  for (const r of rulesToAdd) {
    console.log(`  priority=${r.priority}  "${r.pattern}"  -> ${r.category}`);
  }

  // Simulate re-categorization against the rule set as it will look after this cleanup, to show
  // exactly which transactions would flip category before touching anything.
  const nextRuleSet: { id: number; category: string; matchType: 'keyword' | 'regex'; pattern: string; priority: number }[] =
    survivingRules.map((r) => ({ id: r.id, category: r.category, matchType: r.matchType, pattern: r.pattern, priority: r.priority }));
  let nextId = -1;
  const rulesToAddWithIds = rulesToAdd.map((r) => ({ id: nextId--, category: r.category, matchType: 'keyword' as const, pattern: r.pattern, priority: r.priority }));
  nextRuleSet.push(...rulesToAddWithIds);

  const ruleSourcedTxns = await txnRepo.find({ where: { categorySource: 'rule' }, relations: { categoryRule: true } });

  const changes: { id: string; description: string; oldCategory: string | null; newCategory: string | null }[] = [];
  for (const t of ruleSourcedTxns) {
    const match = categorize(t.descriptionClean, nextRuleSet);
    const newCategory = match?.category ?? null;
    if (newCategory !== t.category) {
      changes.push({ id: t.id, description: t.descriptionClean, oldCategory: t.category, newCategory });
    }
  }

  console.log(`\nTransactions whose category would change (${changes.length}):`);
  for (const c of changes.slice(0, 50)) {
    console.log(`  ${c.id}  "${c.description}"  ${c.oldCategory ?? '(none)'} -> ${c.newCategory ?? 'NEEDS REVIEW'}`);
  }
  if (changes.length > 50) console.log(`  … and ${changes.length - 50} more`);

  if (!apply) {
    console.log('\nDry run only -- nothing written. Re-run with --apply to execute.');
    await dataSource.destroy();
    return;
  }

  await dataSource.transaction(async (manager) => {
    const managerRuleRepo = manager.getRepository<CategoryRule>('CategoryRule');
    const managerTxnRepo = manager.getRepository<Transaction>('Transaction');

    await managerRuleRepo.delete(Array.from(rulesToDeleteIds));

    const savedNewRules = await managerRuleRepo.save(
      rulesToAdd.map((r) =>
        managerRuleRepo.create({
          category: r.category,
          matchType: 'keyword',
          pattern: r.pattern,
          priority: r.priority,
          createdBy: 'claude_code',
          notes: 'Merchant-specific replacement for a deleted generic-prefix rule (cleanup script).',
        }),
      ),
    );

    const finalRules = await managerRuleRepo.find();
    const matchableRules = finalRules.map((r) => ({ id: r.id, category: r.category, matchType: r.matchType, pattern: r.pattern, priority: r.priority }));

    let updated = 0;
    for (const t of ruleSourcedTxns) {
      const match = categorize(t.descriptionClean, matchableRules);
      const newCategory = match?.category ?? null;
      const newRuleId = match?.ruleId ?? null;
      if (newCategory !== t.category || newRuleId !== (t.categoryRule?.id ?? null)) {
        await managerTxnRepo.update(t.id, {
          category: newCategory,
          categoryRule: newRuleId ? ({ id: newRuleId } as CategoryRule) : null,
          categorySource: newCategory ? 'rule' : null,
          needsReview: !match,
          internalTransfer: newCategory === 'INTERNAL_TRANSFER',
        });
        updated++;
      }
    }

    console.log(`\nDeleted ${rulesToDeleteIds.size} generic rule(s).`);
    console.log(`Added ${savedNewRules.length} merchant-specific rule(s).`);
    console.log(`Updated ${updated} transaction(s).`);
  });

  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
