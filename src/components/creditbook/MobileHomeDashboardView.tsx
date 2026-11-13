/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Mobile Home Dashboard View
 * FMCG Field Execution & Analytics Home (National Light #0052FF Blue & Clean White Surfaces)
 * - Officer Profile Header with Achievement Progress Bar
 * - Sub-tabs: Analytics (SKU/Bill Bars, Visit Productivity Ring, Sales Trend Line Chart) & Scoring Criteria
 * - Searchable Dealer Ledger & Quick Actions
 */

import React, { useMemo, useState } from 'react';
import { Customer, SalesOrder, Recovery } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { triggerHaptic } from '../../utils/haptics';
import { calculateKpiScorecard, KpiPeriod } from '../../lib/kpi-scorecard';
import {
  TrendingUp,
  Trophy,
  ListChecks,
  BarChart2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Store,
  PhoneCall,
  FileText,
  Package,
  Zap,
  Search,
  ShoppingCart,
  Receipt,
  MapPin,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export interface MobileHomeDashboardViewProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  isCheckedIn: boolean;
  checkedInTime: string | null;
  onOpenOrderBooking: () => void;
  onOpenRecordRecovery: () => void;
  onOpenCustomerCheckin: () => void;
  onOpenReturns?: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onOpenAlerts?: () => void;
}

type HomeSubTab = 'ANALYTICS' | 'PERFORMANCE' | 'SCORING' | 'DEALERS';

export const MobileHomeDashboardView: React.FC<MobileHomeDashboardViewProps> = ({
  currentUser,
  customers = [],
  orders = [],
  recoveries = [],
  isCheckedIn,
  checkedInTime,
  onOpenOrderBooking,
  onOpenRecordRecovery,
  onOpenCustomerCheckin,
  onSelectCustomer,
}) => {
  const [subTab, setSubTab] = useState<HomeSubTab>('ANALYTICS');
  const [kpiPeriod, setKpiPeriod] = useState<KpiPeriod>('MTD');
  const [expandedCriteria, setExpandedCriteria] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const monthPrefix = todayDateStr.slice(0, 7);

  // Live metrics
  const monthlyOrders = useMemo(
    () =>
      orders.filter(
        (o) => (o.orderDate || o.createdAt || '').slice(0, 7) === monthPrefix && o.status !== 'REJECTED'
      ),
    [orders, monthPrefix]
  );

  const todayOrders = useMemo(
    () =>
      orders.filter(
        (o) => (o.orderDate || o.createdAt || '').slice(0, 10) === todayDateStr && o.status !== 'REJECTED'
      ),
    [orders, todayDateStr]
  );

  const billedTodayCount = useMemo(
    () => new Set(todayOrders.map((o) => o.customerId)).size,
    [todayOrders]
  );

  const billedMonthCount = useMemo(
    () => new Set(monthlyOrders.map((o) => o.customerId)).size,
    [monthlyOrders]
  );

  const todaySalesValue = useMemo(
    () => todayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0),
    [todayOrders]
  );

  const todayRecoveries = useMemo(
    () =>
      recoveries.filter(
        (r) =>
          (r.collectionDate || (r as any).paymentDate || r.recordedAt || r.createdAt || '').slice(0, 10) === todayDateStr &&
          r.status !== 'REJECTED'
      ),
    [recoveries, todayDateStr]
  );

  const todayRecoveryValue = useMemo(
    () => todayRecoveries.reduce((s, r) => s + (r.amount || 0), 0),
    [todayRecoveries]
  );

  const monthlySalesValue = useMemo(
    () => monthlyOrders.reduce((s, o) => s + (o.totalAmount || 0), 0),
    [monthlyOrders]
  );

  const monthlyRecoveryValue = useMemo(
    () =>
      recoveries
        .filter((r) => (r.collectionDate || (r as any).paymentDate || r.recordedAt || r.createdAt || '').slice(0, 7) === monthPrefix && r.status !== 'REJECTED')
        .reduce((s, r) => s + (r.amount || 0), 0),
    [recoveries, monthPrefix]
  );

  const monthlyTarget = useMemo(
    () => Math.max(500000, customers.reduce((s, c) => s + (c.creditLimit || 0), 0) * 0.25),
    [customers]
  );

  const monthlyRecoveryTarget = useMemo(() => Math.round(monthlyTarget * 0.85), [monthlyTarget]);
  const dailySalesTarget = useMemo(() => Math.max(20000, Math.round(monthlyTarget / 26)), [monthlyTarget]);
  const dailyRecoveryTarget = useMemo(() => Math.max(15000, Math.round(monthlyRecoveryTarget / 26)), [monthlyRecoveryTarget]);

  const achievementPct = Math.min(100, Math.round((monthlySalesValue / monthlyTarget) * 100));
  const mtdRecoveryPct = Math.min(100, Math.round((monthlyRecoveryValue / monthlyRecoveryTarget) * 100));
  const todaySalesPct = Math.min(100, Math.round((todaySalesValue / dailySalesTarget) * 100));
  const todayRecoveryPct = Math.min(100, Math.round((todayRecoveryValue / dailyRecoveryTarget) * 100));

  // Average SKU / Bill over last 7 days
  const dailySkuBars = useMemo(() => {
    const days: { label: string; avgSku: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayLabel =
        i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayOrders = orders.filter(
        (o) => (o.orderDate || o.createdAt || '').slice(0, 10) === iso && o.status !== 'REJECTED'
      );
      const totalSkus = dayOrders.reduce((s, o) => s + Math.max(1, o.items?.length || 1), 0);
      const avgSku = dayOrders.length > 0 ? Number((totalSkus / dayOrders.length).toFixed(2)) : 0;
      days.push({ label: dayLabel, avgSku });
    }
    return days;
  }, [orders]);

  const maxSkuVal = Math.max(...dailySkuBars.map((b) => b.avgSku), 8);

  // Sales Trend (Value) over last 7 days
  const salesTrendPoints = useMemo(() => {
    const pts: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const val = orders
        .filter((o) => (o.orderDate || o.createdAt || '').slice(0, 10) === iso && o.status !== 'REJECTED')
        .reduce((s, o) => s + (o.totalAmount || 0), 0);
      pts.push({ label: i === 0 ? 'Today' : d.getDate().toString(), value: val });
    }
    return pts;
  }, [orders]);

  const maxTrendVal = Math.max(...salesTrendPoints.map((p) => p.value), 1);

  // Visit productivity ring
  const visitTotal = customers.length;
  const visitPct = visitTotal > 0 ? Math.min(100, Math.round((billedTodayCount / visitTotal) * 100)) : 0;
  const ringR = 42;
  const ringCirc = 2 * Math.PI * ringR;
  const ringOffset = ringCirc - (visitPct / 100) * ringCirc;

  // Configurable 6-KPI Scorecard Engine (Salesflo-inspired, shared with Desktop)
  const scorecard = useMemo(
    () =>
      calculateKpiScorecard({
        period: kpiPeriod,
        customers,
        orders,
        recoveries,
      }),
    [kpiPeriod, customers, orders, recoveries]
  );

  const kpiIconMap: Record<string, { icon: React.ElementType; color: string }> = {
    outletProductivity: { icon: Store, color: 'bg-[#0D9488]' },
    callProductivity: { icon: PhoneCall, color: 'bg-[#F59E0B]' },
    billProductivity: { icon: FileText, color: 'bg-[#10B981]' },
    skuPerBill: { icon: Package, color: 'bg-[#0284C7]' },
    strikeRate: { icon: Zap, color: 'bg-[#1B5E3A]' },
    visitCompliance: { icon: CheckCircle2, color: 'bg-[#0F766E]' },
  };

  const filteredDealers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.companyName || '').toLowerCase().includes(q) ||
        (c.town || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const initials = (currentUser?.fullName || 'NL')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col w-full pb-24 space-y-4 animate-in fade-in duration-200">
      {/* 1. Officer Profile Header + Target Progress Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#C8E6C9] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-14 h-14 rounded-full bg-[#1B5E3A] text-[#F1F8E9] border border-[#A7C957] flex items-center justify-center text-lg font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1B5E3A] truncate tracking-tight">
              {currentUser?.fullName || 'Field Officer'}
            </h1>
            <p className="text-xs font-mono text-[#5F8564]">
              {currentUser?.roleTitle || 'Field Sales Officer'}
            </p>
            <div className="flex items-center gap-2.5 mt-2">
              <div className="flex-1 max-w-[180px] h-2.5 rounded-full bg-[#F1F8E9] border border-[#C8E6C9] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    achievementPct >= 75 ? 'bg-[#1B5E3A]' : achievementPct >= 40 ? 'bg-[#4CAF50]' : 'bg-[#A7C957]'
                  }`}
                  style={{ width: `${achievementPct}%` }}
                />
              </div>
              <span className="text-xs font-mono tabular-nums font-bold text-[#1B5E3A]">
                {achievementPct}% MTD
              </span>
            </div>
          </div>
        </div>

        {/* Quick Attendance / Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onOpenCustomerCheckin();
            }}
            className={isCheckedIn ? 'btn-outline' : 'btn-primary'}
          >
            <Clock className={`w-4 h-4 ${isCheckedIn ? 'text-[#10B981]' : ''}`} />
            <span>{isCheckedIn ? `In · ${checkedInTime || 'Active'}` : 'Check In'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onOpenOrderBooking();
            }}
            className="btn-secondary"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Book Order</span>
          </button>
        </div>
      </div>

      {/* 1B. Daily Targets & MTD Sales / Recovery Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Daily Sales vs Target */}
        <div className="bg-white rounded-2xl p-4 border border-[#C8E6C9] space-y-2 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#3E6B48]">Today&apos;s Sales</span>
            <span className="text-[11px] font-mono tabular-nums font-bold text-[#1B5E3A]">
              {todaySalesPct}%
            </span>
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-[#1B5E3A] truncate">
            Rs. {todaySalesValue.toLocaleString()}
          </div>
          <div className="h-1.5 rounded-full bg-[#F1F8E9] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#4CAF50] transition-all duration-500"
              style={{ width: `${todaySalesPct}%` }}
            />
          </div>
          <div className="text-[11px] text-[#5F8564] font-mono tabular-nums flex items-center justify-between gap-1">
            <span>Target: Rs. {dailySalesTarget.toLocaleString()}</span>
            <span>{todayOrders.length} ord · {billedTodayCount} dlr</span>
          </div>
        </div>

        {/* Daily Recovery vs Target */}
        <div className="bg-white rounded-2xl p-4 border border-[#C8E6C9] space-y-2 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#3E6B48]">Today&apos;s Recovery</span>
            <span className="text-[11px] font-mono tabular-nums font-bold text-[#1B5E3A]">
              {todayRecoveryPct}%
            </span>
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-[#4CAF50] truncate">
            Rs. {todayRecoveryValue.toLocaleString()}
          </div>
          <div className="h-1.5 rounded-full bg-[#F1F8E9] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1B5E3A] transition-all duration-500"
              style={{ width: `${todayRecoveryPct}%` }}
            />
          </div>
          <div className="text-[11px] text-[#5F8564] font-mono tabular-nums flex items-center justify-between gap-1">
            <span>Target: Rs. {dailyRecoveryTarget.toLocaleString()}</span>
            <span>{todayRecoveries.length} receipts</span>
          </div>
        </div>

        {/* MTD Sales Performance */}
        <div className="bg-white rounded-2xl p-4 border border-[#C8E6C9] space-y-2 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#3E6B48]">MTD Sales</span>
            <span className="text-[11px] font-mono tabular-nums font-bold text-[#1B5E3A]">
              {achievementPct}%
            </span>
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-[#1B5E3A] truncate">
            Rs. {monthlySalesValue.toLocaleString()}
          </div>
          <div className="h-1.5 rounded-full bg-[#F1F8E9] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#4CAF50] transition-all duration-500"
              style={{ width: `${achievementPct}%` }}
            />
          </div>
          <div className="text-[11px] text-[#5F8564] font-mono tabular-nums flex items-center justify-between gap-1">
            <span>Target: Rs. {Math.round(monthlyTarget).toLocaleString()}</span>
            <span>{monthlyOrders.length} ord · {billedMonthCount} dlr</span>
          </div>
        </div>

        {/* MTD Recovery Performance */}
        <div className="bg-white rounded-2xl p-4 border border-[#C8E6C9] space-y-2 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#3E6B48]">MTD Recovery</span>
            <span className="text-[11px] font-mono tabular-nums font-bold text-[#1B5E3A]">
              {mtdRecoveryPct}%
            </span>
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-[#4CAF50] truncate">
            Rs. {monthlyRecoveryValue.toLocaleString()}
          </div>
          <div className="h-1.5 rounded-full bg-[#F1F8E9] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1B5E3A] transition-all duration-500"
              style={{ width: `${mtdRecoveryPct}%` }}
            />
          </div>
          <div className="text-[11px] text-[#5F8564] font-mono tabular-nums flex items-center justify-between gap-1">
            <span>Target: Rs. {monthlyRecoveryTarget.toLocaleString()}</span>
            <span>{mtdRecoveryPct}% realized</span>
          </div>
        </div>
      </div>

      {/* 2. 4-Icon Sub-Tab Strip */}
      <div className="bg-white rounded-2xl border border-[#C8E6C9] p-1 grid grid-cols-4 gap-1">
        {(
          [
            { id: 'ANALYTICS', label: 'Analytics', icon: TrendingUp },
            { id: 'PERFORMANCE', label: 'Summary', icon: Trophy },
            { id: 'SCORING', label: 'Scorecard', icon: ListChecks },
            { id: 'DEALERS', label: 'Dealers', icon: BarChart2 },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSubTab(tab.id);
              }}
              className={`min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#1B5E3A] text-white'
                  : 'text-[#5F8564] hover:text-[#1B5E3A]'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-[#D9F99D]' : ''}`} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3A. ANALYTICS SUB-TAB (Average SKU/Bill + Visit Productivity + Sales Trend) */}
      {subTab === 'ANALYTICS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Average SKU/Bill + Visit Productivity Ring */}
          <div className="lg:col-span-6 bg-white dark:bg-[#111C33] rounded-2xl p-5 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Today&apos;s Field Productivity
              </h2>
              <span className="text-xs text-[#0D9488] font-semibold">Live</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Horizontal SKU/Bill Bars */}
              <div className="sm:col-span-7 space-y-2.5">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Average SKU / Bill
                </div>
                {dailySkuBars.map((row) => {
                  const pct = Math.min(100, Math.round((row.avgSku / maxSkuVal) * 100));
                  const barColor =
                    row.avgSku === 0
                      ? 'bg-slate-200 dark:bg-slate-700'
                      : row.avgSku < 3
                      ? 'bg-[#F59E0B]'
                      : 'bg-[#0D9488]';
                  return (
                    <div key={row.label} className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-right text-slate-600 dark:text-slate-400 truncate shrink-0">
                        {row.label}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-[#F8FAFC] dark:bg-slate-800 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-9 font-mono tabular-nums font-semibold text-[#0F172A] dark:text-white text-right">
                        {row.avgSku > 0 ? row.avgSku.toFixed(1) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Visit Productivity Ring */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center py-2">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Visit Productivity
                </div>
                <div className="relative flex items-center justify-center">
                  <svg width="108" height="108" viewBox="0 0 108 108" className="-rotate-90">
                    <circle
                      cx="54"
                      cy="54"
                      r={ringR}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="7"
                      className="text-slate-200 dark:text-slate-800"
                    />
                    <circle
                      cx="54"
                      cy="54"
                      r={ringR}
                      fill="none"
                      stroke="#0D9488"
                      strokeWidth="7"
                      strokeDasharray={ringCirc}
                      strokeDashoffset={ringOffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-slate-400">Today&apos;s Beat</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-[#0F172A] dark:text-white">
                      {billedTodayCount} / {visitTotal}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Sales Trend (Value) Line Chart */}
          <div className="lg:col-span-6 bg-white dark:bg-[#111C33] rounded-2xl p-5 border border-[#E2E8F0] dark:border-slate-800 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Sales Trend (Value)
              </h2>
              <span className="text-xs font-mono tabular-nums font-bold text-[#0D9488] dark:text-teal-400">
                Rs. {monthlySalesValue.toLocaleString()}
              </span>
            </div>

            <div className="w-full pt-2">
              <svg viewBox="0 0 360 130" className="w-full h-36 overflow-visible">
                {salesTrendPoints.map((pt, idx) => {
                  const x = 24 + idx * 52;
                  const y = 96 - (pt.value / maxTrendVal) * 68;
                  const next = salesTrendPoints[idx + 1];
                  const nextX = 24 + (idx + 1) * 52;
                  const nextY = next ? 96 - (next.value / maxTrendVal) * 68 : y;
                  return (
                    <g key={pt.label}>
                      <line x1={x} y1="14" x2={x} y2="100" stroke="#E2E8F0" strokeWidth="1" />
                      {next && (
                        <line x1={x} y1={y} x2={nextX} y2={nextY} stroke="#0D9488" strokeWidth="2" />
                      )}
                      <circle cx={x} cy={y} r="4.5" fill="#F59E0B" stroke="#0B132B" strokeWidth="1.5" />
                      <text
                        x={x}
                        y={y - 9}
                        textAnchor="middle"
                        className="fill-[#0F172A] dark:fill-slate-200 text-[9px] font-mono font-semibold"
                      >
                        {pt.value > 0 ? `${Math.round(pt.value / 1000)}k` : '0'}
                      </text>
                      <text
                        x={x}
                        y="118"
                        textAnchor="middle"
                        className="fill-slate-500 dark:fill-slate-400 text-[10px]"
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* 3B. SUMMARY SUB-TAB */}
      {subTab === 'PERFORMANCE' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#111C33] rounded-2xl p-5 border border-[#E2E8F0] dark:border-slate-800 space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Monthly Sales</span>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-white">
              Rs. {monthlySalesValue.toLocaleString()}
            </div>
            <span className="text-xs text-[#0D9488] dark:text-teal-400 font-semibold">
              {monthlyOrders.length} Orders Booked
            </span>
          </div>

          <div className="bg-white dark:bg-[#111C33] rounded-2xl p-5 border border-[#E2E8F0] dark:border-slate-800 space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Monthly Recovery</span>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#10B981]">
              Rs. {monthlyRecoveryValue.toLocaleString()}
            </div>
            <button
              type="button"
              onClick={onOpenRecordRecovery}
              className="text-xs text-[#0D9488] dark:text-teal-400 font-semibold hover:underline cursor-pointer"
            >
              + Record Recovery
            </button>
          </div>

          <div className="bg-white dark:bg-[#111C33] rounded-2xl p-5 border border-[#E2E8F0] dark:border-slate-800 space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Active Dealers / Distributors</span>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] dark:text-white">
              {billedMonthCount} / {visitTotal}
            </div>
            <span className="text-xs text-slate-500">Billed this month</span>
          </div>
        </div>
      )}

      {/* 3C. CONFIGURABLE 6-KPI SCORECARD SUB-TAB */}
      {subTab === 'SCORING' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                KPI Scorecard ({kpiPeriod})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total Score: <strong className="font-mono text-[#0D9488]">{scorecard.totalPoints} / {scorecard.maxPoints} pts</strong>
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#111C33] border border-[#E2E8F0] dark:border-slate-800 rounded-xl self-start">
              {(['DAILY', 'WEEKLY', 'MTD'] as KpiPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setKpiPeriod(p);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    kpiPeriod === p
                      ? 'bg-[#1B5E3A] text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {scorecard.metrics.map((item) => {
              const meta = kpiIconMap[item.id] || { icon: ListChecks, color: 'bg-[#0D9488]' };
              const Icon = meta.icon;
              const isOpen = expandedCriteria === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#111C33] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCriteria(isOpen ? null : item.id)}
                    className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-full ${meta.color} text-white flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#0F172A] dark:text-white truncate">
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Weightage {item.weightage}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Target</span>
                        <span className="text-sm font-bold font-mono tabular-nums text-[#0F172A] dark:text-white">
                          {item.target}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Achieved</span>
                        <span className="text-sm font-bold font-mono tabular-nums text-[#0D9488] dark:text-teal-400">
                          {item.achievement}{item.unit === '%' ? '%' : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Points</span>
                        <span className="text-sm font-bold font-mono tabular-nums text-[#F59E0B]">
                          {item.pointsEarned}
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="font-medium">{item.sourceSummary}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Formula: {item.formula}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3D. DEALERS / DISTRIBUTORS LEDGER SUB-TAB */}
      {subTab === 'DEALERS' && (
        <div className="bg-white dark:bg-[#111C33] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Assigned Dealers / Distributors ({filteredDealers.length})
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Dealer / Distributor or town..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#0D9488]"
              />
            </div>
          </div>

          <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
            {filteredDealers.slice(0, 15).map((dlr) => {
              const balance = dlr.currentBalance ?? dlr.openingBalance ?? 0;
              return (
                <button
                  key={dlr.id}
                  type="button"
                  onClick={() => onSelectCustomer(dlr)}
                  className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0F172A] dark:text-white truncate">
                      {dlr.companyName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {dlr.town || dlr.city || 'Registered Dealer / Distributor'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono tabular-nums text-xs font-bold text-[#0F172A] dark:text-white">
                      Rs. {balance.toLocaleString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Quick Action Bar (Always reachable) */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            onOpenOrderBooking();
          }}
          className="btn-primary"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Book Order</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            onOpenRecordRecovery();
          }}
          className="btn-secondary"
        >
          <Receipt className="w-4 h-4 text-[#10B981]" />
          <span>Recovery</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenCustomerCheckin();
          }}
          className="btn-outline"
        >
          <MapPin className="w-4 h-4 text-[#FF7A00]" />
          <span>GPS Visit</span>
        </button>
      </div>
    </div>
  );
};
