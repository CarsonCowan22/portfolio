import Fade from '@/components/ui/Fade';
import WorkCard from './WorkCard';
import styles from './Work.module.css';

const projects = [
  {
    eyebrow: '01 — SaaS / FOUNDING ENGINEER',
    title: 'Privix',
    description:
      'Multi-tenant SaaS platform for home improvement financing. Schema-level tenant isolation, stateless APIs, full-stack RBAC, and third-party credit plus loan document integrations.',
    bullets: [
      'Architected the platform from schema design through CI/CD and production release.',
      'Implemented PostgreSQL schema isolation so tenant boundaries stay enforced by the database.',
      'Built stateless Next.js API routes to keep the system horizontally scalable.',
    ],
    stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Vercel', 'GitHub Actions'],
    placeholderDescription: 'Privix dashboard screenshot, logged-in state',
    placeholderDimensions: '1200×800px minimum',
    placeholderPath: '/images/www.privix.com_project-details.png',
  },
  {
    eyebrow: '02 — FINTECH / FOUNDER',
    title: 'Payedia',
    description:
      'Personal finance app that answers one question: what can I actually spend right now? Bank-linked balances, bill tracking, budgets, and a 30-day cash-flow forecast, built solo from schema to production.',
    bullets: [
      'Integrated Quiltt bank linking end to end: session proxy, signed webhooks, paginated transaction sync, and cross-user isolation enforced at the database.',
      'Made money-moving writes atomic in Postgres, so paying a bill and updating safe-to-spend can never drift apart.',
      'Run staging and production as separate Vercel environments, with Vitest and Playwright suites and every PR reviewed before merge.',
    ],
    stack: ['Next.js', 'TypeScript', 'Supabase', 'PostgreSQL', 'Quiltt', 'Vercel'],
    placeholderDescription: 'Payedia dashboard, budget, forecast, and bills screens from the public demo',
    placeholderDimensions: '1440×900px screenshots',
    placeholderPath: [
      '/images/payedia-dashboard.png',
      '/images/payedia-budget.png',
      '/images/payedia-forecasting.png',
      '/images/payedia-bills.png',
    ],
    link: { href: 'https://payedia.com/demo', label: 'Try the live demo' },
    reverse: true,
  },
  {
    eyebrow: '03 — WEB',
    title: 'TEC Solar Website',
    description:
      'Engineering firm marketing site with modular architecture for future expansion into a client-facing project portal. Responsive design and scalable routing.',
    bullets: [
      'Built a clean public-facing site that can grow into a portal without a rebuild.',
      'Kept the route structure modular so future client workflows can slot in cleanly.',
      'Shipped a responsive experience with a production deployment path already in place.',
    ],
    stack: ['Next.js', 'React', 'PostgreSQL', 'Vercel'],
    placeholderDescription: 'TEC Solar homepage or full-page screenshot',
    placeholderDimensions: '1400×900px minimum',
    placeholderPath: '/images/www.tecsolar.net_home.png',
  },
  {
    eyebrow: '04 — INTERNAL TOOLS',
    title: 'CAD Workflow Automation',
    description:
      'Windows scripting automation that eliminated hours of manual copy-paste each day for a 30-person CAD engineering department. Built before a CS degree because the process needed fixing.',
    bullets: [
      'Automated repetitive Excel and AutoCAD steps that used to consume the team’s day.',
      'Reduced turnaround time and removed avoidable human error from a high-volume workflow.',
      'Proved I could build useful software long before I had the credential to "officially" do it.',
    ],
    stack: ['Windows Scripting', 'Excel', 'AutoCAD'],
    placeholderDescription: 'Permit-ready CAD plan set or before/after workflow comparison',
    placeholderDimensions: 'High-resolution comparison or plan set',
    placeholderPath: ['/images/cad-automation-1.png', '/images/cad-automation-2.png'],
    reverse: true,
  },
] as const;

export default function Work() {
  return (
    <section id="work" className={styles.section} aria-labelledby="work-heading">
      <div className={styles.inner}>
        <Fade>
          <p className={styles.kicker}>01 — SaaS / FOUNDING ENGINEER</p>
        </Fade>

        <Fade delay={80}>
          <div className={styles.header}>
            <h2 id="work-heading" className={styles.heading}>
              Work
            </h2>
            <p className={styles.intro}>
              I build systems that replace manual workflow with software people can actually trust.
            </p>
          </div>
        </Fade>

        <div className={styles.list}>
          {projects.map((project, index) => (
            <Fade key={project.title} delay={index * 120}>
              <WorkCard {...project} />
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}