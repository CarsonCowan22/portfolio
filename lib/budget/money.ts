/** Parses a signed decimal-string dollar amount into integer cents, avoiding float rounding error. */
export function toCents(decimal: string): number {
  const trimmed = decimal.trim();
  const negative = trimmed.startsWith('-');
  const [intPart, fracPart = '0'] = trimmed.replace(/^[+-]/, '').split('.');
  const cents = Number(intPart) * 100 + Number((fracPart + '00').slice(0, 2));
  return negative ? -cents : cents;
}

export function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
