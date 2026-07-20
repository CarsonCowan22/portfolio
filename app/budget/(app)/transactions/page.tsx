import { getDistinctAccounts, getDistinctCategories, getFilteredTransactions } from '@/lib/budget/queries';
import { toDateString } from '@/lib/budget/format';
import CategoryBadge from '@/components/Budget/CategoryBadge';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Transactions' };

interface RawSearchParams {
  account?: string;
  category?: string;
  search?: string;
  needsReview?: string;
  internalTransfer?: string;
}

export default async function TransactionsPage({ searchParams }: { searchParams: RawSearchParams }) {
  const filters = {
    account: searchParams.account || undefined,
    category: searchParams.category || undefined,
    search: searchParams.search || undefined,
    needsReview: searchParams.needsReview === 'true' ? true : undefined,
    internalTransfer: searchParams.internalTransfer === 'true' ? true : undefined,
  };

  const [transactions, accounts, categories] = await Promise.all([
    getFilteredTransactions(filters),
    getDistinctAccounts(),
    getDistinctCategories(),
  ]);

  const netCents = transactions.reduce((sum, t) => sum + Math.round(Number(t.amount) * 100), 0);
  const net = (netCents / 100).toFixed(2);

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Private</p>
        <h1 className={styles.heading}>Transactions</h1>
        <p className={styles.subhead}>
          {transactions.length} transaction{transactions.length === 1 ? '' : 's'} · net ${net}
        </p>
      </div>

      <form className={styles.filters} method="get">
        <select name="account" defaultValue={filters.account ?? ''} className={styles.select}>
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account} value={account}>
              {account}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={filters.category ?? ''} className={styles.select}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <input
          className={styles.search}
          type="search"
          name="search"
          defaultValue={filters.search ?? ''}
          placeholder="Search description…"
        />
        <label className={styles.checkboxLabel}>
          <input type="checkbox" name="needsReview" value="true" defaultChecked={filters.needsReview === true} />
          Needs review only
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            name="internalTransfer"
            value="true"
            defaultChecked={filters.internalTransfer === true}
          />
          Internal transfers only
        </label>
        <button className={styles.filterButton} type="submit">
          Filter
        </button>
      </form>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{toDateString(transaction.date)}</td>
                <td>{transaction.account}</td>
                <td>{transaction.descriptionClean}</td>
                <td className={Number(transaction.amount) < 0 ? styles.negative : styles.positive}>
                  ${transaction.amount}
                </td>
                <td>
                  <CategoryBadge
                    category={transaction.category}
                    suggestedCategory={transaction.suggestedCategory}
                    needsReview={transaction.needsReview}
                  />
                  {transaction.subcategory ? <span className={styles.subcategoryPill}>{transaction.subcategory}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 ? <p className={styles.empty}>No transactions match this filter.</p> : null}
      </div>
    </div>
  );
}
