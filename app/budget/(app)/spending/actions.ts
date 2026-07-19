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
