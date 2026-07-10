import type { FunnelSummary as FunnelSummaryData } from '@/lib/jobHuntData';
import styles from './FunnelSummary.module.css';

export default function FunnelSummary({ funnel }: { funnel: FunnelSummaryData }) {
  const tiles = [
    { label: 'Postings seen', value: funnel.seen },
    { label: 'Scored strong', value: funnel.strong, accent: true },
    { label: 'Apply with honesty', value: funnel.applyWithHonesty },
    { label: 'Applied', value: funnel.applied },
  ];

  return (
    <section className={styles.section} aria-label="Funnel summary">
      <div className={styles.grid}>
        {tiles.map((tile) => (
          <div className={styles.tile} key={tile.label}>
            <p className={[styles.value, tile.accent ? styles.accent : ''].filter(Boolean).join(' ')}>
              {tile.value}
            </p>
            <p className={styles.label}>{tile.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
