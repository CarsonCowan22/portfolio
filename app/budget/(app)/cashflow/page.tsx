import { getMonthlyCashFlow } from '@/lib/budget/analytics';
import { formatSignedDollars } from '@/lib/budget/format';
import CashFlowChart from '@/components/Budget/CashFlowChart';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Cash Flow' };

function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function CashFlowPage() {
  const rows = await getMonthlyCashFlow();
  const totalIncome = rows.reduce((sum, row) => sum + Number(row.income), 0);
  const totalExpenses = rows.reduce((sum, row) => sum + Number(row.expenses), 0);
  const totalNet = totalIncome + totalExpenses;

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Private</p>
        <h1 className={styles.heading}>Cash Flow</h1>
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>No transactions yet.</p>
      ) : (
        <>
          <div className={styles.grid}>
            <div className={styles.tile}>
              <p className={[styles.tileValue, styles.tileAccent].join(' ')}>${totalIncome.toFixed(2)}</p>
              <p className={styles.tileLabel}>Total income</p>
            </div>
            <div className={styles.tile}>
              <p className={styles.tileValue}>${Math.abs(totalExpenses).toFixed(2)}</p>
              <p className={styles.tileLabel}>Total expenses</p>
            </div>
            <div className={styles.tile}>
              <p className={[styles.tileValue, totalNet >= 0 ? styles.tileAccent : ''].join(' ')}>
                {formatSignedDollars(totalNet.toFixed(2), true)}
              </p>
              <p className={styles.tileLabel}>Net</p>
            </div>
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>By month</h2>
            <p className={styles.subhead}>Excludes internal transfers between your own accounts.</p>
            <CashFlowChart items={rows} />
          </section>

          <section className={styles.section}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Income</th>
                    <th>Expenses</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((row) => (
                    <tr key={row.month}>
                      <td>{formatMonthLabel(row.month)}</td>
                      <td>{formatSignedDollars(row.income)}</td>
                      <td>{formatSignedDollars(row.expenses)}</td>
                      <td className={Number(row.net) >= 0 ? styles.positive : styles.negative}>
                        {formatSignedDollars(row.net, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
