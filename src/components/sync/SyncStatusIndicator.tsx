/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Global Header Sync & Realtime Connection Indicator
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Database,
  FileSpreadsheet,
  RefreshCw,
  Wifi,
} from 'lucide-react';
import {
  BackgroundSyncSnapshot,
  getBackgroundSyncSnapshot,
  runCoordinatedBackgroundSync,
  subscribeBackgroundSync,
} from '../../services/universalSubmissionService';
import {
  RealtimeCoordinatorStatus,
  realtimeSyncCoordinator,
} from '../../services/realtimeSyncCoordinator';
import { formatKarachiDateTime } from '../../utils/dateTime';

export interface SyncStatusIndicatorProps {
  onOpenSyncMonitor?: () => void;
  compact?: boolean;
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  onOpenSyncMonitor,
  compact = false,
  className = '',
}) => {
  const [bgSnap, setBgSnap] = useState<BackgroundSyncSnapshot>(() => getBackgroundSyncSnapshot());
  const [rtStatus, setRtStatus] = useState<RealtimeCoordinatorStatus>(() =>
    realtimeSyncCoordinator.getStatus()
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubBg = subscribeBackgroundSync((snap) => setBgSnap(snap));
    const unsubRt = realtimeSyncCoordinator.subscribeStatus((status) => setRtStatus(status));
    return () => {
      unsubBg();
      unsubRt();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const totalPending = bgSnap.offlinePendingCount + bgSnap.outboxPendingCount;
  const totalFailed = bgSnap.outboxFailedCount;

  const isOffline = !bgSnap.isOnline || rtStatus.connectionState === 'OFFLINE';
  const isBusy = bgSnap.isSyncing || isFlushing;

  let badgeLabel = 'Live Sync';
  let statusColorClass =
    'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800';
  let telemetryDotClass = 'bg-[#16A34A]';

  if (isOffline) {
    badgeLabel = 'Offline';
    statusColorClass =
      'text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800';
    telemetryDotClass = 'bg-amber-500';
  } else if (totalFailed > 0) {
    badgeLabel = `${totalFailed} Retry`;
    statusColorClass =
      'text-rose-700 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800';
    telemetryDotClass = 'bg-rose-500';
  } else if (isBusy || totalPending > 0) {
    badgeLabel = isBusy ? 'Syncing' : `${totalPending} Queued`;
    statusColorClass =
      'text-sky-800 dark:text-sky-200 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800';
    telemetryDotClass = 'bg-sky-500';
  } else if (rtStatus.connectionState === 'RECONNECTING' || rtStatus.connectionState === 'DEGRADED') {
    badgeLabel = 'Reconnecting';
    statusColorClass =
      'text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800';
    telemetryDotClass = 'bg-amber-500';
  } else if (rtStatus.connectionState === 'LOCAL_ONLY') {
    badgeLabel = 'Local Ready';
    statusColorClass =
      'text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    telemetryDotClass = 'bg-[#16A34A]';
  }

  const handleFlushNow = async () => {
    if (isFlushing || !bgSnap.isOnline) return;
    setIsFlushing(true);
    try {
      await runCoordinatedBackgroundSync({ forceAllOutbox: true });
    } finally {
      setIsFlushing(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Synchronization status and telemetry"
        aria-expanded={isOpen}
        className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${statusColorClass}`}
      >
        {isOffline ? (
          <CloudOff className="w-3.5 h-3.5 shrink-0" />
        ) : isBusy ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          <span className={`w-2 h-2 rounded-full shrink-0 ${telemetryDotClass}`} />
        )}
        <span className={compact ? 'hidden sm:inline' : ''}>{badgeLabel}</span>
        {(totalPending > 0 || totalFailed > 0) && (
          <span className="font-mono tabular-nums text-[11px] opacity-90">
            · {totalPending + totalFailed}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute right-3 left-3 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-80 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 rounded-2xl shadow-xl p-4 z-50 text-xs text-[#0F172A] dark:text-slate-100 space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0] dark:border-slate-700">
            <div className="flex items-center gap-2 font-bold">
              <Wifi className="w-4 h-4 text-[#16A34A]" />
              <span>Synchronization Status</span>
            </div>
            <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
              {rtStatus.connectionState}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Offline Queue
              </div>
              <div className="text-sm font-black font-mono tabular-nums mt-0.5">
                {bgSnap.offlinePendingCount}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Sheet Outbox
              </div>
              <div className="text-sm font-black font-mono tabular-nums mt-0.5">
                {bgSnap.outboxPendingCount}{' '}
                {bgSnap.outboxFailedCount > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 text-xs">
                    ({bgSnap.outboxFailedCount} failed)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Database className="w-3.5 h-3.5 text-[#16A34A]" />
                Last DB Save
              </span>
              <span className="font-mono tabular-nums font-semibold">
                {bgSnap.lastDbSavedAt ? formatKarachiDateTime(bgSnap.lastDbSavedAt) : 'Standby'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                Last Sheet Sync
              </span>
              <span className="font-mono tabular-nums font-semibold">
                {bgSnap.lastSheetSyncedAt ? formatKarachiDateTime(bgSnap.lastSheetSyncedAt) : 'Standby'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                {totalFailed > 0 ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                )}
                Realtime Events
              </span>
              <span className="font-mono tabular-nums font-semibold">
                {rtStatus.eventsReceived}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleFlushNow()}
              disabled={isFlushing || isOffline}
              className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFlushing ? 'animate-spin' : ''}`} />
              <span>{isFlushing ? 'Syncing...' : 'Sync Queue'}</span>
            </button>
            {onOpenSyncMonitor && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSyncMonitor();
                }}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0F172A] dark:text-white font-bold cursor-pointer whitespace-nowrap"
              >
                Monitor
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
