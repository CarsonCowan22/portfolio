import './budgetLoadEnv';
import { claimSetupToken, fetchAccounts } from '../lib/budget/simplefin/client';

const USAGE = [
  'Usage:',
  '  pnpm budget:simplefin:setup <setup-token>   Claim a one-time setup token, print the Access URL',
  '                                               to paste into SIMPLEFIN_ACCESS_URL.',
  '  pnpm budget:simplefin:setup -- --list-accounts',
  '                                               List every linked SimpleFIN account (id, name,',
  '                                               balance) using the already-set SIMPLEFIN_ACCESS_URL,',
  '                                               to help fill in SIMPLEFIN_ACCOUNT_MAP.',
].join('\n');

async function main() {
  // `pnpm run <script> -- --list-accounts` inserts a literal "--" into argv ahead of the flag
  // (visible in `tsx scripts/... "--" "--list-accounts"`) -- strip it so it's never mistaken for
  // the setup token itself.
  const arg = process.argv.slice(2).filter((a) => a !== '--')[0];

  if (!arg) {
    console.log(USAGE);
    process.exit(1);
  }

  if (arg === '--list-accounts') {
    const accessUrl = process.env.SIMPLEFIN_ACCESS_URL;
    if (!accessUrl) {
      throw new Error('SIMPLEFIN_ACCESS_URL is not set in .env.local -- run the setup-token step first.');
    }
    const accounts = await fetchAccounts({ accessUrl, balancesOnly: true });
    console.log(`${accounts.length} linked account(s):\n`);
    for (const account of accounts) {
      console.log(`  ${account.id}  ${account.name}  (balance: ${account.balance})`);
    }
    console.log('\nAdd the ones you want synced to SIMPLEFIN_ACCOUNT_MAP, e.g.:');
    console.log(`  SIMPLEFIN_ACCOUNT_MAP={"${accounts[0]?.id ?? 'ACT-...'}":"360 Checking"}`);
    process.exit(0);
  }

  const accessUrl = await claimSetupToken(arg);
  console.log('Claimed. Paste this into SIMPLEFIN_ACCESS_URL (.env.local and Vercel):\n');
  console.log(accessUrl);
  console.log('\nThen run: pnpm budget:simplefin:setup -- --list-accounts');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
