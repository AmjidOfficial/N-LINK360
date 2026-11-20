import React from 'react';
import { Calendar, Filter, RotateCcw } from 'lucide-react';
import { DASHBOARD_DATE_PRESETS } from '../../../lib/dashboard';
import type {
  DashboardDatePreset,
  DashboardHierarchyFilter,
  RoleDashboardConfig,
  UserDataScope,
} from '../../../lib/dashboard';

export interface DashboardFiltersProps {
  config: RoleDashboardConfig;
  scope: UserDataScope;
  datePreset: DashboardDatePreset;
  customStart: string;
  customEnd: string;
  filter: DashboardHierarchyFilter;
  filterOptions: {
    regions: string[];
    zones: string[];
    territories: string[];
    towns: string[];
    dealers?: Array<{ id: string; name: string }>;
  };
  onDatePresetChange: (preset: DashboardDatePreset) => void;
  onCustomDateChange: (start: string, end: string) => void;
  onFilterChange: (next: DashboardHierarchyFilter) => void;
  onResetFilters: () => void;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  config,
  scope,
  datePreset,
  customStart,
  customEnd,
  filter,
  filterOptions,
  onDatePresetChange,
  onCustomDateChange,
  onFilterChange,
  onResetFilters,
}) => {
  const showRegion = config.allowedFilters.includes('REGION') && scope.isCompanyWide && filterOptions.regions.length > 0;
  const showZone =
    config.allowedFilters.includes('ZONE') &&
    (scope.isCompanyWide || scope.scopeLevel === 'REGION') &&
    filterOptions.zones.length > 0;
  const showTerritory =
    config.allowedFilters.includes('TERRITORY') &&
    (scope.isCompanyWide || scope.scopeLevel === 'REGION' || scope.scopeLevel === 'ZONE') &&
    filterOptions.territories.length > 0;
  const showTown = config.allowedFilters.includes('TOWN') && filterOptions.towns.length > 0;
  const showDealer =
    config.allowedFilters.includes('DEALER') &&
    (filterOptions.dealers?.length || 0) > 0 &&
    scope.scopeLevel !== 'DEALER';

  const hasActiveHierarchyFilter = Boolean(
    filter.region || filter.zone || filter.territory || filter.town || filter.dealerId
  );

  return (
    <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#0F172A] p-3.5 sm:p-4 space-y-3">
      {/* Date Presets Row (Asia/Karachi) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0 pr-1">
            <Calendar className="w-3.5 h-3.5 text-[#3B82F6] dark:text-blue-400" />
            <span>PKT Period</span>
          </div>
          {DASHBOARD_DATE_PRESETS.map((p) => {
            const active = datePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onDatePresetChange(p.id)}
                className={`min-h-[44px] sm:min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#3B82F6] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/70'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {datePreset === 'CUSTOM' && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <input
              type="date"
              value={customStart}
              onChange={(e) => onCustomDateChange(e.target.value, customEnd)}
              aria-label="Custom start date"
              className="min-h-[44px] sm:min-h-[40px] rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] px-2.5 py-1.5 text-xs font-mono tabular-nums text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => onCustomDateChange(customStart, e.target.value)}
              aria-label="Custom end date"
              className="min-h-[44px] sm:min-h-[40px] rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] px-2.5 py-1.5 text-xs font-mono tabular-nums text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
            />
          </div>
        )}
      </div>

      {/* Hierarchy Scope Selectors (strictly hidden when role is fixed to single scope) */}
      {(showRegion || showZone || showTerritory || showTown || showDealer) && (
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#3B82F6] dark:text-blue-400" />
            <span>Hierarchy</span>
          </div>

          {showRegion && (
            <select
              value={filter.region || 'ALL'}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  region: e.target.value === 'ALL' ? undefined : e.target.value,
                  zone: undefined,
                  territory: undefined,
                  town: undefined,
                  dealerId: undefined,
                })
              }
              aria-label="Filter by region"
              className="min-h-[44px] sm:min-h-[40px] rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] px-3 py-1.5 text-xs font-medium text-[#0F172A] dark:text-slate-100 outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Regions</option>
              {filterOptions.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          {showZone && (
            <select
              value={filter.zone || 'ALL'}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  zone: e.target.value === 'ALL' ? undefined : e.target.value,
                  territory: undefined,
                  town: undefined,
                  dealerId: undefined,
                })
              }
              aria-label="Filter by zone"
              className="min-h-[44px] sm:min-h-[40px] rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] px-3 py-1.5 text-xs font-medium text-[#0F172A] dark:text-slate-100 outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Zones</option>
              {filterOptions.zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          )}

          {showTerritory && (
            <select
              value={filter.territory || 'ALL'}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  territory: e.target.value === 'ALL' ? undefined : e.target.value,
                  town: undefined,
                  dealerId: undefined,
                })
              }
              aria-label="Filter by territory"
              className="min-h-[44px] sm:min-h-[40px] rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] px-3 py-1.5 text-xs font-medium text-[#0F172A] dark:text-slate-100 outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Territories</option>
              {filterOptions.territories.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {showTown && (
            <select
              value={filter.town || 'ALL'}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  town: e.target.value === 'ALL' ? undefined : e.target.value,
                  dealerId: undefined,
                })
              }
              aria-label="Filter by town"
              className="min-h-[44px] sm:min-h-[40px] rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] px-3 py-1.5 text-xs font-medium text-[#0F172A] dark:text-slate-100 outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Towns</option>
              {filterOptions.towns.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {showDealer && (
            <select
              value={filter.dealerId || 'ALL'}
              onChange={(e) =>
                onFilterChange({
                  ...filter,
                  dealerId: e.target.value === 'ALL' ? undefined : e.target.value,
                })
              }
              aria-label="Filter by dealer"
              className="min-h-[44px] sm:min-h-[40px] max-w-[220px] rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] px-3 py-1.5 text-xs font-medium text-[#0F172A] dark:text-slate-100 outline-none focus:border-[#3B82F6]"
            >
              <option value="ALL">All Accounts ({filterOptions.dealers?.length || 0})</option>
              {(filterOptions.dealers || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {hasActiveHierarchyFilter && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 min-h-[44px] sm:min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#3B82F6] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
