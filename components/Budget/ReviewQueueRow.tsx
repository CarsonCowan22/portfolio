'use client';

import { useState, useTransition } from 'react';
import { categorizeTransaction } from '@/app/budget/(app)/review/actions';
import type { ReviewTransaction } from './ReviewQueue';
import CategoryBadge from './CategoryBadge';
import styles from './ReviewQueueRow.module.css';

function suggestPattern(descriptionClean: string): string {
  return descriptionClean.trim().split(/\s+/).slice(0, 2).join(' ').toUpperCase();
}

export default function ReviewQueueRow({
  transaction,
  selected,
  onToggleSelected,
  onCategorized,
  onFlag,
}: {
  transaction: ReviewTransaction;
  selected: boolean;
  onToggleSelected: () => void;
  onCategorized: () => void;
  onFlag: (flagged: boolean) => void;
}) {
  const [category, setCategory] = useState(transaction.suggestedCategory ?? '');
  const [createRule, setCreateRule] = useState(true);
  const [pattern, setPattern] = useState(suggestPattern(transaction.descriptionClean));
  const [flagged, setFlagged] = useState(transaction.flaggedForFollowUp);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) return;
    startTransition(async () => {
      await categorizeTransaction({
        id: transaction.id,
        category: trimmedCategory,
        createRule: createRule && pattern.trim() ? { pattern: pattern.trim(), matchType: 'keyword', priority: 500 } : undefined,
      });
      onCategorized();
    });
  };

  const toggleFlag = () => {
    const next = !flagged;
    setFlagged(next);
    onFlag(next);
  };

  return (
    <div className={styles.row}>
      <input
        className={styles.checkbox}
        type="checkbox"
        checked={selected}
        onChange={onToggleSelected}
        aria-label="Select for bulk categorize"
      />

      <div className={styles.info}>
        <p className={styles.description}>{transaction.descriptionClean}</p>
        <p className={styles.meta}>
          {transaction.date} · {transaction.account} · ${transaction.amount}
        </p>
        {transaction.suggestedCategory ? (
          <CategoryBadge category={null} suggestedCategory={transaction.suggestedCategory} needsReview={false} />
        ) : null}
      </div>

      <div className={styles.actions}>
        <input
          className={styles.categoryInput}
          list="known-categories"
          placeholder="Category…"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
        <label className={styles.ruleCheckbox}>
          <input type="checkbox" checked={createRule} onChange={(event) => setCreateRule(event.target.checked)} />
          Always categorize matches of
        </label>
        {createRule ? (
          <input
            className={styles.patternInput}
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder="matching text…"
          />
        ) : null}
        <button
          className={styles.saveButton}
          type="button"
          disabled={isPending || !category.trim()}
          onClick={handleSave}
        >
          Save
        </button>
        <button className={styles.flagButton} type="button" onClick={toggleFlag} aria-pressed={flagged}>
          {flagged ? 'Flagged' : 'Flag'}
        </button>
      </div>
    </div>
  );
}
