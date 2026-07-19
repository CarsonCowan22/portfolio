import styles from './CategoryBarChart.module.css';

export interface CategoryBarChartItem {
  category: string;
  actual: string;
}

export default function CategoryBarChart({ items }: { items: CategoryBarChartItem[] }) {
  const max = Math.max(...items.map((item) => Number(item.actual)), 1);

  return (
    <div className={styles.chart}>
      {items.map((item) => (
        <div key={item.category} className={styles.row}>
          <span className={styles.label}>{item.category}</span>
          <div className={styles.barTrack}>
            <div className={styles.bar} style={{ width: `${Math.max((Number(item.actual) / max) * 100, 1)}%` }} />
          </div>
          <span className={styles.value}>${item.actual}</span>
        </div>
      ))}
    </div>
  );
}
