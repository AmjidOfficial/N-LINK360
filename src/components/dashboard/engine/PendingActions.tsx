import React from 'react';
import { BellRing, ChevronRight } from 'lucide-react';
import type { DashboardPendingAction, QuickActionId } from '../../../lib/dashboard';

export interface PendingActionsProps {
  items: DashboardPendingAction[];
  onAction?: (actionId: QuickActionId, task: DashboardPendingAction) => void;
}

export const PendingActions: React.FC<PendingActionsProps> = ({ items, onAction }) => {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-emerald-900/50 bg-white dark:bg-[#0E1A14] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-emerald-900/40">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-[0.14em] text-slate-800 dark:text-emerald-100">
            NEEDS YOUR ATTENTION
          </h3>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-emerald-300/75">
          {items.reduce((s, i) => s + i.count, 0)} total queued
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-emerald-900/40">
        {items.map((item) => (
          <div
            key={item.id}
            className="py-3 flex items-center justify-between gap-3 min-h-[52px]"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {item.label}
              </div>
              <div className="text-xs text-slate-500 dark:text-emerald-200/65 font-mono tabular-nums mt-0.5">
                {item.count === 0 ? 'Queue clear (0)' : `${item.count} item${item.count === 1 ? '' : 's'} pending`}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAction?.(item.actionId, item)}
              className={`inline-flex items-center gap-1 min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                item.count > 0 && item.urgency === 'high'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'border border-slate-200 dark:border-emerald-800/70 text-slate-700 dark:text-emerald-200 hover:border-emerald-500'
              }`}
            >
              <span>{item.actionLabel}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
