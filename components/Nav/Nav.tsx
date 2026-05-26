'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './Nav.module.css';

const konamiSequence = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

const links = [
  { href: '#work', label: 'Work' },
  { href: '#experience', label: 'Experience' },
  { href: '#contact', label: 'Contact' },
] as const;

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [eggVisible, setEggVisible] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);
  const [sequenceIndex, setSequenceIndex] = useState(0);

  const navClassName = useMemo(
    () => [styles.nav, scrolled ? styles.scrolled : ''].filter(Boolean).join(' '),
    [scrolled],
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const dismissEgg = () => {
      setEggVisible(false);
      setFlashVisible(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (eggVisible) {
        dismissEgg();
        return;
      }

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const expected = konamiSequence[sequenceIndex];

      if (key === expected || (expected === 'b' && key === 'b') || (expected === 'a' && key === 'a')) {
        const nextIndex = sequenceIndex + 1;

        if (nextIndex === konamiSequence.length) {
          setEggVisible(true);
          setFlashVisible(true);
          setSequenceIndex(0);

          window.setTimeout(() => {
            setEggVisible(false);
            setFlashVisible(false);
          }, 4000);
          return;
        }

        setSequenceIndex(nextIndex);
        return;
      }

      setSequenceIndex(key === konamiSequence[0] ? 1 : 0);
    };

    const handlePointerDown = () => {
      if (eggVisible) {
        dismissEgg();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [eggVisible, sequenceIndex]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  return (
    <>
      <header className={navClassName}>
        <div className={styles.inner}>
          <a className={styles.monogram} href="#top" aria-label="Back to top">
            CC
          </a>

          <nav className={styles.links} aria-label="Primary navigation">
            {links.map((link) => (
              <a key={link.href} className={styles.link} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className={styles.actions}>
            <a
              className={styles.hire}
              href="mailto:carsoncowan0222@gmail.com"
              aria-label="Hire me by email"
            >
              Hire me
            </a>

            <button
              className={styles.menuButton}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((value) => !value)}
            >
              Menu
            </button>
          </div>
        </div>

        <div
          id="mobile-nav"
          className={[styles.mobileMenu, menuOpen ? styles.mobileMenuOpen : ''].filter(Boolean).join(' ')}
        >
          {links.map((link) => (
            <a key={link.href} className={styles.mobileLink} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
        </div>
      </header>

      <div className={[styles.flash, flashVisible ? styles.flashVisible : ''].filter(Boolean).join(' ')} aria-hidden="true" />

      {eggVisible ? (
        <div className={styles.easterEgg} role="status" aria-live="polite">
          <p>↑↑↓↓←→←→BA — good instincts. now hire me. → carsoncowan0222@gmail.com</p>
        </div>
      ) : null}
    </>
  );
}