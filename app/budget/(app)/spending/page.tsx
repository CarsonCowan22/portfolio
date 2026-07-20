import Link from 'next/link';
import { getAvailableMonths, getCurrentMonthString, getSpendingByCategory } from '@/lib/budget/analytics';
import CategoryBarChart from '@/components/Budget/CategoryBarChart';
import SpendingTable from '@/components/Budget/SpendingTable';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Spending' };

function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Only meaningful when browsing the actual current calendar month, not a historical month
 * reached via the month nav -- otherwise "60% through the month" would be nonsense. */
function currentMonthProgressPct(month: string): number | null {
  if (month !== getCurrentMonthString()) return null;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.round((now.getDate() / daysInMonth) * 100);
}

export default async function SpendingPage({ searchParams }: { searchParams: { month?: string } }) {
  const availableMonths = await getAvailableMonths();
  const month = searchParams.month && availableMonths.includes(searchParams.month) ? searchParams.month : availableMonths[0];

  if (!month) {
    return (
      <div className={styles.stack}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Private</p>
          <h1 className={styles.heading}>Spending</h1>
        </div>
        <p className={styles.empty}>No transactions yet.</p>
      </div>
    );
  }

  const rows = await getSpendingByCategory(month);
  const totalActual = rows.reduce((sum, row) => sum + Number(row.actual), 0);
  const totalTarget = rows.reduce((sum, row) => sum + (row.target ? Number(row.target) : 0), 0);
  const hasAnyTarget = rows.some((row) => row.target !== null);
  const monthProgressPct = currentMonthProgressPct(month);

  const monthIndex = availableMonths.indexOf(month);
  const olderMonth = availableMonths[monthIndex + 1];
  const newerMonth = availableMonths[monthIndex - 1];

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Private</p>
        <h1 className={styles.heading}>Spending</h1>
      </div>

      <div className={styles.monthNav}>
        {olderMonth ? (
          <Link className={styles.monthLink} href={`/budget/spending?month=${olderMonth}`}>
            ← {formatMonthLabel(olderMonth)}
          </Link>
        ) : (
          <span />
        )}
        <p className={styles.monthLabel}>{formatMonthLabel(month)}</p>
        {newerMonth ? (
          <Link className={styles.monthLink} href={`/budget/spending?month=${newerMonth}`}>
            {formatMonthLabel(newerMonth)} →
          </Link>
        ) : (
          <span />
        )}
      </div>

      <div className={styles.grid}>
        <div className={styles.tile}>
          <p className={styles.tileValue}>${totalActual.toFixed(2)}</p>
          <p className={styles.tileLabel}>Total spent</p>
        </div>
        {hasAnyTarget ? (
          <div className={styles.tile}>
            <p className={[styles.tileValue, totalActual > totalTarget ? styles.tileAccentOver : styles.tileAccent].join(' ')}>
              ${totalTarget.toFixed(2)}
            </p>
            <p className={styles.tileLabel}>Total budgeted</p>
          </div>
        ) : null}
        {monthProgressPct !== null ? (
          <div className={styles.tile}>
            <p className={styles.tileValue}>{monthProgressPct}%</p>
            <p className={styles.tileLabel}>Through the month</p>
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>No categorized spending in {formatMonthLabel(month)} yet.</p>
      ) : (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>By category</h2>
            <CategoryBarChart items={rows} />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>Targets</h2>
            <p className={styles.subhead}>
              "Suggested" is the historical monthly average across every month with data -- a statistic, not a
              guess. It only becomes a target when you click "Use suggested."
            </p>
            <SpendingTable rows={rows} monthProgressPct={monthProgressPct} />
          </section>
        </>
      )}
    </div>
  );
}
