import React from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import type { DashboardAlertItem } from '../../../lib/dashboard';

export interface DashboardAlertsProps {
  alerts: DashboardAlertItem[];
  onInspectRecord?: (recordId: string, alert: DashboardAlertItem) => void;
}

export const DashboardAlerts: React.FC<DashboardAlertsProps> = ({ alerts, onInspectRecord }) => {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/70">
        <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
          Operational Alerts
        </h3>
        <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          {alerts.length} active
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="py-8 text-center text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
          All monitored thresholds within healthy operating limits.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
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
                ? 'text-[#F97316] dark:text-orange-400'
                : 'text-[#3B82F6] dark:text-blue-400';

            return (
              <div
                key={alert.id}
                className="py-3 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconTone}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#0F172A] dark:text-white">
                      {alert.title}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {alert.detail}
                    </p>
                  </div>
                </div>

                {alert.recordId && onInspectRecord && (
                  <button
                    type="button"
                    onClick={() => onInspectRecord(alert.recordId!, alert)}
                    className="btn-outline min-h-[44px] sm:min-h-[36px] text-[#3B82F6] dark:text-blue-400"
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
