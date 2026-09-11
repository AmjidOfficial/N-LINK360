/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Offline Sync Manager & Supabase Diagnostics Detail View
 * Provides visual indicators, exact timestamps, and error inspection for failed background sync attempts.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  X,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RotateCw,
  AlertOctagon,
  Database,
  History,
  Info,
  Server,
  FileJson,
  ShieldAlert,
} from 'lucide-react';
import {
  getOfflineQueue,
  OfflineQueueItem,
  syncManager,
  clearSyncedItems,
  SyncAttemptLog,
  getSyncAttemptLogs,
  clearSyncAttemptLogs,
  ErrorCategory,
} from '../services/offlineSyncEngine';
import { triggerDownload } from '../services/exportEngine';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'FAILED' | 'PENDING' | 'HISTORY' | 'ALL';
}

function formatTimestamp(isoStr?: string): { formatted: string; relative: string } {
  if (!isoStr) return { formatted: 'N/A', relative: 'N/A' };
  try {
    const d = new Date(isoStr);
    const formatted = d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);
    let relative = '';
    if (diffSec < 10) relative = 'Just now';
    else if (diffSec < 60) relative = `${diffSec}s ago`;
    else if (diffSec < 3600) relative = `${Math.floor(diffSec / 60)}m ago`;
    else if (diffSec < 86400) relative = `${Math.floor(diffSec / 3600)}h ago`;
    else relative = `${Math.floor(diffSec / 86400)}d ago`;

    return { formatted, relative };
  } catch {
    return { formatted: isoStr, relative: '' };
  }
}

