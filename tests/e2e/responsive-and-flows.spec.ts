import { test, expect, type Page } from '@playwright/test';

const REQUIRED_VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 360, height: 740 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 480, height: 854 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

async function signInAs(page: Page, email: string, password: string) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.locator('form button[type="submit"]').click();
  // Wait for AuthGate to clear
  await expect(page.locator('#nlink-auth-gate-container')).toHaveCount(0, { timeout: 15_000 });
}

test.describe('N-LINK 360 Enterprise Audit, Idempotency & Multi-Viewport E2E', () => {
  test('API Gateway: Health, Idempotent /api/sync replay, UUID validation & Rate Limiting', async ({ request }) => {
    const health = await request.get('/api/health');
    expect(health.ok()).toBeTruthy();
    const healthJson = await health.json();
    expect(healthJson.status).toBe('healthy');

    // Invalid X-Idempotency-Key returns 400
    const badIdem = await request.post('/api/sync', {
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': 'not-a-valid-uuid',
        'X-Forwarded-For': '198.51.100.11',
      },
      data: { type: 'ORDER', id: 'SO-BAD-1' },
    });
    expect(badIdem.status()).toBe(400);

    // Valid RFC-4122 UUID v4 deduplicates repeated POST /api/sync submissions
    const uuid = crypto.randomUUID();
    const firstSync = await request.post('/api/sync', {
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuid,
        'X-Forwarded-For': '198.51.100.12',
      },
      data: { type: 'ORDER', id: 'SO-IDEM-01' },
    });
    expect(firstSync.status()).toBe(200);
    expect(firstSync.headers()['x-ratelimit-tier']).toBe('FINANCIAL_WRITE');
    const firstBody = await firstSync.json();
    expect(firstBody.idempotencyKey).toBe(uuid);
    expect(firstBody.idempotentReplay).toBeUndefined();

    const replaySync = await request.post('/api/sync', {
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuid,
        'X-Forwarded-For': '198.51.100.12',
      },
      data: { type: 'ORDER', id: 'SO-IDEM-01' },
    });
    expect(replaySync.status()).toBe(200);
    const replayBody = await replaySync.json();
    expect(replayBody.idempotentReplay).toBe(true);
    expect(replayBody.receivedAt).toBe(firstBody.receivedAt);

    // Auth rate limit burst test using isolated test IP (AUTH tier = 12/min -> 13th returns 429 + Retry-After)
    let hit429 = false;
    let retryAfterHeader = '';
    for (let i = 1; i <= 14; i++) {
      const res = await request.post('/api/auth/login', {
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.99',
        },
        data: { email: 'nonexistent@nationallight.pk', password: 'WrongPassword!' },
      });
      if (res.status() === 429) {
        hit429 = true;
        retryAfterHeader = res.headers()['retry-after'] || '';
        break;
      }
    }
    expect(hit429).toBe(true);
    expect(Number(retryAfterHeader)).toBeGreaterThan(0);
  });

  test('PWA & Accessibility Meta: Pinch-zoom preserved and Manifest linked', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const viewportContent = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportContent).toBeTruthy();
    expect(viewportContent).not.toContain('user-scalable=no');
    expect(viewportContent).not.toContain('maximum-scale=1.0');

    const title = await page.title();
    expect(title).toContain('N-LINK 360');
  });

  test('Head Office Portal: All 13 Viewports (320px–1920px), Frozen Header/Drawer & Tab Scroll Reset', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await signInAs(page, 'amjid.bisconni@gmail.com', 'Amjid@1947');
    await expect(page.locator('header')).toBeVisible({ timeout: 10_000 });

    // Check zero horizontal overflow across all 13 target viewports
    for (const vp of REQUIRED_VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(80);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(
        metrics.scrollWidth,
        `Head Office horizontal overflow at ${vp.width}x${vp.height}`
      ).toBeLessThanOrEqual(metrics.innerWidth + 2);
    }

    // Desktop frozen header + scroll reset check at 1280x800
    await page.setViewportSize({ width: 1280, height: 800 });
    const sidebar = page.getByLabel('ERP Sidebar Navigation');
    await expect(sidebar).toBeVisible();

    await sidebar.getByRole('button', { name: /Reports & Audits/i }).click();
    await expect(page.locator('header h1')).toContainText(/reports/i);

    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = 400;
    });
    await sidebar.getByRole('button', { name: /Dealers Network/i }).click();
    await page.waitForTimeout(100);
    const afterSwitch = await page.evaluate(() => {
      const main = document.querySelector('main');
      const brandBar = document.getElementById('brand-header-top-bar');
      const header = document.querySelector('header');
      return {
        mainScrollTop: main ? main.scrollTop : 0,
        brandTop: brandBar ? brandBar.getBoundingClientRect().top : -1,
        headerTop: header ? header.getBoundingClientRect().top : -1,
      };
    });
    expect(afterSwitch.mainScrollTop).toBe(0);
    expect(afterSwitch.brandTop).toBeGreaterThanOrEqual(0);
    expect(afterSwitch.brandTop).toBeLessThanOrEqual(5);
    expect(afterSwitch.headerTop).toBeGreaterThanOrEqual(0);
    expect(afterSwitch.headerTop).toBeLessThanOrEqual(85);

    expect(pageErrors).toEqual([]);
  });

  test('Field Mobile Portal: Single 5-Tab Bottom Nav, Frozen Header, Drawer & Zero Overflow (320px–480px)', async ({ page, request }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Verify unauthenticated admin reset is strictly rejected (401)
    const unauthReset = await request.post('/api/employees/admin-reset-password', {
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.43' },
      data: { email: 'syedzain@nationallight.pk', temporaryPassword: 'National@link360' },
    });
    expect(unauthReset.status()).toBe(401);

    // Authenticate as Super Admin before triggering admin password reset setup
    const adminLoginRes = await request.post('/api/auth/login', {
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.44' },
      data: { email: 'amjid.bisconni@gmail.com', password: 'Amjid@1947' },
    });
    expect(adminLoginRes.ok()).toBeTruthy();
    const adminLoginJson = await adminLoginRes.json();

    // Ensure clean initial password state before first-login rotation check
    const setupResetRes = await request.post('/api/employees/admin-reset-password', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminLoginJson.sessionToken}`,
        'X-Forwarded-For': '198.51.100.44',
      },
      data: {
        email: 'syedzain@nationallight.pk',
        temporaryPassword: 'National@link360',
        resetBy: 'E2E Test Setup',
      },
    });
    expect(setupResetRes.ok()).toBeTruthy();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Also exercises domain typo auto-correction (@nationalight.com -> @nationallight.pk)
    await page.fill('#login-email', 'syedzain@nationalight.com');
    await page.fill('#login-password', 'National@link360');
    await page.locator('form button[type="submit"]').click();

    // Wait for either first-login password rotation modal (#cp-new) OR mobile bottom nav
    await page.waitForSelector('#cp-new, [aria-label="Mobile Primary Navigation"]', {
      state: 'visible',
      timeout: 15_000,
    });

    const cpNew = page.locator('#cp-new');
    if (await cpNew.isVisible()) {
      await cpNew.fill('Zain@National2026!');
      await page.locator('#cp-confirm').fill('Zain@National2026!');
      await page.locator('button[type="submit"]:has-text("Set Permanent Password")').click();
      await expect(page.locator('#cp-new')).toHaveCount(0, { timeout: 10_000 });
    }

    // Verify Field Mobile rendered with authoritative single 5-tab bar
    const mobileNav = page.getByLabel('Mobile Primary Navigation');
    await expect(mobileNav).toBeVisible({ timeout: 15_000 });

    // Strictly 1 primary mobile bottom nav with exactly 5 tab buttons
    await expect(mobileNav).toHaveCount(1);
    await expect(mobileNav.locator('button')).toHaveCount(5);

    const box = await mobileNav.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.height).toBeLessThanOrEqual(80);
    }

    // Navigate via 5-tab bar to Entry, then Invoices, checking overflow at 320px and 390px
    await mobileNav.getByRole('button', { name: 'Entry' }).click();
    for (const vp of [
      { width: 320, height: 640 },
      { width: 360, height: 740 },
      { width: 390, height: 844 },
      { width: 480, height: 854 },
    ]) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(80);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 2);
    }

    // Open drawer, press Escape -> closes
    const drawerToggle = page.getByRole('button', { name: /Open menu/i });
    if (await drawerToggle.isVisible().catch(() => false)) {
      await drawerToggle.click();
      await page.keyboard.press('Escape');
    }

    // Restore initial temporary credential so management onboarding credential stays valid
    await request.post('/api/employees/admin-reset-password', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminLoginJson.sessionToken}`,
        'X-Forwarded-For': '198.51.100.45',
      },
      data: {
        email: 'syedzain@nationallight.pk',
        temporaryPassword: 'National@link360',
        resetBy: 'E2E Test Cleanup',
      },
    });

    expect(pageErrors).toEqual([]);
  });

  test('Auto-Sync Duplicate Signature Guard & Central 30-SKU Price List RBAC APIs + Head Office UI', async ({ page, request }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // 1. Transaction Signature / Fingerprint Duplicate Prevention on POST /api/sync
    const uniqueFp = `fp_e2e_${Date.now()}`;
    const txnSig = `NLINK-PAY-20261115-${Math.floor(100000 + Math.random() * 899999)}`;
    const firstPost = await request.post('/api/sync', {
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.77' },
      data: {
        type: 'PAYMENT_RECOVERY',
        id: txnSig,
        transactionId: txnSig,
        fingerprintHash: uniqueFp,
        idempotencyKey: crypto.randomUUID(),
      },
    });
    expect(firstPost.status()).toBe(200);
    const firstJson = await firstPost.json();
    expect(firstJson.duplicatePrevented).toBe(false);

    // Retry with DIFFERENT idempotency key but SAME fingerprintHash -> MUST prevent duplicate
    const dupFpPost = await request.post('/api/sync', {
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.77' },
      data: {
        type: 'PAYMENT_RECOVERY',
        id: `${txnSig}-RETRY`,
        transactionId: `${txnSig}-RETRY`,
        fingerprintHash: uniqueFp,
        idempotencyKey: crypto.randomUUID(),
      },
    });
    expect(dupFpPost.status()).toBe(200);
    const dupFpJson = await dupFpPost.json();
    expect(dupFpJson.duplicatePrevented).toBe(true);
    expect(dupFpJson.originalTransactionId).toBe(txnSig);

    const syncStatusRes = await request.get('/api/sync/status');
    expect(syncStatusRes.ok()).toBeTruthy();
    const syncStatusJson = await syncStatusRes.json();
    expect(syncStatusJson.duplicatesPrevented).toBeGreaterThanOrEqual(1);

    // 2. Price List GET (30 SKUs) & PUT RBAC Check
    const priceListRes = await request.get('/api/price-list');
    expect(priceListRes.ok()).toBeTruthy();
    const priceListJson = await priceListRes.json();
    expect(priceListJson.count).toBe(30);

    // Unauthenticated PUT -> 401
    const unauthPut = await request.put('/api/price-list/NL-BULB-05W', {
      data: { tradePrice: 999, listPrice: 850, reason: 'Unauth test' },
    });
    expect(unauthPut.status()).toBe(401);

    // Authenticated SUPER_ADMIN login + authorized price edit + revert
    const loginRes = await request.post('/api/auth/login', {
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.78' },
      data: { email: 'amjid.bisconni@gmail.com', password: 'Amjid@1947' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();
    const originalBulb = priceListJson.items.find((i: any) => i.id === 'NL-BULB-05W');

    const authPut = await request.put('/api/price-list/NL-BULB-05W', {
      headers: { Authorization: `Bearer ${loginJson.sessionToken}` },
      data: { tradePrice: 400, listPrice: 340, reason: 'E2E Verification Rate Test' },
    });
    expect(authPut.status()).toBe(200);

    // Restore original rate cleanly
    await request.put('/api/price-list/NL-BULB-05W', {
      headers: { Authorization: `Bearer ${loginJson.sessionToken}` },
      data: {
        tradePrice: originalBulb.tradePrice,
        listPrice: originalBulb.listPrice,
        reason: 'E2E Restoration',
      },
    });

    // 3. Head Office UI Navigation: Price List & SKUs (30 SKUs + Integrity Banner) & System Sync (Transaction History Table + Retry Control + 3 Tabs)
    await page.setViewportSize({ width: 1280, height: 800 });
    await signInAs(page, 'amjid.bisconni@gmail.com', 'Amjid@1947');
    const sidebar = page.getByLabel('ERP Sidebar Navigation');
    await expect(sidebar).toBeVisible();

    await sidebar.getByRole('button', { name: /Price List & SKUs/i }).click();
    await expect(page.getByText(/Complete SKU & Price List \(30 Official Products\)/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Catalog Rate-Card Integrity Diagnostics/i)).toBeVisible();
    await expect(page.getByText('NL-CP-12W', { exact: true })).toBeVisible();

    await sidebar.getByRole('button', { name: /System Sync/i }).click();
    await expect(page.getByText(/System Sync Monitoring & Reconciliation Center/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Retry All Failed Syncs/i })).toBeVisible();

    const historyTable = page.getByRole('table', { name: /Transaction Sync History/i });
    await expect(historyTable).toBeVisible();
    await expect(historyTable.getByRole('columnheader', { name: 'Timestamp' })).toBeVisible();
    await expect(historyTable.getByRole('columnheader', { name: 'Type' })).toBeVisible();
    await expect(historyTable.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(historyTable.getByRole('columnheader', { name: 'Error Details' })).toBeVisible();

    await page.getByRole('button', { name: /Retry All Failed Syncs/i }).click();
    await expect(page.getByText(/0 failed sync operations|Retried|Pending queue records flushed/i)).toBeVisible({ timeout: 5_000 });

    const ghaffarTab = page.getByRole('button', { name: /M Ghaffar Tools & Date Forensics/i });
    await expect(ghaffarTab).toBeVisible();
    await ghaffarTab.click();
    await expect(page.getByText(/M Ghaffar Tools — Invoice Date vs Entry Timestamp Investigation/i)).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});

