import { EntitySchema } from 'typeorm';

/**
 * One creditor/loan in the debt picture -- balance and monthlyPayment are nullable because some
 * debts don't have a fixed number yet (e.g. Honda's deficiency is unknown until the auction), and
 * `status` carries the free-text description of where things stand (a settlement plan, a
 * repossession pending auction, deferment, etc.) since that shape genuinely varies per creditor.
 */
export interface Debt {
  id: number;
  creditor: string;
  balance: string | null;
  monthlyPayment: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** EntitySchema, not a decorated class -- see the comment in CategoryRule.ts for why. */
export const DebtEntity = new EntitySchema<Debt>({
  name: 'Debt',
  tableName: 'debts',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    creditor: { type: 'text' },
    balance: { type: 'numeric', precision: 12, scale: 2, nullable: true },
    monthlyPayment: { name: 'monthly_payment', type: 'numeric', precision: 12, scale: 2, nullable: true },
    status: { type: 'text' },
    notes: { type: 'text', nullable: true },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
});
