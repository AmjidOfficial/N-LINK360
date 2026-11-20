import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Globe2, MapPin, Search, Users, X } from 'lucide-react';
import { formatCurrencyPKR } from '../../../lib/dashboard';
import type {
  DataScopeLevel,
  HierarchyBreakdowns,
  HierarchyPerformanceRow,
  TeamPerformanceRow,
} from '../../../lib/dashboard';

export interface HierarchyBreakdownPanelProps {
  breakdowns: HierarchyBreakdowns;
  scopeLevel: DataScopeLevel;
  dateRangeLabel: string;
  onSelectCustomer?: (customerId: string) => void;
}

type BreakdownLens = 'REGION' | 'ZONE' | 'TERRITORY' | 'TOWN' | 'TEAM' | 'TOP_5' | 'LOWEST_5';

export const HierarchyBreakdownPanel: React.FC<HierarchyBreakdownPanelProps> = ({
  breakdowns,
  scopeLevel,
  dateRangeLabel,
  onSelectCustomer,
}) => {
  const availableLenses = useMemo<Array<{ id: BreakdownLens; label: string }>>(() => {
    if (scopeLevel === 'COMPANY' || scopeLevel === 'NATIONAL') {
      return [
        { id: 'REGION', label: 'Regional & Outstanding' },
        { id: 'ZONE', label: 'Zonal Performance' },
        { id: 'TERRITORY', label: 'All Territories' },
        { id: 'TOWN', label: 'Town Breakdown' },
        { id: 'TEAM', label: 'Field Team' },
        { id: 'TOP_5', label: 'Top 5 Territories' },
        { id: 'LOWEST_5', label: 'Lowest 5 Territories' },
      ];
    }
    if (scopeLevel === 'REGION') {
      return [
        { id: 'ZONE', label: 'Zonal Performance' },
        { id: 'TERRITORY', label: 'Territory Breakdown' },
        { id: 'TOWN', label: 'Town Breakdown' },
        { id: 'TEAM', label: 'Field Team' },
        { id: 'TOP_5', label: 'Top 5 Territories' },
        { id: 'LOWEST_5', label: 'Lowest 5 Territories' },
      ];
    }
    if (scopeLevel === 'ZONE') {
      return [
        { id: 'TERRITORY', label: 'Territory Breakdown' },
        { id: 'TOWN', label: 'Town Breakdown' },
        { id: 'TEAM', label: 'Field Team' },
        { id: 'TOP_5', label: 'Top Performing' },
        { id: 'LOWEST_5', label: 'Needs Attention' },
      ];
    }
    return [
      { id: 'TOWN', label: 'Town Breakdown' },
      { id: 'TEAM', label: 'Field Team' },
    ];
  }, [scopeLevel]);

  const [lens, setLens] = useState<BreakdownLens>(availableLenses[0]?.id || 'REGION');
  const [searchQuery, setSearchQuery] = useState('');

  const activeLens = availableLenses.some((l) => l.id === lens) ? lens : availableLenses[0].id;

  const geoRows: HierarchyPerformanceRow[] = useMemo(() => {
    if (activeLens === 'TEAM') return [];
    const source =
      activeLens === 'REGION'
        ? breakdowns.byRegion
        : activeLens === 'ZONE'
        ? breakdowns.byZone
        : activeLens === 'TERRITORY'
        ? breakdowns.byTerritory
        : activeLens === 'TOWN'
        ? breakdowns.byTown
        : activeLens === 'TOP_5'
        ? breakdowns.topTerritories
        : breakdowns.lowestTerritories;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return source;
    return source.filter((r) => r.name.toLowerCase().includes(q));
  }, [activeLens, breakdowns, searchQuery]);

  const teamRows: TeamPerformanceRow[] = useMemo(() => {
    if (activeLens !== 'TEAM') return [];
    const source = breakdowns.byTeam || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (r) =>
        r.salesUserName.toLowerCase().includes(q) ||
        r.territory.toLowerCase().includes(q)
    );
  }, [activeLens, breakdowns.byTeam, searchQuery]);

  const { nationalSummary } = breakdowns;
  const showSummaryStrip =
    scopeLevel === 'COMPANY' ||
    scopeLevel === 'NATIONAL' ||
    scopeLevel === 'REGION' ||
    scopeLevel === 'ZONE';
  const stripPrefix =
    scopeLevel === 'REGION' ? 'Regional' : scopeLevel === 'ZONE' ? 'Zonal' : 'National';

  const sectionTitle =
    scopeLevel === 'REGION'
      ? 'Regional Zones, Territories & Team Performance'
      : scopeLevel === 'ZONE'
      ? 'Zonal Territories, Towns & Field Team Performance'
      : 'National, Regional, Zonal & Territory Performance';

  const isEmpty = activeLens === 'TEAM' ? teamRows.length === 0 : geoRows.length === 0;

  return (
    <section className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] overflow-hidden">
      {/* Section Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-[#3B82F6] dark:text-blue-400" />
            <span>{sectionTitle}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Posted sales net of credits, confirmed recoveries &amp; receivables · {dateRangeLabel}
          </p>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter zone, town or officer..."
            aria-label="Filter hierarchy rows"
            className="w-full min-h-[44px] sm:min-h-[40px] pl-9 pr-10 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-xs text-[#0F172A] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#3B82F6]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear hierarchy search"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scope Summary Totals Strip */}
      {showSummaryStrip && (
        <div className="px-4 sm:px-5 py-3.5 bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-slate-100 dark:border-slate-700/70 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {stripPrefix} Network
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-0.5">
              {nationalSummary.activeDealers} Dealers · {nationalSummary.activeDistributors} Dist.
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {stripPrefix} Posted Sales
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-[#3B82F6] dark:text-blue-400 mt-0.5">
              {formatCurrencyPKR(nationalSummary.postedSales)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {stripPrefix} Recovery
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrencyPKR(nationalSummary.confirmedRecovery)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Outstanding
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-[#F97316] dark:text-orange-400 mt-0.5">
              {formatCurrencyPKR(nationalSummary.outstanding)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overdue Exposure
            </div>
            <div
              className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
                nationalSummary.overdueOutstanding > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {formatCurrencyPKR(nationalSummary.overdueOutstanding)}
            </div>
          </div>
        </div>
      )}

      {/* Lens Switcher Tabs */}
      <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-700/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {availableLenses.map((tab) => {
          const isActive = activeLens === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLens(tab.id)}
              className={`inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#3B82F6] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              {tab.id === 'TOP_5' && <ArrowUpRight className="w-3.5 h-3.5" />}
              {tab.id === 'LOWEST_5' && <ArrowDownRight className="w-3.5 h-3.5" />}
              {tab.id === 'TEAM' && <Users className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {isEmpty ? (
        <div className="p-8 text-center">
          <div className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">
            No hierarchy performance records match this filter
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Adjust your search query or hierarchy filter above.
          </p>
        </div>
      ) : activeLens === 'TEAM' ? (
        <>
          {/* Team / Field Officer Desktop Table */}
          <div className="hidden md:block responsive-table-container">
            <table className="w-full text-left text-xs border-collapse frozen-first-col">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-slate-700 text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Field Officer</th>
                  <th className="py-3 px-3">Territory</th>
                  <th className="py-3 px-3 text-center">Dealers</th>
                  <th className="py-3 px-3 text-right">Posted Sales</th>
                  <th className="py-3 px-3 text-right">Confirmed Recovery</th>
                  <th className="py-3 px-3 text-right">Outstanding</th>
                  <th className="py-3 px-3 text-center">Pending</th>
                  <th className="py-3 px-4 text-center">Visits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {teamRows.map((row, idx) => (
                  <tr
                    key={row.salesUserId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-[#0F172A] dark:text-white whitespace-nowrap">
                      <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500 mr-2">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {row.salesUserName}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {row.territory}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-700 dark:text-slate-200">
                      {row.activeDealers}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white">
                      {formatCurrencyPKR(row.postedSales)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyPKR(row.confirmedRecovery)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#F97316] dark:text-orange-400">
                      {formatCurrencyPKR(row.outstanding)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-[#F97316] dark:text-orange-400">
                      {row.pendingOrdersCount}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {row.visitsCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Team Mobile Card Stack */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/60">
            {teamRows.map((row, idx) => (
              <div key={`m-team-${row.salesUserId}`} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500 mr-1.5">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-[#0F172A] dark:text-white">
                      {row.salesUserName}
                    </span>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.territory}</div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                    {row.activeDealers} dealers · {row.visitsCount} visits
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Sales</div>
                    <div className="font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white">
                      {formatCurrencyPKR(row.postedSales)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Recovery</div>
                    <div className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyPKR(row.confirmedRecovery)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Pending</div>
                    <div className="font-mono tabular-nums font-semibold text-[#F97316] dark:text-orange-400">
                      {row.pendingOrdersCount} orders
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Geographic Breakdown Desktop Table */}
          <div className="hidden md:block responsive-table-container">
            <table className="w-full text-left text-xs border-collapse frozen-first-col">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-slate-700 text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">
                    {activeLens === 'REGION' ? 'Region' : activeLens === 'ZONE' ? 'Zone' : activeLens === 'TOWN' ? 'Town' : 'Territory'}
                  </th>
                  <th className="py-3 px-3 text-center">Dealers</th>
                  <th className="py-3 px-3 text-right">Posted Sales</th>
                  <th className="py-3 px-3 text-right">Confirmed Recovery</th>
                  <th className="py-3 px-3 text-right">Outstanding</th>
                  <th className="py-3 px-3 text-right">Overdue</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {geoRows.map((row, idx) => (
                  <tr
                    key={`${row.level}-${row.key}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-[#0F172A] dark:text-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500 w-5">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <MapPin className="w-3.5 h-3.5 text-[#3B82F6] dark:text-blue-400 shrink-0" />
                        <span>{row.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-700 dark:text-slate-200">
                      {row.activeDealers + row.activeDistributors}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white">
                      {formatCurrencyPKR(row.postedSales)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyPKR(row.confirmedRecovery)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#F97316] dark:text-orange-400">
                      {formatCurrencyPKR(row.outstanding)}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${row.overdueOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {formatCurrencyPKR(row.overdueOutstanding)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {row.leadCustomerId && onSelectCustomer ? (
                        <button
                          type="button"
                          onClick={() => onSelectCustomer(row.leadCustomerId!)}
                          className="text-xs font-semibold text-[#3B82F6] dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Inspect Ledger &rarr;
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Card Stack */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/60">
            {geoRows.map((row, idx) => (
              <div key={`m-${row.level}-${row.key}`} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-[#0F172A] dark:text-white truncate">
                      {row.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                    {row.activeDealers + row.activeDistributors} accounts
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Posted Sales</div>
                    <div className="font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white">
                      {formatCurrencyPKR(row.postedSales)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Recovery</div>
                    <div className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrencyPKR(row.confirmedRecovery)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Outstanding</div>
                    <div className="font-mono tabular-nums font-semibold text-[#F97316] dark:text-orange-400">
                      {formatCurrencyPKR(row.outstanding)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Overdue</div>
                    <div className={`font-mono tabular-nums font-semibold ${row.overdueOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {formatCurrencyPKR(row.overdueOutstanding)}
                    </div>
                  </div>
                </div>

                {row.leadCustomerId && onSelectCustomer && (
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(row.leadCustomerId!)}
                    className="btn-outline w-full min-h-[44px] text-[#3B82F6] dark:text-blue-400"
                  >
                    Inspect Party Ledger
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
