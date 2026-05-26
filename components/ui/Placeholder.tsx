import styles from './Placeholder.module.css';

type PlaceholderProps = {
  description: string;
  dimensions: string;
  filePath: string;
};

export default function Placeholder({ description, dimensions, filePath }: PlaceholderProps) {
  return (
    <div className={styles.placeholder} role="img" aria-label={`Placeholder for ${description}`}>
      <span className={styles.label}>[ PLACEHOLDER — {description} — {dimensions} ]</span>
      <span className={styles.meta}>Replace with /public/images/{filePath}</span>
      <span className={styles.meta}>Use a Next.js Image component when the real asset is ready.</span>
    </div>
  );
}