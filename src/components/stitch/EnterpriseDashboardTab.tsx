/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Field Intelligence: Dashboard Tab
 * Pixel-perfect implementation based on Stitch Design System & Specifications
 */

import React from 'react';
import { NLinkUser } from '../../data/nlink-users-team';
import { Customer, SalesOrder, Recovery } from '../../types';

export interface EnterpriseDashboardTabProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  onNavigateTab: (tab: 'DASHBOARD' | 'ATTENDANCE' | 'ORDERS' | 'LEDGERS' | 'DEALERS') => void;
  onOpenAddDealer: () => void;
  onOpenRateCard: () => void;
  onOpenPDFReport?: () => void;
  isCheckedIn: boolean;
  onToggleCheckIn: () => void;
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
  isCheckedIn,
  onToggleCheckIn,
}) => {
  // Calculate dynamic summary stats
  const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalRecovery = recoveries.reduce((sum, r) => sum + (r.amount || 0), 0);

  const targetSales = 60000;
  const targetRecovery = 35000;
  const salesProgress = Math.min(100, Math.round((45000 + (totalSales > 0 ? totalSales * 0.1 : 0)) / targetSales * 100));
  const recoveryProgress = Math.min(100, Math.round((28000 + (totalRecovery > 0 ? totalRecovery * 0.1 : 0)) / targetRecovery * 100));

  return (
    <div className="flex flex-col w-full gap-5 pb-12 animate-fadeIn" id="enterprise-dashboard-view">
      {/* 1. Welcome Banner & Live Status Card */}
      <div className="flex items-center justify-between bg-[#0f2942] p-4 sm:p-5 rounded-2xl text-white shadow-md border border-[#1a3b5c]/50 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#006b5f]/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col z-10">
          <span className="text-[11px] font-semibold tracking-wider text-[#7991af] uppercase">
            Field Agent Portal
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
            {currentUser.fullName || 'Alex Mercer'}
          </h2>
          <div className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-[#76f4e0] animate-pulse' : 'bg-slate-400'}`} />
            <span>Route: {currentUser.territory || 'Downtown Commercial (Territory #4)'}</span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="text-emerald-400 font-mono text-[11px]">ID: {currentUser.id || 'DSF-310'}</span>
          </div>
        </div>

        <button
          onClick={onToggleCheckIn}
          className={`p-2.5 sm:px-3.5 sm:py-2 rounded-xl flex flex-col items-center justify-center border transition-all active:scale-95 z-10 ${
            isCheckedIn
              ? 'bg-[#001428] border-emerald-500/40 text-[#76f4e0]'
              : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:bg-slate-800'
          }`}
          title={isCheckedIn ? 'Tap to view Attendance' : 'Tap to Clock In'}
        >
          <span className="material-symbols-outlined text-[24px]">
            {isCheckedIn ? 'verified' : 'login'}
          </span>
          <span className="text-[11px] font-semibold mt-0.5 whitespace-nowrap">
            {isCheckedIn ? 'Clocked In' : 'Clock In'}
          </span>
        </button>
      </div>

      {/* 2. Monthly Targets vs Achievement Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#191c1e] dark:text-white tracking-tight">Monthly Targets</h3>
          <span className="text-xs font-semibold text-[#006b5f] dark:text-[#76f4e0] bg-[#76f4e0]/25 dark:bg-[#76f4e0]/15 px-2.5 py-0.5 rounded-full">
            12 Days Left
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Primary Sales Target Card */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex flex-col gap-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex justify-between items-baseline">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#001428]/5 dark:bg-[#76f4e0]/10 flex items-center justify-center text-[#001428] dark:text-[#76f4e0]">
                  <span className="material-symbols-outlined text-[18px]">trending_up</span>
                </div>
                <span className="text-sm font-semibold text-[#191c1e] dark:text-white">Primary Sales</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-[#191c1e] dark:text-white font-mono">Rs. 45.0 Lacs</span>
                <span className="text-xs text-[#43474d] dark:text-slate-400 font-mono"> / 60 Lacs</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-[#eceef0] dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-[#001428] dark:bg-[#76f4e0] h-full rounded-full transition-all duration-1000"
                style={{ width: `${salesProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-[#43474d] dark:text-slate-400">
              <span className="font-semibold text-[#001428] dark:text-[#76f4e0]">{salesProgress}% Achieved</span>
              <span className="text-[#006b5f] dark:text-[#76f4e0] font-semibold font-mono">Rs. 15.0 Lacs to goal</span>
            </div>
          </div>

          {/* Payment Recovery Target Card */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex flex-col gap-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex justify-between items-baseline">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#006b5f]/10 dark:bg-[#76f4e0]/10 flex items-center justify-center text-[#006b5f] dark:text-[#76f4e0]">
                  <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                </div>
                <span className="text-sm font-semibold text-[#191c1e] dark:text-white">Payment Recovery</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-[#191c1e] dark:text-white font-mono">Rs. 28.0 Lacs</span>
                <span className="text-xs text-[#43474d] dark:text-slate-400 font-mono"> / 35 Lacs</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-[#eceef0] dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-[#006b5f] dark:bg-[#76f4e0] h-full rounded-full transition-all duration-1000"
                style={{ width: `${recoveryProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-[#43474d] dark:text-slate-400">
              <span className="font-semibold text-[#006b5f] dark:text-[#76f4e0]">{recoveryProgress}% Achieved</span>
              <span className="text-[#006b5f] dark:text-[#76f4e0] font-semibold font-mono">Rs. 7.0 Lacs to goal</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Grid (2x2) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg font-bold text-[#191c1e] dark:text-white tracking-tight">Quick Actions</h3>
          <div className="flex items-center gap-2">
            {onOpenPDFReport && (
              <button
                onClick={onOpenPDFReport}
                className="text-xs font-bold text-white bg-[#001428] dark:bg-slate-800 hover:bg-[#002850] dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition-all border border-[#76f4e0]/30"
              >
                <span className="material-symbols-outlined text-[16px] text-[#76f4e0]">picture_as_pdf</span>
                <span>Generate PDF Report</span>
              </button>
            )}
            <button 
              onClick={onOpenRateCard} 
              className="text-xs font-semibold text-[#006b5f] dark:text-[#76f4e0] flex items-center gap-1 hover:underline bg-[#76f4e0]/20 dark:bg-[#76f4e0]/10 px-2.5 py-1.5 rounded-xl"
            >
              <span className="material-symbols-outlined text-[16px]">price_change</span>
              <span>Rate List</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Action 1: Mark Attendance */}
          <button
            onClick={() => onNavigateTab('ATTENDANCE')}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex flex-col items-center text-center gap-2 hover:bg-[#f2f4f6] dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all active:scale-95 group min-touch-target"
          >
            <div className="w-12 h-12 rounded-xl bg-[#76f4e0]/30 dark:bg-[#76f4e0]/20 flex items-center justify-center text-[#006b5f] dark:text-[#76f4e0] group-hover:bg-[#006b5f] group-hover:text-white transition-all shadow-xs">
              <span className="material-symbols-outlined text-[24px]">event_available</span>
            </div>
            <div>
              <span className="text-sm font-bold text-[#191c1e] dark:text-white block">Attendance</span>
              <span className="text-[11px] text-[#43474d] dark:text-slate-400">Check-In / Out</span>
            </div>
          </button>

          {/* Action 2: Add Dealer */}
          <button
            onClick={onOpenAddDealer}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex flex-col items-center text-center gap-2 hover:bg-[#f2f4f6] dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all active:scale-95 group min-touch-target"
          >
            <div className="w-12 h-12 rounded-xl bg-[#d1e4ff] dark:bg-blue-900/40 flex items-center justify-center text-[#011d35] dark:text-blue-200 group-hover:bg-[#001428] group-hover:text-white transition-all shadow-xs">
              <span className="material-symbols-outlined text-[24px]">storefront</span>
            </div>
            <div>
              <span className="text-sm font-bold text-[#191c1e] dark:text-white block">Add Dealer</span>
              <span className="text-[11px] text-[#43474d] dark:text-slate-400">Onboard new shop</span>
            </div>
          </button>

          {/* Action 3: New Order */}
          <button
            onClick={() => onNavigateTab('ORDERS')}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex flex-col items-center text-center gap-2 hover:bg-[#f2f4f6] dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all active:scale-95 group min-touch-target"
          >
            <div className="w-12 h-12 rounded-xl bg-[#76f4e0]/30 dark:bg-[#76f4e0]/20 flex items-center justify-center text-[#006b5f] dark:text-[#76f4e0] group-hover:bg-[#006b5f] group-hover:text-white transition-all shadow-xs">
              <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
            </div>
            <div>
              <span className="text-sm font-bold text-[#191c1e] dark:text-white block">New Order</span>
              <span className="text-[11px] text-[#43474d] dark:text-slate-400">Book products</span>
            </div>
          </button>

          {/* Action 4: Recovery Entry */}
          <button
            onClick={() => onNavigateTab('LEDGERS')}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex flex-col items-center text-center gap-2 hover:bg-[#f2f4f6] dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all active:scale-95 group min-touch-target"
          >
            <div className="w-12 h-12 rounded-xl bg-[#d1e4ff] dark:bg-blue-900/40 flex items-center justify-center text-[#011d35] dark:text-blue-200 group-hover:bg-[#001428] group-hover:text-white transition-all shadow-xs">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
            <div>
              <span className="text-sm font-bold text-[#191c1e] dark:text-white block">Recovery</span>
              <span className="text-[11px] text-[#43474d] dark:text-slate-400">Log collection</span>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Today's Summary Stats */}
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-bold text-[#191c1e] dark:text-white tracking-tight">Today&apos;s Summary</h3>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex flex-col items-center text-center">
            <span className="text-xl sm:text-2xl font-bold text-[#001428] dark:text-[#76f4e0]">7</span>
            <span className="text-[11px] sm:text-xs text-[#43474d] dark:text-slate-400 font-medium mt-1">Visits Made</span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex flex-col items-center text-center">
            <span className="text-xl sm:text-2xl font-bold text-[#006b5f] dark:text-[#76f4e0] font-mono">Rs. 3.45 Lacs</span>
            <span className="text-[11px] sm:text-xs text-[#43474d] dark:text-slate-400 font-medium mt-1">Sales Booked</span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex flex-col items-center text-center">
            <span className="text-xl sm:text-2xl font-bold text-[#191c1e] dark:text-white font-mono">4.2 hrs</span>
            <span className="text-[11px] sm:text-xs text-[#43474d] dark:text-slate-400 font-medium mt-1">Field Time</span>
          </div>
        </div>
      </div>

      {/* 5. Recent Visits List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#191c1e] dark:text-white tracking-tight">Recent Visits</h3>
          <button
            onClick={() => onNavigateTab('DEALERS')}
            className="text-xs font-semibold text-[#006b5f] dark:text-[#76f4e0] hover:underline"
          >
            View All ({customers.length})
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Visit Item 1 */}
          <div 
            onClick={() => onNavigateTab('DEALERS')}
            className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer min-touch-target"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#76f4e0]/30 dark:bg-[#76f4e0]/20 flex items-center justify-center text-[#006b5f] dark:text-[#76f4e0] font-bold text-xs shrink-0">
                AP
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[#191c1e] dark:text-white truncate">Apex Electronics</span>
                <span className="text-xs text-[#43474d] dark:text-slate-400 truncate font-mono">Order Booked • Rs. 125,000</span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 ml-2">
              <span className="text-[11px] text-[#74777e] dark:text-slate-400">10:45 AM</span>
              <span className="text-[10px] bg-[#76f4e0]/30 text-[#006f63] dark:text-[#76f4e0] px-2 py-0.5 rounded-full mt-1 font-bold">
                Completed
              </span>
            </div>
          </div>

          {/* Visit Item 2 */}
          <div 
            onClick={() => onNavigateTab('DEALERS')}
            className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer min-touch-target"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#d1e4ff] dark:bg-blue-900/40 flex items-center justify-center text-[#011d35] dark:text-blue-200 font-bold text-xs shrink-0">
                MS
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[#191c1e] dark:text-white truncate">Metro Superstore</span>
                <span className="text-xs text-[#43474d] dark:text-slate-400 truncate font-mono">Payment Collected • Rs. 80,000</span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 ml-2">
              <span className="text-[11px] text-[#74777e] dark:text-slate-400">09:30 AM</span>
              <span className="text-[10px] bg-[#76f4e0]/30 text-[#006f63] dark:text-[#76f4e0] px-2 py-0.5 rounded-full mt-1 font-bold">
                Completed
              </span>
            </div>
          </div>

          {/* Visit Item 3 */}
          <div 
            onClick={() => onNavigateTab('DEALERS')}
            className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer min-touch-target"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#eceef0] dark:bg-slate-800 flex items-center justify-center text-[#43474d] dark:text-slate-300 font-bold text-xs shrink-0">
                GT
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[#191c1e] dark:text-white truncate">GreenTech Hub</span>
                <span className="text-xs text-[#43474d] dark:text-slate-400 truncate">Follow-up / In-Store Inquiry</span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 ml-2">
              <span className="text-[11px] text-[#74777e] dark:text-slate-400">08:15 AM</span>
              <span className="text-[10px] bg-[#eceef0] dark:bg-slate-800 text-[#43474d] dark:text-slate-300 px-2 py-0.5 rounded-full mt-1 font-bold">
                Scheduled
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
