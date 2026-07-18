import type { BankStatementParseResult, ParsedTransaction, ParseGap, StatementPeriod } from './types';

const ACCOUNT_HEADER_RE = /^(360 Checking|Personal|360 Performance Savings)\s*-\s*\d+/;
const DATE_RE = /^([A-Z][a-z]{2}) (\d{1,2})\s+(.*)$/;
const AMOUNT_RE = /([+-])\s*\$([\d,]+\.\d{2})/;
const DOLLAR_FIGURE_RE = /\$([\d,]+\.\d{2})/;

const MONTH_ABBR_TO_NUM: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stripCreditDebitSuffix(text: string): string {
  return text.replace(/\b(Credit|Debit)\b/gi, '').trim();
}

/** Resolves a two-digit month/day into a full year using the statement's period bounds, so a
 * period that spans a calendar year boundary (e.g. Dec 15 - Jan 14) still gets the right year. */
function resolveYear(monthNum: number, period: StatementPeriod): number {
  const start = new Date(`${period.start}T00:00:00Z`);
  const end = new Date(`${period.end}T00:00:00Z`);
  if (monthNum === start.getUTCMonth() + 1) return start.getUTCFullYear();
  if (monthNum === end.getUTCMonth() + 1) return end.getUTCFullYear();
  return start.getUTCFullYear();
}

interface PendingTransaction {
  month: string;
  day: string;
  descLines: string[];
  startPage: number;
}

/**
 * Port of the proven Appendix A regex parser, generalized to: (1) work on text extracted by
 * unpdf/pdf.js rather than `pdftotext -layout`, (2) track source_page for audit, (3) resolve a
 * full year from the statement period instead of assuming one, (4) surface anything it can't
 * confidently parse as a ParseGap instead of skipping it.
 */
export function parseBankStatement(
  pages: string[],
  options: { defaultAccount?: string; period: StatementPeriod },
): BankStatementParseResult {
  const transactions: ParsedTransaction[] = [];
  const gaps: ParseGap[] = [];

  let currentAccount: string | null = options.defaultAccount ?? null;
  let pending: PendingTransaction | null = null;

  const closeIfAmountPresent = (pageNum: number) => {
    if (!pending) return;
    const buffer = pending.descLines.join(' ');
    const amountMatch = buffer.match(AMOUNT_RE);
    if (!amountMatch) return;

    const monthNum = MONTH_ABBR_TO_NUM[pending.month];
    const sign = amountMatch[1] === '-' ? '-' : '';
    const amount = `${sign}${amountMatch[2].replace(/,/g, '')}`;

    let remainder = buffer.replace(AMOUNT_RE, ' ');
    let runningBalance: string | null = null;
    const balanceMatch = remainder.match(DOLLAR_FIGURE_RE);
    if (balanceMatch) {
      runningBalance = balanceMatch[1].replace(/,/g, '');
      remainder = remainder.replace(DOLLAR_FIGURE_RE, ' ');
    }

    const descriptionClean = normalizeWhitespace(stripCreditDebitSuffix(remainder));
    const descriptionRaw = normalizeWhitespace(buffer);

    if (!currentAccount) {
      gaps.push({
        sourcePage: pending.startPage,
        rawText: descriptionRaw,
        reason: 'Transaction closed before any account header was seen -- account is unknown, not guessed.',
      });
      pending = null;
      return;
    }

    const year = resolveYear(monthNum, options.period);
    const date = `${year}-${String(monthNum).padStart(2, '0')}-${pending.day.padStart(2, '0')}`;

    transactions.push({
      account: currentAccount,
      date,
      descriptionRaw,
      descriptionClean,
      amount,
      runningBalance,
      sourcePage: pending.startPage,
    });
    pending = null;
  };

  pages.forEach((pageText, pageIndex) => {
    const pageNum = pageIndex + 1;
    const lines = pageText.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const accountMatch = line.match(ACCOUNT_HEADER_RE);
      if (accountMatch) {
        if (pending) {
          gaps.push({
            sourcePage: pending.startPage,
            rawText: pending.descLines.join(' '),
            reason: 'A new account section started before this transaction found a signed amount.',
          });
          pending = null;
        }
        currentAccount = accountMatch[1];
        continue;
      }

      const dateMatch = line.match(DATE_RE);
      const monthCandidate = dateMatch?.[1];
      if (dateMatch && monthCandidate && MONTH_ABBR_TO_NUM[monthCandidate]) {
        if (pending) {
          gaps.push({
            sourcePage: pending.startPage,
            rawText: pending.descLines.join(' '),
            reason: 'A new transaction date line started before this transaction found a signed amount.',
          });
        }
        pending = { month: monthCandidate, day: dateMatch[2], descLines: [dateMatch[3]], startPage: pageNum };
        closeIfAmountPresent(pageNum);
        continue;
      }

      if (pending) {
        pending.descLines.push(line);
        closeIfAmountPresent(pageNum);
      }
      // Lines outside any pending transaction (column headers, page footers, etc.) are ignored.
    }
  });

  if (pending) {
    const p: PendingTransaction = pending;
    gaps.push({
      sourcePage: p.startPage,
      rawText: p.descLines.join(' '),
      reason: 'Statement text ended before this transaction found a signed amount.',
    });
  }

  return { transactions, gaps };
}
