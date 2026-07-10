import type { ReactNode } from 'react';
import styles from './DigestView.module.css';

/** Renders inline **bold** and [text](url) markdown within a single line of text. Only covers
 * what daily_digest.py actually emits — not a general markdown renderer. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      parts.push(
        <a key={`${keyPrefix}-${index++}`} href={match[2]} target="_blank" rel="noreferrer">
          {match[1]}
        </a>,
      );
    } else if (match[3] !== undefined) {
      parts.push(<strong key={`${keyPrefix}-${index++}`}>{match[3]}</strong>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function renderDigestBody(markdown: string): ReactNode[] {
  const lines = markdown.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={index}>{renderInline(item, `li-${blocks.length}-${index}`)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();

    if (line.startsWith('# ')) {
      flushList();
      blocks.push(<h1 key={`h1-${lineIndex}`}>{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      flushList();
      blocks.push(<h2 key={`h2-${lineIndex}`}>{line.slice(3)}</h2>);
    } else if (line.startsWith('- ')) {
      listItems.push(line.slice(2));
    } else if (line.length > 0) {
      flushList();
      blocks.push(<p key={`p-${lineIndex}`}>{renderInline(line, `p-${lineIndex}`)}</p>);
    }
  });

  flushList();
  return blocks;
}

export default function DigestView({ date, content }: { date: string; content: string }) {
  return (
    <section className={styles.section} aria-label="Latest digest">
      <p className={styles.eyebrow}>Latest digest — {date}</p>
      <div className={styles.body}>{renderDigestBody(content)}</div>
    </section>
  );
}
