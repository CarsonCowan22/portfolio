import './budgetLoadEnv';
import fs from 'node:fs';
import path from 'node:path';
import { ingestBankStatement } from '../lib/budget/ingest';

function parseArgs(argv: string[]) {
  const [file, ...rest] = argv;
  if (!file) {
    throw new Error(
      'Usage: pnpm budget:ingest <statement.pdf> --account "360 Checking" ' +
        '--period-start 2026-01-01 --period-end 2026-01-31 --opening 1234.56 --closing 987.65',
    );
  }

  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i]?.replace(/^--/, '');
    const value = rest[i + 1];
    if (!key || value === undefined) throw new Error(`Malformed argument near "${rest[i]}"`);
    flags[key] = value;
  }

  for (const required of ['account', 'period-start', 'period-end', 'opening', 'closing']) {
    if (!flags[required]) throw new Error(`Missing required --${required}`);
  }

  return {
    file,
    account: flags.account,
    periodStart: flags['period-start'],
    periodEnd: flags['period-end'],
    opening: flags.opening,
    closing: flags.closing,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const absolutePath = path.resolve(process.cwd(), args.file);
  const fileBytes = new Uint8Array(fs.readFileSync(absolutePath));

  const result = await ingestBankStatement({
    sourceFile: path.basename(absolutePath),
    fileBytes,
    account: args.account,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
    openingBalance: args.opening,
    closingBalance: args.closing,
  });

  console.log(`Statement #${result.statementId}: upserted ${result.transactionsUpserted} transaction(s).`);
  console.log(`Reconciled: ${result.reconciled ? 'YES' : `NO (diff ${result.reconciliationDiff})`}`);

  if (result.gaps.length > 0) {
    console.log(`\n${result.gaps.length} line(s) could not be confidently parsed -- reconcile manually:`);
    for (const gap of result.gaps) {
      console.log(`  page ${gap.sourcePage}: ${gap.reason}\n    "${gap.rawText}"`);
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
