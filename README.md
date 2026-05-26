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