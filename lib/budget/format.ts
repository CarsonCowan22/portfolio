/** TypeORM's 'date' column type can come back as either a string or a Date depending on driver
 * config -- normalize defensively wherever an entity's date field is read for display. */
export function toDateString(value: unknown): string {
  return typeof value === 'string' ? value : new Date(value as string).toISOString().slice(0, 10);
}

/** Formats a signed decimal string as "$12.34" / "-$12.34", with an optional "+" for positive
 * values -- conventional sign-before-symbol ordering, unlike naively prepending "$" to "-12.34". */
export function formatSignedDollars(decimal: string, showPlus = false): string {
  const negative = decimal.trim().startsWith('-');
  const abs = decimal.replace(/^[+-]/, '');
  if (negative) return `-$${abs}`;
  return `${showPlus ? '+' : ''}$${abs}`;
}
