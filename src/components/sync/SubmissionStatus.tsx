/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Inline Submission Lifecycle Banner
 */

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Database,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { SubmissionLifecycleState } from '../../types';

export interface SubmissionStatusProps {
  state: SubmissionLifecycleState;
  transactionId?: string;
  message?: string | null;
  timestamp?: string;
  onRetrySheetSync?: () => void;
  className?: string;
}

const STEP_LABELS: Record<SubmissionLifecycleState, { title: string; tone: string }> = {
  IDLE: {
    title: 'Ready',
    tone: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
  VALIDATING: {
    title: 'Validating payload & permissions',
    tone: 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  },
  SUBMITTING: {
    title: 'Committing to database',
    tone: 'bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800',
  },
  DATABASE_SAVED: {
    title: 'Saved in database',
    tone: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
  },
  SHEET_SYNC_PENDING: {
    title: 'Saved in DB · Queued for Google Sheets',
    tone: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
  },
  SHEET_SYNCING: {
    title: 'Saved in DB · Synchronizing Google Sheets',
    tone: 'bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800',
  },
  FULLY_SYNCHRONIZED: {
    title: 'Fully synchronized (DB + Google Sheets)',
    tone: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
  },
  OFFLINE_QUEUED: {
    title: 'Saved offline in IndexedDB · Auto-sync on reconnect',
    tone: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  },
  SYNC_FAILED: {
    title: 'Saved in DB · Google Sheets retry queued',
    tone: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  },
  SUBMISSION_FAILED: {
    title: 'Submission rejected',
    tone: 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800',
  },
};

export const SubmissionStatus: React.FC<SubmissionStatusProps> = ({
  state,
  transactionId,
  message,
  timestamp,
  onRetrySheetSync,
  className = '',
}) => {
  if (state === 'IDLE') return null;
  const meta = STEP_LABELS[state] || STEP_LABELS.IDLE;
  const isSpinning = state === 'VALIDATING' || state === 'SUBMITTING' || state === 'SHEET_SYNCING';

  const renderIcon = () => {
    if (isSpinning) return <Loader2 className="w-4 h-4 animate-spin shrink-0" />;
    if (state === 'FULLY_SYNCHRONIZED') return <CheckCircle2 className="w-4 h-4 shrink-0" />;
    if (state === 'DATABASE_SAVED' || state === 'SHEET_SYNC_PENDING') {
      return <Database className="w-4 h-4 shrink-0" />;
    }
    if (state === 'OFFLINE_QUEUED') return <CloudOff className="w-4 h-4 shrink-0" />;
    if (state === 'SYNC_FAILED' || state === 'SUBMISSION_FAILED') {
      return <AlertTriangle className="w-4 h-4 shrink-0" />;
    }
    return <FileSpreadsheet className="w-4 h-4 shrink-0" />;
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border px-3.5 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${meta.tone} ${className}`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="mt-0.5">{renderIcon()}</div>
        <div className="min-w-0 space-y-0.5">
          <div className="font-bold flex flex-wrap items-center gap-2">
            <span>{meta.title}</span>
            {transactionId && (
              <span className="font-mono tabular-nums text-[11px] opacity-80">
                {transactionId}
              </span>
            )}
          </div>
          {(message || timestamp) && (
            <div className="text-[11px] opacity-90 flex flex-wrap items-center gap-2 break-words">
              {message && <span>{message}</span>}
              {timestamp && (
                <span className="font-mono tabular-nums opacity-75">{timestamp}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {state === 'SYNC_FAILED' && onRetrySheetSync && (
        <button
          type="button"
          onClick={onRetrySheetSync}
          className="min-h-[36px] px-3 py-1 rounded-lg bg-[#0F172A] dark:bg-[#16A34A] text-white font-bold text-[11px] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Sheet Sync</span>
        </button>
      )}
    </div>
  );
};
