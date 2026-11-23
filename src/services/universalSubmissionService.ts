/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Universal Submission, Outbox & Coordinated Background Sync Service
 *
 * Implements the single authoritative N-LINK pipeline:
 *   User Action -> Validate & Generate Transaction/Idempotency ID
 *     -> Authoritative Supabase/Backend DB Commit FIRST
 *     -> Durable Outbox Enqueue -> Async Keyed Google Sheets UPSERT
 *     -> Persistent Per-User Notification + Telemetry Update
 *
 * Offline behavior:
 *   If offline (or true transient network disconnect during submit), saves into
 *   durable IndexedDB `offline_queue` as `OFFLINE_QUEUED` and automatically replays
 *   upon reconnect (checking auth session validity first).
 */

import {
  GoogleSheetTabName,
  SubmissionLifecycleState,
  SyncOutboxItem,
} from '../types';
import {
  getSyncFallbackSnapshot,
  idbDelete,
  idbGetAll,
  idbPut,
  idbReplaceAll,
  migrateLegacySyncQueuesToIndexedDb,
} from '../lib/offlineIndexedDb';
import { generateIdempotencyUuid, isValidUuid } from '../utils/idGenerator';
import {
  computeSyncFingerprintHash,
  detectDuplicateTransaction,
  generateDeterministicTransactionId,
  TransactionDomainPrefix,
} from '../utils/transactionSignature';
import { safeApiFetch } from '../lib/safeFetch';
import { supabase, isSupabaseConfigured } from './supabase';
import { syncService } from './SyncService';
import {
  incrementDuplicatesPrevented,
  recordSyncLifecycleEvent,
} from './autoSaveSyncService';
import { publishUserNotification } from './syncNotificationService';
import { getGoogleSheetsWebhookUrl } from './google-sheets';
import { TARGET_SPREADSHEET_ID } from './googleSheetsLiveService';

export interface SubmissionContext<TPayload = Record<string, unknown>, TDbResult = unknown> {
  module: string;
  entityType: string;
  sheetTab: GoogleSheetTabName | string;
  recordLabel: string;
  payload: TPayload;
  userEmail?: string;
  userId?: string;
  userName?: string;
  existingIdempotencyKey?: string;
  transactionId?: string;
  fingerprintFields?: Record<string, unknown>;
  hasPermission?: () => boolean | string;
  validate?: (payload: TPayload) => string | null;
  commitDb: (meta: {
    idempotencyKey: string;
    transactionId: string;
    fingerprintHash: string;
  }) => Promise<{ entityId: string; dbRecord?: Record<string, unknown>; result?: TDbResult }>;
  pushSheet?: (outboxItem: SyncOutboxItem) => Promise<{ externalSheetId?: string } | void>;
  onStateChange?: (state: SubmissionLifecycleState, details?: string) => void;
}

export interface SubmissionOutcome<TDbResult = unknown> {
  success: boolean;
  state: SubmissionLifecycleState;
  transactionId: string;
  idempotencyKey: string;
  entityId?: string;
  dbResult?: TDbResult;
  outboxItem?: SyncOutboxItem;
  error?: string;
  isDuplicateBlocked?: boolean;
  isOfflineQueued?: boolean;
}

export interface UniversalOfflineRecord {
  id: string;
  idempotencyKey: string;
  transactionId: string;
  module: string;
  entityType: string;
  sheetTab: GoogleSheetTabName | string;
  recordLabel: string;
  payload: Record<string, unknown>;
  userEmail?: string;
  userId?: string;
  createdAt: string;
  attemptCount: number;
  lastError?: string;
  requiresReauth?: boolean;
  status: 'PENDING_SYNC' | 'SYNCED' | 'FAILED';
}

export interface BackgroundSyncSnapshot {
  isOnline: boolean;
  isSyncing: boolean;
  offlinePendingCount: number;
  outboxPendingCount: number;
  outboxFailedCount: number;
  outboxCompletedCount: number;
  lastDbSavedAt: string | null;
  lastSheetSyncedAt: string | null;
  nextRetryAt: string | null;
  activeStateMessage: string | null;
}

export type OfflineReplayExecutor = (item: UniversalOfflineRecord) => Promise<{ entityId: string; dbRecord?: Record<string, unknown> }>;

const inFlightIdempotencyKeys = new Set<string>();
const recentFingerprintTxns = new Map<string, string>();
const backgroundListeners = new Set<(snap: BackgroundSyncSnapshot) => void>();
const offlineReplayHandlers = new Map<string, OfflineReplayExecutor>();

