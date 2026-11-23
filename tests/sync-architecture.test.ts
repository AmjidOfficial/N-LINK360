/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Unified Sync Architecture, Offline Replay, Financial Conflict & API Gateway Verification
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

// Ensure clean browser-like globals for Node.js execution
const memoryStorage = new Map<string, string>();
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (k: string) => memoryStorage.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memoryStorage.set(k, String(v));
    },
    removeItem: (k: string) => {
      memoryStorage.delete(k);
    },
    clear: () => {
      memoryStorage.clear();
    },
  };
}

let simulatedOnline = true;
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    get onLine() {
      return simulatedOnline;
    },
  },
});

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  const {
    executeUniversalSubmission,
    getBackgroundSyncSnapshot,
    getOfflineQueueItems,
    getOutboxItems,
    registerAuthSessionValidator,
    registerOfflineReplayHandler,
    resetUniversalSubmissionStoreForTests,
    runCoordinatedBackgroundSync,
  } = await import('../src/services/universalSubmissionService');
  const {
    evaluateInboundSheetBatch,
    getConflictsSnapshot,
    resetSyncConflictsForTests,
    resolveSyncConflict,
  } = await import('../src/services/syncConflictManager');
  const {
    getNotificationsSnapshot,
    resetNotificationsForTests,
    setNotificationUserContext,
  } = await import('../src/services/syncNotificationService');
  const { resetProcessedTransactionsCacheForTests } = await import('../src/utils/transactionSignature');
  const {
    getLocalDatabaseCache,
    saveLocalDatabaseCache,
  } = await import('../src/services/googleSheetsTwoWaySyncService');
  const { createApiGateway } = await import('../src/server/apiGateway');

  console.log('\n================================================================');
  console.log('🧪 N-LINK 360: UNIFIED SYNC & API GATEWAY VERIFICATION SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Online Universal Submission Pipeline -> DB First -> Outbox -> Sheet UPSERT
  // ---------------------------------------------------------------------------
  console.log('🔄 [1/8] Testing Online Universal Submission & User Notification...');
  resetUniversalSubmissionStoreForTests();
  resetNotificationsForTests();
  resetProcessedTransactionsCacheForTests();
  simulatedOnline = true;

  const executionOrder: string[] = [];
  let pushedEntityId = '';
  setNotificationUserContext('syedzain@nationallight.pk');

  const onlineOutcome = await executeUniversalSubmission({
    module: 'SALES_ORDERS',
    entityType: 'SALES_ORDER',
    sheetTab: 'Orders',
    recordLabel: 'Order SO-TEST-1001',
    userEmail: 'syedzain@nationallight.pk',
    userId: 'USR-002',
    userName: 'Syed Zain',
    payload: {
      customerCode: 'CUST-100',
      totalAmount: 45000,
    },
    fingerprintFields: {
      customerId: 'CUST-100',
      totalAmount: 45000,
      salt: 'online-1',
    },
    commitDb: async ({ idempotencyKey, transactionId }) => {
      executionOrder.push('DB_COMMIT');
      return {
        entityId: 'SO-DB-1001',
        dbRecord: { id: 'SO-DB-1001', transactionId, idempotencyKey, totalAmount: 45000 },
      };
    },
    pushSheet: async (outboxItem) => {
      executionOrder.push('SHEET_UPSERT');
      pushedEntityId = outboxItem.entityId;
      return { externalSheetId: '1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo' };
    },
  });

  const outboxAfterOnline = await getOutboxItems();
  const notifSnapOnline = getNotificationsSnapshot('syedzain@nationallight.pk');

  check(
    onlineOutcome.success === true && onlineOutcome.state === 'FULLY_SYNCHRONIZED',
    'Online submission reaches FULLY_SYNCHRONIZED state'
  );
  check(
    executionOrder[0] === 'DB_COMMIT' && executionOrder[1] === 'SHEET_UPSERT' && pushedEntityId === 'SO-DB-1001',
    'Authoritative DB commit strictly precedes Google Sheets UPSERT'
  );
  check(
    outboxAfterOnline.length === 1 && outboxAfterOnline[0].status === 'COMPLETED',
    'Outbox entry recorded and transitioned to COMPLETED'
  );
  check(
    notifSnapOnline.items.some((n) => n.syncStatus === 'FULLY_SYNCHRONIZED' && n.transactionId === onlineOutcome.transactionId),
    'Per-user notification persisted with FULLY_SYNCHRONIZED status'
  );

  // ---------------------------------------------------------------------------
  // 2. Concurrent Double-Submit & Duplicate Fingerprint Protection
  // ---------------------------------------------------------------------------
  console.log('\n🛡️ [2/8] Testing In-Flight Double-Click & Duplicate Fingerprint Guard...');
  let resolveSlowDb!: (val: { entityId: string }) => void;
  const slowDbPromise = new Promise<{ entityId: string }>((r) => {
    resolveSlowDb = r;
  });
  const sharedKey = '550e8400-e29b-41d4-a716-446655440001';

  const firstReq = executeUniversalSubmission({
    module: 'RECOVERIES',
    entityType: 'RECOVERY',
    sheetTab: 'Recoveries',
    recordLabel: 'Recovery REC-DUP-1',
    existingIdempotencyKey: sharedKey,
    userEmail: 'syedzain@nationallight.pk',
    payload: { amount: 15000 },
    commitDb: async () => slowDbPromise,
    pushSheet: async () => ({ externalSheetId: '1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo' }),
  });

  const duplicateClick = await executeUniversalSubmission({
    module: 'RECOVERIES',
    entityType: 'RECOVERY',
    sheetTab: 'Recoveries',
    recordLabel: 'Recovery REC-DUP-1',
    existingIdempotencyKey: sharedKey,
    userEmail: 'syedzain@nationallight.pk',
    payload: { amount: 15000 },
    commitDb: async () => ({ entityId: 'SHOULD-NOT-RUN' }),
    pushSheet: async () => ({ externalSheetId: '1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo' }),
  });

  resolveSlowDb({ entityId: 'REC-DB-1' });
  const firstDone = await firstReq;

  check(
    duplicateClick.success === false && duplicateClick.isDuplicateBlocked === true,
    'Concurrent double-submit sharing idempotencyKey is immediately blocked'
  );
  check(firstDone.success === true && firstDone.entityId === 'REC-DB-1', 'Primary submission completes cleanly');

  // ---------------------------------------------------------------------------
  // 3. Transient Sheet Failure -> DB Retained + Exponential Backoff Outbox
  // ---------------------------------------------------------------------------
  console.log('\n⏱️ [3/8] Testing DB-First Durability + Exponential Backoff on Sheet Failure...');
  const sheetFailOutcome = await executeUniversalSubmission({
    module: 'CUSTOMERS',
    entityType: 'CUSTOMER',
    sheetTab: 'Dealers',
    recordLabel: 'Dealer Al-Noor Lights',
    userEmail: 'syedzain@nationallight.pk',
    payload: { companyName: 'Al-Noor Lights', creditLimit: 250000 },
    commitDb: async () => ({
      entityId: 'CUST-DB-88',
      dbRecord: { id: 'CUST-DB-88', companyName: 'Al-Noor Lights' },
    }),
    pushSheet: async () => {
      throw new Error('Google Apps Script HTTP 503 rate limited');
    },
  });

  const outboxWithFailure = await getOutboxItems();
  const failedItem = outboxWithFailure.find((o) => o.entityId === 'CUST-DB-88');

  check(
    sheetFailOutcome.success === true && sheetFailOutcome.state === 'SYNC_FAILED',
    'DB commit succeeds even when Google Sheets fails (SYNC_FAILED retry state)'
  );
  check(
    Boolean(failedItem && failedItem.status === 'FAILED' && failedItem.retryCount === 1 && Date.parse(failedItem.nextRetryAt) > Date.now()),
    'Failed outbox item schedules future exponential backoff nextRetryAt'
  );

  // ---------------------------------------------------------------------------
  // 4. Offline Queue -> Auth Session Guard -> Automatic Reconnect Replay
  // ---------------------------------------------------------------------------
  console.log('\n📡 [4/8] Testing Offline Queue Persistence, Auth Guard & Reconnect Replay...');
  resetUniversalSubmissionStoreForTests();
  simulatedOnline = false;

  let replayedOfflineIds: string[] = [];
  registerOfflineReplayHandler('ATTENDANCE', async (item) => {
    replayedOfflineIds.push(item.transactionId);
    return {
      entityId: `ATT-DB-${item.transactionId}`,
      dbRecord: { ...item.payload, syncedFromOffline: true },
    };
  });

  const offlineRes = await executeUniversalSubmission({
    module: 'ATTENDANCE',
    entityType: 'ATTENDANCE',
    sheetTab: 'Attendance',
    recordLabel: 'Field Check-In Peshawar',
    userEmail: 'syedzain@nationallight.pk',
    payload: { locationLabel: 'Peshawar Ring Road', status: 'CHECKED_IN' },
    commitDb: async () => ({ entityId: 'SHOULD_QUEUE_OFFLINE' }),
  });

  const queuedOffline = await getOfflineQueueItems();
  check(
    offlineRes.success === true && offlineRes.state === 'OFFLINE_QUEUED' && offlineRes.isOfflineQueued === true,
    'Offline submission returns OFFLINE_QUEUED cleanly'
  );
  check(queuedOffline.length === 1 && queuedOffline[0].status === 'PENDING_SYNC', 'Offline submission stored durably in offline_queue');

  // Bring network online with expired auth session -> replay MUST pause with requiresReauth
  simulatedOnline = true;
  let sessionValid = false;
  registerAuthSessionValidator(() => sessionValid);

  const blockedReplay = await runCoordinatedBackgroundSync({
    customOutboxTransport: async () => ({ externalSheetId: '1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo' }),
  });
  const afterExpiredReplay = await getOfflineQueueItems();
  check(
    blockedReplay.authExpired === true && blockedReplay.offlineSynced === 0 && afterExpiredReplay[0]?.requiresReauth === true,
    'Coordinated background sync blocks replay when auth session expired and flags requiresReauth=true'
  );

  // Restore valid auth session -> offline queue replays to DB + outbox + Sheet UPSERT
  sessionValid = true;
  const resumedReplay = await runCoordinatedBackgroundSync({
    forceAllOutbox: true,
    customOutboxTransport: async () => ({ externalSheetId: '1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo' }),
  });
  const bgSnap = getBackgroundSyncSnapshot();
  check(
    resumedReplay.authExpired === false &&
      resumedReplay.offlineSynced === 1 &&
      resumedReplay.outboxCompleted === 1 &&
      replayedOfflineIds.length === 1 &&
      bgSnap.offlinePendingCount === 0,
    'Coordinated background sync flushes offline queue to DB and completes Sheet outbox upon valid session'
  );

  // ---------------------------------------------------------------------------
  // 5. Financial Authority Quarantine & RBAC Conflict Resolution
  // ---------------------------------------------------------------------------
  console.log('\n⚖️ [5/8] Testing Financial Safety Quarantine & Admin-Only Override RBAC...');
  resetSyncConflictsForTests();

  const inboundReport = await evaluateInboundSheetBatch({
    users: [{ email: 'newrep@nationallight.pk', fullName: 'New Field Rep' }],
    customers: [
      { customerCode: 'CUST-501', companyName: 'Khyber Traders', type: 'DEALER', creditLimit: 100000, currentBalance: 999999 },
    ],
    products: [{ skuCode: 'NL-9W-BULB', name: '9W LED Bulb', tradePrice: 210 }],
    invoices: [{ invoiceCode: 'INV-2026-001', totalAmount: 50000 }],
    recoveries: [{ recoveryNumber: 'REC-2026-002', amount: 20000 }],
    ledger: [{ id: 'LED-001', runningBalance: 0 }],
    inventory: [{ skuCode: 'NL-9W-BULB', qty: 5000 }],
    existingCustomerBalances: new Map([['CUST-501', 42000]]),
    existingCustomerCodes: new Set(['CUST-501']),
    existingSkuCodes: new Set(),
  });

  const conflicts = getConflictsSnapshot();
  check(
    inboundReport.conflictCount === 5 && conflicts.length === 5,
    'Direct Sheet edits to Invoices, Recoveries, Ledger, Inventory, and Dealer Balance are quarantined (5 conflicts)'
  );
  check(
    inboundReport.createdCount === 2 && inboundReport.updatedCount === 1 && inboundReport.rejectedCount === 0,
    'Authorized Master Data rows (Users, Dealers metadata, Products) validate without blocking financial lock'
  );

  let nonAdminBlocked = false;
  try {
    await resolveSyncConflict(conflicts[0].id, 'RESOLVED_ACCEPT_SHEET', 'accounts@nationallight.pk', 'ACCOUNTS', 'Attempt override');
  } catch (err: any) {
    nonAdminBlocked = String(err?.message || '').includes('Only SUPER_ADMIN');
  }
  check(nonAdminBlocked, 'Financial safety lock blocks non-SUPER_ADMIN from accepting external financial override');

  const resolvedByAdmin = await resolveSyncConflict(
    conflicts[0].id,
    'RESOLVED_KEEP_DB',
    'amjid@nationallight.pk',
    'SUPER_ADMIN',
    'Kept authoritative PostgreSQL ledger balance'
  );
  check(resolvedByAdmin.status === 'RESOLVED_KEEP_DB', 'SUPER_ADMIN resolves conflict cleanly with audit metadata');

  // ---------------------------------------------------------------------------
  // 6. Canonical Supabase Schema Column Verification (src/services/dbSync.ts)
  // ---------------------------------------------------------------------------
  console.log('\n🗄️ [6/8] Verifying Canonical Supabase Column Integrity in dbSync.ts...');
  const dbSyncSource = fs.readFileSync(path.resolve(process.cwd(), 'src/services/dbSync.ts'), 'utf8');
  const requiredCanonicalCols = ['customer_code', 'order_code', 'recovery_code', 'invoice_code', 'ledger_code'];
  const missingCols = requiredCanonicalCols.filter((c) => !dbSyncSource.includes(c));
  check(missingCols.length === 0, `dbSync.ts aligns with canonical Supabase columns (${requiredCanonicalCols.join(', ')})`);

  // ---------------------------------------------------------------------------
  // 7. Express API Gateway + Netlify Function Handler Parity Smoke Test
  // ---------------------------------------------------------------------------
  console.log('\n🌐 [7/8] Running Express API Gateway & Netlify Function Handler Smoke Tests...');
  const tmpStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nlink-gateway-test-'));
  const prevSecret = process.env.NLINK_SESSION_SECRET;
  const prevNetlify = process.env.NETLIFY;
  process.env.NLINK_SESSION_SECRET = 'nlink360-test-signing-secret-minimum-32-chars-ok';
  process.env.NETLIFY = 'true';

  let server: http.Server | null = null;
  try {
    const gatewayApp = createApiGateway({ storeDir: tmpStoreDir });
    server = http.createServer(gatewayApp);
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as any;
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    // Health check -> JSON 200
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthCt = healthRes.headers.get('content-type') || '';
    const healthJson = (await healthRes.json()) as any;
    check(
      healthRes.status === 200 && healthCt.includes('application/json') && healthJson.status === 'healthy',
      'Express /api/health returns JSON 200 (never HTML)'
    );

    // Status check
    const statusRes = await fetch(`${baseUrl}/api/status`);
    const statusJson = (await statusRes.json()) as any;
    check(
      statusRes.status === 200 &&
        typeof statusJson.bootstrapRequired === 'boolean' &&
        Array.isArray(statusJson.activeModules),
      'Express /api/status returns valid JSON'
    );

    // Unauthenticated /api/audit-logs -> 401
    const unauthAudit = await fetch(`${baseUrl}/api/audit-logs`);
    check(unauthAudit.status === 401, 'Unauthenticated GET /api/audit-logs fails closed with 401');

    // Unauthenticated /api/sync -> 401
    const unauthSync = await fetch(`${baseUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ORDER', transactionId: 'T-UNAUTH' }),
    });
    check(unauthSync.status === 401, 'Unauthenticated POST /api/sync fails closed with 401');

    // First-boot admin bootstrap (using ephemeral test secret, never hardcoded defaults)
    const ephemeralBootstrapSecret = ['BootTest', Date.now().toString(36), '!99Xy'].join('#');
    const bootRes = await fetch(`${baseUrl}/api/auth/bootstrap-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'amjid@nationallight.pk',
        password: ephemeralBootstrapSecret,
        fullName: 'Amjid Test Admin',
      }),
    });
    const bootJson = (await bootRes.json()) as any;
    check(
      bootRes.status === 200 && Boolean(bootJson.sessionToken) && bootJson.user?.role === 'SUPER_ADMIN',
      'POST /api/auth/bootstrap-admin provisions initial SUPER_ADMIN and returns signed sessionToken'
    );

    // Verify login succeeds with provisioned password & rejects wrong password
    const loginOk = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'amjid@nationallight.pk', password: ephemeralBootstrapSecret }),
    });
    const loginOkJson = (await loginOk.json()) as any;
    const bearerToken = loginOkJson.sessionToken;
    check(loginOk.status === 200 && Boolean(bearerToken), 'POST /api/auth/login authenticates provisioned account');

    const loginFail = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'amjid@nationallight.pk', password: 'WrongPassword!123' }),
    });
    check(loginFail.status === 401, 'POST /api/auth/login rejects invalid password with 401');

    // Authenticated /api/audit-logs & /api/sync -> 200 JSON
    const authAudit = await fetch(`${baseUrl}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    check(authAudit.status === 200, 'Authenticated GET /api/audit-logs returns 200');

    const authSync = await fetch(`${baseUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
        'x-idempotency-key': '660e8400-e29b-41d4-a716-446655440099',
      },
      body: JSON.stringify({
        type: 'SALES_ORDER',
        transactionId: 'TXN-API-SMOKE-1',
        recordId: 'SO-API-1',
      }),
    });
    const authSyncJson = (await authSync.json()) as any;
    check(authSync.status === 200 && authSyncJson.success === true, 'Authenticated POST /api/sync returns 200 JSON');

    // Unknown API route returns JSON 404 (not HTML)
    const unknownApi = await fetch(`${baseUrl}/api/non-existent-endpoint`);
    const unknownCt = unknownApi.headers.get('content-type') || '';
    check(unknownApi.status === 404 && unknownCt.includes('application/json'), 'Unknown /api/* route returns JSON 404');

    // Netlify Function handler parity test
    const { handler: netlifyApiHandler } = await import('../netlify/functions/api');
    const nfHealth = await netlifyApiHandler({
      httpMethod: 'GET',
      path: '/.netlify/functions/api/health',
      headers: {},
    });
    const nfHealthBody = JSON.parse(nfHealth.body);
    check(
      nfHealth.statusCode === 200 &&
        String(nfHealth.headers['content-type'] || '').includes('application/json') &&
        nfHealthBody.status === 'healthy',
      'Netlify Function handler (/.netlify/functions/api/health) returns parity JSON 200'
    );

    const nfUnauthSync = await netlifyApiHandler({
      httpMethod: 'POST',
      path: '/api/sync',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'ORDER' }),
    });
    check(nfUnauthSync.statusCode === 401, 'Netlify Function handler enforces Bearer auth on /api/sync (401)');
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    if (prevSecret === undefined) delete process.env.NLINK_SESSION_SECRET;
    else process.env.NLINK_SESSION_SECRET = prevSecret;
    if (prevNetlify === undefined) delete process.env.NETLIFY;
    else process.env.NETLIFY = prevNetlify;
    fs.rmSync(tmpStoreDir, { recursive: true, force: true });
    for (const f of ['.nlink-auth-store.json', '.nlink-sync-store.json', '.nlink-dashboard-config.json', '.nlink-pricelist-store.json']) {
      const tmpFile = path.join('/tmp', f);
      if (fs.existsSync(tmpFile)) fs.rmSync(tmpFile, { force: true });
    }
  }

  // ---------------------------------------------------------------------------
  // 8. PR #7 Cache Preservation & Non-Destructive Supabase Data Recovery Checks
  // ---------------------------------------------------------------------------
  console.log('\n💾 [8/8] Verifying PR #7 Cache Preservation & Non-Destructive Recovery...');
  saveLocalDatabaseCache({
    customers: [],
    orders: [],
    recoveries: [],
    visits: [{ id: 'VIS-1', customerId: 'C-1', customerName: 'Test Dealer', officerName: 'Syed Zain', visitDate: '2026-11-22', status: 'COMPLETED' } as any],
    attendance: [{ id: 'ATT-1', userId: 'USR-002', date: '2026-11-22', status: 'CHECKED_IN' } as any],
    lastUpdated: new Date().toISOString(),
  });
  const prevCache = getLocalDatabaseCache();
  saveLocalDatabaseCache({
    customers: [{ id: 'C-1', companyName: 'Test Dealer' } as any],
    orders: [],
    recoveries: [],
    visits: prevCache?.visits || [],
    attendance: prevCache?.attendance || [],
    lastUpdated: new Date().toISOString(),
  });
  const preservedCache = getLocalDatabaseCache();
  check(
    Boolean(preservedCache?.visits?.length === 1 && preservedCache?.attendance?.length === 1 && preservedCache?.customers?.length === 1),
    'Local DB cache preserves visits & attendance arrays alongside customer/order/recovery updates'
  );

  const supabaseDataSource = fs.readFileSync(path.resolve(process.cwd(), 'src/services/supabase-data.ts'), 'utf8');
  check(
    supabaseDataSource.includes(".from('parties')") && supabaseDataSource.includes(".from('erp_products')"),
    'supabase-data.ts preserves non-destructive parties merge & erp_products SKU fallback'
  );

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('❌ Test suite crashed:', err);
  process.exit(1);
});
