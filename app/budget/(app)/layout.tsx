import Link from 'next/link';
import styles from './layout.module.css';

const NAV_LINKS = [
  { href: '/budget', label: 'Overview' },
  { href: '/budget/spending', label: 'Spending' },
  { href: '/budget/cashflow', label: 'Cash Flow' },
  { href: '/budget/debts', label: 'Debts' },
  { href: '/budget/review', label: 'Review' },
  { href: '/budget/rules', label: 'Rules' },
  { href: '/budget/transactions', label: 'Transactions' },
];

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} className={styles.navLink} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <form action="/api/budget/logout" method="post">
          <button className={styles.logout} type="submit">
            Log out
          </button>
        </form>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
