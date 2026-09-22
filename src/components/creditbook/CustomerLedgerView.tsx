/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Customer Ledger (Khata Account Statement) View
 * Passbook ledger showing:
 * - Opening Balance
 * - Chronological Invoices (Debits) & Recoveries (Credits)
 * - Running Balance after each transaction
 * - Download Official Ledger PDF Statement
 * - WhatsApp statement summary
 */

import React, { useState, useMemo } from 'react';
import { Customer, SalesOrder, Recovery } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import {
  ArrowLeft,
  FileText,
  Download,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  Receipt,
  CreditCard,
  Building2,
  Calendar,
  Wallet,
} from 'lucide-react';
import { downloadCustomerLedgerPdf } from '../../utils/exportLedgerPdf';

export interface CustomerLedgerViewProps {
  customer: Customer;
  currentUser: NLinkUser;
  orders: SalesOrder[];
  recoveries: Recovery[];
  onBack: () => void;
}

export const CustomerLedgerView: React.FC<CustomerLedgerViewProps> = ({
  customer,
  currentUser,
  orders,
  recoveries,
  onBack,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  // Filter orders & recoveries for this customer
  const customerOrders = orders.filter(
    (o) => (o.customerId === customer.id || o.customerName === customer.companyName) && o.status !== 'REJECTED'
  );
  const customerRecoveries = recoveries.filter(
    (r) => (r.customerId === customer.id || r.customerName === customer.companyName) && r.status !== 'REJECTED'
  );

  const openingBalance = customer.openingBalance ?? 0;

  // Build sorted timeline of transactions
  const timelineEntries = useMemo(() => {
    const rawEvents: Array<{
      id: string;
      date: string;
      type: 'INVOICE' | 'RECOVERY';
      reference: string;
      description: string;
      debit: number;
      credit: number;
      status: string;
    }> = [];

    // Invoices are DEBITS (Customer owes more)
    customerOrders.forEach((o) => {
      rawEvents.push({
        id: o.id || o.orderNumber,
        date: o.orderDate || o.createdAt || '',
        type: 'INVOICE',
        reference: `INV #${o.orderNumber || o.id?.slice(-5)}`,
        description: `Sales Order (${o.items?.length || 1} SKUs)`,
        debit: o.totalAmount || 0,
        credit: 0,
        status: o.status || 'SUBMITTED',
      });
    });

    // Recoveries are CREDITS (Customer pays, reducing debt)
    customerRecoveries.forEach((r) => {
      rawEvents.push({
        id: r.id,
        date: r.recordedAt || r.createdAt || '',
        type: 'RECOVERY',
        reference: `REC #${r.id?.slice(-5)}`,
        description: `Payment Received (${r.paymentMode || 'CASH'})`,
        debit: 0,
        credit: r.amount || 0,
        status: r.status || 'PENDING_VERIFICATION',
      });
    });

    // Sort chronologically (oldest to newest for running balance computation)
    rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let running = openingBalance;
    const withRunning = rawEvents.map((ev) => {
      running = running + ev.debit - ev.credit;
      return {
        ...ev,
        runningBalance: running,
      };
    });

    // Reverse to display newest first in UI table
    return withRunning.reverse();
  }, [customerOrders, customerRecoveries, openingBalance]);

  // Current Net Balance
  const netBalance = customer.currentBalance ?? (timelineEntries[0]?.runningBalance ?? openingBalance);

  // Total Invoiced & Total Recovered
  const totalInvoiced = customerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalRecovered = customerRecoveries.reduce((sum, r) => sum + (r.amount || 0), 0);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const pdfEntries = timelineEntries.map((e) => ({
        id: e.id,
        date: e.date,
        reference: e.reference,
        particulars: e.description,
        debit: e.debit > 0 ? e.debit : null,
        credit: e.credit > 0 ? e.credit : null,
        balance: e.runningBalance ?? 0,
      }));

      await downloadCustomerLedgerPdf({
        customer,
        entries: pdfEntries,
        openingBalance,
        totalDebits: totalInvoiced,
        totalCredits: totalRecovered,
        closingBalance: netBalance,
        startDate: '2026-01-01',
        endDate: new Date().toISOString().slice(0, 10),
        preparedByName: currentUser.fullName,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsAppStatement = () => {
    const text = `*NATIONAL LIGHTS - ACCOUNT STATEMENT*\n\n*Customer:* ${customer.companyName}\n*Town:* ${customer.town || customer.city}\n*Date:* ${new Date().toLocaleDateString('en-PK')}\n\n*Opening Balance:* Rs. ${openingBalance.toLocaleString()}\n*Total Invoiced:* Rs. ${totalInvoiced.toLocaleString()}\n*Total Recovered:* Rs. ${totalRecovered.toLocaleString()}\n------------------------------\n*NET OUTSTANDING BALANCE:* Rs. ${netBalance.toLocaleString()} PKR\n\n_Prepared by: ${currentUser.fullName} (${currentUser.phone || ''})_`;
    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Customer 360</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleWhatsAppStatement}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Exporting...' : 'Export Statement PDF'}</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-700 dark:text-teal-400" />
            Customer Ledger &amp; Khata Statement
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Authorized financial statement for <strong>{customer.companyName}</strong> ({customer.customerCode})
          </p>
        </div>

        {/* Financial Overview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Opening Balance</span>
            <span className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5 block truncate">
              Rs. {openingBalance.toLocaleString()}
            </span>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-200 dark:border-amber-900">
            <span className="text-[10px] font-extrabold uppercase text-amber-800 dark:text-amber-300 block">Total Debits (Maal)</span>
            <span className="text-sm font-black font-mono text-amber-900 dark:text-amber-200 mt-0.5 block truncate">
              Rs. {totalInvoiced.toLocaleString()}
            </span>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900">
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 dark:text-emerald-300 block">Total Credits (Paisa)</span>
            <span className="text-sm font-black font-mono text-emerald-900 dark:text-emerald-200 mt-0.5 block truncate">
              Rs. {totalRecovered.toLocaleString()}
            </span>
          </div>

          <div className="bg-teal-900 p-3 rounded-2xl text-white shadow-xs">
            <span className="text-[10px] font-extrabold uppercase text-teal-300 block">Closing Net Balance</span>
            <span className="text-sm font-black font-mono text-white mt-0.5 block truncate">
              Rs. {netBalance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Ledger Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Account Statement History ({timelineEntries.length} Transactions)
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            Debits (+), Credits (-), Balance
          </span>
        </div>

        {timelineEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Ledger Entries</p>
            <p className="mt-1">Only the opening balance of Rs. {openingBalance.toLocaleString()} is currently on file.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {timelineEntries.map((item) => {
              const isDebit = item.debit > 0;
              const dateObj = new Date(item.date);

              return (
                <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  {/* Left: Icon & Ref */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isDebit
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                          : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {isDebit ? <Receipt className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                          {item.reference}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                            isDebit
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {isDebit ? 'Debit / Sale' : 'Credit / Recovery'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {dateObj.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })} &bull; {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Amounts & Running Balance */}
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-black font-mono block ${
                        isDebit ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {isDebit ? `+ Rs. ${item.debit.toLocaleString()}` : `- Rs. ${item.credit.toLocaleString()}`}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold block">
                      Bal: Rs. {item.runningBalance?.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
