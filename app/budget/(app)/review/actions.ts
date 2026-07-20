'use server';

import { revalidatePath } from 'next/cache';
import { getBudgetDataSource } from '@/lib/budget/dataSource';
import { previewRulePattern, type RulePatternPreview } from '@/lib/budget/queries';
import type { CategoryRule, CategoryRuleMatchType } from '@/lib/budget/entities/CategoryRule';
import type { Transaction } from '@/lib/budget/entities/Transaction';

export async function previewPattern(matchType: CategoryRuleMatchType, pattern: string): Promise<RulePatternPreview> {
  return previewRulePattern(matchType, pattern);
}

function revalidateBudgetPages() {
  revalidatePath('/budget');
  revalidatePath('/budget/review');
  revalidatePath('/budget/transactions');
  revalidatePath('/budget/rules');
}

export async function categorizeTransaction(input: {
  id: string;
  category: string;
  subcategory?: string;
  createRule?: { pattern: string; matchType: 'keyword' | 'regex'; priority: number };
}) {
  const dataSource = await getBudgetDataSource();

  await dataSource.transaction(async (manager) => {
    let ruleId: number | null = null;

    if (input.createRule) {
      // Repositories are resolved by entity NAME (string), not a class reference: Next.js
      // compiles this 'use server' file into a bundle isolated from the module that builds the
      // DataSource, so a decorator-based class ends up duplicated across bundles and the
      // minifier renames it inconsistently -- entities/*.ts uses TypeORM's EntitySchema (a
      // plain object with a literal `name`) specifically so this string lookup is stable.
      const rule = await manager.getRepository<CategoryRule>('CategoryRule').save(
        manager.getRepository<CategoryRule>('CategoryRule').create({
          category: input.category,
          matchType: input.createRule.matchType,
          pattern: input.createRule.pattern,
          priority: input.createRule.priority,
          createdBy: 'carson',
        }),
      );
      ruleId = rule.id;
    }

    await manager.getRepository<Transaction>('Transaction').update(input.id, {
      category: input.category,
      subcategory: input.subcategory?.trim() || null,
      categorySource: 'manual',
      categoryRule: ruleId ? ({ id: ruleId } as CategoryRule) : null,
      needsReview: false,
    });
  });

  revalidateBudgetPages();
}

export async function bulkCategorize(ids: string[], category: string) {
  if (ids.length === 0) return;
  const dataSource = await getBudgetDataSource();
  await dataSource.getRepository<Transaction>('Transaction').update(ids, {
    category,
    categorySource: 'manual',
    needsReview: false,
  });
  revalidateBudgetPages();
}

export async function setFlaggedForFollowUp(id: string, flagged: boolean) {
  const dataSource = await getBudgetDataSource();
  await dataSource.getRepository<Transaction>('Transaction').update(id, { flaggedForFollowUp: flagged });
  revalidateBudgetPages();
}
