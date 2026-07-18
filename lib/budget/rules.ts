import { getBudgetDataSource } from './dataSource';
import { CategoryRule } from './entities/CategoryRule';

export interface CategorizationMatch {
  category: string;
  ruleId: number;
}

type MatchableRule = Pick<CategoryRule, 'id' | 'category' | 'matchType' | 'pattern' | 'priority'>;

export function matchRule(descriptionClean: string, rule: MatchableRule): boolean {
  if (rule.matchType === 'keyword') {
    return descriptionClean.toUpperCase().includes(rule.pattern.toUpperCase());
  }
  try {
    return new RegExp(rule.pattern, 'i').test(descriptionClean);
  } catch {
    // A malformed regex rule never silently matches -- it just never fires, and the
    // transaction falls through to needs_review like any other unmatched line.
    return false;
  }
}

/** First match wins; rules are checked in priority order (ascending), ties broken by id. */
export function categorize(descriptionClean: string, rules: MatchableRule[]): CategorizationMatch | null {
  const ordered = [...rules].sort((a, b) => a.priority - b.priority || a.id - b.id);
  for (const rule of ordered) {
    if (matchRule(descriptionClean, rule)) {
      return { category: rule.category, ruleId: rule.id };
    }
  }
  return null;
}

export async function loadRules(): Promise<CategoryRule[]> {
  const dataSource = await getBudgetDataSource();
  return dataSource.getRepository(CategoryRule).find({ order: { priority: 'ASC', id: 'ASC' } });
}
