# N-LINK-360 Deployment Checklist

Use this checklist before and after deploying N-LINK-360 to Netlify.

## Pre-Deployment
- [ ] Source code tested and all automated tests passing (`npm test`).
- [ ] TypeScript compilation verified (`npm run lint`).
- [ ] Production build verified (`npm run build`).
- [ ] `netlify.toml` configured with correct build command and publish directory.
- [ ] Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) prepared for Netlify dashboard.
- [ ] `.env` excluded in `.gitignore`.

## Post-Deployment
- [ ] Verify homepage loads successfully.
- [ ] Test user login with authorized Supabase credentials.
- [ ] Verify forced password change workflow for reset accounts (Syed Zain, Shahzad, Arshad Khan).
- [ ] Check National Dashboard KPI figures and database connectivity.
- [ ] Verify Regional, Zonal, and Territorial review tabs.
- [ ] Test Sales order creation, order approval, and invoice generation.
- [ ] Test Recovery entry, verification, and ledger closing balance calculation (`Closing = Opening + Approved Invoices - Verified Recoveries`).
- [ ] Test PDF and Excel report exports.
- [ ] Test mobile responsiveness across mobile viewports.
