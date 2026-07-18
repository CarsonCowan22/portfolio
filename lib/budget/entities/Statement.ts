import { EntitySchema } from 'typeorm';

/**
 * One ingested statement (one account, one period). `reconciled` blocks a statement's
 * transactions from counting toward "final" totals until opening_balance + sum(amount) ==
 * closing_balance within $0.01, or a human overrides it with a documented reason.
 */
export interface Statement {
  id: number;
  sourceFile: string;
  account: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: string;
  closingBalance: string;
  reconciled: boolean;
  reconciliationDiff: string | null;
  verifiedByHuman: boolean;
  overrideReason: string | null;
  createdAt: Date;
}

/**
 * EntitySchema, not a decorated class -- see the comment in CategoryRule.ts for why (decorator
 * metadata doesn't survive Next.js bundling Server Actions into separate chunks from the
 * DataSource's own module).
 *
 * Unique on (source_file, account) so re-ingesting the same statement updates this row instead
 * of duplicating it -- the same idempotency guarantee transactions get from their stable id.
 */
export const StatementEntity = new EntitySchema<Statement>({
  name: 'Statement',
  tableName: 'statements',
  uniques: [{ name: 'uq_statements_source_file_account', columns: ['sourceFile', 'account'] }],
  columns: {
    id: { type: 'int', primary: true, generated: true },
    sourceFile: { name: 'source_file', type: 'text' },
    account: { type: 'text' },
    periodStart: { name: 'period_start', type: 'date' },
    periodEnd: { name: 'period_end', type: 'date' },
    openingBalance: { name: 'opening_balance', type: 'numeric', precision: 12, scale: 2 },
    closingBalance: { name: 'closing_balance', type: 'numeric', precision: 12, scale: 2 },
    reconciled: { type: 'boolean', default: false },
    reconciliationDiff: { name: 'reconciliation_diff', type: 'numeric', precision: 12, scale: 2, nullable: true },
    verifiedByHuman: { name: 'verified_by_human', type: 'boolean', default: false },
    overrideReason: { name: 'override_reason', type: 'text', nullable: true },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
  },
});
