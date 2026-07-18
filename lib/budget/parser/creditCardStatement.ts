export interface CreditCardStatementSummary {
  newBalance: string | null;
  minimumPaymentDue: string | null;
  paymentDueDate: string | null;
  purchaseApr: string | null;
}

/**
 * Credit card statements are an account-summary block, not a transaction ledger -- this only
 * extracts balance/min-payment/APR/due-date, not per-transaction data. These patterns are a
 * best-effort starting point (no real credit card statement was available to validate against
 * in this session) and should be checked against Carson's actual statement text on first real
 * ingestion; a field that doesn't match returns null rather than a guessed value.
 */
export function parseCreditCardStatement(fullText: string): CreditCardStatementSummary {
  const newBalanceMatch = fullText.match(/New Balance[:\s]+\$?([\d,]+\.\d{2})/i);
  const minPaymentMatch = fullText.match(/Minimum Payment(?: Due)?[:\s]+\$?([\d,]+\.\d{2})/i);
  const dueDateMatch = fullText.match(/Payment Due Date[:\s]+([A-Za-z]+ \d{1,2},? \d{4})/i);
  const aprMatch = fullText.match(/(?:Purchase )?APR[:\s]+([\d.]+)%/i);

  return {
    newBalance: newBalanceMatch ? newBalanceMatch[1].replace(/,/g, '') : null,
    minimumPaymentDue: minPaymentMatch ? minPaymentMatch[1].replace(/,/g, '') : null,
    paymentDueDate: dueDateMatch ? dueDateMatch[1] : null,
    purchaseApr: aprMatch ? aprMatch[1] : null,
  };
}
