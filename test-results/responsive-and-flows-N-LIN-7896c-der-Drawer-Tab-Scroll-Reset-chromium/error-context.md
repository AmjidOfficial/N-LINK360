# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive-and-flows.spec.ts >> N-LINK 360 Enterprise Audit, Idempotency & Multi-Viewport E2E >> Head Office Portal: All 13 Viewports (320px–1920px), Frozen Header/Drawer & Tab Scroll Reset
- Location: tests/e2e/responsive-and-flows.spec.ts:107:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('#nlink-auth-gate-container')
Expected: 0
Received: 1
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" locator('#nlink-auth-gate-container') with timeout 15000ms
  - waiting for locator('#nlink-auth-gate-container')
    34 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e5]:
    - button "Switch to Light Mode" [ref=e7] [cursor=pointer]
    - generic [ref=e14]:
      - generic "National Light - Enlightening The Nation" [ref=e17]:
        - img "National Lights Pakistan Logo" [ref=e20]
      - generic [ref=e21]:
        - paragraph [ref=e22]: Head Office & Field Portal · Peshawar
        - heading "NATIONAL LIGHT 360" [level=1] [ref=e23]
        - paragraph [ref=e24]: Enterprise Resource Planning & Financial Accounting
    - generic [ref=e25]: Invalid email address or password.
    - generic [ref=e29]:
      - generic [ref=e30]:
        - generic [ref=e31]: Email Address
        - textbox "Email Address" [ref=e33]:
          - /placeholder: name@nationallight.pk
          - text: amjid.bisconni@gmail.com
      - generic [ref=e34]:
        - generic [ref=e35]:
          - generic [ref=e36]: Password
          - button "Forgot Password?" [ref=e37] [cursor=pointer]
        - generic [ref=e38]:
          - textbox "Password" [ref=e39]:
            - /placeholder: Enter your password
            - text: Amjid@1947
          - button "Show password" [ref=e40] [cursor=pointer]
      - button "Login" [ref=e44] [cursor=pointer]
    - generic [ref=e51]:
      - paragraph [ref=e52]: Office No GF 71, Sheikh Yaseen Tower, Peshawar
      - paragraph [ref=e57]: "Ph: 091-2212700 · Cell: 0303-5262872 / 0312-7876620"
      - paragraph [ref=e58]: "Central Admin: nationallights2026@gmail.com"
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | const REQUIRED_VIEWPORTS = [
  4   |   { width: 320, height: 640 },
  5   |   { width: 360, height: 740 },
  6   |   { width: 375, height: 667 },
  7   |   { width: 390, height: 844 },
  8   |   { width: 412, height: 915 },
  9   |   { width: 430, height: 932 },
  10  |   { width: 480, height: 854 },
  11  |   { width: 768, height: 1024 },
  12  |   { width: 1024, height: 768 },
  13  |   { width: 1280, height: 800 },
  14  |   { width: 1366, height: 768 },
  15  |   { width: 1440, height: 900 },
  16  |   { width: 1920, height: 1080 },
  17  | ];
  18  | 
  19  | async function signInAs(page: Page, email: string, password: string) {
  20  |   await page.goto('/', { waitUntil: 'domcontentloaded' });
  21  |   await page.fill('#login-email', email);
  22  |   await page.fill('#login-password', password);
  23  |   await page.locator('form button[type="submit"]').click();
  24  |   // Wait for AuthGate to clear
> 25  |   await expect(page.locator('#nlink-auth-gate-container')).toHaveCount(0, { timeout: 15_000 });
      |                                                            ^ Error: expect(locator).toHaveCount(expected) failed
  26  | }
  27  | 
  28  | test.describe('N-LINK 360 Enterprise Audit, Idempotency & Multi-Viewport E2E', () => {
  29  |   test('API Gateway: Health, Idempotent /api/sync replay, UUID validation & Rate Limiting', async ({ request }) => {
  30  |     const health = await request.get('/api/health');
  31  |     expect(health.ok()).toBeTruthy();
  32  |     const healthJson = await health.json();
  33  |     expect(healthJson.status).toBe('healthy');
  34  | 
  35  |     // Invalid X-Idempotency-Key returns 400
  36  |     const badIdem = await request.post('/api/sync', {
  37  |       headers: {
  38  |         'Content-Type': 'application/json',
  39  |         'X-Idempotency-Key': 'not-a-valid-uuid',
  40  |         'X-Forwarded-For': '198.51.100.11',
  41  |       },
  42  |       data: { type: 'ORDER', id: 'SO-BAD-1' },
  43  |     });
  44  |     expect(badIdem.status()).toBe(400);
  45  | 
  46  |     // Valid RFC-4122 UUID v4 deduplicates repeated POST /api/sync submissions
  47  |     const uuid = '550e8400-e29b-41d4-a716-446655440099';
  48  |     const firstSync = await request.post('/api/sync', {
  49  |       headers: {
  50  |         'Content-Type': 'application/json',
  51  |         'X-Idempotency-Key': uuid,
  52  |         'X-Forwarded-For': '198.51.100.12',
  53  |       },
  54  |       data: { type: 'ORDER', id: 'SO-IDEM-01' },
  55  |     });
  56  |     expect(firstSync.status()).toBe(200);
  57  |     expect(firstSync.headers()['x-ratelimit-tier']).toBe('FINANCIAL_WRITE');
  58  |     const firstBody = await firstSync.json();
  59  |     expect(firstBody.idempotencyKey).toBe(uuid);
  60  |     expect(firstBody.idempotentReplay).toBeUndefined();
  61  | 
  62  |     const replaySync = await request.post('/api/sync', {
  63  |       headers: {
  64  |         'Content-Type': 'application/json',
  65  |         'X-Idempotency-Key': uuid,
  66  |         'X-Forwarded-For': '198.51.100.12',
  67  |       },
  68  |       data: { type: 'ORDER', id: 'SO-IDEM-01' },
  69  |     });
  70  |     expect(replaySync.status()).toBe(200);
  71  |     const replayBody = await replaySync.json();
  72  |     expect(replayBody.idempotentReplay).toBe(true);
  73  |     expect(replayBody.receivedAt).toBe(firstBody.receivedAt);
  74  | 
  75  |     // Auth rate limit burst test using isolated test IP (AUTH tier = 12/min -> 13th returns 429 + Retry-After)
  76  |     let hit429 = false;
  77  |     let retryAfterHeader = '';
  78  |     for (let i = 1; i <= 14; i++) {
  79  |       const res = await request.post('/api/auth/login', {
  80  |         headers: {
  81  |           'Content-Type': 'application/json',
  82  |           'X-Forwarded-For': '198.51.100.99',
  83  |         },
  84  |         data: { email: 'nonexistent@nationallight.pk', password: 'WrongPassword!' },
  85  |       });
  86  |       if (res.status() === 429) {
  87  |         hit429 = true;
  88  |         retryAfterHeader = res.headers()['retry-after'] || '';
  89  |         break;
  90  |       }
  91  |     }
  92  |     expect(hit429).toBe(true);
  93  |     expect(Number(retryAfterHeader)).toBeGreaterThan(0);
  94  |   });
  95  | 
  96  |   test('PWA & Accessibility Meta: Pinch-zoom preserved and Manifest linked', async ({ page }) => {
  97  |     await page.goto('/', { waitUntil: 'domcontentloaded' });
  98  |     const viewportContent = await page.locator('meta[name="viewport"]').getAttribute('content');
  99  |     expect(viewportContent).toBeTruthy();
  100 |     expect(viewportContent).not.toContain('user-scalable=no');
  101 |     expect(viewportContent).not.toContain('maximum-scale=1.0');
  102 | 
  103 |     const title = await page.title();
  104 |     expect(title).toContain('N-LINK 360');
  105 |   });
  106 | 
  107 |   test('Head Office Portal: All 13 Viewports (320px–1920px), Frozen Header/Drawer & Tab Scroll Reset', async ({ page }) => {
  108 |     const pageErrors: string[] = [];
  109 |     page.on('pageerror', (err) => pageErrors.push(err.message));
  110 | 
  111 |     await signInAs(page, 'amjid.bisconni@gmail.com', 'Amjid@1947');
  112 |     await expect(page.locator('header')).toBeVisible({ timeout: 10_000 });
  113 | 
  114 |     // Check zero horizontal overflow across all 13 target viewports
  115 |     for (const vp of REQUIRED_VIEWPORTS) {
  116 |       await page.setViewportSize(vp);
  117 |       await page.waitForTimeout(80);
  118 |       const metrics = await page.evaluate(() => ({
  119 |         scrollWidth: document.documentElement.scrollWidth,
  120 |         innerWidth: window.innerWidth,
  121 |       }));
  122 |       expect(
  123 |         metrics.scrollWidth,
  124 |         `Head Office horizontal overflow at ${vp.width}x${vp.height}`
  125 |       ).toBeLessThanOrEqual(metrics.innerWidth + 2);
```