# N-LINK 360 P11 Identity + Data Architecture

## Supabase account recommendation

Use the dedicated National Lights Google account as the project owner/admin identity where possible: `nationallights2026@gmail.com`.

Do not make ChatGPT, GitHub or Gemini AI Studio the application's user database.

GitHub is the source-control identity.
Gemini AI Studio is a development/build tool.
Supabase Auth is the application authentication system.

The same Google account can own/access GitHub, Gemini and Supabase, but these remain separate services with separate permissions.

## Recommended login methods

### Admin / management
Prefer Google sign-in or email/password through Supabase Auth. Keep the initial Super Admin controlled and do not expose public sign-up.

### Sales/Recovery team
Use individual employee accounts in Supabase Auth. Do not share one account across the sales team.

Email/password is the simplest pilot option. Google sign-in can be enabled later if company Google Workspace is adopted.

## Environment separation

Development/pilot and production should use separate Supabase projects when the system moves to real business use.

Recommended:
- N-LINK360-DEV
- N-LINK360-PROD

GitHub remains one repository with environment-specific secrets/configuration.

## Google Sheets recommendation

Google Sheets may be used as an optional import/export and management convenience layer, but NOT as the primary database for N-LINK 360 transactional data.

Good Sheet use cases:
- initial SKU import
- employee/team import
- customer/distributor/dealer bulk import
- price-list preparation
- offline planning templates
- report exports
- controlled management uploads

Do NOT use Sheets as the source of truth for:
- inventory balances
- invoices
- order posting
- recovery/ledger
- credit limits during transaction posting
- dispatch/GRN
- returns/damage

Those require PostgreSQL/Supabase transactions, RLS and audit history.

## Optional Sheet integration

Build a controlled `Import Center`:

Google Sheet/CSV
→ validate columns
→ preview errors
→ duplicate check
→ approve import
→ write to Supabase
→ import audit record

For exports:

Supabase report
→ filtered dataset
→ XLSX/CSV
→ optional Google Sheet export

Sheets must never be able to overwrite live transactions directly.

## Identity mapping

`Supabase Auth user UUID → users.auth_user_id → employee → role → permissions → data scope`

The application should not infer role from email address.

## Security rules

- Never commit Supabase service-role key.
- Never put service-role key in Vite environment variables.
- Use anon/publishable key in browser.
- Use RLS for data scope.
- Keep credentials in environment/secret storage.
- Audit privileged changes.
