/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Executive Spotlight Card
 * Modeled after the "Doctor Available / Executive on Duty" card in the attached dashboard.jpeg.
 * Displays the current executive signing authority (Shahzad Ullah) with active schedule,
 * pending review counters, and direct 1-tap review CTA.
 */

import React from 'react';
import { NLinkUser } from '../../data/nlink-users-team';
import { ShieldCheck, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export interface ExecutiveSpotlightCardProps {
 currentUser?: NLinkUser | null;
 pendingOrdersCount: number;
 pendingRecoveriesCount: number;
 onOpenApprovals: () => void;
 className?: string;
}

export const ExecutiveSpotlightCard: React.FC<ExecutiveSpotlightCardProps> = ({
 currentUser,
 pendingOrdersCount,
 pendingRecoveriesCount,
 onOpenApprovals,
 className = '',
}) => {
 const isApprover = currentUser?.email?.toLowerCase().includes('shahzad');
 const approverName = isApprover ? currentUser?.fullName : 'Shahzad Ullah';
 const approverRole = 'Managing Director & Sole Executive Approver';
 const totalPending = pendingOrdersCount + pendingRecoveriesCount;

 return (
 <div
 className={`h-full rounded-2xl p-5 bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs flex flex-col justify-between ${className}`}
 >
 {/* Top Header */}
 <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100 dark:border-slate-700/70">
 <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
 <ShieldCheck className="w-4 h-4 text-[#3B82F6] dark:text-blue-400" />
 Executive Authority
 </span>
 <span className="text-[11px] font-semibold text-[#3B82F6] dark:text-blue-400">
 Active Signing Authority
 </span>
 </div>

 {/* Center Spotlight Avatar & Details */}
 <div className="flex items-center gap-4 py-3">
 <div className="shrink-0">
 <div className="w-11 h-11 rounded-xl bg-[#0F172A] dark:bg-[#0B1120] border border-slate-700 flex items-center justify-center font-bold text-sm text-white shadow-xs">
 SU
 </div>
 </div>

 <div className="min-w-0 flex-1">
 <h3 className="text-sm font-bold text-[#0F172A] dark:text-white truncate">
 {approverName}
 </h3>
 <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
 {approverRole}
 </p>
 <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
 <Clock className="w-3 h-3 text-[#3B82F6] dark:text-blue-400" />
 <span>09:00 AM – 07:00 PM PKT · Executive Desk</span>
 </div>
 </div>
 </div>

 {/* Bottom Queue Status & 1-Tap Action */}
 <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-2">
 <div className="text-xs">
 <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">Awaiting Sole Sign-off</span>
 <span className="tabular-nums font-bold text-[#0F172A] dark:text-white text-xs">
 {totalPending > 0 ? (
 <span className="text-[#F97316] dark:text-orange-400 tabular-nums">
 {pendingOrdersCount} Orders &bull; {pendingRecoveriesCount} Payments
 </span>
 ) : (
 <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
 <CheckCircle2 className="w-3.5 h-3.5" /> All Transactions Clear
 </span>
 )}
 </span>
 </div>

 <button
 type="button"
 onClick={onOpenApprovals}
 className={totalPending > 0 ? 'btn-primary min-h-[44px]' : 'btn-outline min-h-[44px]'}
 >
 <span>Review</span>
 <ArrowRight className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 );
};
