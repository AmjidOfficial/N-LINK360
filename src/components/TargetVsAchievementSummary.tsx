/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Target vs Achievement Summary Component
 * Displays real-time progress bars for Sales & Recovery metrics calculated from user monthly goals.
 */

import React, { useMemo } from 'react';
import { Target, TrendingUp, CheckCircle2, AlertCircle, Calendar, Zap, ArrowUpRight, Award, ShieldCheck, Clock } from 'lucide-react';
import { NLinkUser } from '../data/nlink-users-team';
import { SalesOrder, Recovery } from '../types';

export interface TargetVsAchievementSummaryProps {
  currentUser: NLinkUser;
  salesOrders?: SalesOrder[];
  recoveries?: Recovery[];
  className?: string;
  onViewDetails?: () => void;
}

export const TargetVsAchievementSummary: React.FC<TargetVsAchievementSummaryProps> = ({
  currentUser,
  salesOrders = [],
  recoveries = [],
  className = '',
  onViewDetails,
}) => {
  // 1. Determine Current Month Info & Workdays
  const { currentMonthName, daysPassed, totalDaysInMonth, daysRemaining } = useMemo(() => {
    const now = new Date();
    const currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = Math.max(1, totalDaysInMonth - daysPassed);
    return { currentMonthName, daysPassed, totalDaysInMonth, daysRemaining };
  }, []);

  // 2. Extract and Normalize Monthly Targets from User Profile
  const {
    salesTarget,
    recoveryTarget,
    salesAchieved,
    recoveryAchieved,
    salesPercent,
    recoveryPercent,
    salesRemaining,
    recoveryRemaining,
    dailyRequiredSales,
    dailyRequiredRecovery,
    salesPaceStatus,
    recoveryPaceStatus,
  } = useMemo(() => {
    // Sales Target
    const rawSalesTarget =
      currentUser.monthlySalesTarget && currentUser.monthlySalesTarget > 0
        ? currentUser.monthlySalesTarget
        : currentUser.monthlyTarget && currentUser.monthlyTarget > 0
        ? currentUser.monthlyTarget
        : 5000000;

    // Recovery Target (defaults to 80% of sales target if not explicitly set)
    const rawRecoveryTarget =
      currentUser.monthlyRecoveryTarget && currentUser.monthlyRecoveryTarget > 0
        ? currentUser.monthlyRecoveryTarget
        : Math.round(rawSalesTarget * 0.8);

    // Filter relevant orders and recoveries for the current month
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Calculate actual achieved amounts
    const isExecutive =
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'MANAGEMENT' ||
      currentUser.email?.includes('zain') ||
      currentUser.email?.includes('shahzad');

    // Scoped or global orders
    const relevantOrders = salesOrders.filter((o) => {
      const dateStr = o.orderDate || o.createdAt || '';
      const inCurrentMonth = dateStr.startsWith(currentYearMonth);
      if (!inCurrentMonth) return false;
      if (isExecutive) return true;
      return (
        o.salesOfficerId === currentUser.id ||
        o.salesRepId === currentUser.id ||
        o.salesOfficerName === currentUser.fullName
      );
    });

    // Scoped or global recoveries
    const relevantRecoveries = recoveries.filter((r) => {
      const dateStr = r.collectionDate || r.createdAt || '';
      const inCurrentMonth = dateStr.startsWith(currentYearMonth);
      if (!inCurrentMonth) return false;
      if (isExecutive) return true;
      return (
        r.collectorId === currentUser.id ||
        r.collectorName === currentUser.fullName ||
        r.salesOfficerId === currentUser.id
      );
    });

    const ordersSum = relevantOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const recoveriesSum = relevantRecoveries.reduce((sum, r) => sum + (r.amount || 0), 0);

    // Combine with MTD fields in profile if available as fallback baseline
    const salesAchieved = ordersSum > 0 ? ordersSum : currentUser.mtdSalesAchieved || 0;
    const recoveryAchieved = recoveriesSum > 0 ? recoveriesSum : currentUser.mtdRecoveryAchieved || 0;

    const salesPercent = rawSalesTarget > 0 ? Math.round((salesAchieved / rawSalesTarget) * 100) : 0;
    const recoveryPercent = rawRecoveryTarget > 0 ? Math.round((recoveryAchieved / rawRecoveryTarget) * 100) : 0;

    const salesRemaining = Math.max(0, rawSalesTarget - salesAchieved);
    const recoveryRemaining = Math.max(0, rawRecoveryTarget - recoveryAchieved);

    const dailyRequiredSales = Math.round(salesRemaining / daysRemaining);
    const dailyRequiredRecovery = Math.round(recoveryRemaining / daysRemaining);

    // Expected pace based on days passed
    const expectedPacePct = Math.min(100, Math.round((daysPassed / totalDaysInMonth) * 100));

    const getPaceBadge = (pct: number) => {
      const diff = pct - expectedPacePct;
      if (pct >= 100) {
        return {
          label: 'Target Achieved',
          bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          dot: 'bg-emerald-500',
        };
      }
      if (diff >= 5) {
        return {
          label: 'Ahead of Pace',
          bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200 dark:border-teal-800',
          dot: 'bg-teal-500',
        };
      }
      if (diff >= -10) {
        return {
          label: 'On Track',
          bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          dot: 'bg-blue-500',
        };
      }
      return {
        label: 'Needs Catch-up',
        bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
      };
    };

    return {
      salesTarget: rawSalesTarget,
      recoveryTarget: rawRecoveryTarget,
      salesAchieved,
      recoveryAchieved,
      salesPercent,
      recoveryPercent,
      salesRemaining,
      recoveryRemaining,
      dailyRequiredSales,
      dailyRequiredRecovery,
      salesPaceStatus: getPaceBadge(salesPercent),
      recoveryPaceStatus: getPaceBadge(recoveryPercent),
    };
  }, [currentUser, salesOrders, recoveries, daysPassed, totalDaysInMonth, daysRemaining]);

  return (
    <div
      id="target-vs-achievement-summary"
      className={`bg-white dark:bg-[#0c1420] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs p-5 transition-all ${className}`}
    >
      {/* Header with Title, Month, and Officer Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/60 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#006b5f] dark:text-[#76f4e0] flex items-center justify-center border border-teal-200/60 dark:border-teal-800/40 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Target vs Achievement
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                MTD
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{currentMonthName}</span>
              <span>•</span>
              <span>Day {daysPassed} of {totalDaysInMonth} ({daysRemaining} days left)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
            {currentUser.fullName}
          </span>
          {onViewDetails && (
            <button
              type="button"
              onClick={onViewDetails}
              className="text-[11px] font-bold text-[#006b5f] dark:text-[#76f4e0] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>View Report</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Dual Metric Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. SALES BOOKING PROGRESS CARD */}
        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between space-y-3.5">
          {/* Top Row: Metric Title & Pace Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#006b5f] dark:text-[#76f4e0]" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                FMCG Sales Booking
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${salesPaceStatus.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${salesPaceStatus.dot}`} />
              {salesPaceStatus.label}
            </span>
          </div>

          {/* Value Achieved vs Target */}
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                Rs. {salesAchieved.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Goal: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">Rs. {salesTarget.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-[#006b5f] dark:text-[#76f4e0] font-mono leading-none">
                {salesPercent}%
              </div>
              <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                Achieved
              </div>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="space-y-1.5">
            <div className="relative w-full h-3.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#006b5f] via-teal-500 to-[#76f4e0] rounded-full transition-all duration-700 shadow-sm relative"
                style={{ width: `${Math.min(100, Math.max(2, salesPercent))}%` }}
              >
                {salesPercent >= 15 && (
                  <div className="absolute right-1 top-0 bottom-0 flex items-center">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-90" />
                  </div>
                )}
              </div>
            </div>

            {/* Milestones / Tick Marks */}
            <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-slate-500 px-0.5">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">100% Target</span>
            </div>
          </div>

          {/* Footer Info: Remaining & Daily Run-rate */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <span>
                {salesRemaining > 0 ? (
                  <>Deficit: <strong className="font-mono text-slate-800 dark:text-slate-200">Rs. {salesRemaining.toLocaleString()}</strong></>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Target Completed</span>
                )}
              </span>
            </div>
            {salesRemaining > 0 && (
              <div className="font-mono font-medium text-slate-500 dark:text-slate-400">
                Run-rate: <strong className="text-slate-700 dark:text-slate-300">Rs. {dailyRequiredSales.toLocaleString()}</strong>/day
              </div>
            )}
          </div>
        </div>

        {/* 2. RECOVERY & COLLECTION PROGRESS CARD */}
        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between space-y-3.5">
          {/* Top Row: Metric Title & Pace Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Recovery & Collection
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${recoveryPaceStatus.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${recoveryPaceStatus.dot}`} />
              {recoveryPaceStatus.label}
            </span>
          </div>

          {/* Value Achieved vs Target */}
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                Rs. {recoveryAchieved.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Goal: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">Rs. {recoveryTarget.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono leading-none">
                {recoveryPercent}%
              </div>
              <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                Collected
              </div>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="space-y-1.5">
            <div className="relative w-full h-3.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-400 rounded-full transition-all duration-700 shadow-sm relative"
                style={{ width: `${Math.min(100, Math.max(2, recoveryPercent))}%` }}
              >
                {recoveryPercent >= 15 && (
                  <div className="absolute right-1 top-0 bottom-0 flex items-center">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-90" />
                  </div>
                )}
              </div>
            </div>

            {/* Milestones / Tick Marks */}
            <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-slate-500 px-0.5">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">100% Target</span>
            </div>
          </div>

          {/* Footer Info: Remaining & Daily Run-rate */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500 shrink-0" />
              <span>
                {recoveryRemaining > 0 ? (
                  <>Deficit: <strong className="font-mono text-slate-800 dark:text-slate-200">Rs. {recoveryRemaining.toLocaleString()}</strong></>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Target Completed</span>
                )}
              </span>
            </div>
            {recoveryRemaining > 0 && (
              <div className="font-mono font-medium text-slate-500 dark:text-slate-400">
                Run-rate: <strong className="text-slate-700 dark:text-slate-300">Rs. {dailyRequiredRecovery.toLocaleString()}</strong>/day
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
