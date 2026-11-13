/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Today's Sales Audit & Net TP Revision UI Modal
 * Enforces company policy: All Sales Entries must be billed & posted at Net TP (15% Less).
 * Auto-recalculates any Full TP sales entries to Net TP and synchronizes customer ledger debits.
 */

import React, { useState, useMemo } from 'react';
import { Customer, LedgerEntry, SalesOrder } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import {
  auditAndReviseTodaySalesEntries,
  SalesAuditSummary,
} from '../../utils/salesAuditEngine';
import {
  X,
  CheckCircle2,
  RefreshCw,
  FileCheck2,
  ArrowRight,
  TrendingDown,
  Building2,
  ShieldCheck,
} from 'lucide-react';

export interface TodaySalesAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: SalesOrder[];
  ledgerEntries: LedgerEntry[];
  customers: Customer[];
  onApplyAuditResult: (
    updatedOrders: SalesOrder[],
    updatedLedgerEntries: LedgerEntry[],
    updatedCustomers: Customer[]
  ) => void;
}

export const TodaySalesAuditModal: React.FC<TodaySalesAuditModalProps> = ({
  isOpen,
  onClose,
  orders = [],
  ledgerEntries = [],
  customers = [],
  onApplyAuditResult,
}) => {
  const [filterTodayOnly, setFilterTodayOnly] = useState<boolean>(false);

  // Compute live audit summary
  const auditSummary: SalesAuditSummary = useMemo(() => {
    return auditAndReviseTodaySalesEntries(orders, ledgerEntries, customers, filterTodayOnly);
  }, [orders, ledgerEntries, customers, filterTodayOnly]);

  if (!isOpen) return null;

  const handleConfirmAndApply = () => {
    triggerHaptic('success');
    onApplyAuditResult(
      auditSummary.updatedOrders,
      auditSummary.updatedLedgerEntries,
      auditSummary.updatedCustomers
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-4xl max-h-[92vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Sales Entry Audit Engine
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800 font-mono">
                  Net TP @ 15% Less
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold">
                Today&apos;s Sales Entry Rate Verification
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audit Mode Selector & KPI Cards */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterTodayOnly(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  !filterTodayOnly
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                All Accounts Audit
              </button>
              <button
                type="button"
                onClick={() => setFilterTodayOnly(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterTodayOnly
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Today&apos;s Entries Only
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Last Verified: {new Date(auditSummary.auditTimestamp).toLocaleTimeString()}
            </div>
          </div>

          {/* KPI Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <span className="text-xs text-slate-500 block font-medium">Total Audited Sales</span>
              <span className="font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white">
                {auditSummary.totalAudited} <span className="text-xs text-slate-400 font-sans">Entries</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs">
              <span className="text-xs text-amber-700 dark:text-amber-400 block font-medium">Revised from Full TP</span>
              <span className="font-mono tabular-nums text-xl font-bold text-amber-700 dark:text-amber-300">
                {auditSummary.totalRevised} <span className="text-xs font-sans">Updated</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-medium">15% Discount Savings Applied</span>
              <span className="font-mono tabular-nums text-xl font-bold text-emerald-700 dark:text-emerald-300">
                Rs. {auditSummary.totalDiscountApplied.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Audit Breakdown Log ({auditSummary.auditLogs.length} Entries)
            </h3>
            {auditSummary.totalRevised > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                {auditSummary.totalRevised} sales entry rate(s) revised to Net TP
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Customer Account</th>
                    <th className="p-3">Order Ref</th>
                    <th className="p-3 text-right">Gross Amount</th>
                    <th className="p-3 text-right">Net TP (15% Less)</th>
                    <th className="p-3 text-right">15% Discount</th>
                    <th className="p-3 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {auditSummary.auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No sales entries found for the selected scope.
                      </td>
                    </tr>
                  ) : (
                    auditSummary.auditLogs.map((log) => (
                      <tr
                        key={log.orderId}
                        className={
                          log.status === 'REVISED_TO_NET_TP'
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }
                      >
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{log.customerName}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                          {log.orderNumber}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-slate-500">
                          Rs. {log.originalGrossAmount.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          Rs. {log.revisedNetAmount.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                          {log.discountAmount > 0 ? `-Rs. ${log.discountAmount.toLocaleString()}` : '0'}
                        </td>
                        <td className="p-3 text-center">
                          {log.status === 'REVISED_TO_NET_TP' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              REVISED TO NET TP
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              NET TP COMPLIANT
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            {auditSummary.totalRevised > 0
              ? `Click below to update ${auditSummary.totalRevised} order(s) and synchronise customer ledgers.`
              : 'All audited sales entries are 100% compliant with Net TP rate policy.'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleConfirmAndApply}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Synchronise Net TP Rates &amp; Ledgers</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
