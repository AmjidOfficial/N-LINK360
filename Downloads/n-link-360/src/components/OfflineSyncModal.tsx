/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Offline Sync Queue & Network Status Inspector
 */

import React, { useState, useEffect } from 'react';
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
  Send,
  CloudOff,
  Layers,
} from 'lucide-react';
import {
  getOfflineQueue,
  OfflineQueueItem,
  syncManager,
  clearSyncedItems,
  saveOfflineQueue,
} from '../services/offlineSyncEngine';
import { triggerDownload } from '../services/exportEngine';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({ isOpen, onClose }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubNet = syncManager.subscribeNetwork((online) => setIsOnline(online));
    const unsubQueue = syncManager.subscribeQueue((q) => setQueue(q));

    return () => {
      unsubNet();
      unsubQueue();
    };
  }, []);

  if (!isOpen) return null;

  const pendingCount = queue.filter((i) => i.status === 'PENDING_SYNC').length;
  const failedCount = queue.filter((i) => i.status === 'FAILED').length;
  const syncedCount = queue.filter((i) => i.status === 'SYNCED').length;

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    const result = await syncManager.triggerSync();
    setIsSyncing(false);
    setSyncFeedback(`Sync completed: ${result.syncedCount} items synced, ${result.failedCount} failed.`);
    setQueue(getOfflineQueue());
  };

  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(queue, null, 2);
    triggerDownload(jsonStr, `Offline_Queue_Backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  const handleClearSynced = () => {
    clearSyncedItems();
    setQueue(getOfflineQueue());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-card/60 p-4 backdrop-blur-xs">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-surface-card px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-black ${isOnline ? 'bg-secondary text-white' : 'bg-rose-500 text-white'}`}>
              {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Offline Engine & Queue Manager</h3>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${isOnline ? 'bg-secondary/20 text-emerald-300 border border-emerald-400/30' : 'bg-rose-400/20 text-rose-300 border border-rose-400/30'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Zero data loss guarantee • Safe transaction queueing</p>
            </div>
          </div>

          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Metric Summary */}
        <div className="grid grid-cols-3 gap-2 bg-bg-secondary p-4 border-b border-slate-200">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="text-[10px] font-bold text-amber-700">PENDING SYNC</div>
            <div className="text-lg font-black text-amber-900">{pendingCount}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="text-[10px] font-bold text-emerald-700">SYNCED RECORDS</div>
            <div className="text-lg font-black text-emerald-900">{syncedCount}</div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
            <div className="text-[10px] font-bold text-rose-700">SYNC FAILURES</div>
            <div className="text-lg font-black text-rose-900">{failedCount}</div>
          </div>
        </div>

        {/* Feedback Message */}
        {syncFeedback && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs font-bold text-amber-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Queue Items List */}
        <div className="max-h-[45vh] overflow-y-auto p-4 space-y-2.5">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <CheckCircle2 className="h-10 w-10 text-deep-teal mb-2" />
              <div className="text-xs font-bold text-slate-700">Offline Queue Is Empty</div>
              <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
                All field orders, recoveries, and customer visits are safely synchronized with the central database.
              </p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-bg-secondary/80 shadow-2xs text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-700">
                    <Layers className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary uppercase">{item.module}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-extrabold ${
                          item.status === 'SYNCED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'PENDING_SYNC'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      Key: {item.idempotencyKey.slice(0, 24)}... • {new Date(item.createdAt).toLocaleTimeString()}
                    </div>
                    {item.errorMessage && (
                      <div className="text-[10px] text-rose-600 font-medium">{item.errorMessage}</div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400">Attempts: {item.attemptCount}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-bg-secondary px-6 py-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={queue.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Queue JSON</span>
            </button>
            {syncedCount > 0 && (
              <button
                type="button"
                onClick={handleClearSynced}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                <span>Clear Synced</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={!isOnline || isSyncing || (pendingCount === 0 && failedCount === 0)}
            className="inline-flex items-center gap-2 rounded-xl bg-surface-card px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-deep-teal ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
