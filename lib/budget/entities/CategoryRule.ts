import { EntitySchema } from 'typeorm';

export type CategoryRuleMatchType = 'keyword' | 'regex';
export type CategoryRuleCreatedBy = 'seed' | 'carson' | 'claude_code';

/**
 * A versioned, human-auditable categorization rule. Rules are checked in `priority` order
 * (ascending -- lower runs first); the first match wins. This table is the entire answer to
 * "why is this transaction categorized this way" -- nothing about categorization lives in code.
 */
export interface CategoryRule {
  id: number;
  category: string;
  matchType: CategoryRuleMatchType;
  pattern: string;
  priority: number;
  createdBy: CategoryRuleCreatedBy;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Defined via EntitySchema (a plain object) rather than @Entity()-decorated class. Next.js
 * bundles Server Actions into a chunk isolated from the module that builds the DataSource, so a
 * decorator-based class ends up duplicated as two distinct objects in production -- and since
 * decorator metadata is keyed to class identity (and the production minifier renames classes
 * inconsistently across those chunks), `getRepository()` throws "No metadata found" from the
 * "wrong" copy. EntitySchema's `name` is a literal string in source, immune to both problems.
 */
export const CategoryRuleEntity = new EntitySchema<CategoryRule>({
  name: 'CategoryRule',
  tableName: 'category_rules',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    category: { type: 'text' },
    matchType: { name: 'match_type', type: 'varchar', length: 16 },
    pattern: { type: 'text' },
    priority: { type: 'int' },
    createdBy: { name: 'created_by', type: 'varchar', length: 16, default: 'carson' },
    notes: { type: 'text', nullable: true },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
});
