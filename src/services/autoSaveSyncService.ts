/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Global Auto-Save, Lifecycle Tracking & Sync Telemetry Service
 */

import { SyncLifecycleStatus, SyncRecordEvent } from '../types';
import { safeApiFetch } from '../lib/safeFetch';

const SYNC_EVENTS_KEY = 'nlink360_sync_events_v1';
const SYNC_META_KEY = 'nlink360_sync_telemetry_meta_v1';

export interface SyncMonitorSnapshot {
  lastDbSavedAt: string | null;
  lastGoogleSyncedAt: string | null;
  pendingCount: number;
  failedCount: number;
  reconciliationCount: number;
  syncedCount: number;
  savedInDbCount: number;
  duplicatesPreventedCount: number;
  totalTrackedRecords: number;
  hasUnsavedDrafts: boolean;
  events: SyncRecordEvent[];
}

interface TelemetryMeta {
  lastDbSavedAt: string | null;
  lastGoogleSyncedAt: string | null;
  duplicatesPreventedCount: number;
}

const pendingAutoSaveTimers = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; flush: () => void | Promise<void> }
>();

let inMemoryEvents: SyncRecordEvent[] | null = null;
let inMemoryMeta: TelemetryMeta | null = null;
const monitorListeners = new Set<(snap: SyncMonitorSnapshot) => void>();

function readEvents(): SyncRecordEvent[] {
  if (inMemoryEvents) return inMemoryEvents;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SYNC_EVENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          inMemoryEvents = parsed;
          return parsed;
        }
      }
    }
  } catch {
    // Fallback
  }
  inMemoryEvents = [];
  return inMemoryEvents;
}

function writeEvents(events: SyncRecordEvent[]): void {
  const trimmed = events.slice(0, 500);
  inMemoryEvents = trimmed;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SYNC_EVENTS_KEY, JSON.stringify(trimmed));
    }
  } catch {
    // Ignore storage quota errors cleanly
  }
}

function readMeta(): TelemetryMeta {
  if (inMemoryMeta) return inMemoryMeta;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SYNC_META_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        inMemoryMeta = {
          lastDbSavedAt: parsed?.lastDbSavedAt || null,
          lastGoogleSyncedAt: parsed?.lastGoogleSyncedAt || null,
          duplicatesPreventedCount: Number(parsed?.duplicatesPreventedCount || 0),
        };
        return inMemoryMeta;
      }
    }
  } catch {
    // Fallback
  }
  inMemoryMeta = {
    lastDbSavedAt: null,
    lastGoogleSyncedAt: null,
    duplicatesPreventedCount: 0,
  };
  return inMemoryMeta;
}

function writeMeta(meta: TelemetryMeta): void {
  inMemoryMeta = meta;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
    }
  } catch {
    // Ignore
  }
}

function notifyMonitor(): void {
  const snap = getSyncMonitorSnapshot();
  monitorListeners.forEach((cb) => {
    try {
      cb(snap);
    } catch {
      // Isolate listener failures
    }
  });
}

export function subscribeSyncMonitor(listener: (snap: SyncMonitorSnapshot) => void): () => void {
  monitorListeners.add(listener);
  listener(getSyncMonitorSnapshot());
  return () => {
    monitorListeners.delete(listener);
  };
}

export function getSyncMonitorSnapshot(): SyncMonitorSnapshot {
  const events = readEvents();
  const meta = readMeta();
  let pendingCount = 0;
  let failedCount = 0;
  let reconciliationCount = 0;
  let syncedCount = 0;
  let savedInDbCount = 0;

  for (const ev of events) {
    if (ev.syncStatus === 'PENDING_GOOGLE_SYNC') pendingCount += 1;
    else if (ev.syncStatus === 'SYNC_FAILED') failedCount += 1;
    else if (ev.syncStatus === 'REQUIRES_RECONCILIATION') reconciliationCount += 1;
    else if (ev.syncStatus === 'SUCCESSFULLY_SYNCED') syncedCount += 1;
    else if (ev.syncStatus === 'SAVED_IN_DB') savedInDbCount += 1;
  }

  return {
    lastDbSavedAt: meta.lastDbSavedAt,
    lastGoogleSyncedAt: meta.lastGoogleSyncedAt,
    pendingCount,
    failedCount,
    reconciliationCount,
    syncedCount,
    savedInDbCount,
    duplicatesPreventedCount: meta.duplicatesPreventedCount,
    totalTrackedRecords: events.length,
    hasUnsavedDrafts: pendingAutoSaveTimers.size > 0,
    events: [...events],
  };
}

