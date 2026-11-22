# N-LINK 360 GitHub Branch and Pull Request Reconciliation (2026-11-22)

## Why this review exists

The repository has multiple active and historical branches. Importing only `main` into Google AI Studio does not automatically bring every unmerged branch's work into the workspace. Do not merge every branch. Review each branch/PR, select valid changes, resolve conflicts, and test them against the current `main`.

Current `main` at time of review: `b24b1d0c74960d52e969a5f89ffad6c7fcba8c9b`.

## Open pull requests found

| PR | Title | Current state from PR description | Required action |
|---|---|---|---|
| [#8](https://github.com/AmjidOfficial/N-LINK360/pull/8) | N-LINK-360 production hardening | Draft; explicitly not ready to merge. Netlify API routing, browser credential fallback, edge login seed accounts, role reconciliation, sync migration and full CI remain open. | Review and complete security work in a controlled branch. Do not merge yet. |
| [#7](https://github.com/AmjidOfficial/N-LINK360/pull/7) | Fix dealer master loading and preserve local visit/attendance data | Latest deploy preview pending. Adds party/ERP product loading and prevents cached visits/attendance from being overwritten with empty arrays. Does not yet implement universal autosave. | High priority: validate diff and tests, complete autosave and source-of-truth checks, then request review. |
| [#6](https://github.com/AmjidOfficial/N-LINK360/pull/6) | Unified roles, hierarchy and responsive department dashboards | Draft; KPI blueprints, factory data, RLS/scope and device tests still open. | Reconcile with approved role decisions and test. Do not merge yet. |
| [#5](https://github.com/AmjidOfficial/N-LINK360/pull/5) | Rebuild unified roles and responsive department dashboards | Initial slice only; not production-ready. | Reuse only validated components/tests. |
| [#4](https://github.com/AmjidOfficial/N-LINK360/pull/4) | Rebuild unified role and department dashboards | Foundation only; not production-ready. | Review for reusable role adapter and tests. Avoid duplicate implementations. |

## Branch comparison against main

Comparison uses GitHub's compare endpoint. "Ahead" means commits unique to that branch; "behind" means main has commits not present in that branch.

| Branch | Status vs main | Ahead | Behind | Notes |
|---|---|---:|---:|---|
| `ai-studio-sync-2026-11-12` | behind | 0 | 24 | No unique commits; stale. |
| `fix/auth-and-google-sheet-sync-2026-11-15` | behind | 0 | 16 | No unique commits; stale. |
| `fix/data-recovery-autosave-2026-11-21` | diverged | 11 | 10 | Includes PR #7 work: data loading, preservation of local visit/attendance, source-of-truth guide and quality checks. |
| `security/nlink-production-hardening` | diverged | 9 | 8 | Includes PR #8 work: auth/session hardening, sync reliability, migrations. Explicitly incomplete. |
| `rebuild/unified-department-dashboards-2026-11-15` | diverged | 34 | 14 | Large dashboard rebuild; compare carefully with PR #6 and #5 to avoid duplicate/conflicting role models. |
| `feat/unified-role-responsive-dashboards` | diverged | 8 | 15 | Earlier responsive dashboard work. |
| `feat/unified-role-dashboard-rebuild` | diverged | 9 | 15 | Earlier role/dashboard foundation. |
| `feature/salespulse-clone-dealer-distributor` | diverged | 3 | 49 | Historical sales/dealer/distributor adapter work. |
| `production-final-hardening-20260912` | diverged | 6 | 49 | Historical production migration and checklist work. |
| `production-rebuild-2026-09-12` | diverged | 5 | 50 | Historical auth/navigation rebuild. |
| `fix/production-auth-security` | no common ancestor | — | — | Do not merge; inspect only for ideas and provenance. |
| `feature/sales-hierarchy-foundation` | no common ancestor | — | — | Do not merge; inspect only for ideas and provenance. |

## Mandatory reconciliation order for Gemini AI Studio

1. Pull current `main` and record the exact SHA.
2. Read PR #7 first. It addresses dealer/distributor loading and local visit/attendance preservation. Check its current head, latest Netlify preview, tests, and diff. Re-implement or cherry-pick only the valid changes onto a fresh branch from current `main`.
3. Read PR #8 and its security branch. The draft itself lists unresolved blockers. Complete the security work; do not merge the draft as-is.
4. Read PR #6 and the dashboard branches. Consolidate into one canonical implementation. Approved decisions: Dealer and Distributor share one portal/permission group while retaining their separate business types and data scope; TSM/Sales Officer share one canonical sales role; one responsive app across devices; management preview is read-only and cannot widen data scope.
5. Review PR #4 and #5 for reusable role adapters and tests, but avoid duplicate blueprints or competing role models.
6. Ignore stale branches with no unique commits unless a specific historical file is needed.
7. Do not merge unrelated-history branches. Copy only reviewed changes manually into a branch based on current `main`.
8. Before merging anything, run clean install, lint, unit tests, production build, API tests, RLS/role-scope tests, and responsive tests. Check the live data snapshot and preserve all records.
9. Close or mark obsolete branches/PRs only after the owner approves. Do not delete branches or close PRs as part of automatic cleanup.

## Critical data and deployment context

The live Supabase audit on 2026-11-22 found 0 rows in `employees`, `customers`, `sales_orders`, `orders`, `invoices`, `ledger_entries`, `party_ledgers`, `recoveries`, `products`, and `skus`. It found 3 `parties`, 4 `profiles`, 4 `erp_products`, 1 active sheet sync token, and 0 Google Sheet sync run records. This is not proof that the business data is gone: historical records may exist in Google Sheets or users' browser storage. Do not import, clear, or seed until the source has been exported and reconciled by stable IDs.

The active code's `functions/api/*` directory is Cloudflare Pages Functions layout. Netlify does not automatically execute it. The current Netlify Edge Function is only a rate-limit wrapper. Complete a real Netlify API architecture or obtain approval to use Cloudflare Pages, then verify every endpoint.

## Safety

This review is read-only. No PRs were merged, no branches were deleted, no Supabase data was modified, and no production deployment was made by this review.
