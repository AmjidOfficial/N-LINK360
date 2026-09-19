/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Field Intelligence Dashboard
 * Premium Executive Dashboard with Advanced Recharts Visualizations
 * Fully responsive, optimized for desktop and mobile devices.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Customer, SalesOrder, Recovery } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { purgeMockDataFromState, isProductionUser } from '../../utils/purgeMockData';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  MapPin,
  Briefcase,
  Users,
  ShieldAlert,
  Settings,
  CreditCard,
  Percent,
} from 'lucide-react';

export interface EnterpriseDashboardTabProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  onNavigateTab: (tab: 'DASHBOARD' | 'ATTENDANCE' | 'ORDERS' | 'LEDGERS' | 'DEALERS') => void;
  onOpenAddDealer: () => void;
  onOpenRateCard: () => void;
  onOpenPDFReport?: () => void;
  onOpenDualApprovals?: () => void;
  isCheckedIn: boolean;
  onToggleCheckIn: () => void;
  checkedInTime?: string | null;
  checkedOutTime?: string | null;
  selectedAttendanceTown?: string;
  onPurgeMockData?: () => void;
}

export const EnterpriseDashboardTab: React.FC<EnterpriseDashboardTabProps> = ({
  currentUser,
  customers,
  orders,
  recoveries,
  onNavigateTab,
  onOpenAddDealer,
  onOpenRateCard,
  onOpenPDFReport,
  onOpenDualApprovals,
  isCheckedIn,
  onToggleCheckIn,
  checkedInTime = '09:12 AM',
  checkedOutTime = null,
  selectedAttendanceTown = 'Peshawar',
  onPurgeMockData,
}) => {
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  // Administrative / Executive clearance check
  const isAdmin = useMemo(() => {
    return (
      ['SUPER_ADMIN', 'MANAGEMENT'].includes(currentUser.role) ||
      currentUser.email?.includes('zain') ||
      currentUser.email?.includes('shahzad')
    );
  }, [currentUser]);

  // Aggregate global financial recovery metrics
  const recoveryMetrics = useMemo(() => {
    const totalRecovery = recoveries.reduce((sum, r) => sum + (r.amount || 0), 0);
    const recoveryCount = recoveries.length;

    // Split cash vs bank
    const cashSum = recoveries
      .filter((r) => (r.paymentMode || 'CASH').toUpperCase() === 'CASH')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const bankSum = totalRecovery - cashSum;

    const cashPercent = totalRecovery > 0 ? Math.round((cashSum / totalRecovery) * 100) : 100;
    const bankPercent = totalRecovery > 0 ? 100 - cashPercent : 0;

    return {
      totalRecovery,
      cashSum,
      bankSum,
      recoveryCount,
      cashPercent,
      bankPercent,
    };
  }, [recoveries]);

  // Aggregate global sales metrics
  const salesMetrics = useMemo(() => {
    const totalSale = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? Math.round(totalSale / orderCount) : 0;

    return {
      totalSale,
      orderCount,
      avgOrderValue,
    };
  }, [orders]);

  // Aggregate MTD target metrics for Sales & Recovery
  const targetMetrics = useMemo(() => {
    const baseMonthlyTarget = currentUser.monthlyTarget && currentUser.monthlyTarget > 0 
      ? currentUser.monthlyTarget 
      : 4500000;

    const salesTarget = baseMonthlyTarget;
    const recoveryTarget = Math.round(baseMonthlyTarget * 0.8);

    const salesAchieved = salesMetrics.totalSale;
    const recoveryAchieved = recoveryMetrics.totalRecovery;

    const salesPercent = salesTarget > 0 ? Math.round((salesAchieved / salesTarget) * 100) : 0;
    const recoveryPercent = recoveryTarget > 0 ? Math.round((recoveryAchieved / recoveryTarget) * 100) : 0;

    return {
      salesTarget,
      salesAchieved,
      salesPercent,
      recoveryTarget,
      recoveryAchieved,
      recoveryPercent,
    };
  }, [currentUser, salesMetrics.totalSale, recoveryMetrics.totalRecovery]);

  // Town-wise Sales & Recovery report
  const townPerformanceReport = useMemo(() => {
    const towns = Array.from(
      new Set([
        'Peshawar',
        'Mardan',
        'Kohat',
        'Swat',
        'Rawalpindi',
        'Lahore',
        ...customers.map((c) => c.city || 'Peshawar'),
      ])
    ).filter(Boolean);

    return towns
      .map((town) => {
        const townCustomers = customers.filter(
          (c) => (c.city || 'Peshawar').toLowerCase() === town.toLowerCase()
        );
        const townOrders = orders.filter((o) => {
          const cust = customers.find((c) => c.id === o.customerId);
          return cust?.city?.toLowerCase() === town.toLowerCase();
        });
        const townRecoveries = recoveries.filter((r) => {
          const cust = customers.find((c) => c.id === r.customerId);
          return cust?.city?.toLowerCase() === town.toLowerCase();
        });

        const orderSum = townOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const recoverySum = townRecoveries.reduce((sum, r) => sum + (r.amount || 0), 0);

        return {
          town: town.charAt(0).toUpperCase() + town.slice(1),
          dealers: townCustomers.length,
          sales: orderSum,
          recovery: recoverySum,
        };
      })
      .filter((t) => t.dealers > 0 || t.sales > 0 || t.recovery > 0)
      .sort((a, b) => b.sales - a.sales);
  }, [customers, orders, recoveries]);

  // Chronological Daily Sales vs Recovery data for Recharts (Past 7 Days)
  const chartTimelineData = useMemo(() => {
    const dateMap = new Map<string, { date: string; Sales: number; Recovery: number }>();

    // Populating last 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap.set(dStr, { date: label, Sales: 0, Recovery: 0 });
    }

    orders.forEach((o) => {
      const dStr = (o.orderDate || o.createdAt || '').slice(0, 10);
      if (dateMap.has(dStr)) {
        const entry = dateMap.get(dStr)!;
        entry.Sales += o.totalAmount || 0;
      }
    });

    recoveries.forEach((r) => {
      const dStr = (r.collectionDate || r.createdAt || '').slice(0, 10);
      if (dateMap.has(dStr)) {
        const entry = dateMap.get(dStr)!;
        entry.Recovery += r.amount || 0;
      }
    });

    return Array.from(dateMap.values());
  }, [orders, recoveries]);

  // Payment Mode breakdown for Recharts PieChart
  const paymentModeData = useMemo(() => {
    return [
      { name: 'Cash Collections', value: recoveryMetrics.cashSum, color: '#10b981' },
      { name: 'Bank Deposits', value: recoveryMetrics.bankSum, color: '#3b82f6' },
    ].filter((item) => item.value > 0);
  }, [recoveryMetrics]);

  // Dealer credit risk profile
  const creditRiskDealers = useMemo(() => {
    return customers
      .map((c) => {
        const limit = c.creditLimit || 500000;
        const balance = c.currentBalance || 0;
        const ratio = limit > 0 ? Math.round((balance / limit) * 100) : 0;
        return {
          id: c.id,
          name: c.companyName,
          city: c.city || 'Peshawar',
          balance,
          limit,
          ratio,
        };
      })
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 4);
  }, [customers]);

  // Purge Mock Data Handler (Admin only override)
  const handlePurgeMockDataClick = () => {
    setIsPurging(true);
    try {
      const result = purgeMockDataFromState({ customers, orders, recoveries });
      if (onPurgeMockData) {
        onPurgeMockData();
      }
      setPurgeFeedback(result.message);
      setTimeout(() => setPurgeFeedback(null), 6000);
    } catch (err: any) {
      console.error('Purge error:', err);
      setPurgeFeedback('Error during purge operation.');
      setTimeout(() => setPurgeFeedback(null), 4000);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-5 pb-16 animate-fadeIn" id="enterprise-dashboard-view">
      
      {/* 1. Welcoming executive panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 px-6 py-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-3xs gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#006b5f] dark:text-[#76f4e0]">
            Executive Operations Terminal
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            National Light Business Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time analytics and financial health check of the distributor network.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenPDFReport && (
            <button
              onClick={onOpenPDFReport}
              className="min-h-[44px] px-4 py-2 bg-[#001428] dark:bg-slate-800 text-white font-extrabold text-xs rounded-xl hover:bg-[#00254b] dark:hover:bg-slate-700 transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm"
            >
              <span>Export Executive Brief (PDF)</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={handlePurgeMockDataClick}
              disabled={isPurging}
              className="min-h-[44px] px-3.5 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
            >
              <span>Purge Mock Data</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Sync / Purge Feedback Alerts */}
      {purgeFeedback && (
        <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-xl text-xs text-teal-800 dark:text-teal-200 flex items-center gap-2 animate-fadeIn shadow-2xs">
          <span>{purgeFeedback}</span>
        </div>
      )}

      {/* 3. Shift Check-In Redirection Banner (Optimized touch targets) */}
      {!isCheckedIn && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 animate-fadeIn shadow-3xs">
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold text-lg">
              !
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider leading-none">Awaiting Shift Check-In</h4>
              <p className="text-[11px] opacity-90 mt-1">Please record your attendance and check-in location to start routing your beat.</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('ATTENDANCE')}
            className="min-h-[44px] w-full md:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl active:scale-95 transition-all cursor-pointer shadow-xs"
          >
            Go to Attendance &amp; Punch
          </button>
        </div>
      )}

      {/* Target vs Achievement MTD Panel */}
      <div className="bg-white dark:bg-[#0c1420] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#006b5f] dark:text-[#76f4e0]">
              Month-to-Date Targets vs Achievements
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Comparative analysis of field officer targets vs verified transactions for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className="self-start sm:self-center text-[10px] font-black px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-100 dark:border-indigo-900/40">
            Active Profile: {currentUser.fullName}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sales Target vs Achievement */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                  FMCG Sales Booking Target
                </span>
                <div className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                  Rs. {targetMetrics.salesAchieved.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-sans">of Rs. {targetMetrics.salesTarget.toLocaleString()}</span>
                </div>
              </div>
              <span className={`text-xs font-black px-2 py-0.5 rounded-lg font-mono ${
                targetMetrics.salesPercent >= 100 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' 
                  : 'bg-teal-50 text-[#006b5f] dark:bg-[#006b5f]/10 dark:text-[#76f4e0]'
              }`}>
                {targetMetrics.salesPercent}% Achieved
              </span>
            </div>
            {/* Elegant Progress bar */}
            <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, targetMetrics.salesPercent)}%` }} 
              />
            </div>
            <div className="flex justify-between text-[9px] font-semibold text-slate-400">
              <span>Remaining: Rs. {Math.max(0, targetMetrics.salesTarget - targetMetrics.salesAchieved).toLocaleString()}</span>
              <span>Target: 100%</span>
            </div>
          </div>

          {/* Recovery Target vs Achievement */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                  Recovery Collection Target (80% Efficiency Target)
                </span>
                <div className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                  Rs. {targetMetrics.recoveryAchieved.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-sans">of Rs. {targetMetrics.recoveryTarget.toLocaleString()}</span>
                </div>
              </div>
              <span className={`text-xs font-black px-2 py-0.5 rounded-lg font-mono ${
                targetMetrics.recoveryPercent >= 100 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' 
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
              }`}>
                {targetMetrics.recoveryPercent}% Achieved
              </span>
            </div>
            {/* Elegant Progress bar */}
            <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, targetMetrics.recoveryPercent)}%` }} 
              />
            </div>
            <div className="flex justify-between text-[9px] font-semibold text-slate-400">
              <span>Remaining: Rs. {Math.max(0, targetMetrics.recoveryTarget - targetMetrics.recoveryAchieved).toLocaleString()}</span>
              <span>Target: 100% (80% Collection Ratio)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Core Numerical Business Cards (Grid of 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="executive-metric-cards">
        
        {/* CARD 1: TOTAL RECOVERY */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Recovery
            </span>
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-mono">
              {recoveryMetrics.recoveryCount} Trans
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              Rs. {recoveryMetrics.totalRecovery.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Cash received + Bank deposits
            </p>
          </div>
          {/* Progress split */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${recoveryMetrics.cashPercent}%` }} />
              <div className="bg-blue-500 h-full" style={{ width: `${recoveryMetrics.bankPercent}%` }} />
            </div>
            <div className="flex justify-between text-[9px] font-mono mt-1 text-slate-500">
              <span>Cash: {recoveryMetrics.cashPercent}%</span>
              <span>Bank: {recoveryMetrics.bankPercent}%</span>
            </div>
          </div>
        </div>

        {/* CARD 2: CASH COLLECTIONS */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cash Received
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 dark:text-white font-mono tracking-tight">
              Rs. {recoveryMetrics.cashSum.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              On-field physical cash collection
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
            Handled by on-ground sales officers
          </div>
        </div>

        {/* CARD 3: BANK DEPOSITS */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Bank Deposits
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 dark:text-white font-mono tracking-tight">
              Rs. {recoveryMetrics.bankSum.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Direct clearing bank slips / EasyPaisa
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
            Subject to dual-executive clearance
          </div>
        </div>

        {/* CARD 4: TOTAL SALES ORDERS */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Order Volume
            </span>
            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full font-mono">
              {salesMetrics.orderCount} Orders
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-[#006b5f] dark:text-[#76f4e0] font-mono tracking-tight">
              Rs. {salesMetrics.totalSale.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Aggregated catalog value of new orders
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 flex justify-between">
            <span>AOV:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">Rs. {salesMetrics.avgOrderValue.toLocaleString()}</span>
          </div>
        </div>

      </div>

      {/* 5. Executive Graphical Analytical Blocks (GRID LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="dashboard-graphics-panel">
        
        {/* CHART 1: Sales vs Recovery Daily Chronological Trends (8 columns) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs flex flex-col h-[340px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#006b5f] dark:text-[#76f4e0]" />
                <span>Daily Sales vs Recovery Trend</span>
              </h3>
              <p className="text-[10px] text-slate-400">Chronological analysis over the last 7 calendar days</p>
            </div>
            <div className="flex gap-3 text-[10px] font-bold font-mono">
              <span className="flex items-center gap-1.5 text-[#006b5f]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#006b5f]" />
                <span>Orders</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>Recoveries</span>
              </span>
            </div>
          </div>

          <div className="flex-1 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTimelineData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006b5f" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#006b5f" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/50" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                {/* Dual Axis: Left Y-Axis for Sales Booking */}
                <YAxis
                  yAxisId="left"
                  stroke="#006b5f"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `Rs.${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                />
                {/* Dual Axis: Right Y-Axis for Recovery Collection */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `Rs.${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#76f4e0' }}
                  formatter={(value: any, name: any) => [`Rs. ${Number(value || 0).toLocaleString()}`, name === 'Sales' ? 'Sales Booked (PKR)' : 'Recovery Collected (PKR)']}
                />
                <Area yAxisId="left" type="monotone" dataKey="Sales" stroke="#006b5f" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" name="Sales" />
                <Area yAxisId="right" type="monotone" dataKey="Recovery" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#recGrad)" name="Recovery" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Cash vs Bank Collection Split (4 columns) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs flex flex-col h-[340px] justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
              Recovery Methods
            </h3>
            <p className="text-[10px] text-slate-400">Cash collection vs banking liquidity</p>
          </div>

          <div className="flex-1 flex justify-center items-center h-44 relative">
            {paymentModeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentModeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentModeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `Rs. ${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs text-center">No recovery transactions recorded</div>
            )}
            <div className="absolute text-center">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Total Ratio</span>
              <span className="text-sm font-black text-[#006b5f] dark:text-[#76f4e0] font-mono">
                {recoveryMetrics.cashPercent}% Cash
              </span>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Cash Collections:</span>
              </div>
              <span className="font-mono font-bold text-slate-800 dark:text-white">
                Rs. {recoveryMetrics.cashSum.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Bank Deposits:</span>
              </div>
              <span className="font-mono font-bold text-slate-800 dark:text-white">
                Rs. {recoveryMetrics.bankSum.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 6. Town/Beat performance ranking (2-column layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="beat-performance-panel">
        
        {/* Town Performance Table-Graph (7 columns) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs flex flex-col h-[350px]">
          <div className="mb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Town Beat Performance Ranking</span>
            </h3>
            <p className="text-[10px] text-slate-400">Distributor network orders &amp; recovery split by town beat</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 font-mono text-xs">
            {townPerformanceReport.map((t) => {
              const maxVal = Math.max(...townPerformanceReport.map((x) => x.sales), 100000);
              const salesPct = Math.max(5, Math.round((t.sales / maxVal) * 100));

              return (
                <div key={t.town} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {t.town} <span className="font-medium text-slate-400 text-[10px] font-sans">({t.dealers} dealers)</span>
                    </span>
                    <div className="space-x-2 text-[11px]">
                      <span className="text-[#006b5f] dark:text-[#76f4e0] font-bold">Rs. {t.sales.toLocaleString()}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-emerald-500 font-bold">Rec: Rs. {t.recovery.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-50 dark:bg-slate-850 h-2.5 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800 flex">
                    <div
                      className="bg-teal-600 dark:bg-[#76f4e0] h-full rounded-full"
                      style={{ width: `${salesPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Credit Risk Profile (5 columns) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs flex flex-col h-[350px] justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Credit Ageing &amp; Limit Utilization</span>
            </h3>
            <p className="text-[10px] text-slate-400">Risk check: Dealers approaching credit ceilings</p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto mt-3 pr-1">
            {creditRiskDealers.map((d) => (
              <div key={d.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1420] border border-slate-200/60 dark:border-slate-800/60 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-extrabold text-slate-800 dark:text-white truncate max-w-[150px]">{d.name}</span>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                    d.ratio >= 90 ? 'bg-rose-500/20 text-rose-400' : d.ratio >= 70 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {d.ratio}% Limit Used
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Balance: Rs. {d.balance.toLocaleString()}</span>
                  <span>Limit: Rs. {d.limit.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
            * Standard trade terms limit outstanding balances.
          </div>
        </div>

      </div>

    </div>
  );
};
