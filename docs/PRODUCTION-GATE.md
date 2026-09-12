# N-LINK 360 Production Release Gate

A release is considered production-ready only when all of these are true:

- CI/typecheck/tests/build pass.
- Supabase production migrations are applied and tracked in source control.
- Authentication is passwordless and restricted to provisioned users.
- No demo users, dummy transactions, default passwords, or hardcoded private credentials exist.
- Employee/customer/product/SKU master data is loaded from the approved production source.
- Customer assignment and hierarchy are verified.
- Field attendance is persistent, GPS/time aware, and duplicate-protected.
- Sales order submission, approval, invoice posting, stock deduction, recovery, and ledger posting use server-side transaction rules.
- RLS and security-definer RPC privileges are reviewed; anonymous execution of privileged RPCs is denied.
- Google Sheets sync is configured with server-side secrets and tested end-to-end.
- Production email/OTP delivery is configured and tested.
- Mobile field-force and desktop head-office smoke tests pass at supported breakpoints.

This repository must not be labeled 10/10 while a required external production dependency (such as approved master data, SMTP, Google credentials, or live user provisioning) is unavailable or unverified.