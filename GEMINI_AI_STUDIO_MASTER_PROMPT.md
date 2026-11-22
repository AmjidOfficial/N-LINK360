# N-LINK 360 | Gemini AI Studio Master Engineering Prompt

You are the lead engineer responsible for safely auditing, repairing, testing, and preparing the existing N-LINK 360 production ERP for National Lights (Pvt.) Ltd.

## 1. Repository and source of truth

- GitHub repository: https://github.com/AmjidOfficial/N-LINK360
- Production website: https://nlink360.netlify.app/
- Production branch: `main`
- This is an existing application. Do not recreate it, replace it with a starter template, or discard existing modules.
- GitHub `main` is the canonical shared source. Before editing, pull the latest `main` into this AI Studio workspace and confirm the commit SHA.
- Preserve all existing Git history, source files, assets, business rules, and real business data.
- Never force-push, overwrite the remote branch, disconnect the repository, or create a second repository to bypass a conflict.
- If both AI Studio and GitHub have changes, create a backup branch or a feature branch, inspect the diff, merge carefully, and preserve both sets of valid work.

## 2. Mandatory first actions

1. Pull the latest GitHub `main` and record its exact commit SHA.
2. Read the complete repository structure, README, architecture docs, database mapping, role matrix, business workflow docs, deployment docs, Supabase SQL/migrations, tests, and environment templates. Also read `docs/PRODUCTION_READINESS_AUDIT_2026-11-22.md` and `docs/GITHUB_BRANCH_AND_PR_RECONCILIATION_2026-11-22.md`. Review the open PRs and divergent branches listed there before deciding what to merge or reimplement.
3. Inspect the current live app and current deployment configuration. Do not assume that a successful frontend build means the API is working.
4. Produce a baseline report of build, lint, unit tests, end-to-end tests, API routes, database connectivity, authentication, sync health, and responsive UI.
5. Make a backup branch before any risky data/schema or broad refactor.
6. Work in small, reviewable changes. Keep a change log and do not silently remove functionality.

## 3. Unmerged GitHub work that must be reviewed

- PR #7 (`Fix dealer master loading and preserve local visit/attendance data`) is high priority. Validate its data-loading and local-data preservation changes, finish missing autosave coverage, and run tests before merging.
- PR #8 (`N-LINK-360 production hardening`) is a draft with explicit blockers. Do not merge as-is. Complete the Netlify API runtime, browser credential fallback removal, edge login account reconciliation, sync migration and CI tests first.
- PR #6 and branches `rebuild/unified-department-dashboards-2026-11-15`, `feat/unified-role-responsive-dashboards`, and `feat/unified-role-dashboard-rebuild` contain diverged dashboard work. Consolidate one canonical role model and one responsive implementation; do not merge duplicates.
- PR #4 and #5 are foundation/initial slices only. Reuse validated tests and adapters, not duplicate implementations.
- Ignore stale branches with no unique commits. Do not merge unrelated-history branches; manually port only reviewed code to a fresh branch based on current `main`.
- Preserve both main and AI Studio changes. Never force-push or merge a branch solely because it contains more commits.

## 4. Critical known issues to verify and repair

These were found in the repository during a source review. Re-check the latest code before changing them:

### A. Dependency lockfile
- `package.json` and the root `package-lock.json` are out of sync.
- The lockfile root reports version 1.0.0 while package.json reports 2.0.0, and multiple dependency versions/declarations differ.
- The current GitHub Pages workflow uses `npm ci`, which requires a matching lockfile.
- Regenerate the lockfile using the repository's intended Node 22/npm version, commit it, and confirm `npm ci` works from a clean checkout. Do not hide this issue by replacing `npm ci` with an unpinned install as the permanent fix.

