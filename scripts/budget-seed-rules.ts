import './budgetLoadEnv';
import fs from 'node:fs';
import path from 'node:path';
import { getBudgetDataSource } from '../lib/budget/dataSource';
import type { CategoryRule, CategoryRuleMatchType } from '../lib/budget/entities/CategoryRule';

interface SeedRuleGroup {
  category: string;
  matchType: CategoryRuleMatchType;
  priority: number;
  patterns: string[];
  notes?: string;
}

async function main() {
  const seedPath = path.resolve(process.cwd(), 'data/budget/seed-rules.json');
  const groups: SeedRuleGroup[] = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  const dataSource = await getBudgetDataSource();
  const repo = dataSource.getRepository<CategoryRule>('CategoryRule');

  // Re-running this script re-seeds from scratch -- only rows this script created (created_by =
  // 'seed') are replaced, so Carson's own manual rules and Claude-Code-authored rules are untouched.
  const deleted = await repo.delete({ createdBy: 'seed' });

  const rows = groups.flatMap((group) =>
    group.patterns.map((pattern) =>
      repo.create({
        category: group.category,
        matchType: group.matchType,
        pattern,
        priority: group.priority,
        createdBy: 'seed',
        notes: group.notes ?? null,
      }),
    ),
  );

  await repo.save(rows);
  console.log(`Removed ${deleted.affected ?? 0} previously seeded rule(s).`);
  console.log(`Seeded ${rows.length} rule(s) across ${groups.length} categories.`);
  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
