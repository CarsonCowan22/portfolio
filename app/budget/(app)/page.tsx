import Link from 'next/link';
import { getNeedsReviewCount, getStatements } from '@/lib/budget/queries';
import ReconciliationCard from '@/components/Budget/ReconciliationCard';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Overview' };

const CAVEATS = [
  'Honda Financial account closes after auction -- the remaining balance becomes a deficiency negotiation, not an ongoing loan payment.',
  'Childcare (Brightwheel) ends 7/30/26. The real recurring rate is $735/month -- don’t let a blended historical average stand in for it.',
  'Apr-Jun 2026 Capital One activity is sparse because spending moved to other cards -- don’t read that as reduced spending.',
  '360 Checking and 360 Performance Savings are closed accounts -- excluded from every view/total here (see lib/budget/constants.ts), but their historical transactions are still in the database, untouched.',
];

export default async function BudgetOverviewPage() {
  const [statements, needsReviewCount] = await Promise.all([getStatements(), getNeedsReviewCount()]);

  const unreconciled = statements.filter((s) => !s.reconciled && !s.verifiedByHuman);

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Private</p>
        <h1 className={styles.heading}>Budget</h1>
      </div>

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

      {needsReviewCount > 0 ? (
        <Link className={styles.reviewCta} href="/budget/review">
          Review {needsReviewCount} uncategorized transaction{needsReviewCount === 1 ? '' : 's'} →
        </Link>
      ) : null}

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
  );
}