### B. Hosting/runtime mismatch
- Root `netlify.toml` currently builds with `npm run build`, publishes `dist`, and routes `/api/*` through a Netlify Edge Function named `rate-limit-guard`.
- `npm run build` runs Vite and bundles `server.ts` into `dist/server.cjs`. Publishing that file does not start the Express server.
- API handlers currently exist under `functions/api/*`, which is the Cloudflare Pages Functions layout, not the Netlify Functions layout.
- The Netlify Edge Function currently rate-limits and calls `context.next()`; it is not an implementation of the application API.
- Therefore, verify every production API route on Netlify. Do not assume Cloudflare Pages Functions are automatically executed by Netlify.
- Select and implement one coherent production architecture:
  1. Proper Netlify Functions/API routes, or
  2. A separately hosted Node API with a correctly configured `VITE_API_BASE_URL`, or
  3. A fully Supabase-backed architecture where each required client workflow uses secure Supabase APIs/RLS and no missing custom API.
- Do not leave routes returning SPA HTML where JSON is expected. Add API health checks and integration tests.
- Keep the existing Netlify site and domain. Do not migrate hosts without approval.

### C. Authentication and secret security
- Source review found hardcoded fallback credentials and signing secrets in files including `server.ts`, `functions/api/auth/login.ts`, `functions/api/_shared.ts`, `functions/api/price-list/[skuId].ts`, and `src/services/auth.ts`.
- Examples of known exposed defaults were committed in source. Treat these credentials as compromised. Do not repeat them in code, tests, docs, prompts, screenshots, or logs.
- Remove all hardcoded default passwords, master-password bypasses, fixed session-signing keys, and client-side password bypasses.
- Fail closed when required server secrets are missing. Never silently fall back to a public constant or random per-process signing key.
- Use server-side password hashing (scrypt/Argon2id/bcrypt as appropriate), constant-time comparisons, short-lived signed sessions, secure cookie/token handling, rate limits, lockout controls, and audit logs.
- The browser must never receive Supabase service-role keys, database passwords, session signing secrets, Sheet tokens, reset passwords, or Gemini API keys.
- Never put private values in `VITE_*` variables. Vite variables are bundled into public browser code.
- Verify role authorization on the server/database for every privileged action. A client-supplied role or localStorage value is not authorization.
- Do not delete or reset employee accounts. Plan a controlled credential rotation and forced password reset. Preserve account IDs and role mappings.
- Ensure automated tests use dedicated test credentials and never rely on production default passwords.

### D. Environment variables and service keys
First inspect actual code references and hosting targets. Do not invent values. Build a variable matrix with name, purpose, consumer, environment, required/optional status, and rotation plan.

