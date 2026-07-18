import { getDistinctCategories, getNeedsReviewTransactions } from '@/lib/budget/queries';
import { toDateString } from '@/lib/budget/format';
import ReviewQueue, { type ReviewTransaction } from '@/components/Budget/ReviewQueue';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Review' };

export default async function ReviewPage() {
  const [transactions, categories] = await Promise.all([getNeedsReviewTransactions(), getDistinctCategories()]);

  // Entity instances aren't plain objects, so they can't cross the server/client boundary as
  // props -- map to a plain DTO first.
  const items: ReviewTransaction[] = transactions.map((t) => ({
    id: t.id,
    date: toDateString(t.date),
    account: t.account,
    descriptionRaw: t.descriptionRaw,
    descriptionClean: t.descriptionClean,
    amount: t.amount,
    suggestedCategory: t.suggestedCategory,
    suggestedBy: t.suggestedBy,
    flaggedForFollowUp: t.flaggedForFollowUp,
  }));

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Private</p>
        <h1 className={styles.heading}>Review queue</h1>
        <p className={styles.subhead}>
          {items.length} transaction{items.length === 1 ? '' : 's'} with no rule match. Categorizing here is a
          human decision -- it's never inferred silently.
        </p>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>Nothing to review. Every transaction matched a rule or was already confirmed.</p>
      ) : (
        <ReviewQueue transactions={items} knownCategories={categories} />
      )}
    </div>
  );
}
