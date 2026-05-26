import Fade from '@/components/ui/Fade';
import styles from './Experience.module.css';

const roles = [
  {
    company: 'Privix',
    role: 'Founding Engineer',
    date: 'Jun 2025 – Present',
  },
  {
    company: 'Bryton Power',
    role: 'CAD Revision / Project Funding Specialist',
    date: 'Feb 2025 – Jun 2025',
  },
  {
    company: 'ATTYX (FKA SUNco)',
    role: 'CAD & Engineering Manager',
    date: 'Oct 2022 – Feb 2025',
  },
  {
    company: 'Lumio HX',
    role: 'Design & Proposal Team',
    date: 'Aug 2021 – Oct 2022',
  },
  {
    company: 'Utah Valley University',
    role: 'BAS in Software Development',
    date: 'Graduated: May 2025',
  },
] as const;

export default function Experience() {
  return (
    <section id="experience" className={styles.section} aria-labelledby="experience-heading">
      <div className={styles.inner}>
        <div className={styles.labelColumn}>
          <Fade>
            <h2 id="experience-heading" className={styles.heading}>
              Experience
            </h2>
          </Fade>

          <Fade delay={80}>
            <p className={styles.intro}>
              Five years in solar and home improvement taught me how to remove friction where it actually hurts.
            </p>
          </Fade>
        </div>

        <div className={styles.list}>
          {roles.map((role, index) => (
            <Fade key={`${role.company}-${role.date}`} delay={index * 80}>
              <div className={styles.row}>
                <div>
                  <p className={styles.company}>{role.company}</p>
                  <p className={styles.role}>{role.role}</p>
                </div>
                <p className={styles.date}>{role.date}</p>
              </div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}