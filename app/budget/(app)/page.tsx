import Link from 'next/link';
import { getAccountFreshness, getNeedsReviewCount, getStatements } from '@/lib/budget/queries';
import { getCurrentMonthString, getMonthlyCashFlow, getSpendingByCategory } from '@/lib/budget/analytics';
import { formatSignedDollars } from '@/lib/budget/format';
import ReconciliationCard from '@/components/Budget/ReconciliationCard';
import SimpleFinSyncCard from '@/components/Budget/SimpleFinSyncCard';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Overview' };

const CAVEATS = [
  'Honda Financial account closes after auction -- the remaining balance becomes a deficiency negotiation, not an ongoing loan payment.',
  'Childcare (Brightwheel) ends 7/30/26. The real recurring rate is $735/month -- don’t let a blended historical average stand in for it.',
  'Apr-Jun 2026 Capital One activity is sparse because spending moved to other cards -- don’t read that as reduced spending.',
  '360 Checking and 360 Performance Savings are closed accounts -- excluded from every view/total here (see lib/budget/constants.ts), but their historical transactions are still in the database, untouched.',
];

function readSimpleFinAccountNames(): string[] {
  const raw = process.env.SIMPLEFIN_ACCOUNT_MAP;
  if (!raw) return [];
  try {
    return Object.values(JSON.parse(raw) as Record<string, string>);
  } catch {
    return [];
  }
}

export default async function BudgetOverviewPage() {
  const simpleFinConfigured = !!process.env.SIMPLEFIN_ACCESS_URL;
  const simpleFinAccounts = readSimpleFinAccountNames();
  const currentMonth = getCurrentMonthString();

  const [statements, needsReviewCount, accountFreshness, spendingRows, cashFlowRows] = await Promise.all([
    getStatements(),
    getNeedsReviewCount(),
    simpleFinConfigured && simpleFinAccounts.length > 0 ? getAccountFreshness(simpleFinAccounts) : Promise.resolve([]),
    getSpendingByCategory(currentMonth),
    getMonthlyCashFlow(),
  ]);

  const unreconciled = statements.filter((s) => !s.reconciled && !s.verifiedByHuman);

  const totalSpent = spendingRows.reduce((sum, row) => sum + Number(row.actual), 0);
  const totalBudgeted = spendingRows.reduce((sum, row) => sum + (row.target ? Number(row.target) : 0), 0);
  const hasAnyTarget = spendingRows.some((row) => row.target !== null);

  const netSoFar = cashFlowRows.find((row) => row.month === currentMonth)?.net ?? '0.00';

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();

  const topOverTarget = spendingRows
    .filter((row) => row.target !== null)
    .map((row) => ({ category: row.category, over: Number(row.actual) - Number(row.target) }))
    .filter((row) => row.over > 0)
    .sort((a, b) => b.over - a.over)
    .slice(0, 3);

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Private</p>
        <h1 className={styles.heading}>Budget</h1>
      </div>

      <div className={styles.grid}>
        <div className={styles.tile}>
          <p className={styles.tileValue}>${totalSpent.toFixed(2)}</p>
          <p className={styles.tileLabel}>Spent this month{hasAnyTarget ? ` of $${totalBudgeted.toFixed(2)}` : ''}</p>
        </div>
        <div className={styles.tile}>
          <p className={[styles.tileValue, Number(netSoFar) >= 0 ? styles.tileAccent : ''].join(' ')}>
            {formatSignedDollars(netSoFar, true)}
          </p>
          <p className={styles.tileLabel}>Net cash flow so far</p>
        </div>
        <div className={styles.tile}>
          <p className={styles.tileValue}>{daysRemaining}</p>
          <p className={styles.tileLabel}>Days left this month</p>
        </div>
      </div>

      {topOverTarget.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Over target right now</h2>
          <div className={styles.card}>
            {topOverTarget.map((row) => (
              <Link key={row.category} className={styles.overRow} href={`/budget/spending?month=${currentMonth}`}>
                <span>{row.category}</span>
                <span className={styles.overAmount}>${row.over.toFixed(2)} over</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {needsReviewCount > 0 ? (
        <Link className={styles.reviewCta} href="/budget/review">
          Review {needsReviewCount} uncategorized transaction{needsReviewCount === 1 ? '' : 's'} →
        </Link>
      ) : null}

      <SimpleFinSyncCard configured={simpleFinConfigured} accounts={accountFreshness} />

      <details className={styles.dataHealth}>
        <summary className={styles.dataHealthSummary}>Data health</summary>
        <div className={styles.dataHealthBody}>
          <div className={styles.grid}>
            <div className={styles.tile}>
              <p className={styles.tileValue}>{statements.length}</p>
              <p className={styles.tileLabel}>Statements ingested</p>
            </div>
            <div className={styles.tile}>
              <p className={[styles.tileValue, unreconciled.length > 0 ? styles.tileAccent : ''].join(' ')}>
                {unreconciled.length}
              </p>
              <p className={styles.tileLabel}>Unreconciled statements</p>
            </div>
            <div className={styles.tile}>
              <p className={[styles.tileValue, needsReviewCount > 0 ? styles.tileAccent : ''].join(' ')}>
                {needsReviewCount}
              </p>
              <p className={styles.tileLabel}>Transactions needing review</p>
            </div>
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>Statements</h2>
            {statements.length === 0 ? (
              <p className={styles.empty}>No statements ingested yet. Run `pnpm budget:ingest` to add one.</p>
            ) : (
              <div className={styles.card}>
                {statements.map((statement) => (
                  <ReconciliationCard key={statement.id} statement={statement} />
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>Known caveats</h2>
            <ul className={styles.caveats}>
              {CAVEATS.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          </section>
        </div>
      </details>
    </div>
  );
}
