import React from 'react';
import { Receipt, FileText, ArrowRight } from 'lucide-react';
import { formatCurrencyPKR } from '../../../lib/dashboard';
import type { RecentTransactionRow } from '../../../lib/dashboard';
import { AnimatedOrderStatusBadge } from '../../ui/AnimatedOrderStatusBadge';

export interface RecentTransactionsProps {
  transactions: RecentTransactionRow[];
  onSelectCustomer?: (customerId: string) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onSelectCustomer,
}) => {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 bg-white dark:bg-[#1E293B] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/70">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">
            Recent Verified Activity
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Posted invoices &amp; Accounts-confirmed recoveries in scope
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          {transactions.length} entries
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No posted invoices or confirmed recoveries recorded yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {transactions.map((tx, idx) => {
            const isRecovery = tx.type === 'RECOVERY';
            return (
              <div
                key={`${tx.type}-${tx.id}`}
                className="py-3 flex items-center justify-between gap-3 min-h-[52px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isRecovery
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400'
                        : 'bg-orange-50 dark:bg-orange-950/50 text-[#EA580C] dark:text-orange-400'
                    }`}
                  >
                    {isRecovery ? <Receipt className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                      {tx.partyName}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                      {tx.reference} · {tx.date}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      className={`font-mono tabular-nums text-sm font-bold ${
                        isRecovery
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[#0F172A] dark:text-white'
                      }`}
                    >
                      {isRecovery ? `-${formatCurrencyPKR(tx.amount)} CR` : formatCurrencyPKR(tx.amount)}
                    </div>
                    <div className="mt-0.5 flex justify-end">
                      <AnimatedOrderStatusBadge status={tx.status} index={idx} />
                    </div>
                  </div>
                  {tx.customerId && onSelectCustomer && (
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(tx.customerId!)}
                      aria-label={`Inspect ${tx.partyName}`}
                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-[#16A34A] dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
