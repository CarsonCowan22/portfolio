import { In, Not } from 'typeorm';
import { getBudgetDataSource } from './dataSource';
import { ARCHIVED_ACCOUNTS } from './constants';
import { toDateString } from './format';
import type { CategoryRule, CategoryRuleMatchType } from './entities/CategoryRule';
import type { Debt } from './entities/Debt';
import type { DebtPayment } from './entities/DebtPayment';
import type { Statement } from './entities/Statement';
import type { Transaction } from './entities/Transaction';

/** A pattern that would match more than this share of all non-archived transactions, or span
 * more than BROAD_MATCH_CATEGORY_COUNT distinct existing categories, is almost certainly a
 * generic transaction-type prefix rather than a merchant -- see the Rules page guardrail. */
const BROAD_MATCH_RATIO = 0.15;
const BROAD_MATCH_CATEGORY_COUNT = 3;

export interface RulePatternPreview {
  matchCount: number;
  totalTransactionCount: number;
  distinctCategories: string[];
  sample: { id: string; date: string; account: string; descriptionClean: string; amount: string; category: string | null }[];
  broad: boolean;
}

/** Backs the "how many transactions would this match" preview on both the Review page's
 * "always categorize" flow and the Rules page's add-rule form -- the guardrail that would have
 * caught the DIGITAL CARD / CARD PURCHASE generic-prefix rules before they were ever saved. */
export async function previewRulePattern(matchType: CategoryRuleMatchType, pattern: string): Promise<RulePatternPreview> {
  const trimmed = pattern.trim();
  const empty: RulePatternPreview = { matchCount: 0, totalTransactionCount: 0, distinctCategories: [], sample: [], broad: false };
  if (!trimmed) return empty;

  const dataSource = await getBudgetDataSource();
  const repo = dataSource.getRepository<Transaction>('Transaction');
  const totalTransactionCount = await repo.count({ where: { account: Not(In(ARCHIVED_ACCOUNTS)) } });

  const qb = repo
    .createQueryBuilder('t')
    .where('t.account NOT IN (:...archived)', { archived: ARCHIVED_ACCOUNTS })
    .orderBy('t.date', 'DESC');

  let matched: Transaction[];
  try {
    matched =
      matchType === 'regex'
        ? await qb.andWhere('t.description_clean ~* :pattern', { pattern: trimmed }).getMany()
        : await qb.andWhere('t.description_clean ILIKE :pattern', { pattern: `%${trimmed}%` }).getMany();
  } catch {
    // Malformed regex -- never silently matches, same as matchRule() in rules.ts.
    return empty;
  }

  const distinctCategories = Array.from(new Set(matched.map((t) => t.category).filter((c): c is string => !!c))).sort();
  const sample = matched.slice(0, 10).map((t) => ({
    id: t.id,
    date: toDateString(t.date),
    account: t.account,
    descriptionClean: t.descriptionClean,
    amount: t.amount,
    category: t.category,
  }));
  const broad =
    totalTransactionCount > 0 &&
    (matched.length / totalTransactionCount > BROAD_MATCH_RATIO || distinctCategories.length > BROAD_MATCH_CATEGORY_COUNT);

  return { matchCount: matched.length, totalTransactionCount, distinctCategories, sample, broad };
}

export async function getStatements(): Promise<Statement[]> {
  const dataSource = await getBudgetDataSource();
  return dataSource.getRepository<Statement>('Statement').find({
    where: { account: Not(In(ARCHIVED_ACCOUNTS)) },
    order: { periodStart: 'DESC' },
  });
}

export async function getNeedsReviewTransactions(limit = 300): Promise<Transaction[]> {
  const dataSource = await getBudgetDataSource();
  return dataSource.getRepository<Transaction>('Transaction').find({
    where: { needsReview: true, account: Not(In(ARCHIVED_ACCOUNTS)) },
    relations: { categoryRule: true },
    order: { date: 'DESC', amount: 'ASC' },
    take: limit,
  });
}

