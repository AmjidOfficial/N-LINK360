# N-LINK 360: ENVIRONMENT SETUP & FREE-TIER GUIDE

**Project:** N-LINK 360  
**Owner:** National Lights (`nationallights2026@gmail.com`)  
**Free-First Directive:** All services in development, testing, and controlled pilot MUST remain strictly within free tiers. Zero paid upgrades permitted without written owner consent.

---

## 1. Environment Separation Strategy

### A. Development (`DEV`)
- **Project Name:** `n-link360-dev`
- **Database:** Supabase Free PostgreSQL (or local memory/mock test harness)
- **Data Policy:** Purely synthetic fixtures, test accounts, mock invoices, and sample SKU catalogs.
- **Rule:** Absolute prohibition against copying real customer debts, CNICs, or banking details into DEV.

### B. Controlled Pilot / Production (`PROD`)
- **Project Name:** `n-link360-prod`
- **Database:** Dedicated Supabase Free PostgreSQL project (isolated from DEV)
- **Data Policy:** Real company master records and pilot branch transactions upon explicit approval.
- **Security:** Service-role keys protected, RLS policies active, SSL enforced.

---

## 2. Free-Tier Stack Configuration Guide

### 1. Supabase Free Tier Setup
1. Visit [supabase.com](https://supabase.com) and sign in using `nationallights2026@gmail.com`.
2. Create project `n-link360-dev`.
3. In SQL Editor, run `/database/migrations/001_initial_schema.sql` followed by `/database/seed/dev_seed.sql`.
4. Copy Project URL and Public Anon Key into `.env`:
   ```env
   VITE_SUPABASE_URL=https://[YOUR_DEV_REF].supabase.co
   VITE_SUPABASE_ANON_KEY=eyJh...
   SUPABASE_SERVICE_ROLE_KEY=eyJh...
   ```

### 2. Free Storage Setup
- Create bucket `nl-proofs` (public read disabled, signed URLs for payment proofs & return photos).

### 3. Google AI Studio Setup
- Retrieve Gemini API key from AI Studio free tier for server-side business intelligence queries.