function resolveTransactionPrefix(moduleName: string, entityType: string): TransactionDomainPrefix {
  const combined = `${moduleName} ${entityType}`.toUpperCase();
  if (combined.includes('RECOVERY') || combined.includes('PAY')) return 'PAY';
  if (combined.includes('INVOICE') || combined.includes('INV')) return 'INV';
  if (combined.includes('LEDGER') || combined.includes('LED')) return 'LED';
  if (combined.includes('RETURN') || combined.includes('RET')) return 'RET';
  if (combined.includes('ORDER') || combined.includes('ORD')) return 'ORD';
  return 'SYN';
}

let outboxCache: SyncOutboxItem[] = [];
let offlineCache: UniversalOfflineRecord[] = [];
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let isSchedulerSyncing = false;
let lastDbSavedAt: string | null = null;
let lastSheetSyncedAt: string | null = null;
let lastStateMessage: string | null = null;
let networkBound = false;
let authSessionCheckFn: (() => Promise<boolean> | boolean) | null = null;

function isDeviceOnline(): boolean {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true;
}

function isNetworkFailureError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  return (
    !isDeviceOnline() ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('offline') ||
    msg.includes('econnrefused') ||
    msg.includes('timeout')
  );
}

function isAuthSessionError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  const status = Number((err as any)?.status || 0);
  return (
    status === 401 ||
    msg.includes('jwt expired') ||
    msg.includes('session expired') ||
    msg.includes('unauthenticated') ||
    msg.includes('not authenticated') ||
    msg.includes('invalid token')
  );
}

function computeNextBackoffIso(retryCount: number): string {
  // Exponential backoff with cap: 15s, 30s, 60s, 120s, 240s, max 15m
  const seconds = Math.min(900, Math.pow(2, Math.max(0, retryCount)) * 15);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function notifyBackgroundListeners(): void {
  const snap = getBackgroundSyncSnapshot();
  backgroundListeners.forEach((cb) => {
    try {
      cb(snap);
    } catch {
      // Isolate listener failures
    }
  });
}

export function getBackgroundSyncSnapshot(): BackgroundSyncSnapshot {
  const outbox = outboxCache.length > 0 ? outboxCache : getSyncFallbackSnapshot<SyncOutboxItem>('sync_outbox');
  const offline = offlineCache.length > 0 ? offlineCache : getSyncFallbackSnapshot<UniversalOfflineRecord>('offline_queue');

  const outboxPending = outbox.filter((o) => o.status === 'PENDING' || o.status === 'PROCESSING');
  const outboxFailed = outbox.filter((o) => o.status === 'FAILED');
  const outboxCompleted = outbox.filter((o) => o.status === 'COMPLETED');
  const offlinePending = offline.filter((o) => o.status === 'PENDING_SYNC' || o.status === 'FAILED');

  const upcomingRetry = [...outboxPending, ...outboxFailed]
    .map((o) => Date.parse(o.nextRetryAt))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)[0];

  return {
    isOnline: isDeviceOnline(),
    isSyncing: isSchedulerSyncing,
    offlinePendingCount: offlinePending.length,
    outboxPendingCount: outboxPending.length,
    outboxFailedCount: outboxFailed.length,
    outboxCompletedCount: outboxCompleted.length,
    lastDbSavedAt,
    lastSheetSyncedAt,
    nextRetryAt: upcomingRetry ? new Date(upcomingRetry).toISOString() : null,
    activeStateMessage: lastStateMessage,
  };
}

export function subscribeBackgroundSync(listener: (snap: BackgroundSyncSnapshot) => void): () => void {
  backgroundListeners.add(listener);
  listener(getBackgroundSyncSnapshot());
  return () => {
    backgroundListeners.delete(listener);
  };
}

export function registerOfflineReplayHandler(entityType: string, handler: OfflineReplayExecutor): void {
  offlineReplayHandlers.set(entityType.toUpperCase(), handler);
}

export function registerAuthSessionValidator(fn: () => Promise<boolean> | boolean): void {
  authSessionCheckFn = fn;
}

export async function hydrateUnifiedSyncStores(): Promise<void> {
  await migrateLegacySyncQueuesToIndexedDb();
  outboxCache = await idbGetAll<SyncOutboxItem>('sync_outbox');
  offlineCache = await idbGetAll<UniversalOfflineRecord>('offline_queue');
  notifyBackgroundListeners();
}

