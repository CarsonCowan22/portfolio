import { getDebtPayments, getDebts } from '@/lib/budget/queries';
import { toDateString } from '@/lib/budget/format';
import DebtEditor from '@/components/Budget/DebtEditor';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Debts' };

export default async function DebtsPage() {
  const [debts, payments] = await Promise.all([getDebts(), getDebtPayments()]);

  const debtDTOs = debts.map((debt) => ({
    id: debt.id,
    creditor: debt.creditor,
    balance: debt.balance,
    monthlyPayment: debt.monthlyPayment,
    status: debt.status,
    notes: debt.notes,
  }));

  const paymentDTOs = payments.map((payment) => ({
    id: payment.id,
    debtId: payment.debt.id,
    creditor: payment.debt.creditor,
    dueDate: toDateString(payment.dueDate),
    amount: payment.amount,
    paid: payment.paid,
  }));

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Private</p>
        <h1 className={styles.heading}>Debts</h1>
        <p className={styles.subhead}>
          Every creditor and settlement/payment plan outside day-to-day cash flow, so overlapping plans don't get
          missed.
        </p>
      </div>

      <DebtEditor debts={debtDTOs} payments={paymentDTOs} />
    </div>
  );
}
