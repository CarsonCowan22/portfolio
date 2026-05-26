'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import styles from './Fade.module.css';

type FadeProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
};

export default function Fade({ children, delay = 0, y = 24, className }: FadeProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const style = {
    '--fade-y': `${y}px`,
    transitionDelay: `${delay}ms`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={[styles.root, visible ? styles.visible : '', className].filter(Boolean).join(' ')}
      style={style}
    >
      {children}
    </div>
  );
}