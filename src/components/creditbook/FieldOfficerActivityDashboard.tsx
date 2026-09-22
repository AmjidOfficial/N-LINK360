/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Interactive Dynamic Field Officer Activity Dashboard
 * Comprehensive analytics for:
 * - Daily (Today)
 * - Monthly (MTD)
 * - Year-To-Date (YTD)
 * - Sales Velocity & Target Achievement
 * - Cash vs Bank Recovery Split
 * - Town & Route Distribution (e.g. Peshawar - Duran Pur Route)
 * - SKU Category Breakdown
 */

import React, { useState, useMemo } from 'react';
import { Customer, SalesOrder, Recovery } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import {
  TrendingUp,
  CreditCard,
  Target,
  Users,
  Clock,
  Calendar,
  Zap,
  ShoppingBag,
  Award,
  BarChart3,
  PieChart,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Percent,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export interface FieldOfficerActivityDashboardProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  onSelectCustomer?: (customerId: string) => void;
  onOpenNewOrder?: () => void;
  onOpenRecordRecovery?: () => void;
}

export type TimePeriod = 'DAILY' | 'MONTHLY' | 'YTD' | 'ALL';

export const FieldOfficerActivityDashboard: React.FC<FieldOfficerActivityDashboardProps> = ({
  currentUser,
  customers = [],
  orders = [],
  recoveries = [],
  onSelectCustomer,
  onOpenNewOrder,
  onOpenRecordRecovery,
}) => {
  const [period, setPeriod] = useState<TimePeriod>('MONTHLY');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter orders and recoveries by time period
  const { filteredOrders, filteredRecoveries, periodLabel } = useMemo(() => {
    let ords = orders;
    let recs = recoveries;
    let label = 'This Month (MTD)';

    if (period === 'DAILY') {
      label = 'Today’s Performance';
      ords = orders.filter((o) => (o.orderDate || o.createdAt || '').slice(0, 10) === todayStr);
      recs = recoveries.filter((r) => (r.recordedAt || r.createdAt || '').slice(0, 10) === todayStr);
    } else if (period === 'MONTHLY') {
      label = `Month to Date (${now.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })})`;
      ords = orders.filter((o) => {
        const d = new Date(o.orderDate || o.createdAt || '');
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      recs = recoveries.filter((r) => {
        const d = new Date(r.recordedAt || r.createdAt || '');
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    } else if (period === 'YTD') {
      label = `Year to Date (${currentYear})`;
      ords = orders.filter((o) => {
        const d = new Date(o.orderDate || o.createdAt || '');
        return d.getFullYear() === currentYear;
      });
      recs = recoveries.filter((r) => {
        const d = new Date(r.recordedAt || r.createdAt || '');
        return d.getFullYear() === currentYear;
      });
    } else {
      label = 'All Time History';
    }

    return { filteredOrders: ords, filteredRecoveries: recs, periodLabel: label };
  }, [orders, recoveries, period, todayStr, currentMonth, currentYear]);

  // Aggregate Metrics
  const grossSales = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status !== 'REJECTED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [filteredOrders]);

  const approvedSales = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status === 'APPROVED' || o.status === 'VERIFIED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [filteredOrders]);

  const totalRecovery = useMemo(() => {
    return filteredRecoveries
      .filter((r) => r.status !== 'REJECTED')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [filteredRecoveries]);

  // Targets (default to reasonable baseline if not specified)
  const salesTarget = period === 'DAILY' ? 150000 : period === 'MONTHLY' ? 3500000 : 42000000;
  const recoveryTarget = period === 'DAILY' ? 120000 : period === 'MONTHLY' ? 3000000 : 36000000;

  const salesAchievementPct = Math.min(150, Math.round((grossSales / salesTarget) * 100));
  const recoveryAchievementPct = Math.min(150, Math.round((totalRecovery / recoveryTarget) * 100));
  const recoveryEfficiencyPct = grossSales > 0 ? Math.round((totalRecovery / grossSales) * 100) : 100;

  // Recovery breakdown by payment mode (Cash vs Bank vs Cheque)
  const recoveryByMode = useMemo(() => {
    let cash = 0;
    let bank = 0;
    let cheque = 0;

    filteredRecoveries.forEach((r) => {
      if (r.status === 'REJECTED') return;
      const mode = (r.paymentMode || 'CASH').toUpperCase();
      if (mode.includes('BANK') || mode.includes('ONLINE') || mode.includes('TRANSFER')) {
        bank += r.amount || 0;
      } else if (mode.includes('CHEQUE') || mode.includes('PAY_ORDER')) {
        cheque += r.amount || 0;
      } else {
        cash += r.amount || 0;
      }
    });

    const total = cash + bank + cheque || 1;
    return {
      cash,
      bank,
      cheque,
      cashPct: Math.round((cash / total) * 100),
      bankPct: Math.round((bank / total) * 100),
      chequePct: Math.round((cheque / total) * 100),
    };
  }, [filteredRecoveries]);

  // Sales breakdown by Town / Beat
  const salesByTown = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    filteredOrders.forEach((o) => {
      if (o.status === 'REJECTED') return;
      const town = o.customerTown || o.town || 'Peshawar (Duran Pur Route)';
      const existing = map.get(town) || { count: 0, amount: 0 };
      map.set(town, {
        count: existing.count + 1,
        amount: existing.amount + (o.totalAmount || 0),
      });
    });

    return Array.from(map.entries()).sort((a, b) => b[1].amount - a[1].amount);
  }, [filteredOrders]);

  // Unique dealers visited / billed in period
  const uniqueBilledDealers = useMemo(() => {
    const set = new Set<string>();
    filteredOrders.forEach((o) => {
      if (o.customerId) set.add(o.customerId);
      else if (o.customerName) set.add(o.customerName);
    });
    return set.size;
  }, [filteredOrders]);

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200">
      {/* Top Banner & Time Period Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center font-black text-sm shadow-md">
              360
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Field Officer Activity &amp; Sales Dashboard
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentUser.fullName} &bull; {periodLabel}
              </p>
            </div>
          </div>

          {/* Quick Period Segmented Pill Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
            {(['DAILY', 'MONTHLY', 'YTD', 'ALL'] as TimePeriod[]).map((t) => {
              const labels: Record<TimePeriod, string> = {
                DAILY: 'Daily',
                MONTHLY: 'Monthly (MTD)',
                YTD: 'YTD',
                ALL: 'All Time',
              };
              const active = period === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPeriod(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    active
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4-Card Primary KPI Deck */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Total Sales Booked */}
          <div className="bg-gradient-to-br from-[#004d40] to-slate-900 rounded-2xl p-4 text-white shadow-md border border-teal-700/40 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                Total Sales Booked
              </span>
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-300" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight mt-2">
              Rs. {grossSales.toLocaleString()} <span className="text-xs font-sans font-bold text-emerald-300">PKR</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-teal-100/80 pt-1 border-t border-teal-500/30">
              <span>{filteredOrders.length} Invoices</span>
              <span className="font-bold text-emerald-300">{salesAchievementPct}% of Target</span>
            </div>
          </div>

          {/* 2. Total Recovery Collected */}
          <div className="bg-gradient-to-br from-emerald-800 to-slate-900 rounded-2xl p-4 text-white shadow-md border border-emerald-700/40 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">
                Recovery Collected
              </span>
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-emerald-200" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight mt-2">
              Rs. {totalRecovery.toLocaleString()} <span className="text-xs font-sans font-bold text-emerald-200">PKR</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-100/80 pt-1 border-t border-emerald-500/30">
              <span>{filteredRecoveries.length} Vouchers</span>
              <span className="font-bold text-emerald-200">{recoveryAchievementPct}% of Target</span>
            </div>
          </div>

          {/* 3. Recovery Efficiency Ratio */}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Collection Efficiency
              </span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-800 dark:text-teal-300 font-black text-xs">
                %
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-2">
              {recoveryEfficiencyPct}%
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
              <span>Recovery / Sales Ratio</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {recoveryEfficiencyPct >= 80 ? '✓ Healthy' : '⚠ Action Req.'}
              </span>
            </div>
          </div>

          {/* 4. Active Dealer Coverage */}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Active Billed Dealers
              </span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-800 dark:text-teal-300">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-2">
              {uniqueBilledDealers} <span className="text-xs font-sans text-slate-400">Shops</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
              <span>Territory: {currentUser.assignedTowns?.[0] || 'Peshawar'}</span>
              <span className="font-bold text-teal-700 dark:text-teal-400">
                {customers.length > 0 ? `${Math.round((uniqueBilledDealers / customers.length) * 100)}% reach` : '100%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Recovery Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              Payment Recovery Channels
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-400">
              Rs. {totalRecovery.toLocaleString()} Total
            </span>
          </div>

          {/* Progress Split Bar */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${recoveryByMode.cashPct}%` }}
                className="bg-emerald-500 transition-all"
                title={`Cash: ${recoveryByMode.cashPct}%`}
              />
              <div
                style={{ width: `${recoveryByMode.bankPct}%` }}
                className="bg-teal-600 transition-all"
                title={`Bank: ${recoveryByMode.bankPct}%`}
              />
              <div
                style={{ width: `${recoveryByMode.chequePct}%` }}
                className="bg-amber-500 transition-all"
                title={`Cheque: ${recoveryByMode.chequePct}%`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 block">
                  Cash ({recoveryByMode.cashPct}%)
                </span>
                <span className="font-mono font-black text-slate-900 dark:text-white block mt-0.5">
                  Rs. {recoveryByMode.cash.toLocaleString()}
                </span>
              </div>

              <div className="bg-teal-50 dark:bg-teal-950/40 p-2.5 rounded-xl border border-teal-100 dark:border-teal-900">
                <span className="text-[10px] font-bold text-teal-800 dark:text-teal-400 block">
                  Bank / Online ({recoveryByMode.bankPct}%)
                </span>
                <span className="font-mono font-black text-slate-900 dark:text-white block mt-0.5">
                  Rs. {recoveryByMode.bank.toLocaleString()}
                </span>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900">
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 block">
                  Cheque ({recoveryByMode.chequePct}%)
                </span>
                <span className="font-mono font-black text-slate-900 dark:text-white block mt-0.5">
                  Rs. {recoveryByMode.cheque.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Territory & Route Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              Town &amp; Route Performance
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              Sales Distribution
            </span>
          </div>

          <div className="space-y-2.5">
            {salesByTown.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                <MapPin className="w-6 h-6 mx-auto mb-1 opacity-40" />
                <p>No territory sales recorded for this time period.</p>
              </div>
            ) : (
              salesByTown.slice(0, 4).map(([townName, data]) => {
                const townPct = grossSales > 0 ? Math.round((data.amount / grossSales) * 100) : 0;
                return (
                  <div key={townName} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-900 dark:text-white flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-teal-600" />
                        {townName}
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        Rs. {data.amount.toLocaleString()} ({townPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${townPct}%` }}
                        className="h-full bg-teal-700 dark:bg-teal-500 rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders & Recovery Stream */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            Activity Log &amp; Bookings
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            {filteredOrders.length + filteredRecoveries.length} Transactions
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {filteredOrders.slice(0, 5).map((ord) => (
            <div key={ord.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-black text-slate-900 dark:text-white block truncate">
                    {ord.customerName || 'Dealer Order'}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {ord.orderNumber || ord.id} &bull; {ord.items?.length || 1} SKUs &bull; {ord.status}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono font-black text-teal-800 dark:text-teal-400 block">
                  Rs. {Number(ord.totalAmount || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">
                  {ord.orderDate ? new Date(ord.orderDate).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }) : 'Today'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
