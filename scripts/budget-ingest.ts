import './budgetLoadEnv';
import fs from 'node:fs';
import path from 'node:path';
import { ingestBankStatement } from '../lib/budget/ingest';
import { extractPdfText } from '../lib/budget/parser/pdfText';
import { parseCreditCardStatement } from '../lib/budget/parser/creditCardStatement';

const ACCOUNT_HEADER_HINT = /(360 Checking|Personal|360 Performance Savings)\s*-\s*\d+/;

async function main() {
  const file = process.argv[2];
  if (!file) {
    throw new Error('Usage: pnpm budget:ingest <statement.pdf>');
  }

  const absolutePath = path.resolve(process.cwd(), file);
  const fileBytes = new Uint8Array(fs.readFileSync(absolutePath));
  const sourceFile = path.basename(absolutePath);

  const { pages } = await extractPdfText(fileBytes);
  const fullText = pages.join('\n');
  const isBankStatement = ACCOUNT_HEADER_HINT.test(fullText);

  if (!isBankStatement) {
    // Credit card statements are an account-summary block, not a transaction ledger -- report
    // the extracted numbers instead of forcing them into the transactions/statements schema.
    const summary = parseCreditCardStatement(fullText);
    console.log(`${sourceFile}: looks like a credit card statement, not a bank statement.`);
    console.log('Extracted summary (not written to the database):');
    console.log(`  New balance:          ${summary.newBalance ?? '(not found)'}`);
    console.log(`  Minimum payment due:  ${summary.minimumPaymentDue ?? '(not found)'}`);
    console.log(`  Payment due date:     ${summary.paymentDueDate ?? '(not found)'}`);
    console.log(`  Purchase APR:         ${summary.purchaseApr ?? '(not found)'}`);
    process.exit(0);
  }

  const result = await ingestBankStatement({ sourceFile, pages });

  console.log(`${sourceFile}: statement period ${result.period.start} to ${result.period.end}`);
  for (const account of result.accounts) {
    const balanceInfo =
      account.openingBalance != null && account.closingBalance != null
        ? `opening ${account.openingBalance} -> closing ${account.closingBalance}`
        : 'no opening/closing balance found';
    const reconciledInfo =
      account.reconciled === null
        ? 'not reconciled (no statement record)'
        : account.reconciled
          ? 'reconciled'
          : `NOT reconciled (diff ${account.reconciliationDiff})`;
    console.log(`  ${account.account}: ${account.transactionsUpserted} transaction(s), ${balanceInfo}, ${reconciledInfo}`);
  }

  if (result.gaps.length > 0) {
    console.log(`\n${result.gaps.length} line(s) need a look -- reconcile manually:`);
    for (const gap of result.gaps) {
      console.log(`  page ${gap.sourcePage}: ${gap.reason}${gap.rawText ? `\n    "${gap.rawText}"` : ''}`);
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
