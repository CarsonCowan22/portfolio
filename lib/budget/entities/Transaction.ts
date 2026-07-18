import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { CategoryRule } from './CategoryRule';
import { Statement } from './Statement';

export type CategorySource = 'rule' | 'manual' | 'ai_suggested_confirmed';

/**
 * One real, verifiable transaction. `id` is a stable hash of
 * (source_file, source_page, date, amount, description_raw) so re-ingesting a statement
 * upserts instead of duplicating.
 *
 * `category` is only ever set via a rule match or a human confirming a choice -- never written
 * directly from `suggested_category`. See CategoryBadge for the UI-side enforcement of that split.
 */
@Entity('transactions')
export class Transaction {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ name: 'source_file', type: 'text' })
  sourceFile!: string;

  @Column({ name: 'source_page', type: 'int' })
  sourcePage!: number;

  @Column({ type: 'text' })
  account!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ name: 'description_raw', type: 'text' })
  descriptionRaw!: string;

  @Column({ name: 'description_clean', type: 'text' })
  descriptionClean!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ name: 'running_balance', type: 'numeric', precision: 12, scale: 2, nullable: true })
  runningBalance!: string | null;

  @Column({ name: 'internal_transfer', type: 'boolean', default: false })
  internalTransfer!: boolean;

  @Column({ type: 'text', nullable: true })
  category!: string | null;

  @Column({ name: 'category_source', type: 'varchar', length: 24, nullable: true })
  categorySource!: CategorySource | null;

  @ManyToOne(() => CategoryRule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_rule_id' })
  categoryRule!: CategoryRule | null;

  @Column({ name: 'suggested_category', type: 'text', nullable: true })
  suggestedCategory!: string | null;

  @Column({ name: 'suggested_by', type: 'text', nullable: true })
  suggestedBy!: string | null;

  @Column({ name: 'needs_review', type: 'boolean', default: true })
  needsReview!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'flagged_for_follow_up', type: 'boolean', default: false })
  flaggedForFollowUp!: boolean;

  @ManyToOne(() => Statement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'statement_id' })
  statement!: Statement | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
