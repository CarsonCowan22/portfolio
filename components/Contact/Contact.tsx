import Fade from '@/components/ui/Fade';
import styles from './Contact.module.css';

type Detail = {
  label: string;
  value: string;
  href?: string;
};

const details: readonly Detail[] = [
  { label: 'Location', value: 'Vista, CA' },
  { label: 'Phone', value: '760-705-5317', href: 'tel:+17607055317' },
  { label: 'GitHub', value: 'github.com/CarsonCowan22', href: 'https://github.com/CarsonCowan22' },
  { label: 'LinkedIn', value: 'linkedin.com/in/carson-cowan', href: 'https://www.linkedin.com/in/carson-cowan/' },
] as const;

export default function Contact() {
  return (
    <section id="contact" className={styles.section} aria-labelledby="contact-heading">
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.inner}>
        <Fade>
          <h2 id="contact-heading" className={styles.heading}>
            Let&apos;s work together.
          </h2>
        </Fade>

        <div className={styles.grid}>
          <Fade delay={100}>
            <div className={styles.left}>
              <p className={styles.copy}>
                If the work needs someone who understands both operations and software, I can help. I build the systems that replace the handoff points.
              </p>

              <a className={styles.email} href="mailto:carsoncowan0222@gmail.com">
                carsoncowan0222@gmail.com
              </a>
            </div>
          </Fade>

          <div className={styles.right}>
            {details.map((detail, index) => (
              <Fade key={detail.label} delay={160 + index * 80}>
                <div className={styles.row}>
                  <p className={styles.label}>{detail.label}</p>
                  {detail.href ? (
                    <a className={styles.value} href={detail.href} target="_blank" rel="noopener noreferrer">
                      {detail.value}
                    </a>
                  ) : (
                    <p className={styles.value}>{detail.value}</p>
                  )}
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}