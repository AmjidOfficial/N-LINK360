/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Official Customer Statement & Ledger Print Studio
 * Generates official statement of account with running balance ledger and FBR compliance.
 */

import React from 'react';
import {
  Printer,
  Download,
  X,
  FileSpreadsheet,
  Building,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Customer, LedgerEntry } from '../types';
import { exportCustomerLedgerToCsv } from '../services/exportEngine';

interface PrintLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  ledgerEntries: LedgerEntry[];
}

export const PrintLedgerModal: React.FC<PrintLedgerModalProps> = ({
  isOpen,
  onClose,
  customer,
  ledgerEntries,
}) => {
  if (!isOpen || !customer) return null;

  const totalDebits = ledgerEntries.reduce((sum, e) => sum + (e.debitAmount || 0), 0);
  const totalCredits = ledgerEntries.reduce((sum, e) => sum + (e.creditAmount || 0), 0);
  const latestBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].runningBalance : customer.openingBalance;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-card/70 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 my-auto">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-surface-card px-4 sm:px-6 py-3 text-white" data-no-print>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/80 font-black text-deep-green">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Customer Statement of Account</div>
              <div className="text-[11px] text-slate-400">Official Financial Running Ledger</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCustomerLedgerToCsv(customer, ledgerEntries)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-deep-teal" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-1.5 text-xs font-bold text-deep-green hover:bg-secondary/80 shadow-md"
            >
              <Printer className="h-4 w-4" />
              <span>Print Statement</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-4 sm:p-8 bg-slate-100 overflow-y-auto max-h-[82vh]">
          <div className="mx-auto w-full max-w-[210mm] bg-white p-6 sm:p-10 shadow-lg border border-slate-200 text-text-primary font-sans print-area print:shadow-none print:border-none print:p-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/80 font-black text-2xl text-deep-green border border-slate-900">
                  NL
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-deep-green uppercase">National Lights (Pvt) Ltd.</h1>
                  <p className="text-[11px] text-slate-600 font-medium">Head Office: 18-Brandreth Road, Lahore | UAN: 042-111-654</p>
                  <p className="text-[10px] text-slate-500">NTN: 2894102-7 | STRN: 03-00-2894-102-7</p>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block rounded-md bg-surface-card px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                  STATEMENT OF ACCOUNT
                </div>
                <div className="mt-1 text-[11px] font-medium text-slate-600">
                  Generated: {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 py-4 text-xs">
              <div className="space-y-1 bg-bg-secondary p-3 rounded-lg border border-slate-200/70">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">CUSTOMER DETAILS</div>
                <div className="font-bold text-sm text-deep-green">{customer.companyName}</div>
                <div className="text-slate-600">Code: <span className="font-mono font-bold text-text-primary">{customer.customerCode}</span></div>
                <div className="text-slate-600">Contact Person: {customer.contactPerson} ({customer.phone})</div>
                <div className="text-slate-600">{customer.address}, {customer.city}</div>
              </div>

              <div className="space-y-1 bg-bg-secondary p-3 rounded-lg border border-slate-200/70 text-right">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">ACCOUNT STATUS</div>
                <div className="text-slate-600">Credit Limit: <span className="font-bold font-mono">PKR {(customer?.creditLimit || 0).toLocaleString()}</span></div>
                <div className="text-slate-600">Payment Terms: <span className="font-bold">{customer?.creditDays || 30} Days</span></div>
                <div className="text-slate-600">Opening Balance: <span className="font-bold font-mono">PKR {(customer?.openingBalance || 0).toLocaleString()}</span></div>
                <div className="text-deep-green text-sm font-black mt-1">
                  Closing Balance: <span className="font-mono text-amber-700">PKR {latestBalance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="py-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 bg-slate-100 text-text-primary font-bold text-[11px]">
                    <th className="py-2 px-2.5 w-24">Date</th>
                    <th className="py-2 px-2.5 w-28">Type</th>
                    <th className="py-2 px-2.5 w-28">Reference #</th>
                    <th className="py-2 px-2.5">Transaction Particulars</th>
                    <th className="py-2 px-2.5 w-28 text-right">Debit (PKR)</th>
                    <th className="py-2 px-2.5 w-28 text-right">Credit (PKR)</th>
                    <th className="py-2 px-2.5 w-32 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No transactions recorded in this statement period.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((e, idx) => (
                      <tr key={e.id || idx} className="hover:bg-bg-secondary/50">
                        <td className="py-2 px-2.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {e.entryDate || e.createdAt?.slice(0, 10)}
                        </td>
                        <td className="py-2 px-2.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                            {e.entryType}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-800">{e.referenceNumber}</td>
                        <td className="py-2 px-2.5 text-slate-700">{e.description}</td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-rose-700">
                          {e.debitAmount ? e.debitAmount.toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700">
                          {e.creditAmount ? e.creditAmount.toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-black text-deep-green">
                          {e.runningBalance.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="grid grid-cols-2 gap-4 border-t-2 border-slate-900 pt-4 text-xs">
              <div className="text-[10px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">LEDGER VERIFICATION NOTE:</p>
                <p>Formula: Opening Balance + Invoices + Debits - Recoveries - Credits = Closing Balance.</p>
                <p>Kindly report any discrepancy in billing or receipt allocation within 7 business days.</p>
              </div>

              <div className="space-y-1 bg-bg-secondary p-3 rounded-lg border border-slate-200 text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Total Invoices / Debits:</span>
                  <span className="font-mono font-bold text-rose-700">PKR {totalDebits.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Recoveries / Credits:</span>
                  <span className="font-mono font-bold text-emerald-700">PKR {totalCredits.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-deep-green border-t border-slate-300 pt-1">
                  <span>NET OUTSTANDING BALANCE:</span>
                  <span className="font-mono text-amber-900">PKR {latestBalance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-16 text-center text-xs border-t border-slate-200 mt-8">
              <div className="space-y-1">
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">Accounts Department</div>
                <div className="text-[10px] text-slate-400">National Lights (Pvt) Ltd.</div>
              </div>
              <div className="space-y-1">
                <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">Customer Acknowledgment</div>
                <div className="text-[10px] text-slate-400">Authorized Signature & Stamp</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
