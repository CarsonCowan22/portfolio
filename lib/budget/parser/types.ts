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
  /** Position within this statement's parse order. Two genuinely repeated transactions (same
   * date/amount/description, e.g. two identical coffee purchases the same day) would otherwise
   * hash to the same stable id and collide on upsert -- this keeps them distinct. */
  sequence: number;
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

/** Opening/closing balance for one account section, read directly from its "Opening Balance" /
 * "Closing Balance" lines -- never hand-entered, so there's nothing to mistype. */
export interface AccountBalanceSummary {
  account: string;
  openingBalance: string | null;
  closingBalance: string | null;
}

export interface BankStatementParseResult {
  transactions: ParsedTransaction[];
  gaps: ParseGap[];
  accountSummaries: AccountBalanceSummary[];
  /** Null if the "STATEMENT PERIOD" header couldn't be found -- transaction dates can't be
   * resolved to a year without it, so the caller should treat this as a hard failure. */
  period: StatementPeriod | null;
}

export interface StatementPeriod {
  /** ISO 8601 date (YYYY-MM-DD). */
  start: string;
  /** ISO 8601 date (YYYY-MM-DD). */
  end: string;
}
