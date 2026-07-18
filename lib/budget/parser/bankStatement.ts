import type {
  AccountBalanceSummary,
  BankStatementParseResult,
  ParsedTransaction,
  ParseGap,
  StatementPeriod,
} from './types';

const ACCOUNT_HEADER_RE = /^(360 Checking|Personal|360 Performance Savings)\s*-\s*\d+/;
const DATE_RE = /^([A-Z][a-z]{2}) (\d{1,2})\s+(.*)$/;
const AMOUNT_RE = /([+-])\s*\$([\d,]+\.\d{2})/;
const SIGNED_DOLLAR_FIGURE_RE = /([+-]?)\s*\$([\d,]+\.\d{2})/;
const BALANCE_LINE_RE = /^(Opening|Closing) Balance\s+\$([\d,]+\.\d{2})/i;
const REJECTED_LINE_RE = /\bwas Rejected\b/i;
const INTEREST_RATE_CHANGE_RE = /^Interest Rate Change\b/i;
const STATEMENT_PERIOD_RE = /STATEMENT PERIOD\s*\n?\s*([A-Za-z]{3}) (\d{1,2}) - ([A-Za-z]{3}) (\d{1,2}), (\d{4})/;
/** The "STATEMENT PERIOD" date range ("May 1 - May 31, 2026") repeats on every page and, read as
 * a lone line, matches DATE_RE too (a "May 1" transaction with description "- May 31, 2026") --
 * exclude it explicitly rather than let it fall through to noisy false-positive gaps. */
const PERIOD_RANGE_LINE_RE = /^[A-Za-z]{3} \d{1,2} - [A-Za-z]{3} \d{1,2}, \d{4}$/;

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

/** Reads the "STATEMENT PERIOD" header (repeated on every page) instead of requiring it as a
 * CLI argument -- one less hand-typed value that could be mistyped. */
export function detectStatementPeriod(pages: string[]): StatementPeriod | null {
  const fullText = pages.join('\n');
  const match = fullText.match(STATEMENT_PERIOD_RE);
  if (!match) return null;

  const [, startMonthAbbr, startDay, endMonthAbbr, endDay, yearText] = match;
  const startMonthNum = MONTH_ABBR_TO_NUM[startMonthAbbr];
  const endMonthNum = MONTH_ABBR_TO_NUM[endMonthAbbr];
  if (!startMonthNum || !endMonthNum) return null;

  const year = Number(yearText);
  const endYear = endMonthNum < startMonthNum ? year + 1 : year;

  return {
    start: `${year}-${String(startMonthNum).padStart(2, '0')}-${startDay.padStart(2, '0')}`,
    end: `${endYear}-${String(endMonthNum).padStart(2, '0')}-${endDay.padStart(2, '0')}`,
  };
}

interface PendingTransaction {
  month: string;
  day: string;
  descLines: string[];
  startPage: number;
}

/**
 * Port of the proven Appendix A regex parser, generalized to: (1) work on text extracted by
 * unpdf/pdf.js rather than `pdftotext -layout`, (2) track source_page for audit, (3) auto-detect
 * the statement period and resolve the correct year from it, (4) read each account's own
 * opening/closing balance directly from its "Opening Balance"/"Closing Balance" lines rather than
 * requiring it as a hand-typed argument (a single statement PDF can cover multiple accounts, each
 * with its own balance), (5) recognize "was Rejected" lines as informational non-transactions
 * (no balance impact) instead of noisy parse gaps, and (6) surface anything it still can't
 * confidently parse as a ParseGap instead of skipping or guessing it.
 */
