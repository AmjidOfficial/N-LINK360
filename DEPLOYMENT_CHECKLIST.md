# N-LINK-360 Deployment Checklist

## Pre-Deployment
- [ ] `npm run lint` passes with 0 TypeScript errors.
- [ ] `npm test` passes all automated business rule modules.
- [ ] `npm run build` succeeds cleanly and outputs to `dist/`.
- [ ] `netlify.toml` and `public/_redirects` are present at repository root.
- [ ] `.env` files are excluded by `.gitignore`.

## Post-Deployment Verification (`https://nlink360.netlify.app`)
- [ ] Login with `amjid.bisconni@gmail.com` completes cleanly with zero JSON parse errors.
- [ ] Supabase cloud sync / local fallback state functions cleanly across refreshes.
- [ ] Forced first-login password change workflow triggers for reset accounts.
- [ ] National, Regional, Zonal, and Territory dashboards load accurate data.
- [ ] Mobile navigation and sticky financial tables render with zero horizontal overflow.
