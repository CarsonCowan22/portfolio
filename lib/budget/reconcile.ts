import { fromCents, toCents } from './money';

export interface ReconciliationResult {
  reconciled: boolean;
  parsedSum: string;
  /** (opening + parsedSum) - closing, as a signed decimal string. Zero (within $0.01) means reconciled. */
  diff: string;
}

/**
 * A statement is reconciled when opening_balance + sum(transaction amounts) == closing_balance,
 * within $0.01. This is mandatory, not optional, per the guide: it's what catches a parsing bug
 * (a dropped transaction, a misread sign) before it silently understates or overstates spending.
 */
export function reconcileStatement(
  openingBalance: string,
  closingBalance: string,
  transactionAmounts: string[],
): ReconciliationResult {
  const openingCents = toCents(openingBalance);
  const closingCents = toCents(closingBalance);
  const sumCents = transactionAmounts.reduce((total, amount) => total + toCents(amount), 0);
  const diffCents = openingCents + sumCents - closingCents;

  return {
    reconciled: Math.abs(diffCents) <= 1,
    parsedSum: fromCents(sumCents),
    diff: fromCents(diffCents),
  };
}
