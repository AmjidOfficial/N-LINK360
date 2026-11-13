/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - True Offline Sync & Conflict Resolution Engine
 * Handles offline persistence, idempotent sync queuing, network state tracking, and conflict resolution.
 */

export type SyncStatus = 'DRAFT' | 'PENDING_SYNC' | 'SYNCED' | 'FAILED';

export type ErrorCategory = 'NETWORK' | 'DATABASE' | 'RLS_AUTH' | 'VALIDATION' | 'TIMEOUT' | 'UNKNOWN';

export function classifySyncError(errorMsg?: string): ErrorCategory {
  if (!errorMsg) return 'UNKNOWN';
  const lower = errorMsg.toLowerCase();
  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('offline') ||
    lower.includes('load failed') ||
    lower.includes('econnrefused') ||
    lower.includes('internet') ||
    lower.includes('cors')
  ) {
    return 'NETWORK';
  }
  if (
    lower.includes('jwt') ||
    lower.includes('row-level security') ||
    lower.includes('rls') ||
    lower.includes('permission') ||
    lower.includes('unauthorized') ||
    lower.includes('not allowed') ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    return 'RLS_AUTH';
  }
  if (
    lower.includes('foreign key') ||
    lower.includes('duplicate key') ||
    lower.includes('unique constraint') ||
    lower.includes('check constraint') ||
    lower.includes('syntax error') ||
    lower.includes('relation') ||
    lower.includes('column') ||
    lower.includes('23505') ||
    lower.includes('23503')
  ) {
    return 'DATABASE';
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('504') || lower.includes('gateway')) {
    return 'TIMEOUT';
  }
  if (lower.includes('validation') || lower.includes('missing') || lower.includes('invalid') || lower.includes('required')) {
    return 'VALIDATION';
  }
  return 'UNKNOWN';
}

export interface OfflineQueueItem {
  id: string; // Unique queue item ID
  idempotencyKey: string; // Prevents duplicate posting on retry
  module: 'ORDERS' | 'RECOVERY' | 'VISITS' | 'RETURNS' | 'CUSTOMERS';
  action: 'CREATE' | 'UPDATE';
  payload: Record<string, unknown>;
  status: SyncStatus;
  createdAt: string;
  attemptCount: number;
  lastAttemptAt?: string;
  firstFailedAt?: string;
  errorMessage?: string;
  errorCategory?: ErrorCategory;
}

export interface SyncAttemptLog {
  id: string;
  timestamp: string;
  trigger: 'AUTO_ONLINE' | 'BACKGROUND_INTERVAL' | 'MANUAL_USER' | 'RETRY';
  totalAttempted: number;
  syncedCount: number;
  failedCount: number;
  durationMs: number;
  failures: Array<{
    itemId: string;
    module: string;
    errorMessage: string;
    timestamp: string;
    idempotencyKey: string;
    errorCategory?: ErrorCategory;
  }>;
}

const OFFLINE_QUEUE_KEY = 'nlink360_offline_sync_queue';
const SYNC_LOGS_KEY = 'nlink360_sync_attempt_logs';

// ==============================================================================
// 1. QUEUE PERSISTENCE & RETRIEVAL
// ==============================================================================
export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read offline sync queue:', err);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to persist offline sync queue:', err);
  }
}

