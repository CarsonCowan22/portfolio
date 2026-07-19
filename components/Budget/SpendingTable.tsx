'use client';

import { useState, useTransition } from 'react';
import { deleteBudgetTarget, setBudgetTarget } from '@/app/budget/(app)/spending/actions';
import styles from './SpendingTable.module.css';

export interface SpendingRow {
  category: string;
  actual: string;
  target: string | null;
  suggestedMonthlyAverage: string;
}

export default function SpendingTable({ rows }: { rows: SpendingRow[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Category</th>
            <th>Actual</th>
            <th>Target</th>
            <th>Status</th>
            <th>Suggested (avg)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <SpendingTableRow key={row.category} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpendingTableRow({ row }: { row: SpendingRow }) {
  const [targetInput, setTargetInput] = useState(row.target ?? '');
  const [currentTarget, setCurrentTarget] = useState(row.target);
  const [isPending, startTransition] = useTransition();

  const actualNum = Number(row.actual);
  const targetNum = currentTarget ? Number(currentTarget) : null;
  const diff = targetNum !== null ? actualNum - targetNum : null;

  const handleSave = () => {
    const trimmed = targetInput.trim();
    if (!trimmed || Number.isNaN(Number(trimmed))) return;
    startTransition(async () => {
      await setBudgetTarget(row.category, trimmed);
      setCurrentTarget(trimmed);
    });
  };

  const handleApplySuggested = () => {
    setTargetInput(row.suggestedMonthlyAverage);
    startTransition(async () => {
      await setBudgetTarget(row.category, row.suggestedMonthlyAverage);
      setCurrentTarget(row.suggestedMonthlyAverage);
    });
  };

  const handleClear = () => {
    setTargetInput('');
    startTransition(async () => {
      await deleteBudgetTarget(row.category);
      setCurrentTarget(null);
    });
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
        {diff === null ? (
          <span className={styles.noTarget}>No target</span>
        ) : diff > 0 ? (
          <span className={styles.over}>${diff.toFixed(2)} over</span>
        ) : (
          <span className={styles.under}>${Math.abs(diff).toFixed(2)} under</span>
        )}
      </td>
      <td className={styles.mono}>${row.suggestedMonthlyAverage}</td>
      <td className={styles.actions}>
        <button className={styles.button} type="button" disabled={isPending} onClick={handleSave}>
          Save
        </button>
        <button className={styles.button} type="button" disabled={isPending} onClick={handleApplySuggested}>
          Use suggested
        </button>
        {currentTarget ? (
          <button className={styles.button} type="button" disabled={isPending} onClick={handleClear}>
            Clear
          </button>
        ) : null}
      </td>
    </tr>
  );
}
