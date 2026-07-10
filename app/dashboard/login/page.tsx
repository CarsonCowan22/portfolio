import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Private',
  robots: { index: false, follow: false },
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  const next = searchParams.next && searchParams.next.startsWith('/dashboard') ? searchParams.next : '/dashboard/job-hunt';

  return (
    <main className={styles.main}>
      <form className={styles.form} action="/api/dashboard/login" method="post">
        <p className={styles.eyebrow}>Private</p>
        <h1 className={styles.heading}>Job Hunt Dashboard</h1>

        <input type="hidden" name="next" value={next} />

        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          className={styles.input}
          id="password"
          name="password"
          type="password"
          autoFocus
          required
        />

        {searchParams.error ? <p className={styles.error}>Wrong password.</p> : null}

        <button className={styles.button} type="submit">
          Enter
        </button>
      </form>
    </main>
  );
}
