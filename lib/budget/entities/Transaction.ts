import { EntitySchema } from 'typeorm';
import type { CategoryRule } from './CategoryRule';
import type { Statement } from './Statement';

export type CategorySource = 'rule' | 'manual' | 'ai_suggested_confirmed';

/**
 * One real, verifiable transaction. `id` is a stable hash of
 * (source_file, source_page, date, amount, description_raw, sequence) so re-ingesting a
 * statement upserts instead of duplicating.
 *
 * `category` is only ever set via a rule match or a human confirming a choice -- never written
 * directly from `suggested_category`. See CategoryBadge for the UI-side enforcement of that split.
 */
export interface Transaction {
  id: string;
  sourceFile: string;
  sourcePage: number;
  account: string;
  date: string;
  descriptionRaw: string;
  descriptionClean: string;
  amount: string;
  runningBalance: string | null;
  internalTransfer: boolean;
  category: string | null;
  categorySource: CategorySource | null;
  categoryRule: CategoryRule | null;
  suggestedCategory: string | null;
  suggestedBy: string | null;
  needsReview: boolean;
  notes: string | null;
  flaggedForFollowUp: boolean;
  statement: Statement | null;
  createdAt: Date;
}

/**
 * EntitySchema, not a decorated class -- see the comment in CategoryRule.ts for why. Relations
 * reference their targets by string name ('CategoryRule', 'Statement'), which is exactly the
 * name-based resolution this refactor relies on being stable across bundles.
 */
export const TransactionEntity = new EntitySchema<Transaction>({
  name: 'Transaction',
  tableName: 'transactions',
  columns: {
    id: { type: 'varchar', length: 64, primary: true },
    sourceFile: { name: 'source_file', type: 'text' },
    sourcePage: { name: 'source_page', type: 'int' },
    account: { type: 'text' },
    date: { type: 'date' },
    descriptionRaw: { name: 'description_raw', type: 'text' },
    descriptionClean: { name: 'description_clean', type: 'text' },
    amount: { type: 'numeric', precision: 12, scale: 2 },
    runningBalance: { name: 'running_balance', type: 'numeric', precision: 12, scale: 2, nullable: true },
    internalTransfer: { name: 'internal_transfer', type: 'boolean', default: false },
    category: { type: 'text', nullable: true },
    categorySource: { name: 'category_source', type: 'varchar', length: 24, nullable: true },
    suggestedCategory: { name: 'suggested_category', type: 'text', nullable: true },
    suggestedBy: { name: 'suggested_by', type: 'text', nullable: true },
    needsReview: { name: 'needs_review', type: 'boolean', default: true },
    notes: { type: 'text', nullable: true },
    flaggedForFollowUp: { name: 'flagged_for_follow_up', type: 'boolean', default: false },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
  },
  relations: {
    categoryRule: {
      type: 'many-to-one',
      target: 'CategoryRule',
      nullable: true,
      onDelete: 'SET NULL',
      joinColumn: { name: 'category_rule_id' },
    },
    statement: {
      type: 'many-to-one',
      target: 'Statement',
      nullable: true,
      onDelete: 'SET NULL',
      joinColumn: { name: 'statement_id' },
    },
  },
});
