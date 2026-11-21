/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Universal Submit Button with Lifecycle Feedback & Double-Click Guard
 */

import React from 'react';
import {
  CheckCircle2,
  CloudOff,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { SubmissionLifecycleState } from '../../types';

export interface UniversalSubmitButtonProps {
  label: string;
  state?: SubmissionLifecycleState;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onRetrySheetSync?: () => void;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<'primary' | 'secondary' | 'danger', string> = {
  primary:
    'bg-[#16A34A] hover:bg-[#15803D] text-white border border-transparent shadow-xs',
  secondary:
    'bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0F172A] dark:text-white border border-[#E2E8F0] dark:border-slate-700',
  danger:
    'bg-rose-600 hover:bg-rose-700 text-white border border-transparent shadow-xs',
};

export const UniversalSubmitButton: React.FC<UniversalSubmitButtonProps> = ({
  label,
  state = 'IDLE',
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
  onClick,
  onRetrySheetSync,
  fullWidth = false,
  icon,
}) => {
  const isBusy =
    state === 'VALIDATING' ||
    state === 'SUBMITTING' ||
    state === 'SHEET_SYNCING';

  let displayLabel = label;
  let stateIcon: React.ReactNode = icon ?? null;

  if (state === 'VALIDATING') {
    displayLabel = 'Validating...';
    stateIcon = <Loader2 className="w-4 h-4 animate-spin shrink-0" />;
  } else if (state === 'SUBMITTING') {
    displayLabel = 'Saving DB...';
    stateIcon = <Loader2 className="w-4 h-4 animate-spin shrink-0" />;
  } else if (state === 'DATABASE_SAVED' || state === 'SHEET_SYNC_PENDING') {
    displayLabel = 'Saved · Queued';
    stateIcon = <CheckCircle2 className="w-4 h-4 shrink-0" />;
  } else if (state === 'SHEET_SYNCING') {
    displayLabel = 'Syncing Sheet...';
    stateIcon = <Loader2 className="w-4 h-4 animate-spin shrink-0" />;
  } else if (state === 'FULLY_SYNCHRONIZED') {
    displayLabel = 'Synced';
    stateIcon = <CheckCircle2 className="w-4 h-4 shrink-0" />;
  } else if (state === 'OFFLINE_QUEUED') {
    displayLabel = 'Saved Offline';
    stateIcon = <CloudOff className="w-4 h-4 shrink-0" />;
  } else if (state === 'SYNC_FAILED') {
    displayLabel = 'Saved DB · Retry Sheet';
    stateIcon = <RefreshCw className="w-4 h-4 shrink-0" />;
  } else if (state === 'SUBMISSION_FAILED') {
    displayLabel = label;
    stateIcon = <AlertTriangle className="w-4 h-4 shrink-0" />;
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isBusy || disabled) {
      e.preventDefault();
      return;
    }
    if (state === 'SYNC_FAILED' && onRetrySheetSync) {
      e.preventDefault();
      onRetrySheetSync();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || isBusy}
      aria-busy={isBusy}
      className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-1 ${
        VARIANT_CLASSES[variant]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {stateIcon}
      <span className="truncate">{displayLabel}</span>
    </button>
  );
};
