/**
 * Thin wrapper around the SimpleFIN protocol (https://www.simplefin.org/protocol.html). Plain
 * HTTPS/JSON -- no SDK, no extra dependency.
 */

export interface SimpleFinTransaction {
  id: string;
  /** Unix seconds. 0 if still pending -- we never request pending transactions, see fetchAccounts. */
  posted: number;
  /** Signed decimal string: positive for deposits, negative for withdrawals. */
  amount: string;
  description: string;
  pending?: boolean;
}

export interface SimpleFinAccount {
  id: string;
  name: string;
  balance: string;
  'balance-date': number;
  transactions?: SimpleFinTransaction[];
}

interface SimpleFinAccountSet {
  errors?: string[];
  accounts: SimpleFinAccount[];
}

/**
 * Exchanges a one-time SimpleFIN setup token for a permanent Access URL. The token is a
 * base64-encoded one-time claim URL; POSTing to it returns the Access URL (HTTP Basic creds
 * embedded) as the response body. Run once, manually, via scripts/budget-simplefin-setup.ts --
 * never called from the app itself.
 */
export async function claimSetupToken(setupToken: string): Promise<string> {
  const claimUrl = Buffer.from(setupToken.trim(), 'base64').toString('utf-8');
  if (!claimUrl.startsWith('https://')) {
    throw new Error(`Decoded setup token is not an https:// URL: "${claimUrl}"`);
  }
  const response = await fetch(claimUrl, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Claiming setup token failed: ${response.status} ${await response.text()}`);
  }
  const accessUrl = (await response.text()).trim();
  if (!accessUrl.startsWith('https://')) {
    throw new Error(`Claim response is not a usable Access URL: "${accessUrl}"`);
  }
  return accessUrl;
}

export interface FetchAccountsInput {
  accessUrl: string;
  /** Restrict to these SimpleFIN account ids (undefined fetches every linked account). */
  accountIds?: string[];
  /** Unix seconds; only transactions posted on or after this date are returned. */
  startDate?: number;
  /** Skip transaction data entirely, just balances -- used by --list-accounts. */
  balancesOnly?: boolean;
}

/**
 * GET {access_url}/accounts. Pending transactions are never requested (SimpleFIN excludes them
 * by default unless `pending=1` is passed) -- a pending transaction's id isn't guaranteed stable
 * once it posts, and inserting a row that might silently need revision later is exactly the kind
 * of thing this tool refuses to do.
 */
export async function fetchAccounts(input: FetchAccountsInput): Promise<SimpleFinAccount[]> {
  const url = new URL(`${input.accessUrl.replace(/\/$/, '')}/accounts`);
  if (input.startDate != null) url.searchParams.set('start-date', String(input.startDate));
  if (input.balancesOnly) url.searchParams.set('balances-only', '1');
  for (const id of input.accountIds ?? []) url.searchParams.append('account', id);

  const parsed = new URL(input.accessUrl);
  const auth = Buffer.from(`${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`).toString(
    'base64',
  );

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!response.ok) {
    throw new Error(`SimpleFIN /accounts request failed: ${response.status} ${await response.text()}`);
  }
  const body: SimpleFinAccountSet = await response.json();
  if (body.errors?.length) {
    throw new Error(`SimpleFIN returned error(s): ${body.errors.join('; ')}`);
  }
  return body.accounts;
}
