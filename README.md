# Carson Cowan Portfolio

Production-ready Next.js 14 portfolio for Carson Cowan, built with TypeScript, CSS Modules, and local font assets.

## Setup

```bash
pnpm install
pnpm dev       # development server at localhost:3000
pnpm build     # production build
pnpm start     # serve production build
```

## Image swap instructions

When the work screenshots are ready, replace the `<Placeholder>` components in `components/Work/WorkCard.tsx` with Next.js `<Image>` components that point to the matching file in `/public/images/`.

Minimum asset sizes:

- `privix.jpg` - 1200×800px minimum
- `tec-solar.jpg` - 1400×900px minimum
- `cad-automation.jpg` - use a permit-ready CAD plan set or a before/after workflow comparison

The placeholder copy in the site already documents the expected image path and dimensions.

## GitHub Pages

Yes, this can run on GitHub Pages as a static export.

Use these PowerShell commands for a project page deployment:

```powershell
$env:EXPORT_STATIC='true'
$env:NEXT_PUBLIC_BASE_PATH='/carson-portfolio'
pnpm build
```

If your GitHub Pages repo name is different, replace `/carson-portfolio` with that repo name. For a user/organization site, you can omit `NEXT_PUBLIC_BASE_PATH`.

Deploy the generated `out/` folder to GitHub Pages.

## Deployment

Deploy to Vercel with zero extra configuration. Push to GitHub, import the repo into Vercel, and deploy. No environment variables are required for the base portfolio unless you want a GitHub Pages static export.

## Private job hunt dashboard (`/dashboard/job-hunt`)

A password-gated route that reads data server-side from the private `CarsonCowan22/carson-job-hunt`
repo (evaluated postings, the latest digest, the networking tracker) and renders it -- nothing is
fetched or stored client-side, and the route is excluded from search indexing.

**How it works:**

- `middleware.ts` guards every `/dashboard/*` route except `/dashboard/login`, checking for a
  signed cookie (HMAC-SHA256 via Web Crypto, so the same code runs in both the Edge middleware
  runtime and the Node API route runtime).
- `/dashboard/login` posts a plain HTML form to `/api/dashboard/login`, which checks the submitted
  password against `JOB_HUNT_DASHBOARD_PASSWORD` and, on success, sets the signed cookie.
- `app/dashboard/job-hunt/page.tsx` is a Server Component that fetches
  `data/evaluated_jobs.csv`, `data/networking.csv`, and the latest file in `digests/` from the
  private repo via GitHub's Contents API (`lib/githubRepo.ts`), using `JOB_HUNT_GH_TOKEN` --
  server-only, never sent to the browser.
- If the token is missing or GitHub is unreachable, each section degrades to an empty state
  instead of a hard error.

**Required environment variables** (see `.env.example`), set in Vercel under Project
Settings -> Environment Variables:

| Variable | What it is |
|---|---|
| `JOB_HUNT_DASHBOARD_PASSWORD` | The password to enter the dashboard. Pick anything. |
| `JOB_HUNT_COOKIE_SECRET` | Random secret used to sign the auth cookie, not the password. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `JOB_HUNT_GH_TOKEN` | A **fine-grained** GitHub PAT scoped to only the `carson-job-hunt` repo, with **Contents: Read-only** permission and nothing else. Create at [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new). |

Once those three are set (and the deploy picks them up), the dashboard works with no other setup.

## Private budget tool (`/budget`, or `budget.<your-domain>`)

A transaction-level budget/categorization tool: every dollar traces to a real, parsed transaction,
and every category is either a deterministic rule match or a human-confirmed choice -- never a
silent AI guess. Full design rationale in `lib/budget/`.

**How it works:**

- Bank statement PDFs are parsed **locally**, never uploaded to the deployed app: run
  `pnpm budget:ingest <statement.pdf>` against a `DATABASE_URL` pointed at your Postgres instance.
  The statement period and each account's opening/closing balance are auto-detected from the PDF
  text (`lib/budget/parser/bankStatement.ts`) -- no manual flags needed. Parsing uses `unpdf` (no
  `pdftotext`/poppler binary needed) and any line it can't confidently parse is reported, never
  silently dropped or guessed. If the PDF is a credit card statement rather than a bank statement,
  the script instead prints an account-summary (new balance, minimum payment, due date, APR)
  without writing anything to the database.
- Categorization runs against `category_rules` in Postgres (seeded from
  `data/budget/seed-rules.json` via `pnpm budget:seed-rules`), first match wins by priority. A
  transaction with no rule match is `needs_review`, full stop.
- The web UI (`/budget/*`) is where you review `needs_review` transactions, confirm or correct a
  category (optionally turning it into a rule so the same merchant never needs review again), edit
  rules directly, and see per-statement reconciliation status (opening balance + parsed
  transactions == closing balance, within $0.01 -- if not, that statement is flagged and its
  numbers are excluded from being "final").
- Auth mirrors the job-hunt dashboard (signed HMAC cookie via `middleware.ts`), but with its own
  password/secret/cookie -- logging into one never grants access to the other.
- `middleware.ts` also does hostname-based rewriting: on `budget.<your-domain>`, "/", "/review",
  "/rules", "/transactions" behave as `/budget`, `/budget/review`, etc. On the main domain,
  `/budget/*` works directly (handy for local dev without a second hostname).

**Required environment variables** (see `.env.example`):

| Variable | What it is |
|---|---|
| `DATABASE_URL` | A Postgres connection string (Neon or Vercel Postgres both work). |
| `BUDGET_DASHBOARD_PASSWORD` | The password to enter the budget tool. |
| `BUDGET_COOKIE_SECRET` | Random secret used to sign the auth cookie. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |

**One-time setup, after the env vars above are set in Vercel:**

```bash
pnpm budget:migrate      # creates the transactions/statements/category_rules tables
pnpm budget:seed-rules   # loads data/budget/seed-rules.json
```

**To actually get `budget.<your-domain>` working as a real subdomain:**

1. Vercel project -> Settings -> Domains -> add `budget.<your-domain>`.
2. At your DNS registrar, add the CNAME record Vercel shows you for that subdomain.
3. Once DNS propagates, `budget.<your-domain>` serves the tool at clean paths (no `/budget` prefix
   needed in the address bar).

Running `pnpm budget:test` runs the parser/reconciliation/rules unit tests (Node's built-in test
runner, no extra framework) against fixture text -- there's no substitute for verifying against a
real statement on first ingest, since the parser was built without one to test against.
