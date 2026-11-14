# N-LINK-360 Netlify Deployment Guide

This guide details how to deploy the **N-LINK-360 Enterprise ERP** application for National Lights (Pvt.) Ltd. to **Netlify** with **Supabase** backend integration.

---

## Prerequisites
1. A **GitHub** repository containing the N-LINK-360 source code.
2. A **Netlify** account connected to your GitHub account.
3. A configured **Supabase** project (PostgreSQL + Supabase Auth).

---

## Step 1: Connect GitHub Repository to Netlify
1. Log in to your Netlify Dashboard.
2. Click **Add new site** -> **Import an existing project**.
3. Select **GitHub** and authorize Netlify to access your repository.
4. Select the N-LINK-360 repository.

---

## Step 2: Configure Build Settings
Netlify will automatically detect `netlify.toml`. Confirm the following settings:
- **Production branch**: `main`
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: `22` (configured in `netlify.toml`)

---

## Step 3: Configure Environment Variables
In the Netlify dashboard for your site:
1. Go to **Site settings** -> **Environment variables**.
2. Add the following production environment variables:
   - `VITE_SUPABASE_URL`: Your production Supabase project URL (`https://xxxx.supabase.co`).
   - `VITE_SUPABASE_ANON_KEY`: Your production Supabase public anon/publishable key.

---

## Step 4: Deploy
1. Click **Deploy site**.
2. Netlify will pull the repository, run `npm run build`, and publish the `dist` folder.
3. Once completed, your app will be live at `https://<your-site-name>.netlify.app`.

---

## Step 5: Custom Domain & SSL
1. Go to **Domain management** in Netlify.
2. Click **Add custom domain** (e.g., `erp.nationallight.pk`).
3. Configure DNS records with your domain registrar as instructed by Netlify.
4. Netlify will automatically provision an SSL/TLS certificate via Let's Encrypt.
