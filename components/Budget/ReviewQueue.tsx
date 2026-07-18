'use client';

import { useState, useTransition } from 'react';
import { bulkCategorize, setFlaggedForFollowUp } from '@/app/budget/(app)/review/actions';
import ReviewQueueRow from './ReviewQueueRow';
import styles from './ReviewQueue.module.css';

export interface ReviewTransaction {
  id: string;
  date: string;
  account: string;
  descriptionRaw: string;
  descriptionClean: string;
  amount: string;
  suggestedCategory: string | null;
  suggestedBy: string | null;
  flaggedForFollowUp: boolean;
}

export default function ReviewQueue({
  transactions,
  knownCategories,
}: {
  transactions: ReviewTransaction[];
  knownCategories: string[];
}) {
  const [items, setItems] = useState(transactions);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [isPending, startTransition] = useTransition();

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCategorized = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBulkApply = () => {
    const category = bulkCategory.trim();
    if (!category || selected.size === 0) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkCategorize(ids, category);
      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
      setSelected(new Set());
      setBulkCategory('');
    });
  };

  return (
    <div className={styles.wrap}>
      <datalist id="known-categories">
        {knownCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      {selected.size > 0 ? (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>{selected.size} selected</span>
          <input
            className={styles.bulkInput}
            list="known-categories"
            placeholder="Categorize selected as…"
            value={bulkCategory}
            onChange={(event) => setBulkCategory(event.target.value)}
          />
          <button className={styles.bulkButton} type="button" disabled={isPending} onClick={handleBulkApply}>
            Apply to {selected.size}
          </button>
        </div>
      ) : null}

      <div className={styles.list}>
        {items.map((item) => (
          <ReviewQueueRow
            key={item.id}
            transaction={item}
            selected={selected.has(item.id)}
            onToggleSelected={() => toggleSelected(item.id)}
            onCategorized={() => handleCategorized(item.id)}
            onFlag={(flagged) => startTransition(() => setFlaggedForFollowUp(item.id, flagged))}
          />
        ))}
      </div>
    </div>
  );
}
