import crypto from 'node:crypto';
import { getBudgetDataSource } from './dataSource';
import { CategoryRule } from './entities/CategoryRule';
import { Statement } from './entities/Statement';
import { Transaction } from './entities/Transaction';
import { extractPdfText } from './parser/pdfText';
import { parseBankStatement } from './parser/bankStatement';
import type { ParseGap } from './parser/types';
import { categorize, loadRules } from './rules';
import { reconcileStatement } from './reconcile';

export interface IngestBankStatementInput {
  sourceFile: string;
  fileBytes: Uint8Array;
  account: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: string;
  closingBalance: string;
}

export interface IngestResult {
  statementId: number;
  transactionsUpserted: number;
  gaps: ParseGap[];
  reconciled: boolean;
  reconciliationDiff: string;
}

/** Stable across re-ingests of the same statement, so re-running ingest is an upsert, never a duplicate. */
function computeTransactionId(input: {
  sourceFile: string;
  sourcePage: number;
  date: string;
  amount: string;
  descriptionRaw: string;
}): string {
  const hash = crypto.createHash('sha256');
  hash.update([input.sourceFile, input.sourcePage, input.date, input.amount, input.descriptionRaw].join('|'));
  return hash.digest('hex').slice(0, 40);
}

export async function ingestBankStatement(input: IngestBankStatementInput): Promise<IngestResult> {
  const dataSource = await getBudgetDataSource();
  const { pages } = await extractPdfText(input.fileBytes);
  const { transactions: parsed, gaps } = parseBankStatement(pages, {
    defaultAccount: input.account,
    period: { start: input.periodStart, end: input.periodEnd },
  });

  const rules = await loadRules();

  return dataSource.transaction(async (manager) => {
    const statementRepo = manager.getRepository(Statement);
    const txnRepo = manager.getRepository(Transaction);

    const statement = await statementRepo.save(
      statementRepo.create({
        sourceFile: input.sourceFile,
        account: input.account,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        openingBalance: input.openingBalance,
        closingBalance: input.closingBalance,
        reconciled: false,
        reconciliationDiff: null,
        verifiedByHuman: false,
        overrideReason: null,
      }),
    );

    const rows = parsed.map((p) => {
      const match = categorize(p.descriptionClean, rules);
      const id = computeTransactionId({
        sourceFile: input.sourceFile,
        sourcePage: p.sourcePage,
        date: p.date,
        amount: p.amount,
        descriptionRaw: p.descriptionRaw,
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
        statement: { id: statement.id } as Statement,
      };
    });

    if (rows.length > 0) {
      await txnRepo.upsert(rows, ['id']);
    }

    const reconciliation = reconcileStatement(
      input.openingBalance,
      input.closingBalance,
      parsed.map((p) => p.amount),
    );
    statement.reconciled = reconciliation.reconciled;
    statement.reconciliationDiff = reconciliation.diff;
    await statementRepo.save(statement);

    return {
      statementId: statement.id,
      transactionsUpserted: rows.length,
      gaps,
      reconciled: reconciliation.reconciled,
      reconciliationDiff: reconciliation.diff,
    };
  });
}
