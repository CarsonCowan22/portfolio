'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addPayment,
  createDebt,
  deleteDebt,
  deletePayment,
  markPaymentPaid,
  updateDebt,
  type DebtInput,
} from '@/app/budget/(app)/debts/actions';
import styles from './DebtEditor.module.css';

export interface DebtDTO {
  id: number;
  creditor: string;
  balance: string | null;
  monthlyPayment: string | null;
  status: string;
  notes: string | null;
}

export interface PaymentDTO {
  id: number;
  debtId: number;
  creditor: string;
  dueDate: string;
  amount: string;
  paid: boolean;
}

const EMPTY_DEBT: DebtInput = { creditor: '', balance: null, monthlyPayment: null, status: '', notes: null };

function daysUntil(dueDate: string): number {
  const due = new Date(`${dueDate}T00:00:00Z`).getTime();
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due - today) / 86_400_000);
}

export default function DebtEditor({ debts, payments }: { debts: DebtDTO[]; payments: PaymentDTO[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newDebt, setNewDebt] = useState<DebtInput>(EMPTY_DEBT);
  const [newPayment, setNewPayment] = useState({ debtId: debts[0]?.id ?? 0, dueDate: '', amount: '' });

  // Same reasoning as SpendingTable -- these Server Actions revalidatePath() but don't
  // themselves force this client component to refetch, so ask the router explicitly.
  const run = (action: () => Promise<void>) => {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  };

  const unpaidPayments = payments.filter((p) => !p.paid);

  return (
    <div className={styles.wrap}>
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Upcoming payments</h2>
        {unpaidPayments.length === 0 ? (
          <p className={styles.empty}>No upcoming payments scheduled.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Due</th>
                  <th>Creditor</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {unpaidPayments.map((payment) => {
                  const days = daysUntil(payment.dueDate);
                  const dueClass = days < 0 ? styles.overdue : days <= 14 ? styles.soon : undefined;
                  return (
                    <tr key={payment.id}>
                      <td className={dueClass}>
                        {payment.dueDate}
                        {days < 0 ? ' (overdue)' : days <= 14 ? ` (${days}d)` : ''}
                      </td>
                      <td>{payment.creditor}</td>
                      <td className={styles.mono}>${payment.amount}</td>
                      <td className={styles.rowActions}>
                        <button
                          className={styles.linkButton}
                          type="button"
                          disabled={isPending}
                          onClick={() => run(() => markPaymentPaid(payment.id, true))}
                        >
                          Mark paid
                        </button>
                        <button
                          className={styles.linkButton}
                          type="button"
                          disabled={isPending}
                          onClick={() => run(() => deletePayment(payment.id))}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {debts.length > 0 ? (
          <div className={styles.addForm}>
            <select
              className={styles.select}
              value={newPayment.debtId}
              onChange={(event) => setNewPayment({ ...newPayment, debtId: Number(event.target.value) })}
            >
              {debts.map((debt) => (
                <option key={debt.id} value={debt.id}>
                  {debt.creditor}
                </option>
              ))}
            </select>
            <input
              className={styles.input}
              type="date"
              value={newPayment.dueDate}
              onChange={(event) => setNewPayment({ ...newPayment, dueDate: event.target.value })}
            />
            <input
              className={styles.input}
              placeholder="Amount"
              value={newPayment.amount}
              onChange={(event) => setNewPayment({ ...newPayment, amount: event.target.value })}
            />
            <button
              className={styles.addButton}
              type="button"
              disabled={isPending || !newPayment.dueDate || !newPayment.amount.trim()}
              onClick={() => {
                const { debtId, dueDate, amount } = newPayment;
                run(() => addPayment(debtId, dueDate, amount.trim()));
                setNewPayment({ debtId, dueDate: '', amount: '' });
              }}
            >
              Add payment
            </button>
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Creditors</h2>
        <div className={styles.addForm}>
          <input
            className={styles.input}
            placeholder="Creditor"
            value={newDebt.creditor}
            onChange={(event) => setNewDebt({ ...newDebt, creditor: event.target.value })}
          />
          <input
            className={styles.input}
            placeholder="Balance"
            value={newDebt.balance ?? ''}
            onChange={(event) => setNewDebt({ ...newDebt, balance: event.target.value || null })}
          />
          <input
            className={styles.input}
            placeholder="Monthly payment"
            value={newDebt.monthlyPayment ?? ''}
            onChange={(event) => setNewDebt({ ...newDebt, monthlyPayment: event.target.value || null })}
          />
          <input
            className={styles.input}
            placeholder="Status"
            value={newDebt.status}
            onChange={(event) => setNewDebt({ ...newDebt, status: event.target.value })}
          />
          <input
            className={styles.input}
            placeholder="Notes"
            value={newDebt.notes ?? ''}
            onChange={(event) => setNewDebt({ ...newDebt, notes: event.target.value || null })}
          />
          <button
            className={styles.addButton}
            type="button"
            disabled={isPending || !newDebt.creditor.trim() || !newDebt.status.trim()}
            onClick={() => {
              run(() => createDebt(newDebt));
              setNewDebt(EMPTY_DEBT);
            }}
          >
            Add creditor
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Creditor</th>
                <th>Balance</th>
                <th>Monthly</th>
                <th>Status</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {debts.map((debt) =>
                editingId === debt.id ? (
                  <DebtEditRow
                    key={debt.id}
                    debt={debt}
                    isPending={isPending}
                    onCancel={() => setEditingId(null)}
                    onSave={(input) => {
                      run(() => updateDebt(debt.id, input));
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <tr key={debt.id}>
                    <td>{debt.creditor}</td>
                    <td className={styles.mono}>{debt.balance ? `$${debt.balance}` : '—'}</td>
                    <td className={styles.mono}>{debt.monthlyPayment ? `$${debt.monthlyPayment}` : '—'}</td>
                    <td>{debt.status}</td>
                    <td className={styles.notes}>{debt.notes ?? ''}</td>
                    <td className={styles.rowActions}>
                      <button className={styles.linkButton} type="button" onClick={() => setEditingId(debt.id)}>
                        Edit
                      </button>
                      <button
                        className={styles.linkButton}
                        type="button"
                        disabled={isPending}
                        onClick={() => run(() => deleteDebt(debt.id))}
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
      </section>
    </div>
  );
}

function DebtEditRow({
  debt,
  isPending,
  onSave,
  onCancel,
}: {
  debt: DebtDTO;
  isPending: boolean;
  onSave: (input: DebtInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<DebtInput>({
    creditor: debt.creditor,
    balance: debt.balance,
    monthlyPayment: debt.monthlyPayment,
    status: debt.status,
    notes: debt.notes,
  });

  return (
    <tr>
      <td>
        <input className={styles.input} value={form.creditor} onChange={(event) => setForm({ ...form, creditor: event.target.value })} />
      </td>
      <td>
        <input
          className={styles.input}
          value={form.balance ?? ''}
          onChange={(event) => setForm({ ...form, balance: event.target.value || null })}
        />
      </td>
      <td>
        <input
          className={styles.input}
          value={form.monthlyPayment ?? ''}
          onChange={(event) => setForm({ ...form, monthlyPayment: event.target.value || null })}
        />
      </td>
      <td>
        <input className={styles.input} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} />
      </td>
      <td>
        <input
          className={styles.input}
          value={form.notes ?? ''}
          onChange={(event) => setForm({ ...form, notes: event.target.value || null })}
        />
      </td>
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
