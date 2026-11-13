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
 className={`rounded-lg p-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between ${className}`}
 >
 {/* Top Header */}
 <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200 dark:border-slate-800">
 <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
 <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
 Executive Authority
 </span>
 <span className="text-[11px] font-semibold text-[#0D9488]">
 Active Signing Authority
 </span>
 </div>

 {/* Center Spotlight Avatar & Details */}
 <div className="flex items-center gap-4 py-3">
 <div className="relative shrink-0">
 <div className="w-11 h-11 rounded-xl bg-[#0B132B] flex items-center justify-center font-bold text-sm text-white shadow-xs">
 SU
 </div>
 <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
 </div>

 <div className="min-w-0 flex-1">
 <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
 {approverName}
 </h3>
 <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
 {approverRole}
 </p>
 <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
 <Clock className="w-3 h-3 text-[#0D9488]" />
 <span>09:00 AM – 07:00 PM PKT · Executive Desk</span>
 </div>
 </div>
 </div>

 {/* Bottom Queue Status & 1-Tap Action */}
 <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
 <div className="text-xs">
 <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">Awaiting Sole Sign-off</span>
 <span className=" tabular-nums font-bold text-slate-900 dark:text-white text-xs">
 {totalPending > 0 ? (
 <span className="text-amber-600 dark:text-amber-400 tabular-nums">
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
 className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer shrink-0"
 >
 <span>Review</span>
 <ArrowRight className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 );
};
