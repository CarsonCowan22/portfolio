export interface ReconciliationResult {
  reconciled: boolean;
  parsedSum: string;
  /** (opening + parsedSum) - closing, as a signed decimal string. Zero (within $0.01) means reconciled. */
  diff: string;
}

/** Parses a signed decimal-string dollar amount into integer cents, avoiding float rounding error. */
function toCents(decimal: string): number {
  const trimmed = decimal.trim();
  const negative = trimmed.startsWith('-');
  const [intPart, fracPart = '0'] = trimmed.replace(/^[+-]/, '').split('.');
  const cents = Number(intPart) * 100 + Number((fracPart + '00').slice(0, 2));
  return negative ? -cents : cents;
}

function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
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
