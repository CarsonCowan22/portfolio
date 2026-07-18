import Link from 'next/link';
import type { Statement } from '@/lib/budget/entities/Statement';
import styles from './ReconciliationCard.module.css';

export default function ReconciliationCard({ statement }: { statement: Statement }) {
  return (
    <div className={styles.row}>
      <div>
        <p className={styles.account}>{statement.account}</p>
        <p className={styles.period}>
          {statement.periodStart} – {statement.periodEnd} · {statement.sourceFile}
        </p>
      </div>
      <div className={styles.status}>
        {statement.reconciled ? (
          <span className={styles.ok}>Reconciled</span>
        ) : (
          <span className={styles.bad}>Off by ${statement.reconciliationDiff ?? '?'}</span>
        )}
        {!statement.reconciled && !statement.verifiedByHuman ? (
          <span className={styles.blocked}>Blocked from totals</span>
        ) : null}
      </div>
      <Link
        className={styles.link}
        href={{ pathname: '/budget/transactions', query: { account: statement.account } }}
      >
        View transactions →
      </Link>
    </div>
  );
}
