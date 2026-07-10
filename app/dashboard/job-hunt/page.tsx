import type { Metadata } from 'next';
import {
  computeFunnel,
  getEvaluatedJobs,
  getLatestDigest,
  getNetworkingContacts,
} from '@/lib/jobHuntData';
import FunnelSummary from '@/components/Dashboard/FunnelSummary';
import JobsTable from '@/components/Dashboard/JobsTable';
import DigestView from '@/components/Dashboard/DigestView';
import NetworkingTable from '@/components/Dashboard/NetworkingTable';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Job Hunt Dashboard',
  robots: { index: false, follow: false },
};

export default async function JobHuntDashboardPage() {
  const [jobs, contacts, digest] = await Promise.all([
    getEvaluatedJobs(),
    getNetworkingContacts(),
    getLatestDigest(),
  ]);

  const funnel = computeFunnel(jobs);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Private</p>
          <h1 className={styles.heading}>Job Hunt Dashboard</h1>
        </div>
        <form action="/api/dashboard/logout" method="post">
          <button className={styles.logout} type="submit">
            Log out
          </button>
        </form>
      </div>

      <FunnelSummary funnel={funnel} />

      {digest ? <DigestView date={digest.date} content={digest.content} /> : null}

      <JobsTable jobs={jobs} />

      <NetworkingTable contacts={contacts} />
    </main>
  );
}