/**
 * Records or updates a business record's DB + Google Sync lifecycle status.
 */
export function recordSyncLifecycleEvent(input: {
  module: string;
  recordType: string;
  databaseId: string;
  transactionId: string;
  idempotencyKey: string;
  fingerprintHash?: string;
  syncStatus: SyncLifecycleStatus;
  sourceSystem?: string;
  externalSheetId?: string;
  summary?: string;
  errorMessage?: string;
}): SyncRecordEvent {
  const nowIso = new Date().toISOString();
  const events = readEvents();
  const meta = readMeta();

  const existingIdx = events.findIndex(
    (e) =>
      (e.idempotencyKey && e.idempotencyKey === input.idempotencyKey) ||
      (e.transactionId && e.transactionId === input.transactionId) ||
      (e.databaseId && e.databaseId === input.databaseId && e.recordType === input.recordType)
  );

  let nextEvent: SyncRecordEvent;
  if (existingIdx >= 0) {
    const prev = events[existingIdx];
    nextEvent = {
      ...prev,
      ...input,
      sourceSystem: input.sourceSystem || prev.sourceSystem || 'NLINK_WEB',
      lastDbSavedAt:
        input.syncStatus === 'SAVED_IN_DB' ||
        input.syncStatus === 'PENDING_GOOGLE_SYNC' ||
        input.syncStatus === 'SUCCESSFULLY_SYNCED'
          ? nowIso
          : prev.lastDbSavedAt,
      lastSyncedAt:
        input.syncStatus === 'SUCCESSFULLY_SYNCED' ? nowIso : prev.lastSyncedAt,
      updatedAt: nowIso,
      retryCount:
        input.syncStatus === 'SYNC_FAILED' ? (prev.retryCount || 0) + 1 : prev.retryCount || 0,
    };
    events[existingIdx] = nextEvent;
  } else {
    nextEvent = {
      id: `sync_ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      module: input.module,
      recordType: input.recordType,
      databaseId: input.databaseId,
      externalSheetId: input.externalSheetId,
      transactionId: input.transactionId,
      idempotencyKey: input.idempotencyKey,
      fingerprintHash: input.fingerprintHash,
      syncStatus: input.syncStatus,
      sourceSystem: input.sourceSystem || 'NLINK_WEB',
      lastDbSavedAt:
        input.syncStatus === 'SAVED_IN_DB' ||
        input.syncStatus === 'PENDING_GOOGLE_SYNC' ||
        input.syncStatus === 'SUCCESSFULLY_SYNCED'
          ? nowIso
          : undefined,
      lastSyncedAt: input.syncStatus === 'SUCCESSFULLY_SYNCED' ? nowIso : undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
      summary: input.summary,
      errorMessage: input.errorMessage,
      retryCount: input.syncStatus === 'SYNC_FAILED' ? 1 : 0,
    };
    events.unshift(nextEvent);
  }

  writeEvents(events);

  if (
    input.syncStatus === 'SAVED_IN_DB' ||
    input.syncStatus === 'PENDING_GOOGLE_SYNC' ||
    input.syncStatus === 'SUCCESSFULLY_SYNCED'
  ) {
    meta.lastDbSavedAt = nowIso;
  }
  if (input.syncStatus === 'SUCCESSFULLY_SYNCED') {
    meta.lastGoogleSyncedAt = nowIso;
  }
  writeMeta(meta);
  notifyMonitor();
  return nextEvent;
}

export function markAllPendingEventsSynced(externalSheetId?: string): void {
  const nowIso = new Date().toISOString();
  const events = readEvents().map((ev) => {
    if (ev.syncStatus === 'SAVED_IN_DB' || ev.syncStatus === 'PENDING_GOOGLE_SYNC' || ev.syncStatus === 'SYNC_FAILED') {
      return {
        ...ev,
        syncStatus: 'SUCCESSFULLY_SYNCED' as SyncLifecycleStatus,
        externalSheetId: externalSheetId || ev.externalSheetId,
        lastSyncedAt: nowIso,
        updatedAt: nowIso,
        errorMessage: undefined,
      };
    }
    return ev;
  });
  writeEvents(events);
  const meta = readMeta();
  meta.lastGoogleSyncedAt = nowIso;
  writeMeta(meta);
  notifyMonitor();
}

export function incrementDuplicatesPrevented(reason?: string): number {
  const meta = readMeta();
  meta.duplicatesPreventedCount += 1;
  writeMeta(meta);
  notifyMonitor();
  if (typeof window !== 'undefined') {
    void safeApiFetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'DUPLICATE_PREVENTION_TELEMETRY',
        reason: reason || 'Client idempotency guard prevented duplicate posting',
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }
  return meta.duplicatesPreventedCount;
}

/**
 * Schedules a debounced auto-save callback that will also flush automatically
 * if the user navigates routes/tabs or leaves the browser.
 */
export function scheduleDebouncedAutoSave(
  key: string,
  saveFn: () => void | Promise<void>,
  delayMs = 550
): void {
  const existing = pendingAutoSaveTimers.get(key);
  if (existing) {
    clearTimeout(existing.timer);
  }
  const timer = setTimeout(() => {
    pendingAutoSaveTimers.delete(key);
    try {
      void Promise.resolve(saveFn()).finally(() => notifyMonitor());
    } catch {
      notifyMonitor();
    }
  }, delayMs);

  pendingAutoSaveTimers.set(key, {
    timer,
    flush: () => {
      clearTimeout(timer);
      pendingAutoSaveTimers.delete(key);
      return saveFn();
    },
  });
  notifyMonitor();
}

export function cancelDebouncedAutoSave(key: string): void {
  const existing = pendingAutoSaveTimers.get(key);
  if (existing) {
    clearTimeout(existing.timer);
    pendingAutoSaveTimers.delete(key);
    notifyMonitor();
  }
}

/**
 * Flushes all pending debounced auto-saves immediately (used on route/tab switches and beforeunload).
 */
export async function flushAllAutoSaves(): Promise<number> {
  const entries = Array.from(pendingAutoSaveTimers.values());
  if (entries.length === 0) return 0;
  let flushed = 0;
  for (const entry of entries) {
    try {
      await entry.flush();
      flushed += 1;
    } catch {
      // Continue flushing remaining pending saves
    }
  }
  notifyMonitor();
  return flushed;
}

export function registerGlobalUnloadFlush(): () => void {
  if (typeof window === 'undefined') return () => {};
  const handleFlush = () => {
    void flushAllAutoSaves();
  };
  const handleVisibility = () => {
    if (document.visibilityState === 'hidden') {
      void flushAllAutoSaves();
    }
  };
  window.addEventListener('beforeunload', handleFlush);
  window.addEventListener('pagehide', handleFlush);
  document.addEventListener('visibilitychange', handleVisibility);
  return () => {
    window.removeEventListener('beforeunload', handleFlush);
    window.removeEventListener('pagehide', handleFlush);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}

export function resetSyncMonitorStoreForTests(): void {
  pendingAutoSaveTimers.forEach((entry) => clearTimeout(entry.timer));
  pendingAutoSaveTimers.clear();
  inMemoryEvents = [];
  inMemoryMeta = {
    lastDbSavedAt: null,
    lastGoogleSyncedAt: null,
    duplicatesPreventedCount: 0,
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SYNC_EVENTS_KEY);
      localStorage.removeItem(SYNC_META_KEY);
    }
  } catch {
    // Ignore
  }
}