export function getSyncAttemptLogs(): SyncAttemptLog[] {
  try {
    const raw = localStorage.getItem(SYNC_LOGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSyncAttemptLogs(logs: SyncAttemptLog[]): void {
  try {
    const trimmed = logs.slice(0, 50); // Keep last 50 attempts
    localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to persist sync attempt logs:', err);
  }
}

export function addSyncAttemptLog(log: SyncAttemptLog): void {
  const existing = getSyncAttemptLogs();
  existing.unshift(log);
  saveSyncAttemptLogs(existing);
}

export function clearSyncAttemptLogs(): void {
  try {
    localStorage.removeItem(SYNC_LOGS_KEY);
  } catch {}
}

export function enqueueOfflineAction(
  module: OfflineQueueItem['module'],
  action: OfflineQueueItem['action'],
  payload: Record<string, unknown>
): OfflineQueueItem {
  const queue = getOfflineQueue();

  // Create deterministic idempotency key
  const idempotencyKey = `idem_${module}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const item: OfflineQueueItem = {
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    idempotencyKey,
    module,
    action,
    payload,
    status: 'PENDING_SYNC',
    createdAt: new Date().toISOString(),
    attemptCount: 0,
  };

  queue.push(item);
  saveOfflineQueue(queue);
  return item;
}

export function clearSyncedItems(): void {
  const queue = getOfflineQueue();
  const pending = queue.filter((item) => item.status !== 'SYNCED');
  saveOfflineQueue(pending);
}

// ==============================================================================
// 2. NETWORK EVENT & AUTOMATIC SYNC DISPATCHER
// ==============================================================================
export type NetworkStateListener = (isOnline: boolean) => void;
export type QueueChangeListener = (queue: OfflineQueueItem[]) => void;
export type SyncCompletionListener = (result: { syncedCount: number; failedCount: number }) => void;
export type SyncLogListener = (logs: SyncAttemptLog[]) => void;
export type SyncItemHandler = (item: OfflineQueueItem) => Promise<{ success: boolean; error?: string }>;

async function defaultSupabaseSyncHandler(item: OfflineQueueItem): Promise<{ success: boolean; error?: string }> {
  try {
    const { submitOrder, recordRecovery, logVisit, registerCustomerPending } = await import('./supabase-transactions');
    if (item.module === 'ORDERS') {
      const p = item.payload as Record<string, unknown>;
      const order = (p.order || p) as any;
      const recoveryAmount = Number(p.recoveryAmount || 0);
      await submitOrder(order, recoveryAmount);
      return { success: true };
    }
    if (item.module === 'RECOVERY') {
      const rec = item.payload as any;
      await recordRecovery(rec);
      return { success: true };
    }
    if (item.module === 'VISITS') {
      const visit = item.payload as any;
      await logVisit(visit);
      return { success: true };
    }
    if (item.module === 'CUSTOMERS') {
      const reg = item.payload as any;
      await registerCustomerPending(reg);
      return { success: true };
    }
    return { success: false, error: `Unrecognized module: ${item.module}` };
  } catch (err: any) {
    const msg = err?.message || err?.error_description || (typeof err === 'string' ? err : 'Transaction submission error');
    const details = err?.details ? ` - ${err.details}` : '';
    const hint = err?.hint ? ` (${err.hint})` : '';
    return { success: false, error: `${msg}${details}${hint}` };
  }
}

class SyncManager {
  private networkListeners: Set<NetworkStateListener> = new Set();
  private queueListeners: Set<QueueChangeListener> = new Set();
  private completionListeners: Set<SyncCompletionListener> = new Set();
  private logListeners: Set<SyncLogListener> = new Set();
  private defaultHandler: SyncItemHandler = defaultSupabaseSyncHandler;
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyNetworkState(true);
        void this.triggerSync(undefined, 'AUTO_ONLINE');
      });
      window.addEventListener('offline', () => {
        this.notifyNetworkState(false);
      });

      // Background sync runner every 45s if online and items need syncing
      setInterval(() => {
        if (this.isOnline() && !this.isSyncing) {
          const q = getOfflineQueue();
          const hasPending = q.some((i) => i.status === 'PENDING_SYNC');
          if (hasPending) {
            void this.triggerSync(undefined, 'BACKGROUND_INTERVAL');
          }
        }
      }, 45000);
    }
  }

  public setDefaultHandler(handler: SyncItemHandler): void {
    this.defaultHandler = handler;
  }

  public isOnline(): boolean {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  }

  public subscribeNetwork(listener: NetworkStateListener): () => void {
    this.networkListeners.add(listener);
    listener(this.isOnline());
    return () => this.networkListeners.delete(listener);
  }

  public subscribeQueue(listener: QueueChangeListener): () => void {
    this.queueListeners.add(listener);
    listener(getOfflineQueue());
    return () => this.queueListeners.delete(listener);
  }

  public subscribeCompletion(listener: SyncCompletionListener): () => void {
    this.completionListeners.add(listener);
    return () => this.completionListeners.delete(listener);
  }

  public subscribeLogs(listener: SyncLogListener): () => void {
    this.logListeners.add(listener);
    listener(getSyncAttemptLogs());
    return () => this.logListeners.delete(listener);
  }

  public onSyncComplete(listener: SyncCompletionListener): () => void {
    return this.subscribeCompletion(listener);
  }

  public getQueue(): OfflineQueueItem[] {
    return getOfflineQueue();
  }

  public getPendingCount(): number {
    return getOfflineQueue().filter(
      (item) => item.status === 'PENDING_SYNC' || item.status === 'FAILED'
    ).length;
  }

  public getFailedCount(): number {
    return getOfflineQueue().filter((item) => item.status === 'FAILED').length;
  }

  public getFailedItems(): OfflineQueueItem[] {
    return getOfflineQueue().filter((item) => item.status === 'FAILED');
  }

  public enqueue(
    module: OfflineQueueItem['module'],
    action: OfflineQueueItem['action'],
    payload: Record<string, unknown>
  ): OfflineQueueItem {
    const item = enqueueOfflineAction(module, action, payload);
    this.notifyQueue();
    return item;
  }

  public async syncQueue(): Promise<{ syncedCount: number; failedCount: number }> {
    return this.triggerSync(undefined, 'BACKGROUND_INTERVAL');
  }

  public removeItem(itemId: string): boolean {
    const queue = getOfflineQueue();
    const filtered = queue.filter((i) => i.id !== itemId);
    if (filtered.length !== queue.length) {
      saveOfflineQueue(filtered);
      this.notifyQueue();
      return true;
    }
    return false;
  }

  public clearFailedItems(): void {
    const queue = getOfflineQueue();
    const filtered = queue.filter((i) => i.status !== 'FAILED');
    saveOfflineQueue(filtered);
    this.notifyQueue();
  }

  public async retryItem(
    itemId: string,
    customHandler?: SyncItemHandler
  ): Promise<{ success: boolean; error?: string }> {
    if (this.isSyncing) {
      return { success: false, error: 'A sync operation is already in progress' };
    }
    if (!this.isOnline()) {
      return { success: false, error: 'Cannot connect to Supabase: Device is currently offline' };
    }

    const queue = getOfflineQueue();
    const item = queue.find((i) => i.id === itemId);
    if (!item) {
      return { success: false, error: 'Queue record not found' };
    }

    const startTime = Date.now();
    item.attemptCount += 1;
    item.lastAttemptAt = new Date().toISOString();

    const handler = customHandler || this.defaultHandler;
    try {
      const res = await handler(item);
      if (res.success) {
        item.status = 'SYNCED';
        item.errorMessage = undefined;
        item.errorCategory = undefined;
        saveOfflineQueue(queue);
        this.notifyQueue();

        const log: SyncAttemptLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          trigger: 'RETRY',
          totalAttempted: 1,
          syncedCount: 1,
          failedCount: 0,
          durationMs: Date.now() - startTime,
          failures: [],
        };
        addSyncAttemptLog(log);
        this.notifyLogs();
        this.notifyCompletion({ syncedCount: 1, failedCount: 0 });
        return { success: true };
      } else {
        item.status = 'FAILED';
        item.errorMessage = res.error || 'Server rejected payload';
        item.errorCategory = classifySyncError(item.errorMessage);
        if (!item.firstFailedAt) item.firstFailedAt = new Date().toISOString();
        saveOfflineQueue(queue);
        this.notifyQueue();

        const log: SyncAttemptLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          trigger: 'RETRY',
          totalAttempted: 1,
          syncedCount: 0,
          failedCount: 1,
          durationMs: Date.now() - startTime,
          failures: [
            {
              itemId: item.id,
              module: item.module,
              errorMessage: item.errorMessage,
              timestamp: item.lastAttemptAt,
              idempotencyKey: item.idempotencyKey,
              errorCategory: item.errorCategory,
            },
          ],
        };
        addSyncAttemptLog(log);
        this.notifyLogs();
        return { success: false, error: item.errorMessage };
      }
    } catch (err: any) {
      const msg = err?.message || 'Network communication error';
      item.status = 'FAILED';
      item.errorMessage = msg;
      item.errorCategory = classifySyncError(msg);
      if (!item.firstFailedAt) item.firstFailedAt = new Date().toISOString();
      saveOfflineQueue(queue);
      this.notifyQueue();

      const log: SyncAttemptLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        trigger: 'RETRY',
        totalAttempted: 1,
        syncedCount: 0,
        failedCount: 1,
        durationMs: Date.now() - startTime,
        failures: [
          {
            itemId: item.id,
            module: item.module,
            errorMessage: msg,
            timestamp: item.lastAttemptAt,
            idempotencyKey: item.idempotencyKey,
            errorCategory: item.errorCategory,
          },
        ],
      };
      addSyncAttemptLog(log);
      this.notifyLogs();
      return { success: false, error: msg };
    }
  }

  private notifyNetworkState(isOnline: boolean) {
    this.networkListeners.forEach((l) => l(isOnline));
  }

  private notifyQueue() {
    const queue = getOfflineQueue();
    this.queueListeners.forEach((l) => l(queue));
  }

  private notifyCompletion(result: { syncedCount: number; failedCount: number }) {
    this.completionListeners.forEach((l) => l(result));
  }

  private notifyLogs() {
    const logs = getSyncAttemptLogs();
    this.logListeners.forEach((l) => l(logs));
  }

  public async triggerSync(
    customHandler?: SyncItemHandler,
    trigger: SyncAttemptLog['trigger'] = 'MANUAL_USER'
  ): Promise<{ syncedCount: number; failedCount: number }> {
    if (this.isSyncing || !this.isOnline()) {
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const queue = getOfflineQueue();
    let syncedCount = 0;
    let failedCount = 0;
    const failures: SyncAttemptLog['failures'] = [];
    const handler = customHandler || this.defaultHandler;

    for (const item of queue) {
      if (item.status === 'PENDING_SYNC' || item.status === 'FAILED') {
        item.attemptCount += 1;
        item.lastAttemptAt = new Date().toISOString();

        try {
          const res = await handler(item);
          if (res.success) {
            item.status = 'SYNCED';
            item.errorMessage = undefined;
            item.errorCategory = undefined;
            syncedCount++;
          } else {
            item.status = 'FAILED';
            item.errorMessage = res.error || 'Server rejected payload';
            item.errorCategory = classifySyncError(item.errorMessage);
            if (!item.firstFailedAt) item.firstFailedAt = new Date().toISOString();
            failedCount++;
            failures.push({
              itemId: item.id,
              module: item.module,
              errorMessage: item.errorMessage,
              timestamp: item.lastAttemptAt,
              idempotencyKey: item.idempotencyKey,
              errorCategory: item.errorCategory,
            });
          }
        } catch (err: any) {
          item.status = 'FAILED';
          const msg = err?.message || 'Network communication error';
          item.errorMessage = msg;
          item.errorCategory = classifySyncError(msg);
          if (!item.firstFailedAt) item.firstFailedAt = new Date().toISOString();
          failedCount++;
          failures.push({
            itemId: item.id,
            module: item.module,
            errorMessage: msg,
            timestamp: item.lastAttemptAt,
            idempotencyKey: item.idempotencyKey,
            errorCategory: item.errorCategory,
          });
        }
      }
    }

    saveOfflineQueue(queue);
    this.notifyQueue();
    this.isSyncing = false;

    if (syncedCount > 0 || failedCount > 0) {
      const log: SyncAttemptLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        trigger,
        totalAttempted: syncedCount + failedCount,
        syncedCount,
        failedCount,
        durationMs: Date.now() - startTime,
        failures,
      };
      addSyncAttemptLog(log);
      this.notifyLogs();
    }

    const result = { syncedCount, failedCount };
    if (syncedCount > 0 || failedCount > 0) {
      this.notifyCompletion(result);
    }

    return result;
  }
}

export const syncManager = new SyncManager();
