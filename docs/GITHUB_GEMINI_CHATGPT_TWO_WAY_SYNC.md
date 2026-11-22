# N-LINK 360 Shared GitHub Workflow: ChatGPT ↔ Gemini AI Studio

## Single source of truth

The canonical repository is https://github.com/AmjidOfficial/N-LINK360 and the production branch is `main`.

Both ChatGPT and Google AI Studio work from this same repository. GitHub is the hand-off point. Neither AI workspace is a separate source of truth.

## Before every work session

1. Fetch the latest remote `main`.
2. Record the full commit SHA.
3. Pull/rebase the latest changes into the local AI workspace.
4. Check `git status` and inspect any uncommitted changes before editing.
5. If the workspace has local changes, preserve them on a named feature branch. Never discard them just to pull.
6. If histories diverged, inspect both sides and resolve conflicts file-by-file. Never force-push.

## When ChatGPT changes code

1. Read the current `main` SHA and relevant files.
2. Make a focused change on a branch based on current `main`, or use a direct commit only for low-risk documentation/workflow changes.
3. Run applicable tests and inspect the full diff.
4. Push the reviewed commit to the same repository.
5. Report the commit SHA, changed files, test results, and any unverified areas.
6. Gemini must pull the new commit before making further changes.

## When Gemini AI Studio changes code

1. Use AI Studio's GitHub panel to pull latest `main` before editing.
2. Work against the existing `AmjidOfficial/N-LINK360` repository.
3. Review the diff and run the relevant tests before pushing.
4. Push to the same repository, preferably through a pull request for code, schema, authentication, financial, or data-sync changes.
5. Tell ChatGPT the resulting commit SHA or PR link.
6. ChatGPT must fetch latest GitHub `main` and review the exact pushed changes before continuing.

## Important: this is coordinated two-way sync, not continuous live mirroring

AI Studio's GitHub integration can pull external commits and push AI Studio changes. ChatGPT's GitHub connection can read and commit repository changes. The two AI conversations do not share a live filesystem or automatically notify each other. Each side must fetch/pull the latest commit before work. This explicit hand-off prevents stale edits and accidental overwrites.

## Branch and merge safety

- `main` is the canonical production branch.
- Use feature branches and pull requests for significant application changes.
- Never force-push, rewrite history, or delete a branch as a cleanup shortcut.
- Never blindly merge every old branch or open PR. Reconcile changes against current `main`, preserve useful work, and run tests.
- Keep one canonical implementation for auth, roles, dashboards, database access, and sync.
- Do not commit generated secrets, service-role keys, passwords, private tokens, or real customer/financial data.
- Public Supabase publishable/anon keys may be used by the browser only with strict RLS; all privileged keys remain server-side.

## Deployment hand-off

- Netlify native Git deployment should track `main` once the repository connection is confirmed.
- A successful GitHub Pages workflow is not proof of a Netlify production deployment.
- Do not add duplicate Netlify deploy automation if native Netlify Git integration is active.
- After each production push, verify the Netlify deployment record and test the live frontend and API endpoints.
- If deployment cannot be verified, report it as unverified rather than successful.

## Required hand-off message

After pushing, share:
- Repository and branch
- Full commit SHA
- Pull request URL (if used)
- Changed files
- Tests actually run and results
- Deployment result and health-check evidence
- Known blockers and required next action
