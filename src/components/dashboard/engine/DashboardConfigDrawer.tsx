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
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-white dark:bg-[#0F172A] border-l border-[#E2E8F0] dark:border-slate-700 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#3B82F6] dark:text-blue-400">
              Admin Dashboard Governance
            </div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Configure Role Visibility
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close configuration"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Target Role Profile
            </label>
            <select
              value={selectedRoleKey}
              onChange={(e) => {
                setSelectedRoleKey(e.target.value as DashboardRoleKey);
                setHiddenKpis([]);
                setHiddenCharts([]);
              }}
              className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] px-3 text-sm font-medium text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
            >
              {(Object.keys(DEFAULT_ROLE_DASHBOARD_CONFIGS) as DashboardRoleKey[]).map((key) => (
                <option key={key} value={key}>
                  {DEFAULT_ROLE_DASHBOARD_CONFIGS[key].title} ({key})
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              Visibility controls only; financial formulas and data scopes remain protected by system rules.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Visible KPI Cards
            </div>
            <div className="space-y-1.5">
              {base.allowedKpis.map((kpiId) => {
                const visible = !hiddenKpis.includes(kpiId);
                return (
                  <label
                    key={kpiId}
                    className="flex items-center justify-between min-h-[44px] px-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 bg-slate-50 dark:bg-[#1E293B] cursor-pointer"
                  >
                    <span className="text-xs font-mono text-[#0F172A] dark:text-slate-100">{kpiId}</span>
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => toggleKpi(kpiId)}
                      className="w-4 h-4 accent-[#3B82F6]"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {base.allowedCharts.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                Visible Charts
              </div>
              <div className="space-y-1.5">
                {base.allowedCharts.map((chartId) => {
                  const visible = !hiddenCharts.includes(chartId);
                  return (
                    <label
                      key={chartId}
                      className="flex items-center justify-between min-h-[44px] px-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 bg-slate-50 dark:bg-[#1E293B] cursor-pointer"
                    >
                      <span className="text-xs font-mono text-[#0F172A] dark:text-slate-100">{chartId}</span>
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={() => toggleChart(chartId)}
                        className="w-4 h-4 accent-[#3B82F6]"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="btn-primary min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
