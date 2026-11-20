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
 Wallet,
 BookOpen,
} from 'lucide-react';

export interface FieldOfficerActivityDashboardProps {
 currentUser: NLinkUser;
 customers: Customer[];
 orders: SalesOrder[];
 recoveries: Recovery[];
 onSelectCustomer?: (customerId: string) => void;
 onOpenNewOrder?: () => void;
 onOpenRecordRecovery?: () => void;
 onOpenInvoices?: () => void;
 onOpenLedger?: () => void;
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
 onOpenInvoices,
 onOpenLedger,
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
 .filter((o) => (o.status as string) === 'APPROVED' || (o.status as string) === 'VERIFIED' || o.shahzadApproval === 'APPROVED')
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
    <div className="w-full space-y-4 animate-in fade-in duration-200 overflow-x-hidden">
      {/* Top Banner & Time Period Switcher */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-slate-700/80 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-[#0F172A] dark:text-white truncate">
              Officer Activity &amp; Sales
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {currentUser.fullName} &middot; {periodLabel}
            </p>
          </div>

          {/* Quick Period Segmented Switcher (4 equal columns, single-line, Electric Blue active) */}
          <div className="grid grid-cols-4 gap-1 bg-[#F8FAFC] dark:bg-[#0F172A] p-1 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 w-full sm:w-auto">
            {(['DAILY', 'MONTHLY', 'YTD', 'ALL'] as TimePeriod[]).map((t) => {
              const labels: Record<TimePeriod, string> = {
                DAILY: 'Daily',
                MONTHLY: 'MTD',
                YTD: 'YTD',
                ALL: 'All',
              };
              const active = period === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPeriod(t)}
                  className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center justify-center ${
                    active
                      ? 'bg-[#3B82F6] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 ACTION BUTTONS (Single Vibrant Orange primary Ordering CTA + clean outline secondary actions, >=44px touch targets) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={onOpenNewOrder}
            className="btn-primary min-h-[44px] w-full"
            title="Book sales order"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Book Order</span>
          </button>

          <button
            type="button"
            onClick={onOpenRecordRecovery}
            className="btn-outline min-h-[44px] w-full"
            title="Log daily payment recovery"
          >
            <Wallet className="w-4 h-4 shrink-0 text-[#10B981]" />
            <span>Recovery</span>
          </button>

          <button
            type="button"
            onClick={onOpenInvoices}
            className="btn-outline min-h-[44px] w-full"
            title="View bills and invoices"
          >
            <Receipt className="w-4 h-4 shrink-0 text-[#3B82F6]" />
            <span>Invoices</span>
          </button>

          <button
            type="button"
            onClick={onOpenLedger}
            className="btn-outline min-h-[44px] w-full"
            title="View Khata Ledgers"
          >
            <BookOpen className="w-4 h-4 shrink-0 text-[#3B82F6]" />
            <span>Khata</span>
          </button>
        </div>

        {/* 4-Card Equal-Height Primary KPI Deck */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 items-stretch">
          {/* 1. Total Sales Booked */}
          <div className="h-full bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl p-4 border border-[#E2E8F0] dark:border-slate-700/80 flex flex-col justify-between min-w-0">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Sales Booked
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight mt-2 text-[#0F172A] dark:text-white truncate">
                PKR {grossSales.toLocaleString()}
              </div>
            </div>
            <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-[#E2E8F0] dark:border-slate-800">
              <span className="font-mono tabular-nums">{filteredOrders.length} Invoices</span>
              <span className="font-semibold text-[#F97316] font-mono tabular-nums">{salesAchievementPct}% of Target</span>
            </div>
          </div>

          {/* 2. Total Recovery Collected */}
          <div className="h-full bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl p-4 border border-[#E2E8F0] dark:border-slate-700/80 flex flex-col justify-between min-w-0">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Recovery Collected
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-[#10B981]" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight mt-2 text-[#10B981] truncate">
                PKR {totalRecovery.toLocaleString()}
              </div>
            </div>
            <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-[#E2E8F0] dark:border-slate-800">
              <span className="font-mono tabular-nums">{filteredRecoveries.length} Vouchers</span>
              <span className="font-semibold text-[#10B981] font-mono tabular-nums">{recoveryAchievementPct}% of Target</span>
            </div>
          </div>

          {/* 3. Recovery Efficiency Ratio */}
          <div className="h-full bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl p-4 border border-[#E2E8F0] dark:border-slate-700/80 flex flex-col justify-between min-w-0">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Collection Efficiency
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#3B82F6] font-bold text-xs shrink-0">
                  %
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-2 truncate">
                {recoveryEfficiencyPct}%
              </div>
            </div>
            <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-[#E2E8F0] dark:border-slate-800">
              <span>Recovery / Sales</span>
              <span className={`font-semibold tabular-nums ${recoveryEfficiencyPct >= 80 ? 'text-[#10B981]' : 'text-[#F97316]'}`}>
                {recoveryEfficiencyPct >= 80 ? 'Healthy' : 'Action Req.'}
              </span>
            </div>
          </div>

          {/* 4. Active Dealer Coverage */}
          <div className="h-full bg-[#F8FAFC] dark:bg-[#0F172A] rounded-xl p-4 border border-[#E2E8F0] dark:border-slate-700/80 flex flex-col justify-between min-w-0">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Active Billed Dealers
                </span>
                <div className="w-7 h-7 rounded-lg bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-[#0F172A] dark:text-slate-200 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-2">
                {uniqueBilledDealers} <span className="text-xs font-sans text-slate-500 dark:text-slate-400 font-normal">Dealers</span>
              </div>
            </div>
            <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-[#E2E8F0] dark:border-slate-800">
              <span className="truncate">{currentUser.assignedTowns?.[0] || 'Peshawar'}</span>
              <span className="font-semibold text-[#3B82F6] dark:text-blue-400 font-mono tabular-nums shrink-0">
                {customers.length > 0 ? `${Math.round((uniqueBilledDealers / customers.length) * 100)}% reach` : '100%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Payment Recovery Breakdown */}
        <div className="h-full bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-slate-700/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-700/80 pb-3">
            <span className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#10B981]" />
              Payment Recovery Channels
            </span>
            <span className="text-[11px] font-mono tabular-nums font-semibold text-slate-500 dark:text-slate-400">
              PKR {totalRecovery.toLocaleString()}
            </span>
          </div>

          {/* Progress Split Bar */}
          <div className="space-y-2.5">
            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${recoveryByMode.cashPct}%` }}
                className="bg-[#3B82F6] transition-all"
                title={`Cash: ${recoveryByMode.cashPct}%`}
              />
              <div
                style={{ width: `${recoveryByMode.bankPct}%` }}
                className="bg-[#10B981] transition-all"
                title={`Bank: ${recoveryByMode.bankPct}%`}
              />
              <div
                style={{ width: `${recoveryByMode.chequePct}%` }}
                className="bg-[#F97316] transition-all"
                title={`Cheque: ${recoveryByMode.chequePct}%`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
              <div className="bg-[#F8FAFC] dark:bg-[#0F172A] p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
                <span className="text-[10px] font-semibold text-[#3B82F6] dark:text-blue-400 block">
                  Cash ({recoveryByMode.cashPct}%)
                </span>
                <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white block mt-0.5 text-[11px] truncate">
                  PKR {recoveryByMode.cash.toLocaleString()}
                </span>
              </div>

              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-[10px] font-semibold text-[#10B981] block">
                  Bank ({recoveryByMode.bankPct}%)
                </span>
                <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white block mt-0.5 text-[11px] truncate">
                  PKR {recoveryByMode.bank.toLocaleString()}
                </span>
              </div>

              <div className="bg-orange-50/70 dark:bg-orange-950/30 p-2.5 rounded-xl border border-orange-200 dark:border-orange-800/60">
                <span className="text-[10px] font-semibold text-[#EA580C] dark:text-orange-400 block">
                  Cheque ({recoveryByMode.chequePct}%)
                </span>
                <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white block mt-0.5 text-[11px] truncate">
                  PKR {recoveryByMode.cheque.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Territory & Route Distribution */}
        <div className="h-full bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-slate-700/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-700/80 pb-3">
            <span className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#3B82F6]" />
              Town &amp; Route Performance
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Sales Distribution
            </span>
          </div>

          <div className="space-y-2.5">
            {salesByTown.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                <MapPin className="w-6 h-6 mx-auto mb-1 opacity-40 text-[#3B82F6]" />
                <p>No territory sales recorded for this time period.</p>
              </div>
            ) : (
              salesByTown.slice(0, 4).map(([townName, data]) => {
                const townPct = grossSales > 0 ? Math.round((data.amount / grossSales) * 100) : 0;
                return (
                  <div key={townName} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold gap-2">
                      <span className="text-[#0F172A] dark:text-white flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
                        <span className="truncate">{townName}</span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 shrink-0">
                        PKR {data.amount.toLocaleString()} ({townPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${townPct}%` }}
                        className="h-full bg-[#3B82F6] rounded-full transition-all"
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
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-slate-700/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-700/80 pb-3">
          <span className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            Activity Log &amp; Bookings
          </span>
          <span className="text-[11px] font-mono tabular-nums font-semibold text-slate-500 dark:text-slate-400">
            {filteredOrders.length + filteredRecoveries.length} Txns
          </span>
        </div>

        <div className="divide-y divide-[#E2E8F0] dark:divide-slate-700/80 text-xs">
          {filteredOrders.slice(0, 5).map((ord) => (
            <div key={ord.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#3B82F6] flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#0F172A] dark:text-white block truncate">
                    {ord.customerName || 'Dealer Order'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate font-mono tabular-nums">
                    {ord.orderNumber || ord.id} &middot; {ord.items?.length || 1} SKUs &middot; {ord.status}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono tabular-nums font-bold text-[#3B82F6] dark:text-blue-400 block">
                  PKR {Number(ord.totalAmount || 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-mono tabular-nums">
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
