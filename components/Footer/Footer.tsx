import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copy}>Carson Cowan · Full Stack Software Engineer · Vista, CA</p>
        <a className={styles.link} href="#top">
          Back to top
        </a>
      </div>
    </footer>
  );
}