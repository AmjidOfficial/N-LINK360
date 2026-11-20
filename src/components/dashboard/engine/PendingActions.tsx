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
    <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/70">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-[#F97316] dark:text-orange-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-[0.14em] text-[#0F172A] dark:text-slate-100">
            NEEDS YOUR ATTENTION
          </h3>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          {items.reduce((s, i) => s + i.count, 0)} total queued
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
        {items.map((item) => (
          <div
            key={item.id}
            className="py-3 flex items-center justify-between gap-3 min-h-[52px]"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                {item.label}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                {item.count === 0 ? 'Queue clear (0)' : `${item.count} item${item.count === 1 ? '' : 's'} pending`}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAction?.(item.actionId, item)}
              className={`${
                item.count > 0 && item.urgency === 'high' ? 'btn-primary' : 'btn-outline'
              } min-h-[44px] sm:min-h-[38px]`}
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
