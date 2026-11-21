# N-LINK 360 source of truth

## Active application

The production application is built from the **repository root**.

Use these root-level paths for all current work:

- `src/`
- `public/`
- `package.json` and `package-lock.json`
- `vite.config.ts`
- `netlify.toml`
- `database/migrations/`
- `.github/workflows/`

Netlify's build command is `npm run build` and its publish directory is `dist`, as configured in the root `netlify.toml`.

## Archived duplicate

`Downloads/n-link-360/` contains a second, older copy of the project. It has a different package version and a different Vite configuration. It is **not** the active Netlify application build.

Do not make current production changes only inside `Downloads/n-link-360/`. Do not delete that folder as part of routine cleanup because it may contain useful historical reference material.

## Before every release

1. Confirm changes are in root-level source files.
2. Run `npm ci`.
3. Run `npm run lint`.
4. Run `npm test`.
5. Run `npm run build`.
6. Review the Netlify deploy preview before merging to `main`.
7. Confirm the production deployment and database data after release.

## Data safety

Never clear browser storage, pending sync queues, Google Sheets tabs, or database records to make the interface appear clean. Export and verify a backup first. Reconcile records by stable business identifiers and preserve the original source IDs and audit history.
