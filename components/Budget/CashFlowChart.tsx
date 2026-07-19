import { formatSignedDollars } from '@/lib/budget/format';
import styles from './CashFlowChart.module.css';

export interface CashFlowChartItem {
  month: string;
  income: string;
  expenses: string;
  net: string;
}

function formatMonthShort(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

export default function CashFlowChart({ items }: { items: CashFlowChartItem[] }) {
  const max = Math.max(...items.map((item) => Math.abs(Number(item.income))), ...items.map((item) => Math.abs(Number(item.expenses))), 1);

  return (
    <div className={styles.chart}>
      {items.map((item) => (
        <div key={item.month} className={styles.row}>
          <span className={styles.label}>{formatMonthShort(item.month)}</span>
          <div className={styles.track}>
            <div
              className={styles.expenseBar}
              style={{ width: `${Math.min((Math.abs(Number(item.expenses)) / max) * 100, 100)}%` }}
            />
            <div className={styles.centerLine} />
            <div className={styles.incomeBar} style={{ width: `${Math.min((Number(item.income) / max) * 100, 100)}%` }} />
          </div>
          <span className={[styles.net, Number(item.net) >= 0 ? styles.netPositive : styles.netNegative].join(' ')}>
            {formatSignedDollars(item.net, true)}
          </span>
        </div>
      ))}
    </div>
  );
}