export function parseBankStatement(
  pages: string[],
  options: { defaultAccount?: string; period?: StatementPeriod } = {},
): BankStatementParseResult {
  const transactions: ParsedTransaction[] = [];
  const gaps: ParseGap[] = [];
  const accountBalances = new Map<string, { openingBalance: string | null; closingBalance: string | null }>();

  const period = options.period ?? detectStatementPeriod(pages);
  if (!period) {
    gaps.push({
      sourcePage: 1,
      rawText: '',
      reason: 'Could not find a "STATEMENT PERIOD" header -- transaction dates cannot be resolved to a year.',
    });
    return { transactions, gaps, accountSummaries: [], period: null };
  }

  let currentAccount: string | null = options.defaultAccount ?? null;
  let pending: PendingTransaction | null = null;
  let sequence = 0;

  const getBalanceBucket = (account: string) => {
    let bucket = accountBalances.get(account);
    if (!bucket) {
      bucket = { openingBalance: null, closingBalance: null };
      accountBalances.set(account, bucket);
    }
    return bucket;
  };

  const closeIfAmountPresent = () => {
    if (!pending) return;
    const buffer = pending.descLines.join(' ');
    const amountMatch = buffer.match(AMOUNT_RE);
    if (!amountMatch) return;

    const monthNum = MONTH_ABBR_TO_NUM[pending.month];
    const sign = amountMatch[1] === '-' ? '-' : '';
    const amount = `${sign}${amountMatch[2].replace(/,/g, '')}`;

    let remainder = buffer.replace(AMOUNT_RE, ' ');
    let runningBalance: string | null = null;
    const balanceMatch = remainder.match(SIGNED_DOLLAR_FIGURE_RE);
    if (balanceMatch) {
      const balanceSign = balanceMatch[1] === '-' ? '-' : '';
      runningBalance = `${balanceSign}${balanceMatch[2].replace(/,/g, '')}`;
      remainder = remainder.replace(SIGNED_DOLLAR_FIGURE_RE, ' ');
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

    const year = resolveYear(monthNum, period);
    const date = `${year}-${String(monthNum).padStart(2, '0')}-${pending.day.padStart(2, '0')}`;

    transactions.push({
      account: currentAccount,
      date,
      descriptionRaw,
      descriptionClean,
      amount,
      runningBalance,
      sourcePage: pending.startPage,
      sequence: sequence++,
    });
    pending = null;
  };

  pages.forEach((pageText, pageIndex) => {
    const pageNum = pageIndex + 1;
    const lines = pageText.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (PERIOD_RANGE_LINE_RE.test(line)) continue;

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
        const rest = dateMatch[3];

        // "Opening Balance $X" / "Closing Balance $X" are account metadata, not transactions --
        // read directly into accountBalances rather than accumulated as a pending transaction.
        const balanceLineMatch = rest.match(BALANCE_LINE_RE);
        if (balanceLineMatch) {
          if (pending) {
            gaps.push({
              sourcePage: pending.startPage,
              rawText: pending.descLines.join(' '),
              reason: 'A balance summary line started before the prior transaction found a signed amount.',
            });
            pending = null;
          }
          if (!currentAccount) {
            gaps.push({ sourcePage: pageNum, rawText: line, reason: 'Balance summary line seen before any account header.' });
            continue;
          }
          const kind = balanceLineMatch[1].toLowerCase() === 'opening' ? 'openingBalance' : 'closingBalance';
          getBalanceBucket(currentAccount)[kind] = balanceLineMatch[2].replace(/,/g, '');
          continue;
        }

        // A failed/rejected withdrawal attempt never moved money -- informational, not a gap.
        if (REJECTED_LINE_RE.test(rest)) {
          if (pending) {
            gaps.push({
              sourcePage: pending.startPage,
              rawText: pending.descLines.join(' '),
              reason: 'A rejected-withdrawal line started before the prior transaction found a signed amount.',
            });
            pending = null;
          }
          continue;
        }

        // A savings APY notice ("Interest Rate Change from X% to Y% $Z") -- not a transaction.
        if (INTEREST_RATE_CHANGE_RE.test(rest)) {
          if (pending) {
            gaps.push({
              sourcePage: pending.startPage,
              rawText: pending.descLines.join(' '),
              reason: 'An interest-rate-change notice started before the prior transaction found a signed amount.',
            });
            pending = null;
          }
          continue;
        }

        if (pending) {
          gaps.push({
            sourcePage: pending.startPage,
            rawText: pending.descLines.join(' '),
            reason: 'A new transaction date line started before this transaction found a signed amount.',
          });
        }
        pending = { month: monthCandidate, day: dateMatch[2], descLines: [rest], startPage: pageNum };
        closeIfAmountPresent();
        continue;
      }

      if (pending) {
        pending.descLines.push(line);
        closeIfAmountPresent();
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

  const accountSummaries: AccountBalanceSummary[] = Array.from(accountBalances.entries()).map(
    ([account, balances]) => ({ account, ...balances }),
  );

  return { transactions, gaps, accountSummaries, period };
}
