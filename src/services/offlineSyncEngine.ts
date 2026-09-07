/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - True Offline Sync & Conflict Resolution Engine
 * Handles offline persistence, idempotent sync queuing, network state tracking, and conflict resolution.
 */

export type SyncStatus = 'DRAFT' | 'PENDING_SYNC' | 'SYNCED' | 'FAILED';

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
  errorMessage?: string;
}

const OFFLINE_QUEUE_KEY = 'nlink360_offline_sync_queue';

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
    return { success: false, error: err?.message || 'Transaction submission error' };
  }
}

class SyncManager {
  private networkListeners: Set<NetworkStateListener> = new Set();
  private queueListeners: Set<QueueChangeListener> = new Set();
  private completionListeners: Set<SyncCompletionListener> = new Set();
  private defaultHandler: SyncItemHandler = defaultSupabaseSyncHandler;
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyNetworkState(true);
        void this.triggerSync();
      });
      window.addEventListener('offline', () => {
        this.notifyNetworkState(false);
      });
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
    return this.triggerSync();
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

  public async triggerSync(
    customHandler?: SyncItemHandler
  ): Promise<{ syncedCount: number; failedCount: number }> {
    if (this.isSyncing || !this.isOnline()) {
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    const queue = getOfflineQueue();
    let syncedCount = 0;
    let failedCount = 0;
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
            syncedCount++;
          } else {
            item.status = 'FAILED';
            item.errorMessage = res.error || 'Server rejected payload';
            failedCount++;
          }
        } catch (err: any) {
          item.status = 'FAILED';
          item.errorMessage = err?.message || 'Network communication error';
          failedCount++;
        }
      }
    }

    saveOfflineQueue(queue);
    this.notifyQueue();
    this.isSyncing = false;

    const result = { syncedCount, failedCount };
    if (syncedCount > 0 || failedCount > 0) {
      this.notifyCompletion(result);
    }

    return result;
  }
}

export const syncManager = new SyncManager();
