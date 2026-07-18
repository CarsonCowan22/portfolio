import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CategoryRuleMatchType = 'keyword' | 'regex';
export type CategoryRuleCreatedBy = 'seed' | 'carson' | 'claude_code';

/**
 * A versioned, human-auditable categorization rule. Rules are checked in `priority` order
 * (ascending -- lower runs first); the first match wins. This table is the entire answer to
 * "why is this transaction categorized this way" -- nothing about categorization lives in code.
 */
@Entity('category_rules')
export class CategoryRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  category!: string;

  @Column({ name: 'match_type', type: 'varchar', length: 16 })
  matchType!: CategoryRuleMatchType;

  @Column({ type: 'text' })
  pattern!: string;

  @Column({ type: 'int' })
  priority!: number;

  @Column({ name: 'created_by', type: 'varchar', length: 16, default: "'carson'" })
  createdBy!: CategoryRuleCreatedBy;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
