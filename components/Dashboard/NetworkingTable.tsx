import type { NetworkingContact } from '@/lib/jobHuntData';
import styles from './NetworkingTable.module.css';

function isOverdue(contact: NetworkingContact, today: string): boolean {
  return Boolean(contact.follow_up_due) && contact.follow_up_due <= today;
}

export default function NetworkingTable({ contacts }: { contacts: NetworkingContact[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = [...contacts].sort((a, b) => {
    const aOverdue = isOverdue(a, today);
    const bOverdue = isOverdue(b, today);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    return (a.follow_up_due || '').localeCompare(b.follow_up_due || '');
  });

  return (
    <section className={styles.section} aria-label="Networking tracker">
      <h2 className={styles.heading}>Networking</h2>

      {rows.length === 0 ? (
        <p className={styles.empty}>No contacts logged yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Company</th>
                <th>Channel</th>
                <th>Message sent</th>
                <th>Follow-up due</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((contact, index) => {
                const overdue = isOverdue(contact, today);
                return (
                  <tr key={`${contact.contact}-${index}`} className={overdue ? styles.overdue : ''}>
                    <td>{contact.contact}</td>
                    <td>{contact.company}</td>
                    <td>{contact.channel}</td>
                    <td>{contact.date}</td>
                    <td>
                      {contact.follow_up_due}
                      {overdue ? <span className={styles.overdueLabel}>Overdue</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
