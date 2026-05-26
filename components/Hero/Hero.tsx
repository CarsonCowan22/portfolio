'use client';

import { useEffect, useState } from 'react';
import styles from './Hero.module.css';

const stats = [
  { value: '5+', label: 'years in solar + home improvement' },
  { value: '30', label: 'person CAD team built' },
  { value: '1', label: 'founding engineer seat at Privix' },
] as const;

export default function Hero() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <section className={styles.hero} aria-label="Intro">
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={[styles.kickerWrap, ready ? styles.visible : ''].join(' ')} style={{ transitionDelay: '80ms' }}>
          <span className={styles.kickerBar} aria-hidden="true" />
          <p className={styles.kicker}>Full Stack Software Engineer</p>
        </div>

        <h1 className={[styles.title, ready ? styles.visible : ''].join(' ')} style={{ transitionDelay: '180ms' }}>
          <span className={styles.titleLine}>Carson</span>
          <span className={[styles.titleLine, styles.ghost].join(' ')}>Cowan</span>
        </h1>

        <div className={[styles.ruleWrap, ready ? styles.visible : ''].join(' ')} style={{ transitionDelay: '320ms' }}>
          <div className={styles.rule} aria-hidden="true" />
        </div>

        <dl className={[styles.stats, ready ? styles.visible : ''].join(' ')} style={{ transitionDelay: '420ms' }}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.stat}>
              <dt className={styles.value}>{stat.value}</dt>
              <dd className={styles.label}>{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}