function renderErrorCategoryBadge(cat?: ErrorCategory) {
  switch (cat) {
    case 'NETWORK':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
          <WifiOff className="w-3 h-3 text-amber-700" />
          NETWORK TIMEOUT
        </span>
      );
    case 'RLS_AUTH':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300 inline-flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-rose-700" />
          RLS / PERMISSION DENIED
        </span>
      );
    case 'DATABASE':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1">
          <Database className="w-3 h-3 text-purple-700" />
          DATABASE CONSTRAINT
        </span>
      );
    case 'TIMEOUT':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-orange-100 text-orange-900 border border-orange-300 inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-orange-700" />
          SUPABASE TIMEOUT
        </span>
      );
    case 'VALIDATION':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300 inline-flex items-center gap-1">
          <Info className="w-3 h-3 text-blue-700" />
          DATA VALIDATION
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
          <AlertOctagon className="w-3 h-3 text-rose-600" />
          SYNC REJECTED
        </span>
      );
  }
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
  initialTab,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncAttemptLog[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'SUCCESS' | 'ERROR'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'FAILED' | 'PENDING' | 'HISTORY' | 'ALL'>('FAILED');
  const [expandedPayloadIds, setExpandedPayloadIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubNet = syncManager.subscribeNetwork((online) => setIsOnline(online));
    const unsubQueue = syncManager.subscribeQueue((q) => setQueue(q));
    const unsubLogs = syncManager.subscribeLogs((l) => setSyncLogs(l));

    return () => {
      unsubNet();
      unsubQueue();
      unsubLogs();
    };
  }, []);

  const failedCount = useMemo(() => queue.filter((i) => i.status === 'FAILED').length, [queue]);
  const pendingCount = useMemo(() => queue.filter((i) => i.status === 'PENDING_SYNC').length, [queue]);
  const syncedCount = useMemo(() => queue.filter((i) => i.status === 'SYNCED').length, [queue]);

  // Choose appropriate initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      } else if (failedCount > 0) {
        setActiveTab('FAILED');
      } else if (pendingCount > 0) {
        setActiveTab('PENDING');
      } else {
        setActiveTab('ALL');
      }
    }
  }, [isOpen, initialTab, failedCount, pendingCount]);

  if (!isOpen) return null;

  const failedItems = queue.filter((i) => i.status === 'FAILED');
  const pendingItems = queue.filter((i) => i.status === 'PENDING_SYNC');
  const syncedItems = queue.filter((i) => i.status === 'SYNCED');

  const latestFailedItem = [...failedItems].sort((a, b) =>
    (b.lastAttemptAt || b.createdAt).localeCompare(a.lastAttemptAt || a.createdAt)
  )[0];

  const handleTriggerSyncAll = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    const result = await syncManager.triggerSync(undefined, 'MANUAL_USER');
    setIsSyncing(false);
    if (result.failedCount > 0) {
      setSyncFeedback({
        type: 'ERROR',
        message: `Sync attempted: ${result.syncedCount} succeeded, ${result.failedCount} failed to save to Supabase. Check error messages below.`,
      });
      setActiveTab('FAILED');
    } else {
      setSyncFeedback({
        type: 'SUCCESS',
        message: `All ${result.syncedCount} queued items successfully saved to Supabase!`,
      });
    }
    setQueue(getOfflineQueue());
    setSyncLogs(getSyncAttemptLogs());
  };

  const handleRetryItem = async (itemId: string) => {
    setRetryingItemId(itemId);
    setSyncFeedback(null);
    const res = await syncManager.retryItem(itemId);
    setRetryingItemId(null);
    if (res.success) {
      setSyncFeedback({
        type: 'SUCCESS',
        message: `Item successfully synchronized with Supabase!`,
      });
    } else {
      setSyncFeedback({
        type: 'ERROR',
        message: `Retry failed: ${res.error || 'Server rejected payload'}`,
      });
    }
    setQueue(getOfflineQueue());
    setSyncLogs(getSyncAttemptLogs());
  };

  const handleDiscardItem = (itemId: string) => {
    if (window.confirm('Are you sure you want to discard this failed offline transaction from the queue? This action cannot be undone.')) {
      syncManager.removeItem(itemId);
      setQueue(getOfflineQueue());
    }
  };

  const handleClearFailed = () => {
    if (window.confirm(`Are you sure you want to clear all ${failedCount} failed items from the offline queue?`)) {
      syncManager.clearFailedItems();
      setQueue(getOfflineQueue());
    }
  };

  const handleClearSynced = () => {
    clearSyncedItems();
    setQueue(getOfflineQueue());
  };

  const handleExportDiagnostics = () => {
    const report = {
      exportedAt: new Date().toISOString(),
      networkOnline: isOnline,
      queueSummary: {
        total: queue.length,
        failed: failedCount,
        pending: pendingCount,
        synced: syncedCount,
      },
      failedItems: failedItems.map((item) => ({
        id: item.id,
        idempotencyKey: item.idempotencyKey,
        module: item.module,
        action: item.action,
        createdAt: item.createdAt,
        lastAttemptAt: item.lastAttemptAt,
        attemptCount: item.attemptCount,
        errorCategory: item.errorCategory,
        errorMessage: item.errorMessage,
        payload: item.payload,
      })),
      recentSyncAttemptLogs: syncLogs.slice(0, 20),
    };
    const jsonStr = JSON.stringify(report, null, 2);
    triggerDownload(
      jsonStr,
      `NLink360_Sync_Diagnostics_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.json`,
      'application/json'
    );
  };

  const togglePayloadExpand = (id: string) => {
    setExpandedPayloadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyText = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderPayloadSummary = (item: OfflineQueueItem) => {
    const p = item.payload as any;
    if (item.module === 'ORDERS') {
      const o = p.order || p;
      return (
        <div className="text-xs text-slate-700 space-y-1">
          <div className="font-bold flex items-center gap-2 flex-wrap">
            <span className="text-slate-900">Order #{o.orderNumber || o.id || 'Pending'}</span>
            <span className="text-slate-300">•</span>
            <span className="text-teal-700 font-black">Rs. {Number(o.netTotal || o.totalAmount || 0).toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Customer: <span className="font-semibold text-slate-800">{o.customerName || o.customerId || '-'}</span>
            {Array.isArray(o.items) && (
              <span className="text-slate-600"> • {o.items.length} SKUs ({o.items.map((it: any) => `${it.skuCode || it.name || 'SKU'} x${it.quantity}`).slice(0, 2).join(', ')}{o.items.length > 2 ? '...' : ''})</span>
            )}
          </div>
        </div>
      );
    }
    if (item.module === 'RECOVERY') {
      return (
        <div className="text-xs text-slate-700 space-y-1">
          <div className="font-bold flex items-center gap-2 flex-wrap">
            <span className="text-slate-900">Payment Collection</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-black">Rs. {Number(p.amount || 0).toLocaleString()}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{p.paymentMode || 'CASH'}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Customer: <span className="font-semibold text-slate-800">{p.customerName || p.customerId || '-'}</span>
            {p.receiptNumber && ` • Receipt: #${p.receiptNumber}`}
            {p.bankName && ` • Bank: ${p.bankName}`}
          </div>
        </div>
      );
    }
    if (item.module === 'VISITS') {
      return (
        <div className="text-xs text-slate-700 space-y-1">
          <div className="font-bold text-slate-900">
            <span>Customer Visit: {p.customerName || p.customerId || '-'}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Purpose: <span className="font-semibold text-slate-700">{p.purpose || 'Field Visit'}</span>
            {p.notes && ` • "${p.notes.slice(0, 40)}${p.notes.length > 40 ? '...' : ''}"`}
            {p.latitude && ` • GPS: ${Number(p.latitude).toFixed(4)}, ${Number(p.longitude).toFixed(4)}`}
          </div>
        </div>
      );
    }
    if (item.module === 'CUSTOMERS') {
      return (
        <div className="text-xs text-slate-700 space-y-1">
          <div className="font-bold text-slate-900">
            <span>Commercial Partner: {p.businessName || p.name || p.companyName || '-'}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Proprietor: <span className="font-semibold text-slate-700">{p.ownerName || p.contactPerson || '-'}</span>
            {p.town && ` • Town: ${p.town}`}
            {p.creditLimit && ` • Credit Limit: Rs. ${Number(p.creditLimit).toLocaleString()}`}
          </div>
        </div>
      );
    }
    return <div className="text-xs text-slate-600 font-mono">{JSON.stringify(p).slice(0, 80)}...</div>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="flex w-full max-w-3xl flex-col max-h-[92vh] rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-surface-card px-5 py-3.5 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black ${
                failedCount > 0
                  ? 'bg-rose-500 text-white animate-pulse'
                  : isOnline
                  ? 'bg-secondary text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {failedCount > 0 ? (
                <AlertTriangle className="h-5 w-5" />
              ) : isOnline ? (
                <Wifi className="h-5 w-5" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">Offline Sync Manager & Diagnostics</h3>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                    isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                  }`}
                >
                  {isOnline ? 'SUPABASE CONNECTED' : 'OFFLINE MODE'}
                </span>
                {failedCount > 0 && (
                  <span className="rounded-md px-2 py-0.5 text-[10px] font-black bg-rose-500 text-white border border-rose-400 shadow-xs">
                    {failedCount} FAILED SYNC{failedCount > 1 ? 'S' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                Idempotent transaction queue • Supabase synchronization timestamps & error traces
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            title="Close Sync Inspector"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Alert Bar if Failures Exist */}
        {failedCount > 0 && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-2.5 flex items-start sm:items-center justify-between gap-3 text-xs text-rose-900">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertOctagon className="h-4 w-4 text-rose-600 shrink-0" />
              <div className="min-w-0">
                <span className="font-extrabold">Failed Background Sync Attempts Detected:</span>{' '}
                <span>
                  {failedCount} transaction{failedCount > 1 ? 's' : ''} failed to reach Supabase.{' '}
                  {latestFailedItem?.lastAttemptAt && (
                    <span className="text-rose-700 font-medium">
                      Latest attempt: {formatTimestamp(latestFailedItem.lastAttemptAt).relative}.
                    </span>
                  )}
                </span>
              </div>
            </div>
            <button
              onClick={handleTriggerSyncAll}
              disabled={!isOnline || isSyncing}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Retry All</span>
            </button>
          </div>
        )}

        {/* Feedback Alert */}
        {syncFeedback && (
          <div
            className={`border-b px-5 py-2.5 text-xs font-bold flex items-center justify-between gap-2 ${
              syncFeedback.type === 'SUCCESS'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncFeedback.type === 'SUCCESS' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{syncFeedback.message}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Metrics Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F8FAFC] p-3 sm:p-4 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('FAILED')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === 'FAILED'
                ? 'border-rose-400 bg-rose-50/90 ring-2 ring-rose-300'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider text-rose-700">FAILED SYNCS</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-xl font-black text-rose-900 mt-1">{failedCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {failedCount > 0 ? 'Requires attention' : 'No sync errors'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === 'PENDING'
                ? 'border-amber-400 bg-amber-50/90 ring-2 ring-amber-300'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider text-amber-700">PENDING IN QUEUE</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-900 mt-1">{pendingCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Waiting for connection</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'border-emerald-400 bg-emerald-50/90 ring-2 ring-emerald-300'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider text-emerald-700">SYNCED RECORDS</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-900 mt-1">{syncedCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Safely saved to cloud</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'border-teal-400 bg-teal-50/90 ring-2 ring-teal-300'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider text-teal-700">SYNC ATTEMPT LOGS</span>
              <History className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-xl font-black text-slate-800 mt-1">{syncLogs.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Recent background runs</div>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 px-4 bg-white overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('FAILED')}
            className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'FAILED'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Failed Sync Attempts</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                failedCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {failedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'PENDING'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending Queue</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'HISTORY'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Background Sync History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
              {syncLogs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All Queue Items</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
              {queue.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]/50 min-h-[300px] max-h-[52vh]">
          {/* TAB 1: FAILED ATTEMPTS */}
          {activeTab === 'FAILED' && (
            <div className="space-y-3">
              {failedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2" />
                  <div className="text-sm font-bold text-slate-800">No Failed Sync Attempts</div>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    There are currently no transactions rejected by Supabase. Any network interruptions or
                    server failures will be logged here with timestamps and error codes.
                  </p>
                </div>
              ) : (
                failedItems.map((item) => {
                  const createdTime = formatTimestamp(item.createdAt);
                  const attemptTime = formatTimestamp(item.lastAttemptAt);
                  const isExpanded = expandedPayloadIds.has(item.id);
                  const isRetrying = retryingItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border-2 border-rose-300 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between p-3.5 bg-rose-50/70 border-b border-rose-200">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white tracking-wider">
                            {item.module}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {item.action}
                          </span>
                          {renderErrorCategoryBadge(item.errorCategory)}
                          <span className="text-[11px] font-bold text-rose-800">
                            Attempt #{item.attemptCount}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRetryItem(item.id)}
                            disabled={!isOnline || isSyncing || isRetrying}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            <RotateCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                            <span>{isRetrying ? 'Retrying...' : 'Retry Now'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiscardItem(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Discard this failed item from queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Timestamps Row */}
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-rose-900">
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="font-bold">Last Attempt Failed:</span>
                          <span className="font-extrabold text-slate-900">{attemptTime.formatted}</span>
                          <span className="text-[11px] text-rose-600 font-semibold">({attemptTime.relative})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 sm:justify-end">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Original Entry:</span>
                          <span className="font-semibold text-slate-800">{createdTime.formatted}</span>
                          <span className="text-[11px] text-slate-400">({createdTime.relative})</span>
                        </div>
                      </div>

                      {/* Error Message Box */}
                      <div className="p-3.5 bg-rose-50/40 border-b border-rose-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-black text-rose-900 uppercase tracking-wide">
                            <Server className="w-3.5 h-3.5 text-rose-600" />
                            <span>Supabase Error Response</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(item.errorMessage || 'No error message available', item.id)
                            }
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 hover:text-rose-900 cursor-pointer"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Error</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-2.5 rounded-xl bg-rose-100/60 border border-rose-300 font-mono text-[11px] font-bold text-rose-900 break-words leading-relaxed">
                          {item.errorMessage || 'Unknown server transmission error'}
                        </div>
                      </div>

                      {/* Payload Summary & Details */}
                      <div className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wide">
                            Queued Payload Information
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePayloadExpand(item.id)}
                            className="text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide Raw JSON' : 'Inspect Raw JSON'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Extracted overview */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          {renderPayloadSummary(item)}
                        </div>

                        {/* Raw JSON viewer */}
                        {isExpanded && (
                          <div className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-800 text-[10px] text-slate-400">
                              <span>Idempotency Key: {item.idempotencyKey}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(JSON.stringify(item.payload, null, 2), `json_${item.id}`)}
                                className="text-teal-400 hover:text-teal-300 inline-flex items-center gap-1"
                              >
                                {copiedId === `json_${item.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>Copy JSON</span>
                              </button>
                            </div>
                            <pre>{JSON.stringify(item.payload, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: PENDING QUEUE */}
          {activeTab === 'PENDING' && (
            <div className="space-y-2.5">
              {pendingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2" />
                  <div className="text-sm font-bold text-slate-800">No Pending Items in Queue</div>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    All offline orders, recoveries, and registrations have already been sent to Supabase.
                  </p>
                </div>
              ) : (
                pendingItems.map((item) => {
                  const createdTime = formatTimestamp(item.createdAt);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-amber-200 bg-white shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-white uppercase">
                            {item.module}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {item.action}
                          </span>
                          <span className="text-xs font-bold text-amber-900">Awaiting Upload</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Queued: {createdTime.formatted} ({createdTime.relative})</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
                        {renderPayloadSummary(item)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: HISTORY & DIAGNOSTICS LOGS */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-600">
                  Chronological Background & Manual Sync Attempts
                </span>
                {syncLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearSyncAttemptLogs();
                      setSyncLogs([]);
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    Clear History Logs
                  </button>
                )}
              </div>

              {syncLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
                  <History className="h-12 w-12 text-slate-300 mb-2" />
                  <div className="text-sm font-bold text-slate-800">No Sync Logs Recorded Yet</div>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    When background sync checks or manual retries occur, their exact timestamps and outcomes will appear here.
                  </p>
                </div>
              ) : (
                syncLogs.map((log) => {
                  const logTime = formatTimestamp(log.timestamp);
                  return (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-2xl border bg-white shadow-2xs space-y-2 ${
                        log.failedCount > 0 ? 'border-rose-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              log.trigger === 'AUTO_ONLINE'
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : log.trigger === 'BACKGROUND_INTERVAL'
                                ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                : log.trigger === 'RETRY'
                                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                : 'bg-slate-100 text-slate-900 border border-slate-300'
                            }`}
                          >
                            {log.trigger.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-extrabold text-slate-800">
                            {log.syncedCount} Synced
                          </span>
                          {log.failedCount > 0 && (
                            <span className="text-xs font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                              {log.failedCount} Failed
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({log.durationMs}ms)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{logTime.formatted}</span>
                          <span className="text-slate-400">({logTime.relative})</span>
                        </div>
                      </div>

                      {/* Failure items in this log */}
                      {log.failures && log.failures.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {log.failures.map((f, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900"
                            >
                              <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                                <span className="uppercase text-rose-800">
                                  {f.module} • {formatTimestamp(f.timestamp).formatted}
                                </span>
                                {renderErrorCategoryBadge(f.errorCategory)}
                              </div>
                              <div className="font-mono text-[10px] text-rose-950 break-words">
                                {f.errorMessage}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 4: ALL ITEMS */}
          {activeTab === 'ALL' && (
            <div className="space-y-2.5">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-6">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2" />
                  <div className="text-sm font-bold text-slate-800">Queue is completely empty</div>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    No transactions currently in offline storage.
                  </p>
                </div>
              ) : (
                queue.map((item) => {
                  const createdTime = formatTimestamp(item.createdAt);
                  const attemptTime = item.lastAttemptAt ? formatTimestamp(item.lastAttemptAt) : null;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 uppercase">{item.module}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold ${
                              item.status === 'SYNCED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'PENDING_SYNC'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.status}
                          </span>
                          {item.status === 'FAILED' && renderErrorCategoryBadge(item.errorCategory)}
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono">
                          Attempts: {item.attemptCount} • Queued: {createdTime.relative}
                        </div>
                      </div>

                      {item.errorMessage && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 font-mono text-[10px]">
                          {item.errorMessage}
                          {attemptTime && (
                            <span className="block text-[9px] text-rose-600 mt-0.5">
                              Attempted at {attemptTime.formatted} ({attemptTime.relative})
                            </span>
                          )}
                        </div>
                      )}

                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                        {renderPayloadSummary(item)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3.5 gap-3">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportDiagnostics}
              disabled={queue.length === 0 && syncLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              title="Download diagnostic JSON including queue and failure error traces"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export Diagnostics</span>
            </button>

            {syncedCount > 0 && (
              <button
                type="button"
                onClick={handleClearSynced}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 cursor-pointer"
                title="Remove already synced transactions"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Clear Synced ({syncedCount})</span>
              </button>
            )}

            {failedCount > 0 && (
              <button
                type="button"
                onClick={handleClearFailed}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 cursor-pointer"
                title="Discard all failed transactions"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                <span>Clear Failed ({failedCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleTriggerSyncAll}
              disabled={!isOnline || isSyncing || (pendingCount === 0 && failedCount === 0)}
              className="inline-flex items-center gap-2 rounded-xl bg-surface-card px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-deep-teal ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing to Supabase...' : failedCount > 0 ? `Retry All (${failedCount + pendingCount})` : 'Sync Queue Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
