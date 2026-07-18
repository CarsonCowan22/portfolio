'use server';

import { revalidatePath } from 'next/cache';
import { getBudgetDataSource } from '@/lib/budget/dataSource';
import { CategoryRule } from '@/lib/budget/entities/CategoryRule';
import { Transaction } from '@/lib/budget/entities/Transaction';

function revalidateBudgetPages() {
  revalidatePath('/budget');
  revalidatePath('/budget/review');
  revalidatePath('/budget/transactions');
  revalidatePath('/budget/rules');
}

export async function categorizeTransaction(input: {
  id: string;
  category: string;
  createRule?: { pattern: string; matchType: 'keyword' | 'regex'; priority: number };
}) {
  const dataSource = await getBudgetDataSource();

  await dataSource.transaction(async (manager) => {
    let ruleId: number | null = null;

    if (input.createRule) {
      const rule = await manager.getRepository(CategoryRule).save(
        manager.getRepository(CategoryRule).create({
          category: input.category,
          matchType: input.createRule.matchType,
          pattern: input.createRule.pattern,
          priority: input.createRule.priority,
          createdBy: 'carson',
        }),
      );
      ruleId = rule.id;
    }

    await manager.getRepository(Transaction).update(input.id, {
      category: input.category,
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
  await dataSource.getRepository(Transaction).update(ids, {
    category,
    categorySource: 'manual',
    needsReview: false,
  });
  revalidateBudgetPages();
}

export async function setFlaggedForFollowUp(id: string, flagged: boolean) {
  const dataSource = await getBudgetDataSource();
  await dataSource.getRepository(Transaction).update(id, { flaggedForFollowUp: flagged });
  revalidateBudgetPages();
}
