"use client";

import { useEffect, useRef, useState } from 'react';
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
  placeholderPath: string | readonly string[];
  reverse?: boolean;
};

type ImageSource = {
  publicPath: string;
  optimizedBase: string;
  srcSet: string;
  fallbackPng: string;
};

function resolveImageSource(input: string): ImageSource {
  const publicPath = input.startsWith('/') ? input : `/images/${input}`;
  const fileName = publicPath.split('/').pop() || '';
  const nameOnly = fileName.replace(/\.[^.]+$/, '');
  const optimizedBase = `/images/optimized/${nameOnly}`;
  const srcSet = [800, 1200, 1400].map((w) => `${optimizedBase}-${w}.webp ${w}w`).join(', ');
  const fallbackPng = `${optimizedBase}-optimized.png`;

  return { publicPath, optimizedBase, srcSet, fallbackPng };
}

function renderImage(path: string, alt: string) {
  const { publicPath, srcSet, fallbackPng } = resolveImageSource(path);

  return (
    <picture key={publicPath}>
      <source type="image/webp" srcSet={srcSet} sizes="(max-width: 1400px) 100vw, 1400px" />
      <img src={fallbackPng} alt={alt} className={styles.image} />
    </picture>
  );
}

function Carousel({ images, alt }: { images: readonly string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchActive = useRef(false);

  useEffect(() => {
    if (isHovered || images.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [images.length, isHovered]);

  const prev = () => setIndex((current) => (current - 1 + images.length) % images.length);
  const next = () => setIndex((current) => (current + 1) % images.length);

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchActive.current = true;
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchActive.current || touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    touchActive.current = false;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        next();
      } else {
        prev();
      }
    }
  };

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.frame}>
        {images.map((path, slideIndex) => {
          const { publicPath, srcSet, fallbackPng } = resolveImageSource(path);
          const isActive = slideIndex === index;

          return (
            <div
              key={publicPath}
              className={[styles.slide, isActive ? styles.slideActive : ''].filter(Boolean).join(' ')}
              aria-hidden={!isActive}
            >
              <picture>
                <source type="image/webp" srcSet={srcSet} sizes="(max-width: 1400px) 100vw, 1400px" />
                <img src={fallbackPng} alt={alt} className={styles.image} />
              </picture>
            </div>
          );
        })}

        <button className={styles.prev} onClick={prev} aria-label="Previous image">
          ‹
        </button>
        <button className={styles.next} onClick={next} aria-label="Next image">
          ›
        </button>
      </div>

      <div className={styles.thumbnails} aria-label="Image thumbnails">
        {images.map((path, slideIndex) => {
          const { publicPath, srcSet, fallbackPng } = resolveImageSource(path);

          return (
            <button
              key={publicPath}
              type="button"
              className={[styles.thumbnail, slideIndex === index ? styles.thumbnailActive : ''].filter(Boolean).join(' ')}
              onClick={() => setIndex(slideIndex)}
              aria-label={`Show image ${slideIndex + 1}`}
              aria-pressed={slideIndex === index}
            >
              <picture>
                <source type="image/webp" srcSet={srcSet} sizes="96px" />
                <img src={fallbackPng} alt="" className={styles.thumbnailImage} aria-hidden="true" />
              </picture>
            </button>
          );
        })}
      </div>

      <div className={styles.dots} aria-hidden>
        {images.map((_, slideIndex) => (
          <button
            key={slideIndex}
            className={[styles.dot, slideIndex === index ? styles.activeDot : ''].filter(Boolean).join(' ')}
            onClick={() => setIndex(slideIndex)}
            aria-label={`Show image ${slideIndex + 1}`}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}

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
        {(() => {
          if (Array.isArray(placeholderPath) && placeholderPath.length > 1) {
            return <Carousel images={placeholderPath} alt={placeholderDescription} />;
          }

          if (typeof placeholderPath === 'string' && placeholderPath.includes('/')) {
            return renderImage(placeholderPath, placeholderDescription);
          }

          return (
            <Placeholder
              description={placeholderDescription}
              dimensions={placeholderDimensions}
              filePath={Array.isArray(placeholderPath) ? placeholderPath[0] : placeholderPath}
            />
          );
        })()}
      </div>
    </article>
  );
}
