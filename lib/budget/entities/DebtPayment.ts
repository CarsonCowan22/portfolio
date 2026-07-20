import { EntitySchema } from 'typeorm';
import type { Debt } from './Debt';

/**
 * One scheduled or completed payment against a Debt -- kept as its own row (rather than a JSON
 * schedule on Debt) so "every upcoming payment across every debt, sorted by date" is a plain
 * query, the same reasoning Transaction/Statement use a real relation instead of an embedded blob.
 */
export interface DebtPayment {
  id: number;
  debt: Debt;
  dueDate: string;
  amount: string;
  paid: boolean;
  createdAt: Date;
}

/** EntitySchema, not a decorated class -- see the comment in CategoryRule.ts for why. */
export const DebtPaymentEntity = new EntitySchema<DebtPayment>({
  name: 'DebtPayment',
  tableName: 'debt_payments',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    dueDate: { name: 'due_date', type: 'date' },
    amount: { type: 'numeric', precision: 12, scale: 2 },
    paid: { type: 'boolean', default: false },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
  },
  relations: {
    debt: {
      type: 'many-to-one',
      target: 'Debt',
      nullable: false,
      onDelete: 'CASCADE',
      joinColumn: { name: 'debt_id' },
    },
  },
});
