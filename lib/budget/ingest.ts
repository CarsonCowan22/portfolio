import crypto from 'node:crypto';
import { getBudgetDataSource } from './dataSource';
import { CategoryRule } from './entities/CategoryRule';
import { Statement } from './entities/Statement';
import { Transaction } from './entities/Transaction';
import { parseBankStatement } from './parser/bankStatement';
import type { ParseGap, ParsedTransaction, StatementPeriod } from './parser/types';
import { categorize, loadRules } from './rules';
import { reconcileStatement } from './reconcile';

export interface IngestBankStatementInput {
  sourceFile: string;
  /** Already-extracted page text (see lib/budget/parser/pdfText.ts). unpdf/pdf.js detaches the
   * source ArrayBuffer after extraction, so callers that also need the raw text for something
   * else (e.g. sniffing bank vs. credit card) must extract once and pass the result in here --
   * extracting twice from the same bytes throws. */
  pages: string[];
}

export interface IngestAccountResult {
  account: string;
  /** Null when no Statement row could be created (missing opening/closing balance) -- the
   * transactions are still stored, just not linked to a reconciled statement. */
  statementId: number | null;
  transactionsUpserted: number;
  reconciled: boolean | null;
  reconciliationDiff: string | null;
  openingBalance: string | null;
  closingBalance: string | null;
}

export interface IngestResult {
  period: StatementPeriod;
  accounts: IngestAccountResult[];
  gaps: ParseGap[];
}

/** Stable across re-ingests of the same statement, so re-running ingest is an upsert, never a
 * duplicate -- but two genuinely repeated transactions (same date/amount/description, e.g. two
 * identical coffee purchases the same day) still need distinct ids, hence `sequence`. */
function computeTransactionId(input: {
  sourceFile: string;
  sourcePage: number;
  date: string;
  amount: string;
  descriptionRaw: string;
  sequence: number;
}): string {
  const hash = crypto.createHash('sha256');
  hash.update(
    [input.sourceFile, input.sourcePage, input.date, input.amount, input.descriptionRaw, input.sequence].join('|'),
  );
  return hash.digest('hex').slice(0, 40);
}

function groupByAccount(transactions: ParsedTransaction[]): Map<string, ParsedTransaction[]> {
  const groups = new Map<string, ParsedTransaction[]>();
  for (const txn of transactions) {
    const bucket = groups.get(txn.account) ?? [];
    bucket.push(txn);
    groups.set(txn.account, bucket);
  }
  return groups;
}

export async function ingestBankStatement(input: IngestBankStatementInput): Promise<IngestResult> {
  const dataSource = await getBudgetDataSource();
  const { transactions: parsed, gaps, accountSummaries, period } = parseBankStatement(input.pages);

  if (!period) {
    throw new Error(
      `${input.sourceFile}: could not find a "STATEMENT PERIOD" header -- refusing to guess a year for transaction dates.`,
    );
  }

  const rules = await loadRules();
  const byAccount = groupByAccount(parsed);
  const accountNames = Array.from(new Set([...Array.from(byAccount.keys()), ...accountSummaries.map((s) => s.account)]));

  const accounts = await dataSource.transaction(async (manager) => {
    const statementRepo = manager.getRepository(Statement);
    const txnRepo = manager.getRepository(Transaction);
    const results: IngestAccountResult[] = [];

    for (const account of accountNames) {
      const accountTxns = byAccount.get(account) ?? [];
      const summary = accountSummaries.find((s) => s.account === account) ?? null;

      let statement: Statement | null = null;
      let reconciled: boolean | null = null;
      let reconciliationDiff: string | null = null;

      if (summary?.openingBalance != null && summary.closingBalance != null) {
        // Upsert keyed on (source_file, account) -- re-ingesting the same statement must update
        // this row, not duplicate it, matching how transactions are upserted by their stable id.
        await statementRepo.upsert(
          {
            sourceFile: input.sourceFile,
            account,
            periodStart: period.start,
            periodEnd: period.end,
            openingBalance: summary.openingBalance,
            closingBalance: summary.closingBalance,
            reconciled: false,
            reconciliationDiff: null,
          },
          ['sourceFile', 'account'],
        );
        statement = await statementRepo.findOneOrFail({ where: { sourceFile: input.sourceFile, account } });

        const reconciliation = reconcileStatement(
          summary.openingBalance,
          summary.closingBalance,
          accountTxns.map((t) => t.amount),
        );
        reconciled = reconciliation.reconciled;
        reconciliationDiff = reconciliation.diff;
        statement.reconciled = reconciliation.reconciled;
        statement.reconciliationDiff = reconciliation.diff;
        await statementRepo.save(statement);
      } else {
        gaps.push({
          sourcePage: accountTxns[0]?.sourcePage ?? 1,
          rawText: account,
          reason: `No opening/closing balance found for "${account}" -- transactions stored, but not linked to a reconciled statement.`,
        });
      }

      const rows = accountTxns.map((p) => {
        const match = categorize(p.descriptionClean, rules);
        const id = computeTransactionId({
          sourceFile: input.sourceFile,
          sourcePage: p.sourcePage,
          date: p.date,
          amount: p.amount,
          descriptionRaw: p.descriptionRaw,
          sequence: p.sequence,
        });
        return {
          id,
          sourceFile: input.sourceFile,
          sourcePage: p.sourcePage,
          account: p.account,
          date: p.date,
          descriptionRaw: p.descriptionRaw,
          descriptionClean: p.descriptionClean,
          amount: p.amount,
          runningBalance: p.runningBalance,
          internalTransfer: match?.category === 'INTERNAL_TRANSFER',
          category: match?.category ?? null,
          categorySource: match ? ('rule' as const) : null,
          categoryRule: match ? ({ id: match.ruleId } as CategoryRule) : null,
          suggestedCategory: null,
          suggestedBy: null,
          needsReview: !match,
          flaggedForFollowUp: false,
          statement: statement ? ({ id: statement.id } as Statement) : null,
        };
      });

      if (rows.length > 0) {
        await txnRepo.upsert(rows, ['id']);
      }

      results.push({
        account,
        statementId: statement?.id ?? null,
        transactionsUpserted: rows.length,
        reconciled,
        reconciliationDiff,
        openingBalance: summary?.openingBalance ?? null,
        closingBalance: summary?.closingBalance ?? null,
      });
    }

    return results;
  });

  return { period, accounts, gaps };
}
