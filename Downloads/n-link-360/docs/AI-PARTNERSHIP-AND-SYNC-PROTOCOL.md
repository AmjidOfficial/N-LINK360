# N-LINK 360 AI Partnership & Sync Protocol

## Project ownership

N-LINK 360 is a National Lights project. The repository on GitHub is the canonical source of code and project documents.

ChatGPT and Gemini AI Studio are development partners. Neither tool is the production source of truth by itself.

## Responsibilities

### ChatGPT
- Architecture and system design
- Database/data integrity review
- Security/RLS review
- Business workflow decisions
- Cross-module consistency
- Code/repository review
- Release acceptance criteria

### Gemini AI Studio
- UI implementation and refinement
- Frontend interaction work
- Rapid prototyping
- Responsive styling
- Local development/build assistance

### GitHub
- Canonical source control
- Version history
- Reviewable commits
- Recovery point

### Supabase
- Production data/auth source of truth
- PostgreSQL transactions
- RLS/security
- Storage

## Golden rule

Before either AI changes a major module:

1. Pull the latest GitHub `main` into the working environment.
2. Read the relevant `/docs` specification.
3. Preserve existing database contracts and public types.
4. Implement the change.
5. Run typecheck/tests/build.
6. Commit with a focused message.
7. Push to GitHub.
8. The other AI must pull/review before making the next overlapping change.

Never overwrite the other AI's work blindly.

## Google AI Studio sync conflicts

When AI Studio reports:
`There are changes in both Google AI Studio and GitHub`

Do not use `Select all` automatically.

For the current N-LINK 360 conflict set (`package.json`, `src/App.tsx`, `src/components/Header.tsx`), the GitHub `main` versions are the current canonical baseline because they include the Supabase/RBAC architecture and recent production-readiness changes.

If AI Studio contains additional UI work that is not in GitHub, resolve file-by-file by preserving:
- Supabase data loading
- AuthGate
- role-based workspace routing
- transaction service calls
- responsive layout
- existing dependencies unless a deliberate dependency change is required

Do not resolve a conflict by replacing the complete file with an older copy.

After resolution, pull/reload the resulting GitHub version in AI Studio and continue from that state.

## Change ownership rule

One file should have one active editor at a time when possible.

For large frontend files such as `SalesRecoveryApp.tsx` and `CompanyPortal.tsx`, make focused commits and avoid parallel full-file rewrites.

## Database rule

Never let AI Studio invent or silently modify database columns/functions. Database changes must be represented as numbered migrations under `database/migrations` and reviewed against the existing schema.

## Production rule

No AI-generated code is production-ready until:
- TypeScript passes
- tests pass
- build passes
- RLS is reviewed
- financial/inventory transactions are tested
- no demo/in-memory production source remains
- mobile/desktop acceptance checks pass

## Current canonical stack

React + TypeScript + Vite

Supabase Auth + PostgreSQL + RLS

GitHub main branch

Google Sheets only through controlled import/export workflows, never as the transaction source of truth.
