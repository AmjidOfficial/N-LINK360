/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Toast Notification System
 * Consistent, accessible, and responsive visual feedback for all field force & ERP operations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

type ToastListener = (toast: ToastItem) => void;
const listeners = new Set<ToastListener>();

export function emitToast(type: ToastType, title: string, message?: string, duration = 4500): string {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const item: ToastItem = {
    id,
    type,
    title,
    message,
    duration,
    timestamp: Date.now(),
  };

  listeners.forEach((listener) => {
    try {
      listener(item);
    } catch (e) {
      console.error('Toast notification listener error:', e);
    }
  });

  return id;
}

/**
 * Universal Toast Dispatcher for anywhere in the application
 */
export const toast = {
  success: (title: string, message?: string, duration?: number) =>
    emitToast('success', title, message, duration),
  error: (title: string, message?: string, duration?: number) =>
    emitToast('error', title, message, duration ?? 6000),
  warning: (title: string, message?: string, duration?: number) =>
    emitToast('warning', title, message, duration ?? 5000),
  info: (title: string, message?: string, duration?: number) =>
    emitToast('info', title, message, duration),
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleNewToast: ToastListener = (newToast) => {
      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep max 5 visible

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          dismissToast(newToast.id);
        }, newToast.duration);
      }
    };

    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
    };
  }, [dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      id="nlink-global-toast-container"
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 sm:top-5 sm:right-6 z-[99999] max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-auto flex flex-col gap-2.5 pointer-events-none"
    >
      {toasts.map((item) => {
        const isSuccess = item.type === 'success';
        const isError = item.type === 'error';
        const isWarning = item.type === 'warning';

        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto w-full p-3.5 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-md border transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
              isSuccess
                ? 'bg-slate-900/95 border-emerald-500/60 text-white shadow-emerald-950/40'
                : isError
                ? 'bg-slate-900/95 border-rose-500/60 text-white shadow-rose-950/40'
                : isWarning
                ? 'bg-slate-900/95 border-amber-500/60 text-white shadow-amber-950/40'
                : 'bg-slate-900/95 border-teal-500/60 text-white shadow-teal-950/40'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon with Glowing Halo */}
              <div
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm border ${
                  isSuccess
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                    : isError
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-400'
                    : isWarning
                    ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                    : 'bg-teal-950/80 border-teal-500/50 text-teal-400'
                }`}
              >
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-teal-400" />}
              </div>

              {/* Text content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-extrabold tracking-tight text-white line-clamp-1">
                    {item.title}
                  </h4>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 shrink-0 border border-slate-700/60">
                    {item.type}
                  </span>
                </div>

                {item.message && (
                  <p className="text-[11px] sm:text-xs text-slate-300 font-medium mt-1 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>
                )}
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors shrink-0 -mt-1 -mr-1"
                title="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
