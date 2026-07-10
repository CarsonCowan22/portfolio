'use client';

import { useMemo, useState } from 'react';
import type { EvaluatedJob } from '@/lib/jobHuntData';
import styles from './JobsTable.module.css';

type SortKey = 'date_seen' | 'score' | 'company';

const STATUS_LABELS: Record<string, string> = {
  strong: 'Strong',
  apply_with_honesty: 'Apply w/ honesty',
  skip: 'Skip',
  blocked: 'Blocked',
};

function statusClassName(status: string): string {
  if (status === 'strong') return styles.statusStrong;
  if (status === 'apply_with_honesty') return styles.statusApplyWithHonesty;
  return '';
}

export default function JobsTable({ jobs }: { jobs: EvaluatedJob[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('date_seen');
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      if (!query) return true;
      return (
        job.company.toLowerCase().includes(query) ||
        job.title.toLowerCase().includes(query)
      );
    });
  }, [jobs, search, statusFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'score') {
        comparison = Number(a.score || 0) - Number(b.score || 0);
      } else {
        comparison = (a[sortKey] || '').localeCompare(b[sortKey] || '');
      }
      return sortDesc ? -comparison : comparison;
    });
    return copy;
  }, [filtered, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDesc((value) => !value);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  return (
    <section className={styles.section} aria-label="Evaluated jobs">
      <h2 className={styles.heading}>Evaluated jobs</h2>

      <div className={styles.controls}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search company or title…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className={styles.select}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="strong">Strong</option>
          <option value="apply_with_honesty">Apply with honesty</option>
          <option value="skip">Skip</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className={styles.empty}>No postings match this filter.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <button className={styles.sortButton} type="button" onClick={() => toggleSort('date_seen')}>
                    Date seen
                  </button>
                </th>
                <th>
                  <button className={styles.sortButton} type="button" onClick={() => toggleSort('company')}>
                    Company
                  </button>
                </th>
                <th>Title</th>
                <th>
                  <button className={styles.sortButton} type="button" onClick={() => toggleSort('score')}>
                    Score
                  </button>
                </th>
                <th>Status</th>
                <th>Applied</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((job) => (
                <tr key={job.url || `${job.company}-${job.title}-${job.date_seen}`}>
                  <td>{job.date_seen}</td>
                  <td>{job.company}</td>
                  <td>
                    {job.url ? (
                      <a className={styles.titleLink} href={job.url} target="_blank" rel="noreferrer">
                        {job.title}
                      </a>
                    ) : (
                      job.title
                    )}
                  </td>
                  <td>{job.score}</td>
                  <td>
                    <span className={[styles.status, statusClassName(job.status)].filter(Boolean).join(' ')}>
                      {STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </td>
                  <td>{job.applied?.toLowerCase() === 'y' ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