export async function getOutboxItems(): Promise<SyncOutboxItem[]> {
  if (outboxCache.length === 0) {
    outboxCache = await idbGetAll<SyncOutboxItem>('sync_outbox');
  }
  return [...outboxCache].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getOfflineQueueItems(): Promise<UniversalOfflineRecord[]> {
  if (offlineCache.length === 0) {
    offlineCache = await idbGetAll<UniversalOfflineRecord>('offline_queue');
  }
  return [...offlineCache].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

async function defaultSheetUpsertTransport(item: SyncOutboxItem): Promise<{ externalSheetId?: string }> {
  const spreadsheetId = item.externalSheetId || TARGET_SPREADSHEET_ID;
  const webhookUrl = typeof localStorage !== 'undefined' ? getGoogleSheetsWebhookUrl() : '';

  // 1. Prefer authenticated server proxy when available
  if (typeof window !== 'undefined') {
    const proxyRes = await safeApiFetch<any>('/api/sync-google-sheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': isValidUuid(item.idempotencyKey) ? item.idempotencyKey : generateIdempotencyUuid(),
        ...(webhookUrl ? { 'x-google-sheets-webhook': webhookUrl } : {}),
      },
      body: JSON.stringify({
        action: 'UPSERT',
        mode: 'UPSERT',
        spreadsheetId,
        sheetTab: item.sheetTab,
        entityType: item.entityType,
        entityId: item.entityId,
        idempotencyKey: item.idempotencyKey,
        transactionId: item.transactionId,
        record: item.payload,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!proxyRes.isStaticFallback) {
      if (proxyRes.ok && proxyRes.data?.success) {
        return { externalSheetId: spreadsheetId };
      }
      throw new Error(proxyRes.data?.error || proxyRes.error || `Sheet gateway returned HTTP ${proxyRes.status}`);
    }
  }

  // 2. Fallback to Supabase Edge Function when running on static hosting (Netlify) with Supabase configured
  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase.functions.invoke('sync-google-sheets', {
      body: {
        mode: 'UPSERT',
        outboxId: item.id,
        idempotencyKey: item.idempotencyKey,
        transactionId: item.transactionId,
        entityType: item.entityType,
        entityId: item.entityId,
        sheetTab: item.sheetTab,
        record: item.payload,
      },
    });
    if (error) {
      throw new Error(error.message || 'Supabase Edge Function sync failed');
    }
    if (data && data.success === false) {
      throw new Error(data.error || 'Google Sheets Edge Function returned failure');
    }
    return { externalSheetId: spreadsheetId };
  }

  throw new Error('No authenticated Google Sheets sync endpoint available (waiting for server gateway or Supabase Edge Function).');
}

export async function enqueueOutboxUpsert(input: {
  idempotencyKey: string;
  transactionId: string;
  entityType: string;
  entityId: string;
  sheetTab: GoogleSheetTabName | string;
  payload: Record<string, unknown>;
  userEmail?: string;
  userName?: string;
}): Promise<SyncOutboxItem> {
  if (outboxCache.length === 0) {
    outboxCache = await idbGetAll<SyncOutboxItem>('sync_outbox');
  }
  const existing = outboxCache.find(
    (o) => o.idempotencyKey === input.idempotencyKey && o.entityType === input.entityType
  );
  if (existing) {
    const updated: SyncOutboxItem = {
      ...existing,
      payload: input.payload,
      updatedAt: new Date().toISOString(),
    };
    outboxCache = outboxCache.map((o) => (o.id === existing.id ? updated : o));
    await idbPut('sync_outbox', updated);
    notifyBackgroundListeners();
    return updated;
  }

  const nowIso = new Date().toISOString();
  const outboxItem: SyncOutboxItem = {
    id: `obx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    idempotencyKey: input.idempotencyKey,
    transactionId: input.transactionId,
    direction: 'OUTBOUND',
    entityType: input.entityType,
    entityId: input.entityId,
    sheetTab: input.sheetTab,
    operation: 'UPSERT',
    payload: input.payload,
    status: 'PENDING',
    retryCount: 0,
    maxRetries: 6,
    nextRetryAt: nowIso,
    externalSheetId: TARGET_SPREADSHEET_ID,
    createdByEmail: input.userEmail,
    createdByName: input.userName,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  outboxCache = [outboxItem, ...outboxCache];
  await idbPut('sync_outbox', outboxItem);
  notifyBackgroundListeners();

  // Mirror to server & Supabase durable outbox in background
  if (typeof window !== 'undefined' && isDeviceOnline()) {
    void safeApiFetch('/api/sync/outbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outboxItem),
    }).catch(() => {});

    if (supabase && isSupabaseConfigured) {
      void Promise.resolve(
        supabase.rpc('nlink_enqueue_sync_outbox', {
          p_idempotency_key: outboxItem.idempotencyKey,
          p_transaction_id: outboxItem.transactionId,
          p_entity_type: outboxItem.entityType,
          p_entity_id: outboxItem.entityId,
          p_sheet_tab: outboxItem.sheetTab,
          p_operation: 'UPSERT',
          p_payload: outboxItem.payload,
        })
      ).catch(() => {});
    }
  }

  return outboxItem;
}

async function processSingleOutboxItem(
  item: SyncOutboxItem,
  customTransport?: (outboxItem: SyncOutboxItem) => Promise<{ externalSheetId?: string } | void>
): Promise<{ success: boolean; error?: string }> {
  const nowIso = new Date().toISOString();
  const processingItem: SyncOutboxItem = {
    ...item,
    status: 'PROCESSING',
    updatedAt: nowIso,
  };
  outboxCache = outboxCache.map((o) => (o.id === item.id ? processingItem : o));
  await idbPut('sync_outbox', processingItem);
  notifyBackgroundListeners();

  try {
    const res = customTransport ? await customTransport(processingItem) : await defaultSheetUpsertTransport(processingItem);
    const doneIso = new Date().toISOString();
    const resolvedSheetId =
      (res && typeof res === 'object' && 'externalSheetId' in res ? res.externalSheetId : undefined) ||
      processingItem.externalSheetId ||
      TARGET_SPREADSHEET_ID;
    const completedItem: SyncOutboxItem = {
      ...processingItem,
      status: 'COMPLETED',
      lastError: undefined,
      externalSheetId: resolvedSheetId,
      syncedAt: doneIso,
      updatedAt: doneIso,
    };
    outboxCache = outboxCache.map((o) => (o.id === item.id ? completedItem : o));
    await idbPut('sync_outbox', completedItem);
    lastSheetSyncedAt = doneIso;
    notifyBackgroundListeners();

    syncService.markOperationSynced(item.idempotencyKey, completedItem.externalSheetId);
    recordSyncLifecycleEvent({
      module: item.entityType,
      recordType: item.sheetTab,
      databaseId: item.entityId,
      transactionId: item.transactionId,
      idempotencyKey: item.idempotencyKey,
      syncStatus: 'SUCCESSFULLY_SYNCED',
      externalSheetId: completedItem.externalSheetId,
      summary: `${item.sheetTab} synchronized cleanly with Google Sheets`,
    });

    await publishUserNotification({
      userEmail: item.createdByEmail,
      dedupeKey: `sync:${item.idempotencyKey}`,
      category: 'SYNC',
      severity: 'SUCCESS',
      title: 'Synced to Google Sheets',
      message: `${item.entityType} (${item.transactionId}) saved in DB and synchronized to ${item.sheetTab}.`,
      entityType: item.entityType,
      entityId: item.entityId,
      transactionId: item.transactionId,
      syncStatus: 'FULLY_SYNCHRONIZED',
    });

    return { success: true };
  } catch (err: any) {
    const errMsg = err?.message || 'Google Sheets sync failed';
    const nextRetryCount = (item.retryCount || 0) + 1;
    const failedIso = new Date().toISOString();
    const failedItem: SyncOutboxItem = {
      ...processingItem,
      status: 'FAILED',
      retryCount: nextRetryCount,
      nextRetryAt: computeNextBackoffIso(nextRetryCount),
      lastError: errMsg,
      updatedAt: failedIso,
    };
    outboxCache = outboxCache.map((o) => (o.id === item.id ? failedItem : o));
    await idbPut('sync_outbox', failedItem);
    notifyBackgroundListeners();

    syncService.markOperationFailed(item.idempotencyKey, errMsg);
    await publishUserNotification({
      userEmail: item.createdByEmail,
      dedupeKey: `sync:${item.idempotencyKey}`,
      category: 'SYNC',
      severity: 'WARNING',
      title: 'Saved in Database · Sheet Retry Queued',
      message: `${item.entityType} (${item.transactionId}) is safely stored in database. Google Sheets sync will auto-retry (${errMsg}).`,
      entityType: item.entityType,
      entityId: item.entityId,
      transactionId: item.transactionId,
      syncStatus: 'SYNC_FAILED',
    });

    return { success: false, error: errMsg };
  }
}

/**
 * Unified Submission Pipeline executed by EVERY applicable Submit / Save / Add / Update / Confirm / Approve / Post CTA.
 */
export async function executeUniversalSubmission<TPayload extends Record<string, unknown>, TDbResult = unknown>(
  ctx: SubmissionContext<TPayload, TDbResult>
): Promise<SubmissionOutcome<TDbResult>> {
  const emitState = (state: SubmissionLifecycleState, details?: string) => {
    lastStateMessage = details || state;
    ctx.onStateChange?.(state, details);
    notifyBackgroundListeners();
  };

  // STEP 1: Validate Permissions & Business Form
  emitState('VALIDATING', `Validating ${ctx.recordLabel}...`);
  if (ctx.hasPermission) {
    const permResult = ctx.hasPermission();
    if (permResult !== true) {
      const reason = typeof permResult === 'string' ? permResult : `Unauthorized to submit ${ctx.recordLabel}.`;
      emitState('SUBMISSION_FAILED', reason);
      return {
        success: false,
        state: 'SUBMISSION_FAILED',
        transactionId: ctx.transactionId || '',
        idempotencyKey: ctx.existingIdempotencyKey || '',
        error: reason,
      };
    }
  }

  if (ctx.validate) {
    const validationError = ctx.validate(ctx.payload);
    if (validationError) {
      emitState('SUBMISSION_FAILED', validationError);
      return {
        success: false,
        state: 'SUBMISSION_FAILED',
        transactionId: ctx.transactionId || '',
        idempotencyKey: ctx.existingIdempotencyKey || '',
        error: validationError,
      };
    }
  }

  // Generate Transaction ID, Idempotency Key & Fingerprint
  const idempotencyKey = isValidUuid(ctx.existingIdempotencyKey)
    ? String(ctx.existingIdempotencyKey)
    : generateIdempotencyUuid();

  const transactionId =
    ctx.transactionId ||
    generateDeterministicTransactionId(
      resolveTransactionPrefix(ctx.module, ctx.entityType)
    );

  const fingerprintHash = ctx.fingerprintFields
    ? computeSyncFingerprintHash({
        module: ctx.module,
        ...ctx.fingerprintFields,
      })
    : computeSyncFingerprintHash({
        module: ctx.module,
        entityType: ctx.entityType,
        idempotencyKey,
      });

  // Duplicate & Double-Submit Guard
  if (inFlightIdempotencyKeys.has(idempotencyKey)) {
    incrementDuplicatesPrevented(`In-flight duplicate blocked for ${transactionId}`);
    emitState('SUBMISSION_FAILED', 'Submission already in progress.');
    return {
      success: false,
      state: 'SUBMISSION_FAILED',
      transactionId,
      idempotencyKey,
      isDuplicateBlocked: true,
      error: 'Submission already in progress. Duplicate request blocked.',
    };
  }

  if (ctx.fingerprintFields) {
    const knownDupTxnId = recentFingerprintTxns.get(fingerprintHash);
    const dupCheck = detectDuplicateTransaction(
      { idempotencyKey, transactionId, fingerprintHash },
      [...outboxCache, ...offlineCache]
    );
    if (knownDupTxnId || dupCheck.isDuplicate) {
      const originalRef = knownDupTxnId || dupCheck.existingRecord?.transactionId || transactionId;
      incrementDuplicatesPrevented(`Duplicate fingerprint blocked for ${ctx.recordLabel}`);
      emitState('SUBMISSION_FAILED', `Duplicate ${ctx.recordLabel} prevented.`);
      return {
        success: false,
        state: 'SUBMISSION_FAILED',
        transactionId,
        idempotencyKey,
        isDuplicateBlocked: true,
        error: `Duplicate ${ctx.recordLabel} detected (${originalRef}).`,
      };
    }
  }

  // OFFLINE SHORT-CIRCUIT: Queue durably in IndexedDB when offline
  if (!isDeviceOnline()) {
    const offlineRecord: UniversalOfflineRecord = {
      id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      idempotencyKey,
      transactionId,
      module: ctx.module,
      entityType: ctx.entityType,
      sheetTab: ctx.sheetTab,
      recordLabel: ctx.recordLabel,
      payload: ctx.payload,
      userEmail: ctx.userEmail,
      userId: ctx.userId,
      createdAt: new Date().toISOString(),
      attemptCount: 0,
      status: 'PENDING_SYNC',
    };
    offlineCache = [offlineRecord, ...offlineCache];
    await idbPut('offline_queue', offlineRecord);

    recordSyncLifecycleEvent({
      module: ctx.module,
      recordType: ctx.entityType,
      databaseId: transactionId,
      transactionId,
      idempotencyKey,
      fingerprintHash,
      syncStatus: 'PENDING_GOOGLE_SYNC',
      summary: `Offline queued: ${ctx.recordLabel} stored cleanly in IndexedDB`,
    });

    await publishUserNotification({
      userEmail: ctx.userEmail,
      dedupeKey: `sync:${idempotencyKey}`,
      category: 'OFFLINE',
      severity: 'INFO',
      title: 'Saved Offline · Pending Network',
      message: `${ctx.recordLabel} (${transactionId}) is saved in IndexedDB and will auto-sync when connectivity returns.`,
      entityType: ctx.entityType,
      transactionId,
      syncStatus: 'OFFLINE_QUEUED',
    });

    emitState('OFFLINE_QUEUED', `${ctx.recordLabel} queued offline in IndexedDB.`);
    return {
      success: true,
      state: 'OFFLINE_QUEUED',
      transactionId,
      idempotencyKey,
      isOfflineQueued: true,
    };
  }

  // STEP 2: AUTHORITATIVE DATABASE COMMIT FIRST
  inFlightIdempotencyKeys.add(idempotencyKey);
  emitState('SUBMITTING', `Saving ${ctx.recordLabel} to authoritative database...`);

  try {
    const dbOutcome = await ctx.commitDb({
      idempotencyKey,
      transactionId,
      fingerprintHash,
    });

    const entityId = dbOutcome.entityId || transactionId;
    lastDbSavedAt = new Date().toISOString();
    if (ctx.fingerprintFields) {
      recentFingerprintTxns.set(fingerprintHash, transactionId);
    }

    recordSyncLifecycleEvent({
      module: ctx.module,
      recordType: ctx.entityType,
      databaseId: entityId,
      transactionId,
      idempotencyKey,
      fingerprintHash,
      syncStatus: 'SAVED_IN_DB',
      summary: `${ctx.recordLabel} saved in database (${entityId})`,
    });

    syncService.enqueueOperation({
      idempotencyKey,
      transactionId,
      type: ctx.entityType,
      status: 'PENDING',
      module: ctx.module,
      recordType: ctx.entityType,
      databaseId: entityId,
      summary: `${ctx.recordLabel} -> ${ctx.sheetTab}`,
    });

    emitState('DATABASE_SAVED', `${ctx.recordLabel} saved in database.`);

    // STEP 3: ENQUEUE BACKGROUND SHEET UPSERT OUTBOX & TRIGGER ASYNC SYNC
    emitState('SHEET_SYNC_PENDING', `Queued ${ctx.recordLabel} for Google Sheets UPSERT...`);
    const outboxItem = await enqueueOutboxUpsert({
      idempotencyKey,
      transactionId,
      entityType: ctx.entityType,
      entityId,
      sheetTab: ctx.sheetTab,
      payload: dbOutcome.dbRecord || ctx.payload,
      userEmail: ctx.userEmail,
      userName: ctx.userName,
    });

    await publishUserNotification({
      userEmail: ctx.userEmail,
      dedupeKey: `sync:${idempotencyKey}`,
      category: 'SYNC',
      severity: 'INFO',
      title: 'Saved in Database',
      message: `${ctx.recordLabel} (${transactionId}) committed to database. Synchronizing with ${ctx.sheetTab}...`,
      entityType: ctx.entityType,
      entityId,
      transactionId,
      syncStatus: 'SHEET_SYNC_PENDING',
    });

    // Trigger asynchronous Google Sheets UPSERT immediately (non-blocking if desired, awaited cleanly for accurate final state)
    emitState('SHEET_SYNCING', `Synchronizing ${ctx.recordLabel} with ${ctx.sheetTab}...`);
    const sheetResult = await processSingleOutboxItem(outboxItem, ctx.pushSheet);

    if (sheetResult.success) {
      emitState('FULLY_SYNCHRONIZED', `${ctx.recordLabel} synchronized across DB & Google Sheets.`);
      return {
        success: true,
        state: 'FULLY_SYNCHRONIZED',
        transactionId,
        idempotencyKey,
        entityId,
        dbResult: dbOutcome.result,
        outboxItem,
      };
    }

    // DB succeeded cleanly; Sheet failed and stays in durable retry outbox!
    emitState('SYNC_FAILED', `Saved in database; Google Sheets sync retry queued (${sheetResult.error}).`);
    return {
      success: true,
      state: 'SYNC_FAILED',
      transactionId,
      idempotencyKey,
      entityId,
      dbResult: dbOutcome.result,
      outboxItem,
      error: sheetResult.error,
    };
  } catch (err: any) {
    // True network dropout during submission -> persist in offline IndexedDB queue
    if (isNetworkFailureError(err)) {
      const offlineRecord: UniversalOfflineRecord = {
        id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        idempotencyKey,
        transactionId,
        module: ctx.module,
        entityType: ctx.entityType,
        sheetTab: ctx.sheetTab,
        recordLabel: ctx.recordLabel,
        payload: ctx.payload,
        userEmail: ctx.userEmail,
        userId: ctx.userId,
        createdAt: new Date().toISOString(),
        attemptCount: 0,
        lastError: err?.message,
        status: 'PENDING_SYNC',
      };
      offlineCache = [offlineRecord, ...offlineCache];
      await idbPut('offline_queue', offlineRecord);

      await publishUserNotification({
        userEmail: ctx.userEmail,
        dedupeKey: `sync:${idempotencyKey}`,
        category: 'OFFLINE',
        severity: 'WARNING',
        title: 'Queued Offline Due to Network Dropout',
        message: `${ctx.recordLabel} could not reach server and was preserved in IndexedDB for automatic retry.`,
        entityType: ctx.entityType,
        transactionId,
        syncStatus: 'OFFLINE_QUEUED',
      });

      emitState('OFFLINE_QUEUED', `Network dropped — ${ctx.recordLabel} queued safely offline.`);
      return {
        success: true,
        state: 'OFFLINE_QUEUED',
        transactionId,
        idempotencyKey,
        isOfflineQueued: true,
      };
    }

    const reason = err?.message || `Failed to save ${ctx.recordLabel} in database.`;
    recordSyncLifecycleEvent({
      module: ctx.module,
      recordType: ctx.entityType,
      databaseId: transactionId,
      transactionId,
      idempotencyKey,
      syncStatus: 'SYNC_FAILED',
      summary: `Database rejection: ${ctx.recordLabel}`,
      errorMessage: reason,
    });
    await publishUserNotification({
      userEmail: ctx.userEmail,
      dedupeKey: `err:${idempotencyKey}`,
      category: 'SYNC',
      severity: 'ERROR',
      title: 'Submission Rejected',
      message: reason,
      entityType: ctx.entityType,
      transactionId,
      syncStatus: 'SUBMISSION_FAILED',
    });

    emitState('SUBMISSION_FAILED', reason);
    return {
      success: false,
      state: 'SUBMISSION_FAILED',
      transactionId,
      idempotencyKey,
      error: reason,
    };
  } finally {
    inFlightIdempotencyKeys.delete(idempotencyKey);
  }
}

/**
 * Replays due offline IndexedDB items & failed/pending Sheet outbox items in one coordinated pass.
 */
export async function runCoordinatedBackgroundSync(options?: {
  forceAllOutbox?: boolean;
  customOutboxTransport?: (item: SyncOutboxItem) => Promise<{ externalSheetId?: string } | void>;
}): Promise<{
  offlineSynced: number;
  offlineFailed: number;
  outboxCompleted: number;
  outboxFailed: number;
  authExpired: boolean;
}> {
  if (isSchedulerSyncing || !isDeviceOnline()) {
    return { offlineSynced: 0, offlineFailed: 0, outboxCompleted: 0, outboxFailed: 0, authExpired: false };
  }

  isSchedulerSyncing = true;
  notifyBackgroundListeners();

  let offlineSynced = 0;
  let offlineFailed = 0;
  let outboxCompleted = 0;
  let outboxFailed = 0;
  let authExpired = false;

  try {
    await hydrateUnifiedSyncStores();

    // Check active auth before replaying queued writes
    if (authSessionCheckFn) {
      const valid = await Promise.resolve(authSessionCheckFn());
      if (!valid) {
        authExpired = true;
      }
    }

    // Phase A: Replay Offline Queue into Authoritative Database FIRST
    const updatedOffline: UniversalOfflineRecord[] = [];
    for (const item of offlineCache) {
      if (item.status === 'SYNCED') {
        updatedOffline.push(item);
        continue;
      }
      if (authExpired) {
        item.requiresReauth = true;
        item.lastError = 'Authentication expired. Please sign in again to flush queued offline actions.';
        offlineFailed++;
        updatedOffline.push(item);
        continue;
      }

      const handler = offlineReplayHandlers.get(item.entityType.toUpperCase());
      if (!handler) {
        updatedOffline.push(item);
        continue;
      }

      item.attemptCount += 1;
      try {
        const dbOutcome = await handler(item);
        item.status = 'SYNCED';
        item.lastError = undefined;
        item.requiresReauth = false;
        offlineSynced++;
        lastDbSavedAt = new Date().toISOString();

        await enqueueOutboxUpsert({
          idempotencyKey: item.idempotencyKey,
          transactionId: item.transactionId,
          entityType: item.entityType,
          entityId: dbOutcome.entityId || item.transactionId,
          sheetTab: item.sheetTab,
          payload: dbOutcome.dbRecord || item.payload,
          userEmail: item.userEmail,
        });
      } catch (err: any) {
        if (isAuthSessionError(err)) {
          authExpired = true;
          item.requiresReauth = true;
        }
        item.status = 'FAILED';
        item.lastError = err?.message || 'Offline replay failed';
        offlineFailed++;
      }
      updatedOffline.push(item);
    }

    offlineCache = updatedOffline;
    await idbReplaceAll('offline_queue', offlineCache);

    if (authExpired && offlineFailed > 0) {
      await publishUserNotification({
        dedupeKey: 'reauth-required-offline-queue',
        category: 'OFFLINE',
        severity: 'WARNING',
        title: 'Sign-In Required to Flush Offline Queue',
        message: `${offlineFailed} offline action(s) remain safely queued in IndexedDB. Sign in to complete synchronization.`,
        syncStatus: 'OFFLINE_QUEUED',
      });
    }

    // Phase B: Process Due Outbox Items -> Google Sheets Keyed UPSERT
    const nowMs = Date.now();
    const dueOutbox = outboxCache.filter((o) => {
      if (o.status === 'COMPLETED' || o.status === 'CONFLICT') return false;
      if (o.retryCount >= o.maxRetries && !options?.forceAllOutbox) return false;
      if (options?.forceAllOutbox) return o.status === 'PENDING' || o.status === 'FAILED';
      return o.status === 'PENDING' || Date.parse(o.nextRetryAt || '1970-01-01') <= nowMs;
    });

    for (const outboxItem of dueOutbox) {
      const res = await processSingleOutboxItem(outboxItem, options?.customOutboxTransport);
      if (res.success) outboxCompleted++;
      else outboxFailed++;
    }
  } finally {
    isSchedulerSyncing = false;
    notifyBackgroundListeners();
  }

  return { offlineSynced, offlineFailed, outboxCompleted, outboxFailed, authExpired };
}

export function startUnifiedBackgroundSync(intervalMs = 60_000): () => void {
  void hydrateUnifiedSyncStores();

  if (typeof window !== 'undefined' && !networkBound) {
    networkBound = true;
    window.addEventListener('online', () => {
      notifyBackgroundListeners();
      void runCoordinatedBackgroundSync();
    });
    window.addEventListener('offline', () => {
      notifyBackgroundListeners();
    });
  }

  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = setInterval(() => {
    if (isDeviceOnline() && !isSchedulerSyncing) {
      void runCoordinatedBackgroundSync();
    }
  }, intervalMs);

  return () => {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  };
}

export async function clearOutboxItem(id: string): Promise<void> {
  outboxCache = outboxCache.filter((o) => o.id !== id);
  await idbDelete('sync_outbox', id);
  notifyBackgroundListeners();
}

export async function retryOutboxItem(
  id: string,
  customTransport?: (item: SyncOutboxItem) => Promise<{ externalSheetId?: string } | void>
): Promise<{ success: boolean; error?: string }> {
  if (outboxCache.length === 0) {
    outboxCache = await idbGetAll<SyncOutboxItem>('sync_outbox');
  }
  const item = outboxCache.find((o) => o.id === id);
  if (!item) return { success: false, error: 'Outbox item not found' };
  return processSingleOutboxItem(item, customTransport);
}

export function resetUniversalSubmissionStoreForTests(): void {
  inFlightIdempotencyKeys.clear();
  recentFingerprintTxns.clear();
  outboxCache = [];
  offlineCache = [];
  void idbReplaceAll('sync_outbox', []);
  void idbReplaceAll('offline_queue', []);
  lastDbSavedAt = null;
  lastSheetSyncedAt = null;
  lastStateMessage = null;
  isSchedulerSyncing = false;
  offlineReplayHandlers.clear();
  authSessionCheckFn = null;
  notifyBackgroundListeners();
}
