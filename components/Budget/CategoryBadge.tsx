import styles from './CategoryBadge.module.css';

/**
 * Confirmed categories (rule match or human choice) and AI-suggested-but-unconfirmed categories
 * must never look the same -- this is the one place that distinction is enforced in the UI.
 */
export default function CategoryBadge({
  category,
  suggestedCategory,
  needsReview,
}: {
  category: string | null;
  suggestedCategory: string | null;
  needsReview: boolean;
}) {
  if (category) {
    return <span className={styles.confirmed}>{category}</span>;
  }
  if (suggestedCategory) {
    return <span className={styles.suggested}>{suggestedCategory} · AI suggested, unconfirmed</span>;
  }
  if (needsReview) {
    return <span className={styles.needsReview}>Needs review</span>;
  }
  return <span className={styles.confirmed}>Uncategorized</span>;
}
