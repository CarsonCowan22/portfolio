import { EntitySchema } from 'typeorm';

/** A monthly $ target for one category, set by a human in the Spending page -- never inferred
 * or pre-filled beyond an explicitly-labeled "suggested" (historical average) the human applies. */
export interface BudgetTarget {
  id: number;
  category: string;
  monthlyTarget: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * EntitySchema, not a decorated class -- see the comment in CategoryRule.ts for why (decorator
 * metadata doesn't survive Next.js bundling Server Actions into separate chunks from the
 * DataSource's own module).
 */
export const BudgetTargetEntity = new EntitySchema<BudgetTarget>({
  name: 'BudgetTarget',
  tableName: 'budget_targets',
  uniques: [{ name: 'uq_budget_targets_category', columns: ['category'] }],
  columns: {
    id: { type: 'int', primary: true, generated: true },
    category: { type: 'text' },
    monthlyTarget: { name: 'monthly_target', type: 'numeric', precision: 12, scale: 2 },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
});
