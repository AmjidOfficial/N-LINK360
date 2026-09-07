import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, X, ShieldCheck, Clock } from 'lucide-react';

export interface FinancialSyncToastProps {
  isVisible: boolean;
  onClose: () => void;
  lastRefreshTime: Date;
  elapsedSeconds: number;
  syncTitle?: string;
  recordCount?: number;
  onManualSync?: () => void;
  isSyncing?: boolean;
}

export const FinancialSyncToast: React.FC<FinancialSyncToastProps> = ({
  isVisible,
  onClose,
  lastRefreshTime,
  elapsedSeconds,
  syncTitle = 'Financial Data Synchronized',
  recordCount,
  onManualSync,
  isSyncing = false,
}) => {
  const [displaySeconds, setDisplaySeconds] = useState(elapsedSeconds);

  useEffect(() => {
    setDisplaySeconds(elapsedSeconds);
  }, [elapsedSeconds]);

  // Format elapsed time string
  const formatElapsed = (sec: number): string => {
    if (sec <= 2) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return rem > 0 ? `${mins}m ${rem}s ago` : `${mins}m ago`;
  };

  if (!isVisible) return null;

  return (
    <div
      id="financial-sync-toast"
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-auto animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/60 flex items-center justify-between gap-3 text-xs">
        {/* Left Icon with Pulse Indicator */}
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-xl bg-emerald-950/90 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-slate-100 tracking-tight">
              {isSyncing ? 'Syncing Financial Ledger…' : syncTitle}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-700/60">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Reconciled
            </span>
          </div>

          <p className="text-[11px] text-slate-300 font-medium mt-0.5 flex items-center gap-1.5 truncate">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>
              Background sync completed{' '}
              <strong className="text-white font-semibold">
                ({formatElapsed(displaySeconds)} elapsed)
              </strong>
            </span>
            {recordCount !== undefined && recordCount > 0 && (
              <span className="text-slate-400 text-[10px]">
                · {recordCount} entities active
              </span>
            )}
          </p>
        </div>

        {/* Action / Dismiss */}
        <div className="flex items-center gap-1 shrink-0">
          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              disabled={isSyncing}
              title="Sync again now"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Dismiss notification"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
