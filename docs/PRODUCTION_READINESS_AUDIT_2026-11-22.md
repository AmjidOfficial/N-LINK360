# N-LINK 360 Production Readiness Audit (2026-11-22)

## Scope and evidence

This is a repository-source audit of the GitHub `main` branch. It is not a live Netlify account audit and does not prove that the production database or deployment is healthy.

Repository: https://github.com/AmjidOfficial/N-LINK360  
Production URL: https://nlink360.netlify.app/  
Branch reviewed: `main`  
Reviewed source commit before this report: `defca0a546fdc75feb8c223e050387a089d96622`

The Gemini AI Studio master engineering prompt is stored at the repository root in `GEMINI_AI_STUDIO_MASTER_PROMPT.md`.

## Critical findings

### 1. Public source contains hardcoded authentication fallbacks

Confirmed in source:
- `server.ts` creates initial passwords from hardcoded fallback strings when environment values are absent.
- `functions/api/auth/login.ts` contains a hardcoded master-password fallback and accepts legacy initial-password values.
- `functions/api/_shared.ts` uses a fixed default HMAC signing key when no secret is configured.
- `functions/api/price-list/[skuId].ts` uses the same fallback signing key.
- `src/services/auth.ts` contains client-side password bypass checks.

Because the repository is public, every hardcoded credential or fallback in source must be treated as compromised. Rotate affected credentials in the owning services and remove the source-level bypasses. Do not paste old or replacement secrets into GitHub, AI Studio prompts, or chat.

### 2. Netlify and Cloudflare runtime layouts are mixed

Confirmed in source:
- `netlify.toml` publishes `dist` and maps `/api/*` through the Netlify Edge Function `rate-limit-guard`.
- `functions/api/*` follows the Cloudflare Pages Functions directory convention.
- `netlify/edge-functions/rate-limit-guard.ts` performs rate limiting and then calls `context.next()`; it is not the application API implementation.
- `npm run build` bundles `server.ts` into `dist/server.cjs`, but a static Netlify publish does not start that Express server.

The production API architecture must be selected and implemented before claiming that all API routes work on Netlify. Test real API endpoints and verify they return JSON, not the SPA fallback HTML.

### 3. Dependency lockfile mismatch

Confirmed:
- `package.json` declares version `2.0.0`.
- The root `package-lock.json` root package metadata declares version `1.0.0`.
- The root dependency declarations differ between `package.json` and `package-lock.json`.
- The current GitHub Pages workflow uses `npm ci`, which requires the lockfile to match the package manifest.

Regenerate and commit the lockfile using Node 22 and the repository's intended npm version. Verify `npm ci` from a clean checkout.

### 4. Two deployment paths exist

- `.github/workflows/deploy-pages.yml` deploys GitHub Pages on pushes to `main`.
- `netlify.toml` describes a Netlify build.
- A GitHub Pages workflow run is not proof of a Netlify deploy.
- Netlify native Git continuous deployment must be verified in the Netlify account: repository, production branch, auto-publishing, build command, publish directory, environment variables, and latest published commit.

Do not add a second Netlify deployment workflow if native Netlify Git deployment is already connected.

## Environment variables: configure securely

The exact list must be confirmed against the final selected runtime and code references. Current repository templates mention:

| Variable | Intended use | Exposure |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Public browser build |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key, protected by RLS | Public browser build |
| `SUPABASE_URL` | Server-side Supabase project URL | Server only |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-side Supabase access | Server only, highly sensitive |
| `NLINK_SESSION_SECRET` | HMAC/session signing | Server only, highly sensitive |
| `NLINK_SUPERADMIN_PASS` | Controlled bootstrap/admin credential if still required | Server only, rotate and force reset |
| `NLINK_TEMP_RESET_PASS` | Temporary reset/bootstrap credential if still required | Server only, short-lived |
| `NLINK_SYNC_SECRET` | Sync endpoint authentication if implemented | Server only |
| `NLINK_SHEET_TOKEN` | Google Sheets integration token if implemented | Server only |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Server-side Apps Script endpoint | Server only unless explicitly designed as public |
| `VITE_GOOGLE_SHEETS_WEBHOOK_URL` | Public Apps Script endpoint only if intentionally safe for browser access | Public browser build |
| `GEMINI_API_KEY` | Server-side Gemini API calls | Server only |
| `VITE_API_BASE_URL` | Public URL of a separately hosted API | Public browser build |

Never use a `VITE_` prefix for private keys. Never commit real values. Never include secrets in an AI prompt. Record configuration status only, not the value.

## Changes made by this audit pass

- Added `GEMINI_AI_STUDIO_MASTER_PROMPT.md` to guide the next full engineering pass.
- No production secrets were created or changed.
- No database records, schemas, employee accounts, dealer records, ledgers, invoices, or other business data were modified.
- No Netlify account settings were changed.
- No live deployment is claimed by this report.

## Required next actions

1. Rotate all credentials exposed in public source, using the owning service's secure settings.
2. Remove hardcoded password fallbacks and default signing keys from server, Cloudflare function, and browser authentication code.
3. Choose and complete a single supported Netlify API/runtime architecture.
4. Regenerate and commit `package-lock.json`; verify `npm ci`, lint, tests, and production build.
5. Verify Netlify Git connection to this repository and `main`, then confirm a push creates a new production deploy.
6. Connect the existing repository in Google AI Studio Build mode. Pull before work and push only reviewed changes. Never force-push a divergent branch.
7. Run role-based, financial-ledger, dealer/distributor, offline autosave, Google Sheets sync, and responsive regression tests against backed-up data.

## Verification status

| Area | Status |
|---|---|
| GitHub repository read access | Verified |
| Repository source findings above | Verified by source inspection |
| Master prompt committed | Verified |
| Clean install / npm ci | Not verified |
| Lint and unit tests | Not verified |
| End-to-end tests | Not verified |
| Netlify Git connection and auto-publishing | Not verified |
| Netlify production deploy after changes | Not verified |
| Production API health | Not verified |
| Supabase production schema / RLS / data integrity | Not verified |
| Google Sheets live two-way sync | Not verified |
| Credential rotation | Not performed |

This report is intentionally strict. A green frontend build alone is not enough to mark N-LINK 360 production-ready.
