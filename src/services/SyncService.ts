/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Unified Central SyncService Facade
 *
 * Maintains an authoritative in-memory queue of pending/failed/completed sync operations,
 * exposes real-time batch progress telemetry for the UI, retries individual or batch
 * sync failures, and records reconciliation discrepancies across ERP modules & Google Sheets.
 */

import { SyncLifecycleStatus, SyncRecordEvent } from '../types';
import { safeApiFetch } from '../lib/safeFetch';
import {
  getSyncMonitorSnapshot,
  recordSyncLifecycleEvent,
  subscribeSyncMonitor,
} from './autoSaveSyncService';
import {
  getPendingUploads,
  PendingUploadItem,
  removePendingUpload,
} from './googleSheetsTwoWaySyncService';

export type SyncOperationStatus =
  | 'PENDING'
  | 'SYNCING'
  | 'SYNCED'
  | 'FAILED'
  | 'RECONCILIATION_REQUIRED';

export type SyncExecutor = (op: SyncOperation) => Promise<void>;

export interface SyncOperation {
  id: string;
  idempotencyKey: string;
  transactionId: string;
  timestamp: string;
  type: string;
  status: SyncOperationStatus;
  errorDetails: string | null;
  module: string;
  recordType: string;
  databaseId: string;
  summary?: string;
  externalSheetId?: string;
  retryCount: number;
  lastAttemptAt?: string;
  completedAt?: string;
}

export interface SyncProgressState {
  isSyncing: boolean;
  totalQueued: number;
  pendingCount: number;
  syncingCount: number;
  syncedCount: number;
  failedCount: number;
  reconciliationCount: number;
  batchTotal: number;
  batchCompleted: number;
  progressPercent: number;
  lastUpdatedAt: string | null;
}

export interface ReconciliationDiscrepancy {
  id: string;
  operationId?: string;
  transactionId?: string;
  module: string;
  recordId: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  databaseValue?: string;
  externalValue?: string;
  status: 'OPEN' | 'RESOLVED';
  detectedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface SyncServiceSnapshot {
  operations: SyncOperation[];
  history: SyncOperation[];
  progress: SyncProgressState;
  discrepancies: ReconciliationDiscrepancy[];
}

export interface EnqueueOperationInput {
  id?: string;
  idempotencyKey: string;
  transactionId?: string;
  timestamp?: string;
  type: string;
  status?: SyncOperationStatus;
  errorDetails?: string | null;
  module?: string;
  recordType?: string;
  databaseId?: string;
  summary?: string;
  externalSheetId?: string;
  retryCount?: number;
}

export interface RetryBatchResult {
  totalAttempted: number;
  succeededCount: number;
  failedCount: number;
  remainingFailedIds: string[];
}

export interface RecordDiscrepancyInput {
  id?: string;
  operationId?: string;
  transactionId?: string;
  module: string;
  recordId: string;
  severity?: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  databaseValue?: string;
  externalValue?: string;
}

const DISCREPANCIES_STORAGE_KEY = 'nlink360_sync_discrepancies_v1';

function mapLifecycleToOpStatus(syncStatus: SyncLifecycleStatus): SyncOperationStatus {
  switch (syncStatus) {
    case 'SUCCESSFULLY_SYNCED':
      return 'SYNCED';
    case 'SYNC_FAILED':
      return 'FAILED';
    case 'REQUIRES_RECONCILIATION':
      return 'RECONCILIATION_REQUIRED';
    case 'SAVED_IN_DB':
    case 'PENDING_GOOGLE_SYNC':
    default:
      return 'PENDING';
  }
}

function mapOpStatusToLifecycle(status: SyncOperationStatus): SyncLifecycleStatus {
  switch (status) {
    case 'SYNCED':
      return 'SUCCESSFULLY_SYNCED';
    case 'FAILED':
      return 'SYNC_FAILED';
    case 'RECONCILIATION_REQUIRED':
      return 'REQUIRES_RECONCILIATION';
    case 'PENDING':
    case 'SYNCING':
    default:
      return 'PENDING_GOOGLE_SYNC';
  }
}

export class SyncService {
  private operations: SyncOperation[] = [];
  private discrepancies: ReconciliationDiscrepancy[] = [];
  private executors = new Map<string, SyncExecutor>();
  private defaultExecutor: SyncExecutor | null = null;
  private listeners = new Set<(snapshot: SyncServiceSnapshot) => void>();
  private batchTotal = 0;
  private batchCompleted = 0;
  private isBatchRunning = false;
  private lastUpdatedAt: string | null = null;
  private bridgeLegacyStores: boolean;
  private unsubscribeMonitor: (() => void) | null = null;

