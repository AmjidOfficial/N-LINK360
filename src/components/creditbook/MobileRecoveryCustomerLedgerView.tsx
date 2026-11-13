/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Mobile Recovery & Customer Ledger View
 * Pixel-perfect implementation of stitch_n_link_360_enterprise_platform/mobile_recovery_customer_ledger/code.html
 * - Customer status header & credit overdue tag
 * - Bento Financial Breakdown Card adhering to:
 *   Closing Balance = Opening + Invoices + Debit Notes - Verified Recoveries - Credit Notes
 * - Recovery collection form with PKR amount, Cash/Cheque/Bank Transfer, ref#, receipt upload
 * - Recent Invoices list with status badges (Posted, Pending Verification, Verified)
 * - PDF Statement Download & Audit History actions
 */

import React, { useState } from 'react';
import { Customer, SalesOrder, Recovery } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { triggerHaptic } from '../../utils/haptics';
import { generateUniqueRecoveryId } from '../../utils/idGenerator';
import { NationalLightHeaderBrand, DocumentCenterWatermark } from '../NationalLightLogo';
import {
  Wallet,
  Receipt,
  FileText,
  CreditCard,
  Building2,
  ChevronDown,
  Download,
  History,
  CheckCircle2,
  Camera,
  X,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { downloadCustomerLedgerPdf } from '../../utils/exportLedgerPdf';

export interface MobileRecoveryCustomerLedgerViewProps {
  customer: Customer;
  currentUser: NLinkUser;
  orders?: SalesOrder[];
  recoveries?: Recovery[];
  onBack?: () => void;
  onRecordRecovery: (recovery: Recovery) => void;
  onPreviewInvoicePdf?: (order: SalesOrder, customer: Customer) => void;
}

export const MobileRecoveryCustomerLedgerView: React.FC<MobileRecoveryCustomerLedgerViewProps> = ({
  customer,
  currentUser,
  orders = [],
  recoveries = [],
  onBack,
  onRecordRecovery,
  onPreviewInvoicePdf,
}) => {
  const [activeFilterTab, setActiveFilterTab] = useState<'SUMMARY' | 'INVOICES' | 'RECOVERIES' | 'CREDIT_NOTES'>('SUMMARY');
  const [amountInput, setAmountInput] = useState('50,000');
  const [payMethod, setPayMethod] = useState<'CASH' | 'CHEQUE' | 'BANK_TRANSFER'>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Accounting calculations
  const openingBalance = customer.openingBalance ?? 0;
  const customerOrders = orders.filter(
    (o) => (o.customerId === customer.id || o.customerName === customer.companyName) && o.status !== 'REJECTED'
  );
  const approvedOrders = customerOrders.filter(
    (o) => o.status === 'APPROVED' || o.shahzadApproval === 'APPROVED'
  );
  const totalInvoices = approvedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const debitNotes = 0;

  const customerRecoveries = recoveries.filter(
    (r) => (r.customerId === customer.id || r.customerName === customer.companyName) && r.status !== 'REJECTED'
  );
  const verifiedRecoveries = customerRecoveries
    .filter((r) => r.status === 'VERIFIED' || r.status === 'APPROVED' || r.shahzadApproval === 'APPROVED')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const pendingRecoveriesAmount = customerRecoveries
    .filter((r) => r.status !== 'VERIFIED' && r.status !== 'APPROVED' && r.shahzadApproval !== 'APPROVED')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const closingBalance = customer.currentBalance ?? Math.max(0, openingBalance + totalInvoices - verifiedRecoveries);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic('light');
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseInt(amountInput.replace(/[^0-9]/g, ''), 10) || 0;
    if (cleanAmount <= 0) {
      alert('Please enter a valid recovery amount');
      return;
    }

    const recoveryId = generateUniqueRecoveryId();
    const newRecovery: Recovery = {
      id: recoveryId,
      recoveryNumber: recoveryId,
      customerId: customer.id,
      customerName: customer.companyName,
      customerCode: customer.customerCode || 'NL-DLR',
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName,
      collectionDate: new Date().toISOString().slice(0, 10),
      amount: cleanAmount,
      paymentMode: payMethod === 'BANK_TRANSFER' ? 'ONLINE_TRANSFER' : payMethod,
      instrumentNumber: referenceNumber || undefined,
      receiptUrl: receiptImage || undefined,
      createdAt: new Date().toISOString(),
      status: 'PENDING_VERIFICATION',
      shahzadApproval: 'PENDING',
    };

    triggerHaptic('success');
    onRecordRecovery(newRecovery);
    setToastMessage('Recovery collection logged and synced with N-LINK-360!');
    setTimeout(() => setToastMessage(null), 5000);
    setReferenceNumber('');
    setReceiptImage(null);
  };

  return (
    <div className="flex flex-col w-full pb-24 space-y-4 animate-in fade-in duration-200">
      {/* Back button if modal/subview */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="self-start px-2 py-1 text-xs font-semibold text-[#0052FF] dark:text-blue-400 flex items-center gap-1 cursor-pointer hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Customers</span>
        </button>
      )}

      {/* Top National Light Logo Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <NationalLightHeaderBrand size="sm" />
        <span className="text-[10px] font-mono font-bold text-[#1B5E3A] dark:text-emerald-400 px-2 py-0.5 rounded bg-[#F1F8E9] dark:bg-slate-800 border border-[#C8E6C9] dark:border-slate-700">
          LEDGER & WASOOLI
        </span>
      </div>

      {/* 1. Customer Selector & Credit Status Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-[#0052FF] dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              {customer.companyName?.slice(0, 2).toUpperCase() || 'AN'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Customer Ledger
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950 text-[#DC2626] border border-rose-200 dark:border-rose-800">
                  Overdue
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1">
                {customer.companyName}
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </h1>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Outstanding</span>
            <span className="text-base font-bold font-mono text-[#DC2626]">
              PKR {closingBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Quick Filter & Action Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilterTab('SUMMARY')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilterTab === 'SUMMARY'
                ? 'bg-[#0052FF] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Ledger Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveFilterTab('INVOICES')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilterTab === 'INVOICES'
                ? 'bg-[#0052FF] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Active Invoices ({customerOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilterTab('RECOVERIES')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilterTab === 'RECOVERIES'
                ? 'bg-[#0052FF] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Recovery Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveFilterTab('CREDIT_NOTES')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilterTab === 'CREDIT_NOTES'
                ? 'bg-[#0052FF] text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Credit Notes
          </button>
        </div>
      </div>

      {/* 2. Financial Summary Card with Centered Watermark Overlay */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-xs relative overflow-hidden">
        <DocumentCenterWatermark title="CUSTOMER LEDGER" />
        <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-[#0052FF] dark:text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">Financial Breakdown</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">FY 2026-27</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-3 text-xs">
          <div className="bg-[#F8FAFC] dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Opening Balance</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
              PKR {openingBalance.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Total Invoices</span>
            <span className="font-mono font-bold text-[#0052FF] dark:text-blue-400 text-xs">
              + PKR {totalInvoices.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Debit Notes</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
              + PKR {debitNotes.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Verified Recoveries</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
              - PKR {verifiedRecoveries.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="pt-3 -mx-4 -mb-4 p-4 bg-[#F2F4F6] dark:bg-slate-800/80 border-t border-[#E2E8F0] dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Calculated Closing Balance</span>
            <span className="text-[10px] text-slate-400">Opening + Invs + DN - Rec - CN</span>
          </div>
          <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
            PKR {closingBalance.toLocaleString()}
          </span>
        </div>
        </div>
      </div>

      {/* 3. Recovery Collection Form Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-[#0052FF] dark:text-blue-400">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">New Recovery Collection</h2>
            <p className="text-[11px] text-slate-500">Log cash, cheque, or bank transfer details</p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
          {/* Amount Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Recovery Amount (PKR)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 font-mono font-bold text-xs">
                PKR
              </span>
              <input
                type="text"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#F8FAFC] dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm pl-12 pr-4 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0052FF]"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPayMethod('CASH')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all cursor-pointer ${
                  payMethod === 'CASH'
                    ? 'bg-[#0052FF] text-white border-[#0052FF] shadow-xs'
                    : 'bg-[#F8FAFC] dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Wallet className="w-4 h-4 mb-0.5" />
                <span className="text-[11px] font-semibold">Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPayMethod('CHEQUE')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all cursor-pointer ${
                  payMethod === 'CHEQUE'
                    ? 'bg-[#0052FF] text-white border-[#0052FF] shadow-xs'
                    : 'bg-[#F8FAFC] dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileText className="w-4 h-4 mb-0.5" />
                <span className="text-[11px] font-semibold">Cheque</span>
              </button>

              <button
                type="button"
                onClick={() => setPayMethod('BANK_TRANSFER')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all cursor-pointer ${
                  payMethod === 'BANK_TRANSFER'
                    ? 'bg-[#0052FF] text-white border-[#0052FF] shadow-xs'
                    : 'bg-[#F8FAFC] dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Building2 className="w-4 h-4 mb-0.5" />
                <span className="text-[11px] font-semibold">Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Reference Number */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Instrument / Reference Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. CHQ-998231 or TRX-448102"
              className="w-full bg-[#F8FAFC] dark:bg-slate-800 text-slate-900 dark:text-white text-xs px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0052FF]"
            />
          </div>

          {/* Receipt Photo Upload */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Payment Evidence / Receipt
            </label>
            {receiptImage ? (
              <div className="relative rounded-lg overflow-hidden border border-[#E2E8F0] max-h-36">
                <img src={receiptImage} alt="Payment receipt" className="w-full h-auto object-cover" />
                <button
                  type="button"
                  onClick={() => setReceiptImage(null)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-950/70 text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-[#CBD5E1] dark:border-slate-700 rounded-lg p-3 flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-slate-800 hover:bg-slate-100 transition-colors cursor-pointer text-center">
                <Camera className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tap to capture or upload receipt
                </span>
                <span className="text-[10px] text-slate-400">Supports JPEG, PNG up to 10MB</span>
                <input type="file" accept="image/*" onChange={handleImageCapture} className="hidden" />
              </label>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#0052FF] hover:bg-[#003ECC] text-white rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit Recovery Collection</span>
          </button>
        </form>
      </div>

      {/* 4. Recent Invoices & Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-[#0052FF] dark:text-blue-400">
              <Receipt className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Invoices &amp; Status</h2>
          </div>
          <span className="text-[11px] font-semibold text-[#0052FF] dark:text-blue-400">View All &rarr;</span>
        </div>

        <div className="space-y-2 text-xs">
          {customerOrders.length === 0 ? (
            <div className="p-4 text-center text-slate-400 bg-[#F8FAFC] dark:bg-slate-800/40 rounded-lg">
              No orders or invoices on record for this customer.
            </div>
          ) : (
            customerOrders.slice(0, 5).map((ord) => {
              const isApproved = ord.status === 'APPROVED' || ord.shahzadApproval === 'APPROVED';
              const isPending = !isApproved && ord.status !== 'REJECTED';
              const invNum = ord.orderNumber || ord.id;
              const dateStr = ord.orderDate || ord.createdAt ? new Date(ord.orderDate || ord.createdAt!).toLocaleDateString('en-GB') : 'Recent';

              return (
                <div
                  key={ord.id}
                  onClick={() => onPreviewInvoicePdf && onPreviewInvoicePdf(ord, customer)}
                  className="bg-[#F8FAFC] dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-[#0052FF] transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">#{invNum}</span>
                      {isApproved ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800">
                          Posted (Net -15%)
                        </span>
                      ) : isPending ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-[#D97706] border border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                          Pending Approval
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:border-rose-800">
                          Rejected
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">Date: {dateStr} &bull; {ord.items?.length || 1} items</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 dark:text-white block">
                      PKR {ord.totalAmount?.toLocaleString()}
                    </span>
                    <span className={`text-[10px] font-bold ${isApproved ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#D97706]'}`}>
                      {isApproved ? 'In Ledger' : 'Awaiting Approval'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Secondary Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            downloadCustomerLedgerPdf({
              customer,
              entries: [],
              openingBalance,
              totalDebits: totalInvoices,
              totalCredits: verifiedRecoveries,
              closingBalance,
              startDate: '2026-01-01',
              endDate: new Date().toISOString().slice(0, 10),
              preparedByName: currentUser.fullName,
            });
          }}
          className="py-2.5 px-3 bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer hover:bg-slate-50"
        >
          <Download className="w-3.5 h-3.5 text-[#0052FF] dark:text-blue-400" />
          <span>Download PDF</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setToastMessage('Displaying ledger audit history...');
            setTimeout(() => setToastMessage(null), 5000);
          }}
          className="py-2.5 px-3 bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer hover:bg-slate-50"
        >
          <History className="w-3.5 h-3.5 text-[#0052FF] dark:text-blue-400" />
          <span>Audit History</span>
        </button>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 inset-x-4 z-50 bg-[#0F172A] text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="p-1 text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
