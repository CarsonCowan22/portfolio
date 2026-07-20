'use server';

import { revalidatePath } from 'next/cache';
import { getBudgetDataSource } from '@/lib/budget/dataSource';
import { previewRulePattern, type RulePatternPreview } from '@/lib/budget/queries';
import type { CategoryRule, CategoryRuleMatchType } from '@/lib/budget/entities/CategoryRule';

export async function previewPattern(matchType: CategoryRuleMatchType, pattern: string): Promise<RulePatternPreview> {
  return previewRulePattern(matchType, pattern);
}

function revalidateBudgetPages() {
  revalidatePath('/budget');
  revalidatePath('/budget/review');
  revalidatePath('/budget/rules');
  revalidatePath('/budget/transactions');
}

export interface RuleInput {
  category: string;
  matchType: CategoryRuleMatchType;
  pattern: string;
  priority: number;
  notes?: string;
}

export async function createRule(input: RuleInput) {
  const dataSource = await getBudgetDataSource();
  // Resolved by entity NAME, not class reference -- see the comment in review/actions.ts for why
  // (Next.js bundles this 'use server' file separately from the DataSource's own module).
  const repo = dataSource.getRepository<CategoryRule>('CategoryRule');
  await repo.save(
    repo.create({
      category: input.category,
      matchType: input.matchType,
      pattern: input.pattern,
      priority: input.priority,
      notes: input.notes ?? null,
      createdBy: 'carson',
    }),
  );
  revalidateBudgetPages();
}

export async function updateRule(id: number, input: RuleInput) {
  const dataSource = await getBudgetDataSource();
  await dataSource.getRepository<CategoryRule>('CategoryRule').update(id, {
    category: input.category,
    matchType: input.matchType,
    pattern: input.pattern,
    priority: input.priority,
    notes: input.notes ?? null,
  });
  revalidateBudgetPages();
}

export async function deleteRule(id: number) {
  const dataSource = await getBudgetDataSource();
  // Transactions referencing this rule keep their existing category (ON DELETE SET NULL only
  // clears category_rule_id, not category) -- deleting a rule never un-categorizes past decisions.
  await dataSource.getRepository<CategoryRule>('CategoryRule').delete(id);
  revalidateBudgetPages();
}