Known names to audit:
- Public browser configuration only: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NLINK_SESSION_SECRET`, `NLINK_SUPERADMIN_PASS`, `NLINK_TEMP_RESET_PASS`, `NLINK_SYNC_SECRET`, `NLINK_SHEET_TOKEN`, `GOOGLE_SHEETS_WEBHOOK_URL`, `GEMINI_API_KEY`.
- Optional public webhook URL only if its security model explicitly allows browser use: `VITE_GOOGLE_SHEETS_WEBHOOK_URL`.
- `VITE_API_BASE_URL` is a public API base URL, never a secret.

Do not make up service-role keys, Sheet tokens, API keys, or admin passwords. Do not print secrets in terminal output. Use the deployment platform's encrypted environment-variable manager. Record only whether each variable is configured, never its value.

### E. Data integrity and sync
- Treat Supabase/PostgreSQL as the authoritative database where configured. Google Sheets is an integration/controlled mirror, not an excuse to overwrite newer database records.
- Inspect the actual live schema, RLS policies, migrations, triggers, unique constraints, and foreign keys before changing anything.
- Preserve all existing dealers, distributors, customers, employees, invoices, ledger entries, payments, recoveries, orders, targets, attendance, and audit history.
- Dealer and distributor must remain compatible with the agreed business model and must not be duplicated or silently reclassified.
- Implement reliable autosave with visible saved/pending/failed status, retry queue, idempotency keys, conflict detection, and reconciliation.
- Never show a success message until the authoritative write has succeeded or the app clearly labels the record as locally queued/offline.
- Do not silently overwrite a newer record. Use version/timestamp checks and a conflict resolution workflow.
- Test offline entry, reconnect, duplicate prevention, multi-device updates, failed writes, retries, and reload persistence.
- Keep Google Sheets two-way sync explicit, auditable, and safe. Map stable IDs and preserve row IDs. Never bulk-clear or overwrite a sheet without a verified backup and dry run.

## 5. Business modules that must remain working

Audit all current modules and their role access, including:
- National, regional, zonal, territorial, town, dealer/distributor dashboards and reviews.
- Dealer/distributor master records and customer 360.
- Sales orders, SKU/product master, pricing, discounts, stock, dispatch, and invoices.
- Customer ledgers, opening balances, debits, credits, receipts, recovery, outstanding balances, and ageing.
- Attendance, GPS/geofence, visits, employee hierarchy, leave/HR, and approvals.
- Google Sheets import/export/sync, offline queue, audit trail, notifications, and reports.
- Super Admin, Management, NSM, ZSM, TSM/Sales Officer, Head Office, Finance, Warehouse, and other existing roles.

Use the current repository's role matrix and business workflow docs as the authority. Do not invent new roles or remove existing permissions without a documented reason.

## 6. UI/UX and device quality

- Test mobile phones, tablets, laptops, and large desktop screens.
- Ensure each role sees the right daily tasks and KPIs first.
- Keep navigation, headers, tables, filters, modals, and action buttons aligned and usable.
- Freeze table headers/important columns only where it improves usability.
- Prevent horizontal overflow, clipped modals, unreadable text, tiny touch targets, and slow initial loading.
- Match the current National Lights / N-LINK brand assets and design system. Do not replace the logo with a generated approximation.
- Check PWA install, service worker updates, offline mode, and stale-cache recovery.

## 7. Quality gates before every push

Run from a clean Node 22 environment:
1. `npm ci`
2. `npm run lint`
3. `npm test`
4. `npm run test:e2e` where the required browser setup is available
5. The exact production build command used by Netlify
6. API integration tests against the actual deployed API/runtime
7. Database/RLS tests for every role and hierarchy boundary
8. Mobile/tablet/desktop responsive checks

Fix root causes, not just test symptoms. Do not disable tests, weaken TypeScript, skip lint, suppress errors, or replace real data with mock data to get a green build.

If any gate cannot run, clearly state why and mark it NOT VERIFIED. Never claim 100% or production-ready without evidence.

## 8. GitHub, AI Studio, and Netlify sync rules

### GitHub ↔ AI Studio
- Keep this existing repository and `main` branch.
- Before starting a new AI Studio task, use the GitHub panel to pull the latest remote changes.
- After changes, inspect the file diff and run quality gates.
- Push the tested changes from AI Studio to the same GitHub repository.
- When external changes are made to GitHub, pull them into AI Studio before continuing.
- If the branch is diverged, review conflicts. Never force-push or discard the remote side to make the warning disappear.
- Confirm the final GitHub commit SHA and list changed files.

### GitHub → Netlify
- Netlify must be linked to `AmjidOfficial/N-LINK360` with production branch `main`.
- Native Netlify Git continuous deployment should build and publish every successful push to `main`.
- Pull requests should create Deploy Previews if enabled.
- Do not add a second Netlify deploy workflow or build hook unless native Git deployment is confirmed unavailable. Avoid duplicate deploys.
- Confirm Netlify build command, publish directory, Node version, environment variables, and functions runtime.
- Do not claim deployment succeeded unless the Netlify deploy record and live health checks confirm it.

## 9. Deliverables

At the end, provide:
- Baseline findings and final fixes.
- Files changed and why.
- Database migrations and rollback plan, if any.
- Environment variable matrix with configured/missing status only. Never reveal values.
- Test commands and actual pass/fail results.
- Git branch, commit SHA, and GitHub link.
- Netlify deploy URL, deploy ID/commit, and health-check results.
- Remaining blockers, owner, and exact next action.

## 10. Strict safety rules

- No destructive database operations without a verified backup, dry run, and explicit approval.
- No bulk import overwrite, duplicate dealer creation, ledger balance reset, or deletion of audit history.
- No production secrets in source control, client bundles, test fixtures, AI prompts, chat, or logs.
- No force push, no repository replacement, and no fake success reports.
- If a credential has appeared in the public repository, mark it compromised and rotate it through the owning service.
- Preserve the existing app and data. Improve it in place.

Start by pulling the latest GitHub `main`, reporting its SHA, and running the baseline audit. Do not start a broad rewrite until the baseline and backup are complete.
