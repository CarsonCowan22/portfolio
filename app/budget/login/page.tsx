import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Private',
  robots: { index: false, follow: false },
};

export default function BudgetLoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  // Accepts any same-origin relative path (the subdomain rewrite means the post-login "next"
  // path can be a clean path like "/review", not just "/budget/review") -- rejects protocol-
  // relative "//host" values to avoid an open redirect.
  const next =
    searchParams.next && searchParams.next.startsWith('/') && !searchParams.next.startsWith('//')
      ? searchParams.next
      : '/budget';

  return (
    <main className={styles.main}>
      <form className={styles.form} action="/api/budget/login" method="post">
        <p className={styles.eyebrow}>Private</p>
        <h1 className={styles.heading}>Budget</h1>

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
