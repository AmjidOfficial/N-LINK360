import React from 'react';
import { Receipt, FileText, ArrowRight } from 'lucide-react';
import { formatCurrencyPKR } from '../../../lib/dashboard';
import type { RecentTransactionRow } from '../../../lib/dashboard';

export interface RecentTransactionsProps {
  transactions: RecentTransactionRow[];
  onSelectCustomer?: (customerId: string) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onSelectCustomer,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-emerald-900/50 bg-white dark:bg-[#0E1A14] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-emerald-900/40">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Recent Verified Activity
          </h3>
          <p className="text-xs text-slate-500 dark:text-emerald-200/65 mt-0.5">
            Posted invoices & Accounts-confirmed recoveries in scope
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-emerald-300/75">
          {transactions.length} entries
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500 dark:text-emerald-200/65">
          No posted invoices or confirmed recoveries recorded yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-emerald-900/40">
          {transactions.map((tx) => {
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
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-[#13241C] text-slate-700 dark:text-emerald-200'
                    }`}
                  >
                    {isRecovery ? <Receipt className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {tx.partyName}
                    </div>
                    <div className="text-xs font-mono text-slate-500 dark:text-emerald-200/65 truncate">
                      {tx.reference} · {tx.date} · {tx.status}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`font-mono tabular-nums text-sm font-bold ${
                      isRecovery
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {isRecovery ? '+' : ''}
                    {formatCurrencyPKR(tx.amount)}
                  </div>
                  {tx.customerId && onSelectCustomer && (
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(tx.customerId!)}
                      aria-label={`Inspect ${tx.partyName}`}
                      className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-300 cursor-pointer"
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
