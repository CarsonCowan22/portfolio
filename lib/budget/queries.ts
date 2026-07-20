import { In, Not } from 'typeorm';
import { getBudgetDataSource } from './dataSource';
import { ARCHIVED_ACCOUNTS } from './constants';
import { toDateString } from './format';
import type { CategoryRule } from './entities/CategoryRule';
import type { Statement } from './entities/Statement';
import type { Transaction } from './entities/Transaction';

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
