import React from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import type { DashboardAlertItem } from '../../../lib/dashboard';

export interface DashboardAlertsProps {
  alerts: DashboardAlertItem[];
  onInspectRecord?: (recordId: string, alert: DashboardAlertItem) => void;
}

export const DashboardAlerts: React.FC<DashboardAlertsProps> = ({ alerts, onInspectRecord }) => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-emerald-900/50 bg-white dark:bg-[#0E1A14] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-emerald-900/40">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
          Operational Alerts
        </h3>
        <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-emerald-300/75">
          {alerts.length} active
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="py-8 text-center text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-medium">
          All monitored thresholds within healthy operating limits.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-emerald-900/40">
          {alerts.map((alert) => {
            const Icon =
              alert.severity === 'critical'
                ? ShieldAlert
                : alert.severity === 'warning'
                ? AlertTriangle
                : Info;
            const iconTone =
              alert.severity === 'critical'
                ? 'text-rose-600 dark:text-rose-400'
                : alert.severity === 'warning'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400';

            return (
              <div
                key={alert.id}
                className="py-3 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconTone}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {alert.title}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-emerald-200/70 mt-0.5">
                      {alert.detail}
                    </p>
                  </div>
                </div>

                {alert.recordId && onInspectRecord && (
                  <button
                    type="button"
                    onClick={() => onInspectRecord(alert.recordId!, alert)}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-emerald-800/70 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:border-emerald-500 shrink-0 cursor-pointer"
                  >
                    Inspect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
