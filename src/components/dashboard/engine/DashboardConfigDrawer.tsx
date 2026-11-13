import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { DEFAULT_ROLE_DASHBOARD_CONFIGS } from '../../../lib/dashboard';
import type {
  AdminRoleConfigOverride,
  DashboardChartId,
  DashboardRoleKey,
  KpiMetricId,
} from '../../../lib/dashboard';

export interface DashboardConfigDrawerProps {
  isOpen: boolean;
  initialRoleKey: DashboardRoleKey;
  currentOverride?: AdminRoleConfigOverride | null;
  onClose: () => void;
  onSave: (override: AdminRoleConfigOverride) => Promise<void> | void;
}

export const DashboardConfigDrawer: React.FC<DashboardConfigDrawerProps> = ({
  isOpen,
  initialRoleKey,
  currentOverride,
  onClose,
  onSave,
}) => {
  const [selectedRoleKey, setSelectedRoleKey] = useState<DashboardRoleKey>(initialRoleKey);
  const base = DEFAULT_ROLE_DASHBOARD_CONFIGS[selectedRoleKey];

  const [hiddenKpis, setHiddenKpis] = useState<KpiMetricId[]>(currentOverride?.hiddenKpis || []);
  const [hiddenCharts, setHiddenCharts] = useState<DashboardChartId[]>(currentOverride?.hiddenCharts || []);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const toggleKpi = (id: KpiMetricId) => {
    setHiddenKpis((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]));
  };

  const toggleChart = (id: DashboardChartId) => {
    setHiddenCharts((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        roleKey: selectedRoleKey,
        hiddenKpis,
        hiddenCharts,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-white dark:bg-[#0E1A14] border-l border-slate-200 dark:border-emerald-900/60 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-emerald-900/40 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Admin Dashboard Governance
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Configure Role Visibility
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close configuration"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-emerald-800/70 text-slate-600 dark:text-emerald-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-emerald-300 mb-1.5">
              Target Role Profile
            </label>
            <select
              value={selectedRoleKey}
              onChange={(e) => {
                setSelectedRoleKey(e.target.value as DashboardRoleKey);
                setHiddenKpis([]);
                setHiddenCharts([]);
              }}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-emerald-800/70 bg-slate-50 dark:bg-[#13241C] px-3 text-sm font-medium text-slate-900 dark:text-white"
            >
              {(Object.keys(DEFAULT_ROLE_DASHBOARD_CONFIGS) as DashboardRoleKey[]).map((key) => (
                <option key={key} value={key}>
                  {DEFAULT_ROLE_DASHBOARD_CONFIGS[key].title} ({key})
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-emerald-200/60">
              Visibility controls only; financial formulas and data scopes remain protected by system rules.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-emerald-300 mb-2">
              Visible KPI Cards
            </div>
            <div className="space-y-1.5">
              {base.allowedKpis.map((kpiId) => {
                const visible = !hiddenKpis.includes(kpiId);
                return (
                  <label
                    key={kpiId}
                    className="flex items-center justify-between min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-emerald-900/40 bg-slate-50 dark:bg-[#111E17] cursor-pointer"
                  >
                    <span className="text-xs font-mono text-slate-800 dark:text-emerald-100">{kpiId}</span>
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => toggleKpi(kpiId)}
                      className="w-4 h-4 accent-emerald-600"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {base.allowedCharts.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-emerald-300 mb-2">
                Visible Charts
              </div>
              <div className="space-y-1.5">
                {base.allowedCharts.map((chartId) => {
                  const visible = !hiddenCharts.includes(chartId);
                  return (
                    <label
                      key={chartId}
                      className="flex items-center justify-between min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-emerald-900/40 bg-slate-50 dark:bg-[#111E17] cursor-pointer"
                    >
                      <span className="text-xs font-mono text-slate-800 dark:text-emerald-100">{chartId}</span>
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={() => toggleChart(chartId)}
                        className="w-4 h-4 accent-emerald-600"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-emerald-900/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-emerald-800 text-xs font-semibold text-slate-700 dark:text-emerald-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
