/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Central Auto-Save, Sync Monitoring & Reconciliation Control Center
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CloudOff,
  Database,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Customer, LedgerEntry, Recovery, SalesOrder, SKU } from '../../types';
import {
  getSyncMonitorSnapshot,
  markAllPendingEventsSynced,
  subscribeSyncMonitor,
  SyncMonitorSnapshot,
} from '../../services/autoSaveSyncService';
import {
  SyncOperation,
  SyncOperationStatus,
  syncService,
  SyncServiceSnapshot,
} from '../../services/SyncService';
import { buildReconciliationReport } from '../../services/reconciliationService';
import { getPendingUploads } from '../../services/googleSheetsTwoWaySyncService';
import { formatKarachiDateTime, formatKarachiDate } from '../../utils/dateTime';
import { safeApiFetch } from '../../lib/safeFetch';

export interface SyncMonitoringModuleProps {
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  ledgerEntries?: LedgerEntry[];
  skus?: SKU[];
  isOnline?: boolean;
  isSyncingSheet?: boolean;
  onSyncGoogleSheet?: () => Promise<void>;
}

const OP_STATUS_BADGE: Record<SyncOperationStatus, { label: string; classes: string }> = {
  PENDING: {
    label: 'PENDING',
    classes: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  SYNCING: {
    label: 'SYNCING',
    classes: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  },
  SYNCED: {
    label: 'SYNCED',
    classes: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  FAILED: {
    label: 'FAILED',
    classes: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  RECONCILIATION_REQUIRED: {
    label: 'RECONCILIATION REQUIRED',
    classes: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
};

export const SyncMonitoringModule: React.FC<SyncMonitoringModuleProps> = ({
  customers,
  orders,
  recoveries,
  ledgerEntries = [],
  skus,
  isOnline = true,
  isSyncingSheet = false,
  onSyncGoogleSheet,
}) => {
  const [monitorSnapshot, setMonitorSnapshot] = useState<SyncMonitorSnapshot>(() => getSyncMonitorSnapshot());
  const [serviceSnapshot, setServiceSnapshot] = useState<SyncServiceSnapshot>(() => {
    syncService.hydrateFromLegacyStores();
    return syncService.getSnapshot();
  });
  const [statusFilter, setStatusFilter] = useState<'ALL' | SyncOperationStatus>('ALL');
  const [serverTelemetry, setServerTelemetry] = useState<{
    lastDbSavedAt?: string | null;
    lastGoogleSyncedAt?: string | null;
    duplicatesPrevented?: number;
  } | null>(null);
  const [retryFeedback, setRetryFeedback] = useState<{ tone: 'success' | 'warning'; text: string } | null>(null);
  const [activeView, setActiveView] = useState<'EVENTS' | 'RECONCILIATION' | 'GHAFFAR_AUDIT'>('EVENTS');

  useEffect(() => {
    const unsubMonitor = subscribeSyncMonitor((next) => setMonitorSnapshot(next));
    const unsubService = syncService.subscribe((next) => setServiceSnapshot(next));
    return () => {
      unsubMonitor();
      unsubService();
    };
  }, []);

  useEffect(() => {
    let active = true;
    safeApiFetch('/api/sync/status')
      .then((r) => (r.ok ? r.data : null))
      .then((data) => {
        if (active && data?.success) {
          setServerTelemetry({
            lastDbSavedAt: data.lastDbSavedAt,
            lastGoogleSyncedAt: data.lastGoogleSyncedAt,
            duplicatesPrevented: data.duplicatesPrevented,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [monitorSnapshot.totalTrackedRecords, serviceSnapshot.history.length]);

  const pendingGoogleQueueCount = useMemo(
    () => getPendingUploads().length,
    [monitorSnapshot.pendingCount, serviceSnapshot.progress.pendingCount]
  );

  const reconciliation = useMemo(
    () =>
      buildReconciliationReport({
        customers,
        orders,
        recoveries,
        ledgerEntries,
        syncEvents: monitorSnapshot.events,
        catalog: skus,
      }),
    [customers, orders, recoveries, ledgerEntries, monitorSnapshot.events, skus]
  );

  const openServiceDiscrepancies = useMemo(
    () => serviceSnapshot.discrepancies.filter((d) => d.status === 'OPEN'),
    [serviceSnapshot.discrepancies]
  );

  const totalDiscrepancyCount = reconciliation.flags.length + openServiceDiscrepancies.length;
  const effectiveLastDb = monitorSnapshot.lastDbSavedAt || serverTelemetry?.lastDbSavedAt || null;
  const effectiveLastGoogle = monitorSnapshot.lastGoogleSyncedAt || serverTelemetry?.lastGoogleSyncedAt || null;
  const effectiveDuplicatesPrevented = Math.max(
    monitorSnapshot.duplicatesPreventedCount,
    Number(serverTelemetry?.duplicatesPrevented || 0)
  );

  const isRetryBusy = serviceSnapshot.progress.isSyncing || isSyncingSheet;

  const handleRetryAllFailedSyncs = async () => {
    setRetryFeedback(null);
    try {
      const failedCountBefore = serviceSnapshot.progress.failedCount;
      const result = await syncService.retryAllFailed(
        onSyncGoogleSheet
          ? async () => {
              await onSyncGoogleSheet();
            }
          : undefined,
        { includePending: false }
      );

      if (result.totalAttempted === 0) {
        if (onSyncGoogleSheet && serviceSnapshot.progress.pendingCount > 0) {
          await onSyncGoogleSheet();
          markAllPendingEventsSynced('1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo');
          setRetryFeedback({
            tone: 'success',
            text: 'No failed syncs detected. Pending queue records flushed cleanly.',
          });
        } else {
          setRetryFeedback({
            tone: 'success',
            text: '0 failed sync operations in queue — all transactions are healthy.',
          });
        }
        return;
      }

      if (result.failedCount === 0) {
        setRetryFeedback({
          tone: 'success',
          text: `Retried ${result.succeededCount} failed sync operation(s) successfully (${failedCountBefore} cleared).`,
        });
      } else {
        setRetryFeedback({
          tone: 'warning',
          text: `Retried ${result.totalAttempted} operation(s): ${result.succeededCount} succeeded, ${result.failedCount} still failed.`,
        });
      }
    } catch (err: any) {
      setRetryFeedback({
        tone: 'warning',
        text: `Retry notice: ${err?.message || 'Unable to reach remote Google Sheet right now.'}`,
      });
    }
  };

  const handleSyncSheetNow = async () => {
    if (!onSyncGoogleSheet) return;
    setRetryFeedback(null);
    try {
      await onSyncGoogleSheet();
      markAllPendingEventsSynced('1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo');
      setRetryFeedback({
        tone: 'success',
        text: 'Google Sheets two-way sync completed cleanly.',
      });
    } catch (err: any) {
      setRetryFeedback({
        tone: 'warning',
        text: `Sheet sync notice: ${err?.message || 'Unable to synchronize Google Sheet right now.'}`,
      });
    }
  };

  const handleRetrySingleOperation = async (op: SyncOperation) => {
    setRetryFeedback(null);
    const res = await syncService.retryOperation(
      op.id,
      onSyncGoogleSheet
        ? async () => {
            await onSyncGoogleSheet();
          }
        : undefined
    );
    if (res.success) {
      setRetryFeedback({
        tone: 'success',
        text: `Operation ${op.transactionId} synchronized cleanly.`,
      });
    } else {
      setRetryFeedback({
        tone: 'warning',
        text: `Retry failed for ${op.transactionId}: ${res.error || 'Error'}`,
      });
    }
  };

  const filteredOperations = useMemo(() => {
    if (statusFilter === 'ALL') return serviceSnapshot.history;
    return serviceSnapshot.history.filter((op) => op.status === statusFilter);
  }, [serviceSnapshot.history, statusFilter]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-xs">
      {/* Header & Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span>System Sync · Management &amp; Super Admin Control Center</span>
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              System Sync Monitoring &amp; Reconciliation Center
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pakistan Standard Time (Asia/Karachi, UTC+5) queue telemetry, Google Sheet{' '}
              <span className="font-mono">1NUW0aUOE...ZUSwoo</span> reconciliation, and signature-verified webhook deduplication.
            </p>
          </div>

          {/* Dedicated Control Bar */}
          <div
            aria-label="Sync Control Bar"
            className="flex flex-wrap items-center gap-2 shrink-0"
          >
            <span
              className={`px-3 py-1.5 rounded-lg font-semibold border flex items-center gap-1.5 whitespace-nowrap ${
                isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
            >
              {isOnline ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Online Gateway Connected' : 'Offline Auto-Queue Active'}</span>
            </span>

            {onSyncGoogleSheet && (
              <button
                type="button"
                onClick={() => void handleSyncSheetNow()}
                disabled={isRetryBusy}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sync Sheet Now</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleRetryAllFailedSyncs()}
              disabled={isRetryBusy}
              className="btn-primary py-2 px-4 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetryBusy ? 'animate-spin' : ''}`} />
              <span>{isRetryBusy ? 'Retrying Syncs...' : 'Retry All Failed Syncs'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Batch Progress Bar (visible when batch retry/sync active) */}
        {serviceSnapshot.progress.isSyncing && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span>Retrying sync operations...</span>
              <span className="font-mono tabular-nums">
                {serviceSnapshot.progress.batchCompleted}/{serviceSnapshot.progress.batchTotal || 1} ({serviceSnapshot.progress.progressPercent}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-200"
                style={{ width: `${serviceSnapshot.progress.progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {retryFeedback && (
        <div
          className={`p-3.5 rounded-xl border font-semibold flex items-center justify-between gap-3 ${
            retryFeedback.tone === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
          }`}
        >
          <span>{retryFeedback.text}</span>
          <button
            type="button"
            onClick={() => setRetryFeedback(null)}
            className="text-xs underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 6 KPI Summary Cards (Single-Elevation, Hairline Border, Tabular Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wide">
            <span>Last DB Save (PKT)</span>
            <Database className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 font-mono tabular-nums font-bold text-slate-900 dark:text-white text-xs">
            {effectiveLastDb ? formatKarachiDateTime(effectiveLastDb) : 'Awaiting New Write'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
            {effectiveLastDb ? `UTC: ${effectiveLastDb}` : 'Baseline records loaded'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wide">
            <span>Last Google Sync</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono tabular-nums font-bold text-slate-900 dark:text-white text-xs">
            {effectiveLastGoogle ? formatKarachiDateTime(effectiveLastGoogle) : 'Not Synced Yet'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
            Target Sheet Linked
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wide">
            <span>Pending Sync</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 font-mono tabular-nums font-black text-2xl text-amber-600 dark:text-amber-400">
            {serviceSnapshot.progress.pendingCount + pendingGoogleQueueCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Queued in SyncService</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wide">
            <span>Failed Syncs</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 font-mono tabular-nums font-black text-2xl text-rose-600 dark:text-rose-400">
            {serviceSnapshot.progress.failedCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Requires retry / review</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wide">
            <span>Prevented Duplicates</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono tabular-nums font-black text-2xl text-emerald-700 dark:text-emerald-400">
            {effectiveDuplicatesPrevented}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Idempotency-blocked</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wide">
            <span>Reconciliation Alerts</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 font-mono tabular-nums font-black text-2xl text-purple-700 dark:text-purple-400">
            {totalDiscrepancyCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {serviceSnapshot.progress.syncedCount} verified synced
          </div>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveView('EVENTS')}
          className={`px-4 py-2 rounded-lg font-bold cursor-pointer whitespace-nowrap ${
            activeView === 'EVENTS'
              ? 'bg-emerald-700 text-white'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          Transaction History ({serviceSnapshot.history.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveView('RECONCILIATION')}
          className={`px-4 py-2 rounded-lg font-bold cursor-pointer whitespace-nowrap ${
            activeView === 'RECONCILIATION'
              ? 'bg-emerald-700 text-white'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          Reconciliation Flags ({totalDiscrepancyCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveView('GHAFFAR_AUDIT')}
          className={`px-4 py-2 rounded-lg font-bold cursor-pointer whitespace-nowrap ${
            activeView === 'GHAFFAR_AUDIT'
              ? 'bg-emerald-700 text-white'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          M Ghaffar Tools &amp; Date Forensics ({reconciliation.mGhaffarToolsStatus.invoiceCount})
        </button>
      </div>

      {/* TAB 1: TRANSACTION HISTORY DATA TABLE */}
      {activeView === 'EVENTS' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              Transaction History
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', 'PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'RECONCILIATION_REQUIRED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {st === 'ALL' ? 'All' : OP_STATUS_BADGE[st].label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Semantic Data Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="Transaction Sync History">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th scope="col" className="py-2.5 px-4 whitespace-nowrap">Timestamp</th>
                  <th scope="col" className="py-2.5 px-4 whitespace-nowrap">Type</th>
                  <th scope="col" className="py-2.5 px-4 whitespace-nowrap">Status</th>
                  <th scope="col" className="py-2.5 px-4">Error Details</th>
                  <th scope="col" className="py-2.5 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOperations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-4 text-center text-slate-400">
                      No sync transactions recorded in this filter yet. Orders, recoveries, price updates, and webhook imports will appear here in real time.
                    </td>
                  </tr>
                ) : (
                  filteredOperations.slice(0, 75).map((op) => {
                    const badge = OP_STATUS_BADGE[op.status] || OP_STATUS_BADGE.PENDING;
                    const canRetry =
                      op.status === 'FAILED' ||
                      op.status === 'PENDING' ||
                      op.status === 'RECONCILIATION_REQUIRED';
                    return (
                      <tr
                        key={op.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap align-top">
                          <div>{formatKarachiDateTime(op.timestamp)}</div>
                          <div className="text-[10px] text-slate-400">{op.transactionId}</div>
                        </td>
                        <td className="py-2.5 px-4 align-top">
                          <div className="font-semibold text-slate-900 dark:text-white">{op.type}</div>
                          <div className="text-[11px] text-slate-500">
                            {op.module}{op.summary ? ` · ${op.summary}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap align-top">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold ${badge.classes}`}
                          >
                            {badge.label}
                          </span>
                          {op.retryCount > 0 && (
                            <div className="text-[10px] font-mono tabular-nums text-slate-400 mt-0.5">
                              Attempts: {op.retryCount}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 align-top max-w-md">
                          {op.errorDetails ? (
                            <span className="text-rose-600 dark:text-rose-400 font-medium break-words">
                              {op.errorDetails}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap align-top">
                          {canRetry ? (
                            <button
                              type="button"
                              onClick={() => void handleRetrySingleOperation(op)}
                              disabled={isRetryBusy}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer disabled:opacity-60"
                            >
                              Retry
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Stacked Cards (< md, zero horizontal overflow) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredOperations.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No sync transactions recorded in this filter yet.
              </div>
            ) : (
              filteredOperations.slice(0, 75).map((op) => {
                const badge = OP_STATUS_BADGE[op.status] || OP_STATUS_BADGE.PENDING;
                const canRetry =
                  op.status === 'FAILED' ||
                  op.status === 'PENDING' ||
                  op.status === 'RECONCILIATION_REQUIRED';
                return (
                  <div key={op.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {op.type} · <span className="font-mono">{op.transactionId}</span>
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-500">
                          Timestamp: {formatKarachiDateTime(op.timestamp)}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold shrink-0 ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    {op.errorDetails && (
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium break-words">
                        Error Details: {op.errorDetails}
                      </div>
                    )}
                    {canRetry && (
                      <button
                        type="button"
                        onClick={() => void handleRetrySingleOperation(op)}
                        disabled={isRetryBusy}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Retry Sync
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RECONCILIATION FLAGS */}
      {activeView === 'RECONCILIATION' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                Discrepancies Flagged as Requires Reconciliation
              </div>
              <p className="text-[11px] text-slate-500">
                Discrepancies are never silently overwritten; accounts and administrators inspect both sides below.
              </p>
            </div>
          </div>

          {totalDiscrepancyCount === 0 ? (
            <div className="p-10 text-center text-emerald-600 dark:text-emerald-400 font-semibold">
              No unreconciled invoice date, ledger, duplicate, or price anomalies detected across active records.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {openServiceDiscrepancies.map((disc) => (
                <div key={disc.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          disc.severity === 'HIGH'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                            : disc.severity === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {disc.severity} · {disc.module}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{disc.recordId}</span>
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{disc.title}</div>
                    <div className="text-slate-600 dark:text-slate-400">{disc.description}</div>
                    {(disc.databaseValue || disc.externalValue) && (
                      <div className="text-[11px] font-mono text-slate-500 flex flex-wrap gap-x-4 pt-1">
                        {disc.databaseValue && <span>DB: {disc.databaseValue}</span>}
                        {disc.externalValue && <span>External: {disc.externalValue}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => syncService.resolveDiscrepancy(disc.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-[11px] shrink-0 cursor-pointer"
                  >
                    Mark Resolved
                  </button>
                </div>
              ))}

              {reconciliation.flags.map((flag) => (
                <div key={flag.id} className="p-4 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        flag.severity === 'HIGH'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                          : flag.severity === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {flag.severity} · {flag.module}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{flag.recordId}</span>
                    {flag.customerName && <span className="text-slate-600 dark:text-slate-300 font-semibold">({flag.customerName})</span>}
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{flag.title}</div>
                  <div className="text-slate-600 dark:text-slate-400">{flag.description}</div>
                  {(flag.databaseValue || flag.sheetOrExternalValue) && (
                    <div className="text-[11px] font-mono text-slate-500 flex flex-wrap gap-x-4 pt-1">
                      {flag.databaseValue && <span>DB: {flag.databaseValue}</span>}
                      {flag.sheetOrExternalValue && <span>Audit: {flag.sheetOrExternalValue}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: M GHAFFAR TOOLS FORENSIC INVESTIGATION */}
      {activeView === 'GHAFFAR_AUDIT' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              M Ghaffar Tools — Invoice Date vs Entry Timestamp Investigation
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {reconciliation.mGhaffarToolsStatus.externalConnectivityNote}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Dealer Account</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {reconciliation.mGhaffarToolsStatus.customerName || 'M. Ghaffar Tools (Not in local dataset)'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Officer</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {reconciliation.mGhaffarToolsStatus.assignedOfficer || 'Syed Zain (Peshawar · KPK Zone)'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Audited Invoices / Alerts</span>
              <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                {reconciliation.mGhaffarToolsStatus.invoiceCount} Invoices / {reconciliation.mGhaffarToolsStatus.discrepancyCount} Date Alerts
              </span>
            </div>
          </div>

          {reconciliation.mGhaffarToolsStatus.invoices.length > 0 && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              {reconciliation.mGhaffarToolsStatus.invoices.map((inv) => (
                <div key={inv.orderNumber} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      {inv.invoiceNumber || inv.orderNumber} · Rs. {inv.amount.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      Business Invoice Date: <strong>{formatKarachiDate(inv.businessInvoiceDate)}</strong> · Entered (PKT):{' '}
                      <strong>{inv.createdAtPkt}</strong> · Posted (PKT): <strong>{inv.postedAtPkt}</strong>
                    </div>
                    {inv.discrepancyReason && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-semibold">
                        {inv.discrepancyReason}
                      </div>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-md font-bold text-[10px] shrink-0 ${
                      inv.hasLateEntryGap || inv.hasTimezoneDateShift
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {inv.hasLateEntryGap || inv.hasTimezoneDateShift ? 'DATE GAP FLAGGED' : 'TIMESTAMPS ALIGNED'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