  constructor(options: { bridgeLegacyStores?: boolean } = {}) {
    this.bridgeLegacyStores = options.bridgeLegacyStores ?? true;
    if (this.bridgeLegacyStores) {
      this.loadPersistedDiscrepancies();
      this.hydrateFromLegacyStores();
      this.unsubscribeMonitor = subscribeSyncMonitor((snap) => {
        this.mergeLegacyMonitorEvents(snap.events);
      });
    }
  }

  private loadPersistedDiscrepancies(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(DISCREPANCIES_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.discrepancies = parsed;
          }
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }

  private persistDiscrepancies(): void {
    if (!this.bridgeLegacyStores) return;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DISCREPANCIES_STORAGE_KEY, JSON.stringify(this.discrepancies.slice(0, 300)));
      }
    } catch {
      // Ignore storage quota errors
    }
  }

  private mergeLegacyMonitorEvents(events: SyncRecordEvent[]): void {
    let changed = false;
    for (const ev of events) {
      const mappedStatus = mapLifecycleToOpStatus(ev.syncStatus);
      const existing = this.operations.find(
        (op) =>
          (ev.idempotencyKey && op.idempotencyKey === ev.idempotencyKey) ||
          (ev.transactionId && op.transactionId === ev.transactionId) ||
          op.id === ev.id
      );

      if (!existing) {
        this.operations.push({
          id: ev.id,
          idempotencyKey: ev.idempotencyKey || ev.transactionId || ev.id,
          transactionId: ev.transactionId || ev.databaseId || ev.id,
          timestamp: ev.updatedAt || ev.createdAt,
          type: ev.recordType || ev.module || 'GENERAL',
          status: mappedStatus,
          errorDetails: ev.errorMessage || null,
          module: ev.module || 'SYSTEM',
          recordType: ev.recordType || 'Record',
          databaseId: ev.databaseId || ev.id,
          summary: ev.summary,
          externalSheetId: ev.externalSheetId,
          retryCount: ev.retryCount || 0,
          completedAt: ev.lastSyncedAt,
        });
        changed = true;
      } else if (existing.status !== 'SYNCING') {
        const nextErr = ev.errorMessage || null;
        if (existing.status !== mappedStatus || existing.errorDetails !== nextErr) {
          existing.status = mappedStatus;
          existing.errorDetails = nextErr;
          existing.timestamp = ev.updatedAt || existing.timestamp;
          existing.retryCount = Math.max(existing.retryCount, ev.retryCount || 0);
          if (ev.lastSyncedAt) existing.completedAt = ev.lastSyncedAt;
          changed = true;
        }
      }
    }

    if (changed) {
      this.sortOperations();
      this.lastUpdatedAt = new Date().toISOString();
      this.notify();
    }
  }

  private mergePendingUploads(items: PendingUploadItem[]): void {
    let changed = false;
    for (const item of items) {
      const idemKey = String(item.data?.idempotencyKey || item.id).trim();
      const existing = this.operations.find(
        (op) => op.id === item.id || (idemKey && op.idempotencyKey === idemKey)
      );
      const derivedStatus: SyncOperationStatus = item.lastError ? 'FAILED' : 'PENDING';
      if (!existing) {
        this.operations.push({
          id: item.id,
          idempotencyKey: idemKey,
          transactionId: String(
            item.data?.transactionId || item.data?.orderNumber || item.data?.recoveryNumber || item.id
          ),
          timestamp: item.timestamp || new Date().toISOString(),
          type: item.type,
          status: derivedStatus,
          errorDetails: item.lastError || null,
          module: 'GOOGLE_SHEETS',
          recordType: item.type,
          databaseId: String(item.data?.id || item.id),
          summary: item.customerName
            ? `${item.type} · ${item.customerName}`
            : item.userName
            ? `${item.type} · ${item.userName}`
            : `${item.type} queued for Google Sheets`,
          retryCount: item.attempts || 0,
        });
        changed = true;
      }
    }

    if (changed) {
      this.sortOperations();
      this.lastUpdatedAt = new Date().toISOString();
      this.notify();
    }
  }

  private sortOperations(): void {
    this.operations.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    if (this.operations.length > 500) {
      this.operations = this.operations.slice(0, 500);
    }
  }

  public hydrateFromLegacyStores(): void {
    if (!this.bridgeLegacyStores) return;
    try {
      const monitorSnap = getSyncMonitorSnapshot();
      this.mergeLegacyMonitorEvents(monitorSnap.events);
    } catch {
      // Ignore in non-browser/isolated test contexts
    }
    try {
      const pendingUploads = getPendingUploads();
      this.mergePendingUploads(pendingUploads);
    } catch {
      // Ignore
    }
  }

  public setDefaultExecutor(executor: SyncExecutor | null): void {
    this.defaultExecutor = executor;
  }

  public enqueueOperation(input: EnqueueOperationInput, executor?: SyncExecutor): SyncOperation {
    const nowIso = new Date().toISOString();
    const idempotencyKey = String(input.idempotencyKey || '').trim();
    const existingIdx = this.operations.findIndex(
      (op) =>
        (input.id && op.id === input.id) ||
        (idempotencyKey && op.idempotencyKey === idempotencyKey)
    );

    let operation: SyncOperation;
    if (existingIdx >= 0) {
      const prev = this.operations[existingIdx];
      operation = {
        ...prev,
        ...input,
        id: prev.id,
        idempotencyKey: idempotencyKey || prev.idempotencyKey,
        transactionId: input.transactionId || prev.transactionId,
        timestamp: input.timestamp || nowIso,
        status: input.status || prev.status,
        errorDetails: input.errorDetails !== undefined ? input.errorDetails : prev.errorDetails,
        module: input.module || prev.module,
        recordType: input.recordType || prev.recordType,
        databaseId: input.databaseId || prev.databaseId,
        retryCount: input.retryCount ?? prev.retryCount,
      };
      this.operations[existingIdx] = operation;
    } else {
      const generatedId =
        input.id || `sync_op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      operation = {
        id: generatedId,
        idempotencyKey: idempotencyKey || generatedId,
        transactionId: input.transactionId || generatedId,
        timestamp: input.timestamp || nowIso,
        type: input.type || 'GENERAL',
        status: input.status || 'PENDING',
        errorDetails: input.errorDetails ?? null,
        module: input.module || input.type || 'SYSTEM',
        recordType: input.recordType || input.type || 'Record',
        databaseId: input.databaseId || generatedId,
        summary: input.summary,
        externalSheetId: input.externalSheetId,
        retryCount: input.retryCount ?? 0,
      };
      this.operations.unshift(operation);
    }

    if (executor) {
      this.executors.set(operation.id, executor);
    }

    this.sortOperations();
    this.lastUpdatedAt = nowIso;

    if (this.bridgeLegacyStores) {
      recordSyncLifecycleEvent({
        module: operation.module,
        recordType: operation.recordType,
        databaseId: operation.databaseId,
        transactionId: operation.transactionId,
        idempotencyKey: operation.idempotencyKey,
        syncStatus: mapOpStatusToLifecycle(operation.status),
        externalSheetId: operation.externalSheetId,
        summary: operation.summary,
        errorMessage: operation.errorDetails || undefined,
      });
    }

    this.notify();
    return { ...operation };
  }

  public markOperationSynced(id: string, externalSheetId?: string): SyncOperation | null {
    const op = this.operations.find((o) => o.id === id || o.idempotencyKey === id);
    if (!op) return null;
    const nowIso = new Date().toISOString();
    op.status = 'SYNCED';
    op.errorDetails = null;
    op.completedAt = nowIso;
    op.timestamp = nowIso;
    if (externalSheetId) op.externalSheetId = externalSheetId;

    this.lastUpdatedAt = nowIso;
    if (this.bridgeLegacyStores) {
      removePendingUpload(op.id);
      recordSyncLifecycleEvent({
        module: op.module,
        recordType: op.recordType,
        databaseId: op.databaseId,
        transactionId: op.transactionId,
        idempotencyKey: op.idempotencyKey,
        syncStatus: 'SUCCESSFULLY_SYNCED',
        externalSheetId: op.externalSheetId,
        summary: op.summary,
      });
    }
    this.notify();
    return { ...op };
  }

  public markOperationFailed(id: string, errorDetails: string): SyncOperation | null {
    const op = this.operations.find((o) => o.id === id || o.idempotencyKey === id);
    if (!op) return null;
    const nowIso = new Date().toISOString();
    op.status = 'FAILED';
    op.errorDetails = errorDetails || 'Synchronization failed';
    op.retryCount += 1;
    op.lastAttemptAt = nowIso;
    op.timestamp = nowIso;

    this.lastUpdatedAt = nowIso;
    if (this.bridgeLegacyStores) {
      recordSyncLifecycleEvent({
        module: op.module,
        recordType: op.recordType,
        databaseId: op.databaseId,
        transactionId: op.transactionId,
        idempotencyKey: op.idempotencyKey,
        syncStatus: 'SYNC_FAILED',
        externalSheetId: op.externalSheetId,
        summary: op.summary,
        errorMessage: op.errorDetails,
      });
    }
    this.notify();
    return { ...op };
  }

  public async retryOperation(
    id: string,
    executorOverride?: SyncExecutor
  ): Promise<{ success: boolean; operation: SyncOperation | null; error?: string }> {
    const op = this.operations.find((o) => o.id === id || o.idempotencyKey === id);
    if (!op) {
      return { success: false, operation: null, error: 'Sync operation not found in queue.' };
    }

    const nowIso = new Date().toISOString();
    op.status = 'SYNCING';
    op.lastAttemptAt = nowIso;
    this.lastUpdatedAt = nowIso;
    this.notify();

    try {
      const fn = executorOverride || this.executors.get(op.id) || this.defaultExecutor;
      if (fn) {
        await fn({ ...op });
      } else if (typeof window !== 'undefined') {
        const res = await safeApiFetch<any>('/api/sync/retry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: op.id,
            idempotencyKey: op.idempotencyKey,
            transactionId: op.transactionId,
            type: op.type,
          }),
        });
        if (!res.isStaticFallback && !res.ok) {
          throw new Error(res.data?.error || res.error || `Retry HTTP ${res.status}`);
        }
      }

      const synced = this.markOperationSynced(op.id, op.externalSheetId);
      return { success: true, operation: synced };
    } catch (err: any) {
      const msg = err?.message || 'Sync operation failed during retry.';
      const failed = this.markOperationFailed(op.id, msg);
      return { success: false, operation: failed, error: msg };
    }
  }

  public async retryAllFailed(
    executorOverride?: SyncExecutor,
    options: { includePending?: boolean } = {}
  ): Promise<RetryBatchResult> {
    if (this.bridgeLegacyStores) {
      this.hydrateFromLegacyStores();
    }

    const retryable = this.operations.filter(
      (op) => op.status === 'FAILED' || (options.includePending && op.status === 'PENDING')
    );

    if (retryable.length === 0) {
      return {
        totalAttempted: 0,
        succeededCount: 0,
        failedCount: 0,
        remainingFailedIds: [],
      };
    }

    this.isBatchRunning = true;
    this.batchTotal = retryable.length;
    this.batchCompleted = 0;
    this.lastUpdatedAt = new Date().toISOString();
    this.notify();

    let succeededCount = 0;
    let failedCount = 0;
    const remainingFailedIds: string[] = [];

    try {
      for (const op of retryable) {
        const res = await this.retryOperation(op.id, executorOverride);
        if (res.success) {
          succeededCount += 1;
        } else {
          failedCount += 1;
          remainingFailedIds.push(op.id);
        }
        this.batchCompleted += 1;
        this.lastUpdatedAt = new Date().toISOString();
        this.notify();
      }
    } finally {
      this.isBatchRunning = false;
      this.lastUpdatedAt = new Date().toISOString();
      this.notify();
    }

    return {
      totalAttempted: retryable.length,
      succeededCount,
      failedCount,
      remainingFailedIds,
    };
  }

  public recordDiscrepancy(input: RecordDiscrepancyInput): ReconciliationDiscrepancy {
    const nowIso = new Date().toISOString();
    const existing = this.discrepancies.find(
      (d) =>
        (input.id && d.id === input.id) ||
        (d.status === 'OPEN' &&
          d.module === input.module &&
          d.recordId === input.recordId &&
          d.title === input.title)
    );

    let discrepancy: ReconciliationDiscrepancy;
    if (existing) {
      existing.description = input.description;
      existing.databaseValue = input.databaseValue ?? existing.databaseValue;
      existing.externalValue = input.externalValue ?? existing.externalValue;
      existing.severity = input.severity || existing.severity;
      existing.detectedAt = nowIso;
      discrepancy = existing;
    } else {
      discrepancy = {
        id: input.id || `DISC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        operationId: input.operationId,
        transactionId: input.transactionId,
        module: input.module,
        recordId: input.recordId,
        severity: input.severity || 'HIGH',
        title: input.title,
        description: input.description,
        databaseValue: input.databaseValue,
        externalValue: input.externalValue,
        status: 'OPEN',
        detectedAt: nowIso,
      };
      this.discrepancies.unshift(discrepancy);
    }

    if (input.operationId || input.transactionId) {
      const linkedOp = this.operations.find(
        (op) =>
          (input.operationId && op.id === input.operationId) ||
          (input.transactionId && op.transactionId === input.transactionId)
      );
      if (linkedOp) {
        linkedOp.status = 'RECONCILIATION_REQUIRED';
        linkedOp.errorDetails = input.description;
        linkedOp.timestamp = nowIso;
      }
    }

    this.lastUpdatedAt = nowIso;
    this.persistDiscrepancies();

    if (this.bridgeLegacyStores) {
      recordSyncLifecycleEvent({
        module: input.module,
        recordType: 'Reconciliation',
        databaseId: input.recordId,
        transactionId: input.transactionId || discrepancy.id,
        idempotencyKey: `disc:${input.module}:${input.recordId}`,
        syncStatus: 'REQUIRES_RECONCILIATION',
        summary: input.title,
        errorMessage: input.description,
      });
    }

    this.notify();
    return { ...discrepancy };
  }

  public resolveDiscrepancy(id: string, resolutionNote?: string): ReconciliationDiscrepancy | null {
    const disc = this.discrepancies.find((d) => d.id === id);
    if (!disc) return null;
    const nowIso = new Date().toISOString();
    disc.status = 'RESOLVED';
    disc.resolvedAt = nowIso;
    disc.resolutionNote = resolutionNote || 'Reviewed and reconciled by authorized administrator.';

    if (disc.operationId || disc.transactionId) {
      const linkedOp = this.operations.find(
        (op) =>
          (disc.operationId && op.id === disc.operationId) ||
          (disc.transactionId && op.transactionId === disc.transactionId)
      );
      if (linkedOp && linkedOp.status === 'RECONCILIATION_REQUIRED') {
        linkedOp.status = 'SYNCED';
        linkedOp.errorDetails = null;
        linkedOp.completedAt = nowIso;
      }
    }

    this.lastUpdatedAt = nowIso;
    this.persistDiscrepancies();
    this.notify();
    return { ...disc };
  }

  public getPendingQueue(): SyncOperation[] {
    return this.operations
      .filter((op) => op.status === 'PENDING' || op.status === 'SYNCING')
      .map((op) => ({ ...op }));
  }

  public getFailedOperations(): SyncOperation[] {
    return this.operations
      .filter((op) => op.status === 'FAILED')
      .map((op) => ({ ...op }));
  }

  public getTransactionHistory(): SyncOperation[] {
    return this.operations.map((op) => ({ ...op }));
  }

  public getDiscrepancies(onlyOpen = false): ReconciliationDiscrepancy[] {
    const list = onlyOpen
      ? this.discrepancies.filter((d) => d.status === 'OPEN')
      : this.discrepancies;
    return list.map((d) => ({ ...d }));
  }

  public getProgress(): SyncProgressState {
    let pendingCount = 0;
    let syncingCount = 0;
    let syncedCount = 0;
    let failedCount = 0;
    let reconciliationCount = 0;

    for (const op of this.operations) {
      if (op.status === 'PENDING') pendingCount += 1;
      else if (op.status === 'SYNCING') syncingCount += 1;
      else if (op.status === 'SYNCED') syncedCount += 1;
      else if (op.status === 'FAILED') failedCount += 1;
      else if (op.status === 'RECONCILIATION_REQUIRED') reconciliationCount += 1;
    }

    const totalQueued = pendingCount + syncingCount + failedCount;
    const isSyncing = this.isBatchRunning || syncingCount > 0;
    const progressPercent =
      this.batchTotal > 0
        ? Math.min(100, Math.round((this.batchCompleted / this.batchTotal) * 100))
        : totalQueued === 0 && this.operations.length > 0
        ? 100
        : 0;

    return {
      isSyncing,
      totalQueued,
      pendingCount,
      syncingCount,
      syncedCount,
      failedCount,
      reconciliationCount,
      batchTotal: this.batchTotal,
      batchCompleted: this.batchCompleted,
      progressPercent,
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }

  public getSnapshot(): SyncServiceSnapshot {
    return {
      operations: this.getTransactionHistory(),
      history: this.getTransactionHistory(),
      progress: this.getProgress(),
      discrepancies: this.getDiscrepancies(),
    };
  }

  public subscribe(listener: (snapshot: SyncServiceSnapshot) => void): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getSnapshot());
    } catch {
      // Isolate subscriber errors
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((cb) => {
      try {
        cb(snap);
      } catch {
        // Isolate listener failures
      }
    });
  }

  public resetForTests(): void {
    this.operations = [];
    this.discrepancies = [];
    this.executors.clear();
    this.defaultExecutor = null;
    this.batchTotal = 0;
    this.batchCompleted = 0;
    this.isBatchRunning = false;
    this.lastUpdatedAt = null;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(DISCREPANCIES_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
    this.notify();
  }

  public dispose(): void {
    if (this.unsubscribeMonitor) {
      this.unsubscribeMonitor();
      this.unsubscribeMonitor = null;
    }
    this.listeners.clear();
  }
}

export const syncService = new SyncService({ bridgeLegacyStores: true });