export async function getNeedsReviewCount(): Promise<number> {
  const dataSource = await getBudgetDataSource();
  return dataSource
    .getRepository<Transaction>('Transaction')
    .count({ where: { needsReview: true, account: Not(In(ARCHIVED_ACCOUNTS)) } });
}

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const dataSource = await getBudgetDataSource();
  return dataSource.getRepository<CategoryRule>('CategoryRule').find({ order: { priority: 'ASC', id: 'ASC' } });
}

export async function getDebts(): Promise<Debt[]> {
  const dataSource = await getBudgetDataSource();
  return dataSource.getRepository<Debt>('Debt').find({ order: { creditor: 'ASC' } });
}

/** Every payment across every debt, flattened and sorted by due date -- backs the Debts page's
 * "upcoming payments" list so overlapping plans (e.g. two cards' plans in the same month) can't
 * get missed. */
export async function getDebtPayments(): Promise<DebtPayment[]> {
  const dataSource = await getBudgetDataSource();
  return dataSource
    .getRepository<DebtPayment>('DebtPayment')
    .find({ relations: { debt: true }, order: { dueDate: 'ASC' } });
}

export async function getDistinctCategories(): Promise<string[]> {
  const dataSource = await getBudgetDataSource();
  const rows: { category: string }[] = await dataSource
    .getRepository<Transaction>('Transaction')
    .createQueryBuilder('t')
    .select('DISTINCT t.category', 'category')
    .where('t.category IS NOT NULL')
    .orderBy('t.category', 'ASC')
    .getRawMany();
  return rows.map((row) => row.category);
}

export async function getDistinctAccounts(): Promise<string[]> {
  const dataSource = await getBudgetDataSource();
  const rows: { account: string }[] = await dataSource
    .getRepository<Transaction>('Transaction')
    .createQueryBuilder('t')
    .select('DISTINCT t.account', 'account')
    .where('t.account NOT IN (:...archived)', { archived: ARCHIVED_ACCOUNTS })
    .orderBy('t.account', 'ASC')
    .getRawMany();
  return rows.map((row) => row.account);
}

export interface AccountFreshness {
  account: string;
  /** Latest transaction date on file for this account, from any source (PDF or SimpleFIN) --
   * null if the account has no transactions yet. */
  latestDate: string | null;
}

/** Backs the Overview page's "Live sync" card -- freshness is derived from existing data, not a
 * separately-tracked sync cursor. */
export async function getAccountFreshness(accounts: string[]): Promise<AccountFreshness[]> {
  const dataSource = await getBudgetDataSource();
  const repo = dataSource.getRepository<Transaction>('Transaction');
  const results: AccountFreshness[] = [];
  for (const account of accounts) {
    const latest = await repo.findOne({ where: { account }, order: { date: 'DESC' } });
    results.push({ account, latestDate: latest ? toDateString(latest.date) : null });
  }
  return results;
}

export interface TransactionFilters {
  account?: string;
  category?: string;
  needsReview?: boolean;
  internalTransfer?: boolean;
  search?: string;
}

/** Backs the Transactions page's filterable/drill-down table -- every total shown elsewhere in
 * the app links here with the matching filters, per the "every number traces to real transactions" rule. */
export async function getFilteredTransactions(filters: TransactionFilters, limit = 500): Promise<Transaction[]> {
  const dataSource = await getBudgetDataSource();
  const qb = dataSource
    .getRepository<Transaction>('Transaction')
    .createQueryBuilder('t')
    .leftJoinAndSelect('t.categoryRule', 'rule')
    .where('t.account NOT IN (:...archived)', { archived: ARCHIVED_ACCOUNTS })
    .orderBy('t.date', 'DESC')
    .addOrderBy('t.id', 'ASC')
    .take(limit);

  if (filters.account) qb.andWhere('t.account = :account', { account: filters.account });
  if (filters.category) qb.andWhere('t.category = :category', { category: filters.category });
  if (filters.needsReview !== undefined) qb.andWhere('t.needs_review = :needsReview', { needsReview: filters.needsReview });
  if (filters.internalTransfer !== undefined) {
    qb.andWhere('t.internal_transfer = :internalTransfer', { internalTransfer: filters.internalTransfer });
  }
  if (filters.search) qb.andWhere('t.description_clean ILIKE :search', { search: `%${filters.search}%` });

  return qb.getMany();
}
