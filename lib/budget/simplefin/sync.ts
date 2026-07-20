import crypto from 'node:crypto';
import { getBudgetDataSource } from '../dataSource';
import type { CategoryRule } from '../entities/CategoryRule';
import type { Statement } from '../entities/Statement';
import type { Transaction } from '../entities/Transaction';
import { categorize, loadRules } from '../rules';
import { fetchAccounts, type SimpleFinTransaction } from './client';

const DEFAULT_LOOKBACK_DAYS = 30;

export interface SimpleFinAccountMap {
  [simplefinAccountId: string]: string;
}

/** JSON map of SimpleFIN account id -> our `account` display name. Any linked SimpleFIN account
 * missing from this map is reported, never guessed into an account name (see ingestSimpleFin's
 * `skippedUnmappedAccountIds`). */
export function readAccountMap(): SimpleFinAccountMap {
  const raw = process.env.SIMPLEFIN_ACCOUNT_MAP;
  if (!raw) throw new Error('SIMPLEFIN_ACCOUNT_MAP is not set -- see .env.example');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`SIMPLEFIN_ACCOUNT_MAP is not valid JSON: ${(error as Error).message}`);
  }
}

export function addDaysToIsoDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The boundary that keeps PDF-statement history and SimpleFIN's live tail from ever
 * double-counting the same real-world transaction: pull only dates strictly after the latest
 * date already on record for this account, whether that record came from a reconciled statement
 * or a previous SimpleFIN sync. A brand-new SimpleFIN-only account (no history at all) falls back
 * to a fixed lookback window instead of guessing a start date.
 */
export function computeSyncStartDate(input: {
  latestStatementPeriodEnd: string | null;
  latestTransactionDate: string | null;
  lookbackDays?: number;
  now?: Date;
}): string {
  const candidates = [input.latestStatementPeriodEnd, input.latestTransactionDate].filter(
    (d): d is string => d != null,
  );
  if (candidates.length > 0) {
    const latest = [...candidates].sort().at(-1) as string;
    return addDaysToIsoDate(latest, 1);
  }
  const lookback = input.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const now = input.now ?? new Date();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  cutoff.setUTCDate(cutoff.getUTCDate() - lookback);
  return cutoff.toISOString().slice(0, 10);
}

/** Keyed off SimpleFIN's own stable per-account transaction id rather than a sequence counter --
 * unlike PDF parsing, SimpleFIN ids are already guaranteed unique, so no collision handling needed. */
export function computeSimpleFinTransactionId(simplefinAccountId: string, simplefinTxnId: string): string {
  return crypto.createHash('sha256').update(`simplefin|${simplefinAccountId}|${simplefinTxnId}`).digest('hex').slice(0, 40);
}

export interface NormalizedSimpleFinRow {
  id: string;
  sourceFile: string;
  sourcePage: number;
  account: string;
  date: string;
  descriptionRaw: string;
  descriptionClean: string;
  amount: string;
}

export function normalizeSimpleFinTransaction(
  simplefinAccountId: string,
  account: string,
  txn: SimpleFinTransaction,
): NormalizedSimpleFinRow {
  if (!txn.posted) {
    throw new Error(`Transaction ${txn.id} on account ${simplefinAccountId} has no posted date (still pending?).`);
  }
  return {
    id: computeSimpleFinTransactionId(simplefinAccountId, txn.id),
    sourceFile: `simplefin:${simplefinAccountId}`,
    sourcePage: 0,
    account,
    date: new Date(txn.posted * 1000).toISOString().slice(0, 10),
    descriptionRaw: txn.description,
    descriptionClean: txn.description.replace(/\s+/g, ' ').trim(),
    amount: txn.amount,
  };
}

export interface SimpleFinSyncAccountResult {
  simplefinAccountId: string;
  account: string;
  startDate: string;
  pulled: number;
  upserted: number;
}

export interface SimpleFinSyncResult {
  accounts: SimpleFinSyncAccountResult[];
  /** SimpleFIN accounts the connection has access to but that aren't in SIMPLEFIN_ACCOUNT_MAP --
   * never silently ingested under a guessed account name. */
  skippedUnmappedAccountIds: string[];
}

/**
 * Pulls new transactions for every mapped SimpleFIN account and upserts them as ordinary
 * Transaction rows (no Statement, no reconciliation -- see the SimpleFIN hybrid plan). Safe to
 * re-run: the start-date boundary only ever asks for dates that couldn't already be on file, and
 * the upsert is keyed on the same stable id every time.
 */
export async function ingestSimpleFin(): Promise<SimpleFinSyncResult> {
  const accessUrl = process.env.SIMPLEFIN_ACCESS_URL;
  if (!accessUrl) throw new Error('SIMPLEFIN_ACCESS_URL is not set -- see .env.example');

  const accountMap = readAccountMap();
  const mappedIds = Object.keys(accountMap);
  if (mappedIds.length === 0) {
    throw new Error(
      'SIMPLEFIN_ACCOUNT_MAP has no entries -- run `pnpm budget:simplefin:setup -- --list-accounts` and fill it in.',
    );
  }

  const allLinkedAccounts = await fetchAccounts({ accessUrl, balancesOnly: true });
  const skippedUnmappedAccountIds = allLinkedAccounts.map((a) => a.id).filter((id) => !(id in accountMap));

  const dataSource = await getBudgetDataSource();
  const rules = await loadRules();
  const lookbackDays = process.env.SIMPLEFIN_INITIAL_LOOKBACK_DAYS
    ? Number(process.env.SIMPLEFIN_INITIAL_LOOKBACK_DAYS)
    : undefined;

  const accounts = await dataSource.transaction(async (manager) => {
    const statementRepo = manager.getRepository<Statement>('Statement');
    const txnRepo = manager.getRepository<Transaction>('Transaction');
    const results: SimpleFinSyncAccountResult[] = [];

    for (const simplefinAccountId of mappedIds) {
      const account = accountMap[simplefinAccountId];

      const [latestStatement, latestTxn] = await Promise.all([
        statementRepo.findOne({ where: { account }, order: { periodEnd: 'DESC' } }),
        txnRepo.findOne({ where: { account }, order: { date: 'DESC' } }),
      ]);

      const startDateIso = computeSyncStartDate({
        latestStatementPeriodEnd: latestStatement?.periodEnd ?? null,
        latestTransactionDate: latestTxn?.date ?? null,
        lookbackDays,
      });
      const startDate = Math.floor(new Date(`${startDateIso}T00:00:00Z`).getTime() / 1000);

      const [simplefinAccount] = await fetchAccounts({ accessUrl, accountIds: [simplefinAccountId], startDate });
      const transactions = simplefinAccount?.transactions ?? [];

      const rows = transactions.map((txn) => {
        const normalized = normalizeSimpleFinTransaction(simplefinAccountId, account, txn);
        const match = categorize(normalized.descriptionClean, rules);
        return {
          ...normalized,
          runningBalance: null,
          internalTransfer: match?.category === 'INTERNAL_TRANSFER',
          category: match?.category ?? null,
          categorySource: match ? ('rule' as const) : null,
          categoryRule: match ? ({ id: match.ruleId } as CategoryRule) : null,
          suggestedCategory: null,
          suggestedBy: null,
          needsReview: !match,
          flaggedForFollowUp: false,
          statement: null,
        };
      });

      if (rows.length > 0) {
        await txnRepo.upsert(rows, ['id']);
      }

      results.push({ simplefinAccountId, account, startDate: startDateIso, pulled: transactions.length, upserted: rows.length });
    }

    return results;
  });

  return { accounts, skippedUnmappedAccountIds };
}
