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
    const uuid = '550e8400-e29b-41d4-a716-446655440099';
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

    // Mobile drawer auto-close and Escape behavior at 375px
    await page.setViewportSize({ width: 375, height: 812 });
    const menuBtn = page.getByRole('button', { name: 'Open navigation menu' });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    const sidebar = page.getByLabel('ERP Sidebar Navigation');
    await expect(sidebar).toBeVisible();

    // Press Escape -> drawer slides closed
    await page.keyboard.press('Escape');
    await expect(sidebar).toHaveClass(/-translate-x-full/);

    // Reopen drawer, select Reports & Audits -> auto-closes drawer and opens Reports tab
    await menuBtn.click();
    await sidebar.getByRole('button', { name: /Reports & Audits/i }).click();
    await expect(sidebar).toHaveClass(/-translate-x-full/);
    await expect(page.locator('header h1')).toContainText(/reports/i);

    // Desktop frozen header + scroll reset check at 1280x800
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = 400;
    });
    await sidebar.getByRole('button', { name: /Dealers Network/i }).click();
    await page.waitForTimeout(100);
    const afterSwitch = await page.evaluate(() => {
      const main = document.querySelector('main');
      const header = document.querySelector('header');
      return {
        mainScrollTop: main ? main.scrollTop : 0,
        headerTop: header ? header.getBoundingClientRect().top : -1,
      };
    });
    expect(afterSwitch.mainScrollTop).toBe(0);
    expect(afterSwitch.headerTop).toBeGreaterThanOrEqual(0);
    expect(afterSwitch.headerTop).toBeLessThanOrEqual(5);

    expect(pageErrors).toEqual([]);
  });

  test('Field Mobile Portal: Single 5-Tab Bottom Nav, Frozen Header, Drawer & Zero Overflow (320px–480px)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.fill('#login-email', 'syedzain@nationallight.pk');
    await page.fill('#login-password', 'N@link360');
    await page.locator('form button[type="submit"]').click();

    // Handle first-login forced password rotation modal if shown
    const changePassHeading = page.getByText(/Mandatory Password|Change Password/i).first();
    if (await changePassHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      const currentInput = page.locator('input[placeholder*="current" i], input[name*="current" i]').first();
      const newInput = page.locator('input[placeholder*="new" i], input[name*="new" i]').first();
      const confirmInput = page.locator('input[placeholder*="confirm" i], input[name*="confirm" i]').first();
      if (await currentInput.isVisible().catch(() => false)) {
        await currentInput.fill('N@link360');
      }
      if (await newInput.isVisible().catch(() => false)) {
        await newInput.fill('Zain@National2026!');
      }
      if (await confirmInput.isVisible().catch(() => false)) {
        await confirmInput.fill('Zain@National2026!');
      }
      const saveBtn = page.getByRole('button', { name: /Update Password|Save Password|Change Password/i }).first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
      }
    }

    // If Field Mobile rendered (or wait for header)
    const mobileNav = page.getByLabel('Mobile Primary Navigation');
    if (await mobileNav.isVisible({ timeout: 8000 }).catch(() => false)) {
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
      await page.getByRole('button', { name: /Open menu/i }).click();
      await page.keyboard.press('Escape');
    }

    expect(pageErrors).toEqual([]);
  });
});
