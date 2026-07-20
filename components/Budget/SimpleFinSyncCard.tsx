'use client';

import { useState, useTransition } from 'react';
import { syncSimpleFinNow } from '@/app/budget/(app)/actions';
import styles from './SimpleFinSyncCard.module.css';

export interface SimpleFinAccountFreshness {
  account: string;
  latestDate: string | null;
}

export default function SimpleFinSyncCard({
  configured,
  accounts,
}: {
  configured: boolean;
  accounts: SimpleFinAccountFreshness[];
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!configured) {
    return (
      <section className={styles.card}>
        <h2 className={styles.heading}>Live sync</h2>
        <p className={styles.empty}>
          Not connected. Run <code>pnpm budget:simplefin:setup</code> to link SimpleFIN, then set
          SIMPLEFIN_ACCESS_URL and SIMPLEFIN_ACCOUNT_MAP.
        </p>
      </section>
    );
  }

  const handleSync = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await syncSimpleFinNow();
        const pulled = result.accounts.reduce((sum, a) => sum + a.upserted, 0);
        setMessage(
          `Pulled ${pulled} new transaction${pulled === 1 ? '' : 's'} across ${result.accounts.length} account${
            result.accounts.length === 1 ? '' : 's'
          }.${
            result.skippedUnmappedAccountIds.length > 0
              ? ` ${result.skippedUnmappedAccountIds.length} linked account(s) aren't in SIMPLEFIN_ACCOUNT_MAP: ${result.skippedUnmappedAccountIds.join(', ')}.`
              : ''
          }`,
        );
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Live sync</h2>
        <button className={styles.button} type="button" disabled={isPending} onClick={handleSync}>
          {isPending ? 'Syncing…' : 'Sync now'}
        </button>
      </div>
      <ul className={styles.accounts}>
        {accounts.map((account) => (
          <li key={account.account} className={styles.accountRow}>
            <span>{account.account}</span>
            <span className={styles.mono}>{account.latestDate ? `through ${account.latestDate}` : 'no data yet'}</span>
          </li>
        ))}
      </ul>
      {message ? <p className={styles.message}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </section>
  );
}
