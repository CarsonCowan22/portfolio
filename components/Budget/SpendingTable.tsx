'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptAllSuggestedTargets, deleteBudgetTarget, setBudgetTarget } from '@/app/budget/(app)/spending/actions';
import styles from './SpendingTable.module.css';

export interface SpendingRow {
  category: string;
  actual: string;
  target: string | null;
  suggestedMonthlyAverage: string;
}

/** Below this many categories with a target set, show the "set up your budget" banner. */
const MIN_TARGETS_BEFORE_HIDING_BANNER = 5;

type StatusLevel = 'none' | 'under' | 'near' | 'over';

function statusLevel(actual: number, target: number | null): StatusLevel {
  if (target === null || target <= 0) return 'none';
  const ratio = actual / target;
  if (ratio > 1) return 'over';
  if (ratio >= 0.85) return 'near';
  return 'under';
}

export default function SpendingTable({
  rows,
  monthProgressPct,
}: {
  rows: SpendingRow[];
  /** 0-100, only present when viewing the actual current calendar month -- meaningless for a
   * historical month browsed via the month nav. */
  monthProgressPct: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);

  const targetsSetCount = rows.filter((r) => r.target !== null).length;
  const hiddenRows = rows.filter((r) => r.actual === '0.00' && r.target === null);
  const visibleRows = showAll ? rows : rows.filter((r) => !(r.actual === '0.00' && r.target === null));

  // Server Actions here call revalidatePath(), which only marks the route stale -- since these
  // are invoked as plain functions (not a <form action>), we still have to ask the router to
  // refetch, same reasoning as everywhere else mutations happen outside a form in this app.
  const runAction = (action: () => Promise<void>) => {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  };

  return (
    <div className={styles.wrap}>
      {targetsSetCount < MIN_TARGETS_BEFORE_HIDING_BANNER ? (
        <div className={styles.banner}>
          <p className={styles.bannerText}>
            {rows.length - targetsSetCount} categor{rows.length - targetsSetCount === 1 ? 'y has' : 'ies have'} no
            target yet -- each already has a suggested monthly average below.
          </p>
          <button
            className={styles.bannerButton}
            type="button"
            disabled={isPending}
            onClick={() => runAction(() => acceptAllSuggestedTargets(rows))}
          >
            Accept all suggested
          </button>
        </div>
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Actual</th>
              <th>Target</th>
              <th>Progress</th>
              <th>Suggested (avg)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <SpendingTableRow
                key={row.category}
                row={row}
                isPending={isPending}
                monthProgressPct={monthProgressPct}
                onSave={(value) => runAction(() => setBudgetTarget(row.category, value))}
                onApplySuggested={() => runAction(() => setBudgetTarget(row.category, row.suggestedMonthlyAverage))}
                onClear={() => runAction(() => deleteBudgetTarget(row.category))}
              />
            ))}
          </tbody>
        </table>
      </div>

      {hiddenRows.length > 0 ? (
        <button className={styles.showAllButton} type="button" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Hide zero categories' : `Show all categories (${hiddenRows.length} hidden)`}
        </button>
      ) : null}
    </div>
  );
}

function SpendingTableRow({
  row,
  isPending,
  monthProgressPct,
  onSave,
  onApplySuggested,
  onClear,
}: {
  row: SpendingRow;
  isPending: boolean;
  monthProgressPct: number | null;
  onSave: (value: string) => void;
  onApplySuggested: () => void;
  onClear: () => void;
}) {
  const [targetInput, setTargetInput] = useState(row.target ?? '');

  // Resync when the server sends a new target for this category (e.g. "Accept all suggested"
  // set it from elsewhere) -- the input's own edits still win until the next server round trip.
  useEffect(() => {
    setTargetInput(row.target ?? '');
  }, [row.target]);

  const actualNum = Number(row.actual);
  const targetNum = row.target ? Number(row.target) : null;
  const diff = targetNum !== null ? actualNum - targetNum : null;
  const level = statusLevel(actualNum, targetNum);
  const progressPct = targetNum && targetNum > 0 ? Math.min((actualNum / targetNum) * 100, 100) : 0;

  const handleSave = () => {
    const trimmed = targetInput.trim();
    if (!trimmed || Number.isNaN(Number(trimmed))) return;
    onSave(trimmed);
  };

  return (
    <tr>
      <td>{row.category}</td>
      <td className={styles.mono}>${row.actual}</td>
      <td>
        <input
          className={styles.targetInput}
          value={targetInput}
          onChange={(event) => setTargetInput(event.target.value)}
          placeholder="Set target…"
        />
      </td>
      <td>
        {level === 'none' ? (
          <span className={styles.noTarget}>No target</span>
        ) : (
          <div className={styles.progressCell}>
            <div className={styles.progressTrack}>
              <div
                className={[styles.progressBar, styles[`progress_${level}` as const]].join(' ')}
                style={{ width: `${Math.max(progressPct, 2)}%` }}
              />
            </div>
            <span className={level === 'over' ? styles.over : styles.under}>
              {diff !== null && diff > 0 ? `$${diff.toFixed(2)} over` : `$${Math.abs(diff ?? 0).toFixed(2)} under`}
            </span>
            {monthProgressPct !== null ? (
              <span className={styles.pace}>
                {monthProgressPct}% through the month, {Math.round(progressPct)}% of budget used
              </span>
            ) : null}
          </div>
        )}
      </td>
      <td className={styles.mono}>${row.suggestedMonthlyAverage}</td>
      <td className={styles.actions}>
        <button className={styles.button} type="button" disabled={isPending} onClick={handleSave}>
          Save
        </button>
        <button className={styles.button} type="button" disabled={isPending} onClick={onApplySuggested}>
          Use suggested
        </button>
        {row.target ? (
          <button className={styles.button} type="button" disabled={isPending} onClick={onClear}>
            Clear
          </button>
        ) : null}
      </td>
    </tr>
  );
}
