import { getBudgetDataSource } from './dataSource';
import { CategoryRule } from './entities/CategoryRule';
import { Statement } from './entities/Statement';
import { Transaction } from './entities/Transaction';

export async function getStatements(): Promise<Statement[]> {
  const dataSource = await getBudgetDataSource();
  return dataSource.getRepository(Statement).find({ order: { periodStart: 'DESC' } });
}

export async function getNeedsReviewTransactions(limit = 300): Promise<Transaction[]> {
  const dataSource = await getBudgetDataSource();
  return dataSource.getRepository(Transaction).find({
    where: { needsReview: true },
    relations: { categoryRule: true },
    order: { date: 'DESC', amount: 'ASC' },
    take: limit,
  });
}

export async function getNeedsReviewCount(): Promise<number> {
  const dataSource = await getBudgetDataSource();
  return dataSource.getRepository(Transaction).count({ where: { needsReview: true } });
}

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const dataSource = await getBudgetDataSource();
  return dataSource.getRepository(CategoryRule).find({ order: { priority: 'ASC', id: 'ASC' } });
}

export async function getDistinctCategories(): Promise<string[]> {
  const dataSource = await getBudgetDataSource();
  const rows: { category: string }[] = await dataSource
    .getRepository(Transaction)
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
    .getRepository(Transaction)
    .createQueryBuilder('t')
    .select('DISTINCT t.account', 'account')
    .orderBy('t.account', 'ASC')
    .getRawMany();
  return rows.map((row) => row.account);
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
    .getRepository(Transaction)
    .createQueryBuilder('t')
    .leftJoinAndSelect('t.categoryRule', 'rule')
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
