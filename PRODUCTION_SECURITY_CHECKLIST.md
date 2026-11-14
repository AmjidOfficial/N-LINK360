# N-LINK-360 Production Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `NLINK_SESSION_SECRET`, and `GEMINI_API_KEY` are never exposed in `VITE_*` variables.
- [ ] Public self-registration is disabled; only registered corporate employees can authenticate.
- [ ] Row Level Security (RLS) is enabled across all production Supabase tables (`SUPABASE_SETUP.sql`).
- [ ] HTTP security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are enforced in `netlify.toml`.
- [ ] Service worker and `index.html` revalidate cleanly (`Cache-Control: public, max-age=0, must-revalidate`) on new deployments.
