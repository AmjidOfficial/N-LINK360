/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Customer Credit Health & Average Payment Delay Intelligence
 * Highlights customer credit health score, average payment delay in days,
 * agreed terms vs actual turnaround velocity, and risk mitigation recommendations.
 */

import React, { useState } from 'react';
import { Customer, Invoice, Recovery } from '../types';
import { calculateCustomerCreditHealth, CustomerCreditHealth } from '../lib/business-rules';
import { ShieldCheck, AlertTriangle, AlertCircle, Clock, Zap, ArrowRight, HelpCircle, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';

export interface CreditHealthIndicatorProps {
  customer?: Partial<Customer> | null;
  invoices?: Invoice[] | null;
  recoveries?: Recovery[] | null;
  variant?: 'full' | 'compact' | 'badge' | 'card';
  showSimulator?: boolean;
  onActionClick?: () => void;
  className?: string;
}

export const CreditHealthIndicator: React.FC<CreditHealthIndicatorProps> = ({
  customer,
  invoices,
  recoveries,
  variant = 'full',
  showSimulator = true,
  onActionClick,
  className = '',
}) => {
  const [isSimulatingRecovery, setIsSimulatingRecovery] = useState(false);
  const [simulatedRecoveryAmount, setSimulatedRecoveryAmount] = useState<number>(50000);

  // Compute base credit health
  const baseHealth = calculateCustomerCreditHealth(customer, invoices, recoveries);

  // If simulation active, recalculate with reduced balance
  const effectiveCustomer = isSimulatingRecovery && customer
    ? {
        ...customer,
        currentBalance: Math.max(0, (customer.currentBalance || 0) - simulatedRecoveryAmount),
      }
    : customer;

  const health = isSimulatingRecovery
    ? calculateCustomerCreditHealth(effectiveCustomer, invoices, recoveries)
    : baseHealth;

  const creditDays = Number(customer?.creditDays) || 30;

  // Badge Variant (Ultra-compact for list views and table headers)
  if (variant === 'badge') {
    const isPrompt = health.averagePaymentDelayDays <= 2;
    const isHighDelay = health.averagePaymentDelayDays > 14;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
          isPrompt
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            : isHighDelay
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse'
            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        } ${className}`}
        title={`Average Payment Delay: ${health.averagePaymentDelayDays} Days | Health Score: ${health.score}/100`}
      >
        <span className="material-symbols-outlined text-[14px]">
          {isPrompt ? 'verified_user' : isHighDelay ? 'warning' : 'schedule'}
        </span>
        <span className="font-mono">
          {health.averagePaymentDelayDays === 0
            ? '0d Delay (Prompt)'
            : `+${health.averagePaymentDelayDays}d Delay`}
        </span>
        <span className="text-[10px] opacity-80">({health.score}%)</span>
      </span>
    );
  }

  // Compact Variant (For dealer cards and summary headers)
  if (variant === 'compact') {
    return (
      <div
        className={`p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0 border ${
              health.tier === 'EXCELLENT'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                : health.tier === 'GOOD'
                ? 'bg-sky-500/10 text-sky-600 border-sky-500/30'
                : health.tier === 'MODERATE_RISK'
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
            }`}
          >
            {health.score}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Credit Health</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${health.badgeBg}`}>
                {health.tierLabel}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xs text-slate-600 dark:text-slate-400">Avg. Payment Delay:</span>
              <span
                className={`text-sm font-black font-mono ${
                  health.averagePaymentDelayDays <= 3
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : health.averagePaymentDelayDays <= 10
                    ? 'text-sky-600 dark:text-sky-400'
                    : health.averagePaymentDelayDays <= 20
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {health.averagePaymentDelayDays === 0
                  ? '0 Days (On-Time)'
                  : `+${health.averagePaymentDelayDays} Days`}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] text-slate-400 block">Terms vs Velocity</span>
          <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
            {creditDays}d <span className="text-slate-400">→</span> {health.avgPaymentTurnaroundDays}d
          </span>
        </div>
      </div>
    );
  }

  // Full / Card Variant: Comprehensive Credit Health Cockpit Section
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-4 transition-all ${className}`}
      id="customer-credit-health-indicator"
    >
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
              health.tier === 'EXCELLENT'
                ? 'bg-emerald-600'
                : health.tier === 'GOOD'
                ? 'bg-sky-600'
                : health.tier === 'MODERATE_RISK'
                ? 'bg-amber-600'
                : 'bg-rose-600'
            }`}
          >
            {health.tier === 'EXCELLENT' ? (
              <ShieldCheck className="w-5 h-5" />
            ) : health.tier === 'GOOD' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : health.tier === 'MODERATE_RISK' ? (
              <Clock className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Credit Health &amp; Payment Discipline
              </h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${health.badgeBg}`}>
                {health.tierLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Automated invoice aging &amp; payment turnaround velocity analysis
            </p>
          </div>
        </div>

        {/* Health Score Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="text-right">
            <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Health Score</span>
            <span className="font-mono text-sm font-black text-slate-900 dark:text-white">{health.score} / 100</span>
          </div>
          <div className="w-8 h-8 relative flex items-center justify-center">
            <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200 dark:text-slate-700"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={
                  health.tier === 'EXCELLENT'
                    ? 'text-emerald-500'
                    : health.tier === 'GOOD'
                    ? 'text-sky-500'
                    : health.tier === 'MODERATE_RISK'
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }
                strokeDasharray={`${health.score}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[9px] font-bold text-slate-700 dark:text-slate-300 font-mono">
              {health.score}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Primary Highlighted Metric: Average Payment Delay Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Core Metric Card 1: Average Payment Delay */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-800/60 dark:to-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Average Payment Delay
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                health.averagePaymentDelayDays <= 3
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : health.averagePaymentDelayDays <= 10
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                  : health.averagePaymentDelayDays <= 20
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              {health.averagePaymentDelayDays <= 3
                ? 'Prompt Settlement'
                : health.averagePaymentDelayDays <= 10
                ? 'Minor Lag'
                : health.averagePaymentDelayDays <= 20
                ? 'Delayed'
                : 'Severe Lag'}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                  health.averagePaymentDelayDays <= 3
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : health.averagePaymentDelayDays <= 10
                    ? 'text-sky-600 dark:text-sky-400'
                    : health.averagePaymentDelayDays <= 20
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {health.averagePaymentDelayDays === 0
                  ? '0 Days'
                  : `+${health.averagePaymentDelayDays} Days`}
              </span>
              <span className="text-xs text-slate-500 font-medium">past agreed term</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Agreed Credit: <strong className="text-slate-800 dark:text-slate-200">{creditDays} Days</strong> • Avg Clearance: <strong className="text-slate-800 dark:text-slate-200">{health.avgPaymentTurnaroundDays} Days</strong>
            </p>
          </div>

          {/* Delay Range Gauge Bar */}
          <div className="space-y-1 mt-1">
            <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
              <span>On-Time</span>
              <span>7d</span>
              <span>15d</span>
              <span>30d+</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: '25%' }} title="0-7 Days (Prompt)" />
              <div className="h-full bg-sky-500" style={{ width: '25%' }} title="8-14 Days (Acceptable)" />
              <div className="h-full bg-amber-500" style={{ width: '25%' }} title="15-29 Days (Watchlist)" />
              <div className="h-full bg-rose-500" style={{ width: '25%' }} title="30+ Days (High Risk)" />
            </div>
          </div>
        </div>

        {/* Core Metric Card 2: On-Time Settlement Ratio & Longest Delay */}
        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            Settlement Reliability
          </span>

          <div className="my-2 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">On-Time Clearance Rate</span>
              <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                {health.onTimePaymentPercentage}%
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  health.onTimePaymentPercentage >= 80
                    ? 'bg-emerald-500'
                    : health.onTimePaymentPercentage >= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${health.onTimePaymentPercentage}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Longest Delay</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {health.longestDelayDays} Days
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Delinquent Exp.</span>
                <span className={`font-mono font-bold ${health.delinquentAmount > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                  Rs. {health.delinquentAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Core Metric Card 3: Velocity Comparison Matrix */}
        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            Credit Terms vs Actual
          </span>

          <div className="my-2 space-y-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-600 dark:text-slate-400">Approved Credit Term:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{creditDays} Days</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-600 dark:text-slate-400">Actual Turnaround:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {health.avgPaymentTurnaroundDays} Days
              </span>
            </div>

            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-[10px] text-slate-400">Net Turnaround Variance:</span>
              <span
                className={`font-mono font-bold text-xs ${
                  health.averagePaymentDelayDays <= 3
                    ? 'text-emerald-600'
                    : health.averagePaymentDelayDays <= 10
                    ? 'text-sky-600'
                    : 'text-amber-600'
                }`}
              >
                {health.averagePaymentDelayDays <= 0 ? '✓ On-Schedule' : `+${health.averagePaymentDelayDays} Days Lag`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Actionable AI Credit Recommendation Banner */}
      <div
        className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
          health.tier === 'EXCELLENT'
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
            : health.tier === 'GOOD'
            ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/80 text-sky-900 dark:text-sky-200'
            : health.tier === 'MODERATE_RISK'
            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
            : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
        }`}
      >
        <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">
          {health.tier === 'EXCELLENT'
            ? 'verified'
            : health.tier === 'GOOD'
            ? 'info'
            : health.tier === 'MODERATE_RISK'
            ? 'schedule'
            : 'gpp_maybe'}
        </span>
        <div className="flex-1 text-xs">
          <div className="font-bold flex items-center gap-1.5">
            <span>Credit Policy Directive &amp; Action Recommendation</span>
          </div>
          <p className="mt-0.5 leading-relaxed text-[11px] opacity-95">
            {health.recommendation}
          </p>
        </div>
      </div>

      {/* 4. Interactive Recovery Simulation Toggle */}
      {showSimulator && customer && (
        <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Payment Velocity Simulator:
            </span>
            <span className="text-[11px] text-slate-500">
              Simulate recovery to preview credit health upgrade
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsSimulatingRecovery(!isSimulatingRecovery)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                isSimulatingRecovery
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{isSimulatingRecovery ? 'Simulation Active' : 'Simulate Recovery (Rs. 50k)'}</span>
              {isSimulatingRecovery && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
