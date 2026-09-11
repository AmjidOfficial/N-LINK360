/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Field Officer Daily Summary Component
 * Aggregates today's total sales, recovery, and productive visits for the active field officer.
 */

import React from 'react';
import {
  TrendingUp,
  DollarSign,
  UserCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  Target,
  Percent,
} from 'lucide-react';
import { User } from '../types';

interface DailySummaryProps {
  currentUser: User;
  todaySales: number;
  todayOrdersCount: number;
  todayRecovery: number;
  todayRecoveriesCount: number;
  totalVisitsCount: number;
  productiveVisitsCount: number;
  productivityRate: number;
  activeTown?: string;
}

export const DailySummaryCard: React.FC<DailySummaryProps> = ({
  currentUser,
  todaySales,
  todayOrdersCount,
  todayRecovery,
  todayRecoveriesCount,
  totalVisitsCount,
  productiveVisitsCount,
  productivityRate,
  activeTown,
}) => {
  const todayFormatted = new Date().toLocaleDateString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div id="field-daily-summary" className="bg-gradient-to-br from-slate-900 via-slate-850 to-teal-950 text-white p-4 sm:p-5 rounded-3xl shadow-xl border border-teal-800/40 space-y-4">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-800/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-black shadow-md shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black tracking-tight text-white">Daily Field Summary</h2>
              <span className="text-[10px] font-extrabold uppercase bg-teal-900/80 text-teal-300 px-2 py-0.5 rounded-md border border-teal-700/60">
                Today's Live Pulse
              </span>
            </div>
            <p className="text-[11px] text-teal-200/80 font-medium flex items-center gap-1.5 mt-0.5">
              <UserCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Officer: <strong className="text-white">{currentUser.name || currentUser.email}</strong></span>
              {activeTown && (
                <>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">Town: {activeTown}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="font-mono font-bold text-white">{todayFormatted}</span>
        </div>
      </div>

      {/* 3 Core KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* 1. Today's Total Sales */}
        <div className="bg-slate-800/90 hover:bg-slate-800 p-3.5 rounded-2xl border border-teal-700/40 transition-all flex flex-col justify-between gap-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-teal-400" />
              <span>Total Sales</span>
            </span>
            <span className="text-[10px] font-extrabold bg-teal-950 text-teal-300 px-2 py-0.5 rounded-full border border-teal-800">
              {todayOrdersCount} {todayOrdersCount === 1 ? 'Order' : 'Orders'}
            </span>
          </div>

          <div>
            <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 tracking-tight">
              Rs. {todaySales.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              SKU order booking today
            </span>
          </div>
        </div>

        {/* 2. Today's Total Recovery */}
        <div className="bg-slate-800/90 hover:bg-slate-800 p-3.5 rounded-2xl border border-emerald-700/40 transition-all flex flex-col justify-between gap-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total Recovery</span>
            </span>
            <span className="text-[10px] font-extrabold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800">
              {todayRecoveriesCount} {todayRecoveriesCount === 1 ? 'Payment' : 'Payments'}
            </span>
          </div>

          <div>
            <div className="text-lg sm:text-xl font-black font-mono text-amber-300 tracking-tight">
              Rs. {todayRecovery.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              Reconciled field collection
            </span>
          </div>
        </div>

        {/* 3. Productive Visits & Rate */}
        <div className="bg-slate-800/90 hover:bg-slate-800 p-3.5 rounded-2xl border border-indigo-700/40 transition-all flex flex-col justify-between gap-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              <span>Productive Visits</span>
            </span>
            <span className="text-[10px] font-extrabold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">
              {productivityRate}% Rate
            </span>
          </div>

          <div>
            <div className="text-lg sm:text-xl font-black font-mono text-indigo-300 tracking-tight flex items-baseline gap-1.5">
              <span>{productiveVisitsCount}</span>
              <span className="text-xs text-slate-400 font-normal">/ {totalVisitsCount} Total Visits</span>
            </div>
            
            {/* Small progress bar */}
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full transition-all duration-500"
                style={{ width: `${Math.min(productivityRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Footer Field Note */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex-wrap gap-1">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-teal-400" />
          <span>Real-time authenticated telemetry data</span>
        </span>
        <span className="font-mono text-teal-300">
          Sync Status: <strong className="text-emerald-400">Connected</strong>
        </span>
      </div>
    </div>
  );
};
