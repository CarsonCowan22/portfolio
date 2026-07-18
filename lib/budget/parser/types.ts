export interface ParsedTransaction {
  account: string;
  /** ISO 8601 date (YYYY-MM-DD). */
  date: string;
  descriptionRaw: string;
  descriptionClean: string;
  /** Signed decimal string, e.g. "-42.19" or "1200.00". */
  amount: string;
  runningBalance: string | null;
  sourcePage: number;
}

/**
 * A line (or run of lines) the parser could not confidently turn into a transaction. Per the
 * "never fabricate or infer a transaction that isn't in the source text" rule, these are
 * surfaced for manual reconciliation rather than silently dropped.
 */
export interface ParseGap {
  sourcePage: number;
  rawText: string;
  reason: string;
}

export interface BankStatementParseResult {
  transactions: ParsedTransaction[];
  gaps: ParseGap[];
}

export interface StatementPeriod {
  /** ISO 8601 date (YYYY-MM-DD). */
  start: string;
  /** ISO 8601 date (YYYY-MM-DD). */
  end: string;
}
