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

**Required environment variables** (see `.env.local.example`), set in Vercel under Project
Settings -> Environment Variables:

| Variable | What it is |
|---|---|
| `JOB_HUNT_DASHBOARD_PASSWORD` | The password to enter the dashboard. Pick anything. |
| `JOB_HUNT_COOKIE_SECRET` | Random secret used to sign the auth cookie, not the password. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `JOB_HUNT_GH_TOKEN` | A **fine-grained** GitHub PAT scoped to only the `carson-job-hunt` repo, with **Contents: Read-only** permission and nothing else. Create at [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new). |

Once those three are set (and the deploy picks them up), the dashboard works with no other setup.
