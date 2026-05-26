import Placeholder from '@/components/ui/Placeholder';
import styles from './WorkCard.module.css';

type WorkCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: readonly string[];
  stack: readonly string[];
  placeholderDescription: string;
  placeholderDimensions: string;
  placeholderPath: string;
  reverse?: boolean;
};

export default function WorkCard({
  eyebrow,
  title,
  description,
  bullets,
  stack,
  placeholderDescription,
  placeholderDimensions,
  placeholderPath,
  reverse = false,
}: WorkCardProps) {
  return (
    <article className={[styles.card, reverse ? styles.reverse : ''].filter(Boolean).join(' ')}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>

        <ul className={styles.bullets}>
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        <div className={styles.tags} aria-label={`${title} technology stack`}>
          {stack.map((item) => (
            <span key={item} className={styles.tag}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.media}>
        <Placeholder
          description={placeholderDescription}
          dimensions={placeholderDimensions}
          filePath={placeholderPath}
        />
      </div>
    </article>
  );
}