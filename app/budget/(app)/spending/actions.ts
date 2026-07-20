'use server';

import { revalidatePath } from 'next/cache';
import { getBudgetDataSource } from '@/lib/budget/dataSource';
import type { BudgetTarget } from '@/lib/budget/entities/BudgetTarget';

export async function setBudgetTarget(category: string, monthlyTarget: string) {
  const dataSource = await getBudgetDataSource();
  // Resolved by entity NAME (string), not a class reference -- see the comment in
  // app/budget/(app)/review/actions.ts for why.
  await dataSource
    .getRepository<BudgetTarget>('BudgetTarget')
    .upsert({ category, monthlyTarget }, ['category']);
  revalidatePath('/budget/spending');
}

export async function deleteBudgetTarget(category: string) {
  const dataSource = await getBudgetDataSource();
  await dataSource.getRepository<BudgetTarget>('BudgetTarget').delete({ category });
  revalidatePath('/budget/spending');
}

/** Applies the suggested historical average to every category that doesn't have a target yet --
 * backs the "Accept all suggested" first-run banner. Categories that already have a target are
 * left untouched. */
export async function acceptAllSuggestedTargets(rows: { category: string; target: string | null; suggestedMonthlyAverage: string }[]) {
  const dataSource = await getBudgetDataSource();
  const repo = dataSource.getRepository<BudgetTarget>('BudgetTarget');
  const missing = rows.filter((r) => r.target === null);
  await Promise.all(missing.map((r) => repo.upsert({ category: r.category, monthlyTarget: r.suggestedMonthlyAverage }, ['category'])));
  revalidatePath('/budget/spending');
}
