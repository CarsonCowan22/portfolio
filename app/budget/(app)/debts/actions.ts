'use server';

import { revalidatePath } from 'next/cache';
import { getBudgetDataSource } from '@/lib/budget/dataSource';
import type { Debt } from '@/lib/budget/entities/Debt';
import type { DebtPayment } from '@/lib/budget/entities/DebtPayment';

function revalidate() {
  revalidatePath('/budget/debts');
}

export interface DebtInput {
  creditor: string;
  balance: string | null;
  monthlyPayment: string | null;
  status: string;
  notes: string | null;
}

export async function createDebt(input: DebtInput) {
  const dataSource = await getBudgetDataSource();
  const repo = dataSource.getRepository<Debt>('Debt');
  await repo.save(repo.create(input));
  revalidate();
}

export async function updateDebt(id: number, input: DebtInput) {
  const dataSource = await getBudgetDataSource();
  await dataSource.getRepository<Debt>('Debt').update(id, input);
  revalidate();
}

export async function deleteDebt(id: number) {
  const dataSource = await getBudgetDataSource();
  // Payments cascade via the FK's ON DELETE CASCADE -- deleting a debt clears its schedule too.
  await dataSource.getRepository<Debt>('Debt').delete(id);
  revalidate();
}

export async function addPayment(debtId: number, dueDate: string, amount: string) {
  const dataSource = await getBudgetDataSource();
  const repo = dataSource.getRepository<DebtPayment>('DebtPayment');
  await repo.save(repo.create({ debt: { id: debtId } as Debt, dueDate, amount }));
  revalidate();
}

export async function markPaymentPaid(id: number, paid: boolean) {
  const dataSource = await getBudgetDataSource();
  await dataSource.getRepository<DebtPayment>('DebtPayment').update(id, { paid });
  revalidate();
}

export async function deletePayment(id: number) {
  const dataSource = await getBudgetDataSource();
  await dataSource.getRepository<DebtPayment>('DebtPayment').delete(id);
  revalidate();
}
