'use client';

import { useEffect, useState, useTransition } from 'react';
import { createRule, deleteRule, previewPattern, updateRule, type RuleInput } from '@/app/budget/(app)/rules/actions';
import type { RulePatternPreview } from '@/lib/budget/queries';
import styles from './RuleEditor.module.css';

function usePatternPreview(matchType: RuleInput['matchType'], pattern: string): RulePatternPreview | null {
  const [preview, setPreview] = useState<RulePatternPreview | null>(null);

  useEffect(() => {
    const trimmed = pattern.trim();
    if (!trimmed) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(() => {
      previewPattern(matchType, trimmed).then(setPreview);
    }, 350);
    return () => clearTimeout(timer);
  }, [matchType, pattern]);

  return preview;
}

function PatternPreviewText({ preview }: { preview: RulePatternPreview | null }) {
  if (!preview) return null;
  return (
    <p className={[styles.preview, preview.broad ? styles.previewWarning : ''].join(' ')}>
      Matches {preview.matchCount} of {preview.totalTransactionCount} transactions
      {preview.distinctCategories.length > 0 ? ` across: ${preview.distinctCategories.join(', ')}` : ''}
    </p>
  );
}

export interface RuleDTO {
  id: number;
  category: string;
  matchType: 'keyword' | 'regex';
  pattern: string;
  priority: number;
  createdBy: string;
  notes: string | null;
}

const EMPTY_FORM: RuleInput = { category: '', matchType: 'keyword', pattern: '', priority: 500, notes: '' };

export default function RuleEditor({ rules }: { rules: RuleDTO[] }) {
  const [items, setItems] = useState(rules);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newRule, setNewRule] = useState<RuleInput>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();
  const newRulePreview = usePatternPreview(newRule.matchType, newRule.pattern);

  const handleCreate = () => {
    if (!newRule.category.trim() || !newRule.pattern.trim()) return;
    startTransition(async () => {
      await createRule(newRule);
      setItems((prev) =>
        [...prev, { id: Date.now(), createdBy: 'carson', ...newRule, notes: newRule.notes || null }].sort(
          (a, b) => a.priority - b.priority,
        ),
      );
      setNewRule(EMPTY_FORM);
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteRule(id);
      setItems((prev) => prev.filter((rule) => rule.id !== id));
    });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.addForm}>
        <input
          className={styles.input}
          placeholder="Category"
          value={newRule.category}
          onChange={(event) => setNewRule({ ...newRule, category: event.target.value })}
        />
        <select
          className={styles.select}
          value={newRule.matchType}
          onChange={(event) => setNewRule({ ...newRule, matchType: event.target.value as RuleInput['matchType'] })}
        >
          <option value="keyword">keyword</option>
          <option value="regex">regex</option>
        </select>
        <div className={styles.patternGroup}>
          <input
            className={styles.input}
            placeholder="Pattern"
            value={newRule.pattern}
            onChange={(event) => setNewRule({ ...newRule, pattern: event.target.value })}
          />
          <PatternPreviewText preview={newRulePreview} />
        </div>
        <input
          className={styles.priorityInput}
          type="number"
          value={newRule.priority}
          onChange={(event) => setNewRule({ ...newRule, priority: Number(event.target.value) })}
        />
        <button
          className={newRulePreview?.broad ? styles.warnButton : styles.addButton}
          type="button"
          disabled={isPending || !newRule.category.trim() || !newRule.pattern.trim()}
          onClick={handleCreate}
        >
          {newRulePreview?.broad ? 'Add anyway ⚠' : 'Add rule'}
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Priority</th>
              <th>Category</th>
              <th>Type</th>
              <th>Pattern</th>
              <th>Source</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((rule) =>
              editingId === rule.id ? (
                <RuleEditRow
                  key={rule.id}
                  rule={rule}
                  isPending={isPending}
                  onCancel={() => setEditingId(null)}
                  onSave={(input) => {
                    startTransition(async () => {
                      await updateRule(rule.id, input);
                      setItems((prev) => prev.map((r) => (r.id === rule.id ? { ...r, ...input } : r)));
                      setEditingId(null);
                    });
                  }}
                />
              ) : (
                <tr key={rule.id}>
                  <td>{rule.priority}</td>
                  <td>{rule.category}</td>
                  <td className={styles.mono}>{rule.matchType}</td>
                  <td className={styles.mono}>{rule.pattern}</td>
                  <td className={styles.mono}>{rule.createdBy}</td>
                  <td className={styles.rowActions}>
                    <button className={styles.linkButton} type="button" onClick={() => setEditingId(rule.id)}>
                      Edit
                    </button>
                    <button
                      className={styles.linkButton}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(rule.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RuleEditRow({
  rule,
  isPending,
  onSave,
  onCancel,
}: {
  rule: RuleDTO;
  isPending: boolean;
  onSave: (input: RuleInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<RuleInput>({
    category: rule.category,
    matchType: rule.matchType,
    pattern: rule.pattern,
    priority: rule.priority,
    notes: rule.notes ?? '',
  });
  const preview = usePatternPreview(form.matchType, form.pattern);

  return (
    <tr>
      <td>
        <input
          className={styles.priorityInput}
          type="number"
          value={form.priority}
          onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })}
        />
      </td>
      <td>
        <input className={styles.input} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
      </td>
      <td>
        <select
          className={styles.select}
          value={form.matchType}
          onChange={(event) => setForm({ ...form, matchType: event.target.value as RuleInput['matchType'] })}
        >
          <option value="keyword">keyword</option>
          <option value="regex">regex</option>
        </select>
      </td>
      <td>
        <div className={styles.patternGroup}>
          <input className={styles.input} value={form.pattern} onChange={(event) => setForm({ ...form, pattern: event.target.value })} />
          <PatternPreviewText preview={preview} />
        </div>
      </td>
      <td className={styles.mono}>{rule.createdBy}</td>
      <td className={styles.rowActions}>
        <button className={styles.linkButton} type="button" disabled={isPending} onClick={() => onSave(form)}>
          Save
        </button>
        <button className={styles.linkButton} type="button" onClick={onCancel}>
          Cancel
        </button>
      </td>
    </tr>
  );
}
