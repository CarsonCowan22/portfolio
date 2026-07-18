import { getCategoryRules } from '@/lib/budget/queries';
import RuleEditor, { type RuleDTO } from '@/components/Budget/RuleEditor';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Rules' };

export default async function RulesPage() {
  const rules = await getCategoryRules();

  const items: RuleDTO[] = rules.map((rule) => ({
    id: rule.id,
    category: rule.category,
    matchType: rule.matchType,
    pattern: rule.pattern,
    priority: rule.priority,
    createdBy: rule.createdBy,
    notes: rule.notes,
  }));

  return (
    <div className={styles.stack}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Private</p>
        <h1 className={styles.heading}>Category rules</h1>
        <p className={styles.subhead}>
          Checked in priority order (lowest first), first match wins. This is the entire answer to
          "why is this transaction categorized this way" -- nothing about categorization lives in code.
        </p>
      </div>

      <RuleEditor rules={items} />
    </div>
  );
}
