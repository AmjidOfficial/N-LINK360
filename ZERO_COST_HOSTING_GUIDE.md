# N-LINK 360 — Forever-Free ($0/Month) Zero-Badge Deployment Guide

To permanently remove the bottom-right **"Powered by Netlify"** badge (which Netlify Free/Drop injects at its CDN edge) and run the entire N-LINK 360 ERP at **$0/month forever**, deploy to any or all of the three zero-badge hosts below.

---

## 1. Cloudflare Pages (Primary Recommended — $0/Month, Unlimited Bandwidth)
Cloudflare Pages renders **zero platform badges**, includes **unlimited static bandwidth**, and runs `/functions/api/*` serverless edge routes (`100,000` free requests/day).

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) -> **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git**.
2. Select repository **`AmjidOfficial/N-LINK360`** (`main` branch).
3. Configure Build Settings:
   - **Build command**: `npm run build:static`
   - **Build output directory**: `dist`
   - **Environment variables**: `NODE_VERSION = 22`, plus `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_SHEETS_WEBHOOK_URL` (optional).
   - **Encrypted Secrets (for Edge `/api/*` functions)**: `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_SHEETS_WEBHOOK_URL`, `NLINK_SESSION_SECRET`, `GEMINI_API_KEY`.
4. Click **Save and Deploy**. Your live URL (`https://n-link360.pages.dev`) has **zero floating badges**.

---

## 2. Firebase Hosting (Secondary Enterprise CDN — $0/Month Spark Tier)
Pre-configured in `firebase.json` and `.firebaserc` for project `excellent-era-vbg1d`:

```bash
npm run build:static
npx firebase-tools login
npx firebase-tools deploy --only hosting
```

---

## 3. GitHub Pages (Automated CI/CD Mirror — $0/Month Forever)
Pre-configured in `.github/workflows/deploy-pages.yml` (`VITE_BASE_PATH=/N-LINK360/`):

1. Open GitHub repo **`AmjidOfficial/N-LINK360`** -> **Settings** -> **Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` (or click **Run workflow** in the **Actions** tab). Your zero-badge mirror builds and deploys automatically to `https://amjidofficial.github.io/N-LINK360/`.

Or deploy manually from your terminal:
```bash
npm run deploy:gh-pages
```

---

## 4. Zero-Cost Backend, Database & Sync Stack ($0/Month Total)
| Layer | Free Service | Quota |
| :--- | :--- | :--- |
| **Web + PWA + Edge API** | Cloudflare Pages + Functions | Unlimited bandwidth, `100k` API req/day |
| **Database & Auth** | Supabase Free Tier | `500 MB` PostgreSQL, `50,000` MAU |
| **Spreadsheet Sync** | Google Apps Script Web App | Free forever with Google Account |
| **Offline Queue** | Browser IndexedDB + Workbox PWA | Works in zero-signal territories |
