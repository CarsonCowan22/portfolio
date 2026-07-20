'use client';

import { useEffect, useState, useTransition } from 'react';
import { categorizeTransaction, previewPattern } from '@/app/budget/(app)/review/actions';
import type { RulePatternPreview } from '@/lib/budget/queries';
import type { ReviewTransaction } from './ReviewQueue';
import CategoryBadge from './CategoryBadge';
import styles from './ReviewQueueRow.module.css';

/** Capital One transaction-type prefixes that precede the merchant on nearly every line --
 * stripped first so the suggested pattern is the merchant, not a prefix shared by unrelated
 * transactions across every category. */
const GENERIC_PREFIXES = [
  'digital card purchase -',
  'card purchase -',
  'withdrawal from',
  'deposit from',
  'instant transfer received from',
];

function suggestPattern(descriptionClean: string): string {
  const trimmed = descriptionClean.trim();
  const lower = trimmed.toLowerCase();
  const prefix = GENERIC_PREFIXES.find((p) => lower.startsWith(p));
  const merchantText = prefix ? trimmed.slice(prefix.length).trim() : trimmed;
  return merchantText.split(/\s+/).slice(0, 2).join(' ').toUpperCase();
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
  const [subcategory, setSubcategory] = useState('');
  const [createRule, setCreateRule] = useState(true);
  const [pattern, setPattern] = useState(suggestPattern(transaction.descriptionClean));
  const [flagged, setFlagged] = useState(transaction.flaggedForFollowUp);
  const [preview, setPreview] = useState<RulePatternPreview | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = pattern.trim();
    if (!createRule || !trimmed) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(() => {
      previewPattern('keyword', trimmed).then(setPreview);
    }, 350);
    return () => clearTimeout(timer);
  }, [createRule, pattern]);

  const handleSave = () => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) return;
    startTransition(async () => {
      await categorizeTransaction({
        id: transaction.id,
        category: trimmedCategory,
        subcategory: subcategory.trim() || undefined,
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
        <input
          className={styles.categoryInput}
          placeholder="Subcategory (optional)…"
          value={subcategory}
          onChange={(event) => setSubcategory(event.target.value)}
        />
        <label className={styles.ruleCheckbox}>
          <input type="checkbox" checked={createRule} onChange={(event) => setCreateRule(event.target.checked)} />
          Always categorize matches of
        </label>
        {createRule ? (
          <div className={styles.patternGroup}>
            <input
              className={styles.patternInput}
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              placeholder="matching text…"
            />
            {preview ? (
              <p className={[styles.preview, preview.broad ? styles.previewWarning : ''].join(' ')}>
                Matches {preview.matchCount} of {preview.totalTransactionCount} transactions
                {preview.distinctCategories.length > 0 ? ` across: ${preview.distinctCategories.join(', ')}` : ''}
              </p>
            ) : null}
          </div>
        ) : null}
        <button
          className={createRule && preview?.broad ? styles.warnButton : styles.saveButton}
          type="button"
          disabled={isPending || !category.trim()}
          onClick={handleSave}
        >
          {createRule && preview?.broad ? 'Add anyway ⚠' : 'Save'}
        </button>
        <button className={styles.flagButton} type="button" onClick={toggleFlag} aria-pressed={flagged}>
          {flagged ? 'Flagged' : 'Flag'}
        </button>
      </div>
    </div>
  );
}
