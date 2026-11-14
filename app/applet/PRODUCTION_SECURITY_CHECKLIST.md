# N-LINK-360 Production Security Checklist

Security hardening and verification guidelines for N-LINK-360 on Netlify and Supabase.

## Supabase Security
- [ ] Row Level Security (RLS) enabled on all sensitive tables.
- [ ] Public registration disabled in Supabase Auth settings.
- [ ] Authorized redirect URLs configured in Supabase Auth (including `https://<your-site-name>.netlify.app/**`).
- [ ] Service-role keys strictly kept server-side and never exposed in client/frontend bundles.

## Netlify Security
- [ ] HTTPS enforced across all routes.
- [ ] HTTP Security Headers configured in `netlify.toml` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- [ ] Environment variables securely stored in Netlify UI settings rather than committed code files.
- [ ] Restricted admin roles and permissions enforced at database and application layers.
