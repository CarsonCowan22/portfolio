'use server';

import { revalidatePath } from 'next/cache';
import { ingestSimpleFin, type SimpleFinSyncResult } from '@/lib/budget/simplefin/sync';

export async function syncSimpleFinNow(): Promise<SimpleFinSyncResult> {
  const result = await ingestSimpleFin();
  revalidatePath('/budget');
  revalidatePath('/budget/review');
  revalidatePath('/budget/transactions');
  return result;
}
