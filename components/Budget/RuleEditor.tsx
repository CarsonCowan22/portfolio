'use client';

import { useState, useTransition } from 'react';
import { createRule, deleteRule, updateRule, type RuleInput } from '@/app/budget/(app)/rules/actions';
import styles from './RuleEditor.module.css';

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
        <input
          className={styles.input}
          placeholder="Pattern"
          value={newRule.pattern}
          onChange={(event) => setNewRule({ ...newRule, pattern: event.target.value })}
        />
        <input
          className={styles.priorityInput}
          type="number"
          value={newRule.priority}
          onChange={(event) => setNewRule({ ...newRule, priority: Number(event.target.value) })}
        />
        <button
          className={styles.addButton}
          type="button"
          disabled={isPending || !newRule.category.trim() || !newRule.pattern.trim()}
          onClick={handleCreate}
        >
          Add rule
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
        <input className={styles.input} value={form.pattern} onChange={(event) => setForm({ ...form, pattern: event.target.value })} />
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
