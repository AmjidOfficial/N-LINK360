# N-LINK-360 Netlify Deployment Guide

This guide details how to deploy the **N-LINK-360 Enterprise ERP** application for National Lights (Pvt.) Ltd. to **Netlify** (`https://nlink360.netlify.app`) from GitHub (`AmjidOfficial/N-LINK360`).

---

## Step 1: Connect GitHub Repository to Netlify
1. Log in to your Netlify Dashboard.
2. Click **Add new site** -> **Import an existing project**.
3. Select **GitHub** and select `AmjidOfficial/N-LINK360`.

## Step 2: Confirm Build Settings (`netlify.toml`)
- **Production branch**: `main`
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: `22`

## Step 3: Configure Environment Variables in Netlify UI
In **Site settings -> Environment variables**, add:
- `VITE_SUPABASE_URL`: Your production Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your production Supabase anon/publishable key
- `VITE_API_BASE_URL` *(Optional)*: External Node/Express API base URL if deploying `server.ts` separately (e.g., on Render/Railway). When left unset, N-LINK-360 operates in seamless Netlify Hybrid Static + Supabase mode without JSON errors.

## Step 4: Configure Supabase Auth URLs
In your Supabase Dashboard -> **Authentication -> URL Configuration**:
- **Site URL**: `https://nlink360.netlify.app`
- **Redirect URLs**: `https://nlink360.netlify.app/**`
