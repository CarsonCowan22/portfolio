import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * One ingested statement (one account, one period). `reconciled` blocks a statement's
 * transactions from counting toward "final" totals until opening_balance + sum(amount) ==
 * closing_balance within $0.01, or a human overrides it with a documented reason.
 *
 * Unique on (source_file, account) so re-ingesting the same statement updates this row instead
 * of duplicating it -- the same idempotency guarantee transactions get from their stable id.
 */
@Entity('statements')
@Unique(['sourceFile', 'account'])
export class Statement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'source_file', type: 'text' })
  sourceFile!: string;

  @Column({ type: 'text' })
  account!: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: string;

  @Column({ name: 'opening_balance', type: 'numeric', precision: 12, scale: 2 })
  openingBalance!: string;

  @Column({ name: 'closing_balance', type: 'numeric', precision: 12, scale: 2 })
  closingBalance!: string;

  @Column({ type: 'boolean', default: false })
  reconciled!: boolean;

  @Column({ name: 'reconciliation_diff', type: 'numeric', precision: 12, scale: 2, nullable: true })
  reconciliationDiff!: string | null;

  @Column({ name: 'verified_by_human', type: 'boolean', default: false })
  verifiedByHuman!: boolean;

  @Column({ name: 'override_reason', type: 'text', nullable: true })
  overrideReason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
