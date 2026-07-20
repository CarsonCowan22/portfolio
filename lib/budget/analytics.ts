import { getBudgetDataSource } from './dataSource';
import { ARCHIVED_ACCOUNTS } from './constants';
import type { BudgetTarget } from './entities/BudgetTarget';
import { fromCents, toCents } from './money';

/**
 * Every query here excludes internal transfers and archived accounts, matching the same rule
 * the rest of the app uses -- these numbers describe real income/spending, not money moving
 * between your own accounts.
 */
const EXCLUDE_CLAUSE = 'internal_transfer = false AND NOT (account = ANY($1))';

/** "YYYY-MM" for today, server clock -- fine for a single-user personal tool. */
export function getCurrentMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getAvailableMonths(): Promise<string[]> {
  const dataSource = await getBudgetDataSource();
  const rows: { month: string }[] = await dataSource.query(
    `SELECT DISTINCT to_char(date, 'YYYY-MM') as month FROM transactions
     WHERE ${EXCLUDE_CLAUSE}
     ORDER BY month DESC`,
    [ARCHIVED_ACCOUNTS],
  );
  return rows.map((r) => r.month);
}

export interface MonthlyCashFlow {
  month: string;
  income: string;
  /** Negative (or zero) -- a signed decimal string, same convention as transaction amounts. */
  expenses: string;
  net: string;
}

export async function getMonthlyCashFlow(): Promise<MonthlyCashFlow[]> {
  const dataSource = await getBudgetDataSource();
  const rows: { month: string; income: string; expenses: string }[] = await dataSource.query(
    `SELECT
       to_char(date, 'YYYY-MM') as month,
       COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::text as income,
       COALESCE(SUM(amount) FILTER (WHERE amount < 0), 0)::text as expenses
     FROM transactions
     WHERE ${EXCLUDE_CLAUSE}
     GROUP BY month
     ORDER BY month ASC`,
    [ARCHIVED_ACCOUNTS],
  );
  return rows.map((r) => ({
    month: r.month,
    income: r.income,
    expenses: r.expenses,
    net: fromCents(toCents(r.income) + toCents(r.expenses)),
  }));
}

export interface CategorySpending {
  category: string;
  /** Positive decimal string -- how much was spent this category this month. */
  actual: string;
  /** Human-set monthly target, or null if none has been set for this category. */
  target: string | null;
  /** Positive decimal string -- average monthly spend for this category across every month with
   * data (absent months count as $0), so it reflects true monthly cadence, not just months it
   * happened to occur. A statistic, not a guess -- only becomes a target if a human applies it. */
  suggestedMonthlyAverage: string;
}

export async function getSpendingByCategory(month: string): Promise<CategorySpending[]> {
  const dataSource = await getBudgetDataSource();

  const [actualRows, monthlyTotalRows, availableMonths, targets] = await Promise.all([
    dataSource.query<{ category: string; total: string }[]>(
      `SELECT category, SUM(amount)::text as total
       FROM transactions
       WHERE ${EXCLUDE_CLAUSE} AND category IS NOT NULL AND amount < 0
         AND to_char(date, 'YYYY-MM') = $2
       GROUP BY category`,
      [ARCHIVED_ACCOUNTS, month],
    ),
    dataSource.query<{ category: string; total: string }[]>(
      `SELECT category, SUM(amount)::text as total
       FROM transactions
       WHERE ${EXCLUDE_CLAUSE} AND category IS NOT NULL AND amount < 0
       GROUP BY category`,
      [ARCHIVED_ACCOUNTS],
    ),
    getAvailableMonths(),
    dataSource.getRepository<BudgetTarget>('BudgetTarget').find(),
  ]);

  const monthCount = Math.max(availableMonths.length, 1);
  const targetByCategory = new Map(targets.map((t) => [t.category, t.monthlyTarget]));
  const actualByCategory = new Map(actualRows.map((r) => [r.category, fromCents(Math.abs(toCents(r.total)))]));
  const lifetimeTotalByCategory = new Map(monthlyTotalRows.map((r) => [r.category, Math.abs(toCents(r.total))]));

  const allCategories = new Set([
    ...Array.from(actualByCategory.keys()),
    ...Array.from(lifetimeTotalByCategory.keys()),
    ...Array.from(targetByCategory.keys()),
  ]);

  return Array.from(allCategories)
    .map((category) => ({
      category,
      actual: actualByCategory.get(category) ?? '0.00',
      target: targetByCategory.get(category) ?? null,
      suggestedMonthlyAverage: fromCents(Math.round((lifetimeTotalByCategory.get(category) ?? 0) / monthCount)),
    }))
    .sort((a, b) => Number(b.actual) - Number(a.actual));
}
