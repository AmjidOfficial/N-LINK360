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
import { Customer, SalesOrder, Recovery, LedgerEntry } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { isAuthorizedApproverEmail } from '../../services/production-users';
import {
  ArrowLeft,
  FileText,
  Download,
  MessageCircle,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  Receipt,
  CreditCard,
  Building2,
  Calendar,
  Wallet,
  Check,
  CheckCircle2,
  Edit3,
  Printer,
  Search,
  FileSpreadsheet,
  Eye,
  X,
  Filter,
  Info,
  ArrowUpDown,
} from 'lucide-react';
import { downloadCustomerLedgerPdf } from '../../utils/exportLedgerPdf';
import { exportCustomerLedgerToExcel } from '../../services/exportEngine';
import { EditOrDeleteEntryModal } from './EditOrDeleteEntryModal';
import { NationalLightHeaderBrand, DocumentCenterWatermark } from '../NationalLightLogo';
import { canUserEditEntry, canUserDeleteEntry } from '../../utils/entryManagement';

export interface CustomerLedgerViewProps {
  customer: Customer;
  currentUser?: NLinkUser;
  orders?: SalesOrder[];
  invoices?: SalesOrder[];
  recoveries?: Recovery[];
  ledgerEntries?: any[];
  onBack: () => void;
  onOpenNewOrder?: () => void;
  onOpenRecoveryDrawer?: () => void;
  onApproveOrder?: (orderId: string, approver?: any) => void;
  onApproveRecovery?: (recoveryId: string, approver?: any) => void;
  onCancelOrReverseOrder?: (orderId: string, reason: string) => void;
  onSaveOrderEdit?: (orderId: string, updates: Partial<SalesOrder>) => void;
  onCancelOrReverseRecovery?: (recoveryId: string, reason: string) => void;
  onSaveRecoveryEdit?: (recoveryId: string, updates: Partial<Recovery>) => void;
  onOpenSalesAuditModal?: () => void;
}

export const CustomerLedgerView: React.FC<CustomerLedgerViewProps> = ({
  customer,
  currentUser,
  orders,
  invoices,
  recoveries = [],
  ledgerEntries = [],
  onBack,
  onOpenNewOrder,
  onOpenRecoveryDrawer,
  onApproveOrder,
  onApproveRecovery,
  onCancelOrReverseOrder,
  onSaveOrderEdit,
  onCancelOrReverseRecovery,
  onSaveRecoveryEdit,
  onOpenSalesAuditModal,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedEntryForManage, setSelectedEntryForManage] = useState<{ type: 'ORDER' | 'RECOVERY'; data: any } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'DEBIT_ONLY' | 'CREDIT_ONLY'>('ALL');
  const [sortOrder, setSortOrder] = useState<'OLDEST_FIRST' | 'NEWEST_FIRST'>('OLDEST_FIRST');
  const [selectedDetailEntry, setSelectedDetailEntry] = useState<any | null>(null);
  const [fromDate, setFromDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Helper to compute Net Trade Price (Net TP @ 15% Discount) for Sales Orders
  const getNetOrderTotal = (o: SalesOrder): number => {
    if (typeof o.netAmount === 'number' && o.netAmount > 0) return o.netAmount;
    if (typeof o.netTotal === 'number' && o.netTotal > 0) return o.netTotal;
    if (Array.isArray(o.items) && o.items.length > 0) {
      const gross = o.items.reduce((sum, item) => {
        const price = item.unitPrice || 0;
        const qty = item.orderedQuantity || item.approvedQuantity || item.quantity || 0;
        return sum + (price * qty);
      }, 0);
      if (gross > 0 && (!o.discountAmount || o.discountAmount === 0)) {
        return Math.round(gross * 0.85); // Apply 15% Net TP commercial discount
      }
    }
    return o.totalAmount || 0;
  };

  // Safe fallback list of orders / invoices
  const safeOrdersList = orders || invoices || [];
  const safeRecoveriesList = recoveries || [];

  // Filter orders & recoveries for this customer
  const customerOrders = safeOrdersList.filter((o) => {
    if (!o || o.status === 'REJECTED') return false;
    const matchId = (customer?.id && (o.customerId === customer.id || o.customerId === customer.customerCode)) ||
      (customer?.customerCode && (o.customerCode === customer.customerCode || o.customerId === customer.customerCode));
    const matchName = customer?.companyName && o.customerName &&
      o.customerName.toLowerCase().trim() === customer.companyName.toLowerCase().trim();
    return matchId || matchName;
  });

  const customerRecoveries = safeRecoveriesList.filter((r) => {
    if (!r || r.status === 'REJECTED') return false;
    const matchId = (customer?.id && (r.customerId === customer.id || r.customerId === customer.customerCode)) ||
      (customer?.customerCode && (r.customerCode === customer.customerCode || r.customerId === customer.customerCode));
    const matchName = customer?.companyName && r.customerName &&
      r.customerName.toLowerCase().trim() === customer.companyName.toLowerCase().trim();
    return matchId || matchName;
  });

  const openingBalance = customer.openingBalance ?? 0;

  // Check authorized executive approver status (Shahzad Ullah)
  const isApprover = isAuthorizedApproverEmail(currentUser?.email, currentUser);

  // Posted Invoices strictly increase the balance using Net TP (@ after 15% discount)
  const postedOrders = customerOrders.filter(
    (o) => o.status === 'APPROVED' || o.shahzadApproval === 'APPROVED' || o.dualApprovalStatus === 'DUAL_APPROVED'
  );
  const postedInvoicesTotal = postedOrders.reduce((sum, o) => sum + getNetOrderTotal(o), 0);
  const pendingOrders = customerOrders.filter(
    (o) => o.status !== 'APPROVED' && o.shahzadApproval !== 'APPROVED' && o.dualApprovalStatus !== 'DUAL_APPROVED'
  );
  const pendingInvoicesTotal = pendingOrders.reduce((sum, o) => sum + getNetOrderTotal(o), 0);

  // Confirmed Recoveries strictly reduce the balance
  const confirmedRecoveries = customerRecoveries.filter(
    (r) => r.status === 'VERIFIED' || r.status === 'APPROVED' || r.shahzadApproval === 'APPROVED' || r.dualApprovalStatus === 'DUAL_APPROVED'
  );
  const confirmedRecoveriesTotal = confirmedRecoveries.reduce((sum, r) => sum + (r.amount || 0), 0);
  const pendingRecoveries = customerRecoveries.filter(
    (r) => r.status !== 'VERIFIED' && r.status !== 'APPROVED' && r.shahzadApproval !== 'APPROVED' && r.dualApprovalStatus !== 'DUAL_APPROVED'
  );
  const pendingRecoveriesTotal = pendingRecoveries.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Authoritative Accounting Formula:
  // Opening Balance + Posted Invoices - Confirmed Recoveries = Closing Balance
  const closingBalance = openingBalance + postedInvoicesTotal - confirmedRecoveriesTotal;
  const outstandingBalance = closingBalance;
  const invoiceCount = postedOrders.length;

  // Recovery days calculation (days since last confirmed recovery)
  const recoveryDays = useMemo(() => {
    if (confirmedRecoveries.length === 0) return customer.creditDays || 30;
    const dates = confirmedRecoveries
      .map((r) => new Date(r.collectionDate || (r as any).paymentDate || r.recordedAt || r.createdAt || '').getTime())
      .filter((d) => !isNaN(d));
    if (dates.length === 0) return customer.creditDays || 30;
    const latest = Math.max(...dates);
    const diffDays = Math.max(0, Math.round((Date.now() - latest) / (1000 * 60 * 60 * 24)));
    return diffDays;
  }, [confirmedRecoveries, customer.creditDays]);

  // Invoice Aging calculation
  const invoiceAging = useMemo(() => {
    if (outstandingBalance <= 0) return 'Fully Settled';
    if (recoveryDays <= 7) return 'Current (0-7 Days)';
    if (recoveryDays <= 15) return '8-15 Days Aging';
    if (recoveryDays <= 30) return '16-30 Days Aging';
    return 'Overdue (>30 Days)';
  }, [outstandingBalance, recoveryDays]);

  // Build sorted timeline of transactions
  const timelineEntries = useMemo(() => {
    const rawEvents: Array<{
      id: string;
      rawId: string;
      date: string;
      type: 'INVOICE' | 'RECOVERY';
      reference: string;
      description: string;
      debit: number;
      credit: number;
      status: string;
      isPending: boolean;
    }> = [];

    // Invoices are DEBITS (Customer owes more - calculated at Net TP @ 15% discount)
    customerOrders.forEach((o) => {
      const orderRef = o.orderNumber || o.id || 'SO-NEW';
      const isApproved = o.status === 'APPROVED' || o.shahzadApproval === 'APPROVED' || o.dualApprovalStatus === 'DUAL_APPROVED';
      rawEvents.push({
        id: o.id || orderRef,
        rawId: o.id || orderRef,
        date: o.orderDate || o.createdAt || '',
        type: 'INVOICE',
        reference: orderRef.startsWith('INV') || orderRef.startsWith('SO') ? orderRef : `INV #${orderRef}`,
        description: `Sales Invoice (${o.items?.length || 1} SKUs @ Net TP)`,
        debit: getNetOrderTotal(o),
        credit: 0,
        status: isApproved ? 'APPROVED' : (o.status || 'SUBMITTED'),
        isPending: !isApproved,
      });
    });

    // Recoveries are CREDITS (Customer pays, reducing debt)
    customerRecoveries.forEach((r) => {
      const recRef = r.recoveryNumber || r.id || 'RC-NEW';
      const cleanRef = recRef.startsWith('RC') ? recRef : `REC #${recRef}`;
      const channelDesc = r.paymentMode === 'ONLINE_TRANSFER' ? 'Online Transfer' : 'Cash';
      const bankDesc = r.bankName && r.bankName !== 'Direct Cash Collection' ? ` (${r.bankName})` : '';
      const instDesc = r.instrumentNumber && r.instrumentNumber !== 'N/A' ? ` [${r.instrumentNumber}]` : '';
      const isConfirmed = r.status === 'VERIFIED' || r.status === 'APPROVED' || r.shahzadApproval === 'APPROVED' || r.dualApprovalStatus === 'DUAL_APPROVED';

      rawEvents.push({
        id: r.id,
        rawId: r.id,
        date: r.collectionDate || (r as any).paymentDate || r.recordedAt || r.createdAt || '',
        type: 'RECOVERY',
        reference: cleanRef,
        description: `Payment Recovery via ${channelDesc}${bankDesc}${instDesc}`,
        debit: 0,
        credit: r.amount || 0,
        status: isConfirmed ? 'VERIFIED' : (r.status || 'PENDING_VERIFICATION'),
        isPending: !isConfirmed,
      });
    });

    // Also include any direct ledger entries for this customer that are not already present
    if (Array.isArray(ledgerEntries)) {
      ledgerEntries.forEach((le: any) => {
        if (!le || le.transactionType === 'OPENING_BALANCE') return;
        const matchCust =
          (customer?.id && (le.customerId === customer.id || le.customerId === customer.customerCode)) ||
          (customer?.customerCode && (le.customerCode === customer.customerCode || le.customerId === customer.customerCode)) ||
          (customer?.companyName && le.customerName && le.customerName.toLowerCase().trim() === customer.companyName.toLowerCase().trim());
        if (!matchCust) return;

        const refNum = le.entryNumber || le.referenceNumber || le.referenceId || le.id;
        const alreadyExists = rawEvents.some((ev) => ev.reference === refNum || ev.rawId === le.referenceId || ev.id === le.id);
        if (!alreadyExists) {
          const isDebit = (le.debitAmount || 0) > 0;
          rawEvents.push({
            id: le.id,
            rawId: le.referenceId || le.id,
            date: le.entryDate || le.createdAt || '',
            type: isDebit ? 'INVOICE' : 'RECOVERY',
            reference: refNum,
            description: le.description || (isDebit ? 'Commercial Debit Entry' : 'Recovery Credit Entry'),
            debit: le.debitAmount || 0,
            credit: le.creditAmount || 0,
            status: 'VERIFIED',
            isPending: false,
          });
        }
      });
    }

    // Sort chronologically (oldest to newest for running balance computation)
    rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance: Running = Opening + Debits - Credits
    let running = openingBalance;
    const withRunning = rawEvents.map((ev) => {
      // Only posted invoices and confirmed recoveries alter running balance in official accounting
      if (!ev.isPending) {
        running = running + ev.debit - ev.credit;
      }
      return {
        ...ev,
        runningBalance: running,
      };
    });

    // Display Oldest to Newest by default, or Newest First if selected
    return sortOrder === 'NEWEST_FIRST' ? [...withRunning].reverse() : withRunning;
  }, [customerOrders, customerRecoveries, ledgerEntries, openingBalance, sortOrder]);

  // Filtered timeline entries by Date, Search Query, and Debit/Credit direction
  const filteredTimelineEntries = useMemo(() => {
    return timelineEntries.filter((ev) => {
      const d = (ev.date || '').slice(0, 10);
      if (fromDate && d && d < fromDate) return false;
      if (toDate && d && d > toDate) return false;

      // Direction filter
      if (directionFilter === 'DEBIT_ONLY' && ev.debit <= 0) return false;
      if (directionFilter === 'CREDIT_ONLY' && ev.credit <= 0) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRef = (ev.reference || '').toLowerCase().includes(q);
        const matchDesc = (ev.description || '').toLowerCase().includes(q);
        const matchDebit = ev.debit.toString().includes(q);
        const matchCredit = ev.credit.toString().includes(q);
        const matchBal = (ev.runningBalance ?? '').toString().includes(q);
        return matchRef || matchDesc || matchDebit || matchCredit || matchBal;
      }

      return true;
    });
  }, [timelineEntries, fromDate, toDate, directionFilter, searchQuery]);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const pdfEntries = filteredTimelineEntries.map((e) => ({
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
        totalDebits: postedInvoicesTotal,
        totalCredits: confirmedRecoveriesTotal,
        closingBalance,
        startDate: fromDate || '2026-01-01',
        endDate: toDate || new Date().toISOString().slice(0, 10),
        preparedByName: currentUser?.fullName || 'Field Officer',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const buildLedgerShareText = () =>
    `*NATIONAL LIGHTS - AUTHORIZED KHATA STATEMENT*\n\n*Dealer:* ${customer.companyName}\n*Dealer Code:* ${customer.customerCode}\n*Town:* ${customer.town || customer.city}\n*Period:* ${fromDate || 'Start'} to ${toDate || 'Today'}\n\n*Opening Balance:* Rs. ${openingBalance.toLocaleString()}\n*Posted Invoices (${invoiceCount}):* Rs. ${postedInvoicesTotal.toLocaleString()}\n*Confirmed Recovery:* Rs. ${confirmedRecoveriesTotal.toLocaleString()}\n------------------------------\n*CLOSING BALANCE:* Rs. ${closingBalance.toLocaleString()} PKR\n*OUTSTANDING BALANCE:* Rs. ${outstandingBalance.toLocaleString()} PKR\n*Invoice Aging:* ${invoiceAging}\n\n_Authorized Executive: Shahzad Ullah (Managing Director)_`;

  const handleWhatsAppStatement = () => {
    const text = buildLedgerShareText();
    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSmsStatement = () => {
    const text = buildLedgerShareText().replace(/\*/g, '');
    const cleanPhone = (customer.phone || '').replace(/[^0-9+]/g, '');
    const smsUrl = cleanPhone
      ? `sms:${cleanPhone}?body=${encodeURIComponent(text)}`
      : `sms:?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
  };

  const handleExportExcel = () => {
    const excelEntries: LedgerEntry[] = filteredTimelineEntries.map((e) => ({
      id: e.id,
      entryNumber: e.reference,
      customerId: customer.id,
      customerName: customer.companyName,
      entryDate: e.date,
      transactionType: e.type === 'INVOICE' ? 'INVOICE' : 'RECOVERY',
      referenceModule: e.type,
      referenceId: e.rawId,
      debitAmount: e.debit || 0,
      creditAmount: e.credit || 0,
      runningBalance: e.runningBalance ?? 0,
      description: e.description,
      createdAt: e.date,
    }));
    exportCustomerLedgerToExcel(customer, excelEntries);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Customer 360</span>
          </button>

          <div className="flex flex-wrap items-center gap-1.5">
            {onOpenSalesAuditModal && (
              <button
                type="button"
                onClick={onOpenSalesAuditModal}
                className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-amber-300 font-bold text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer border border-slate-700"
                title="Audit and verify Today's Sales Entries at Net TP (15% Less)"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Net TP Audit</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleWhatsAppStatement}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer"
              title="Share statement on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer"
              title="Export to Excel Spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer"
              title="Download Vector Ledger PDF"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Exporting...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="Print Ledger Statement"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
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

        {/* Search & Filter Control Bar */}
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions by reference, description, amount..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:border-teal-600 outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Direction Filter Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setDirectionFilter('ALL')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  directionFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter('DEBIT_ONLY')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  directionFilter === 'DEBIT_ONLY'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Debits
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter('CREDIT_ONLY')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  directionFilter === 'CREDIT_ONLY'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Credits
              </button>
            </div>

            {/* Sort Order Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'OLDEST_FIRST' ? 'NEWEST_FIRST' : 'OLDEST_FIRST'))}
              className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer shrink-0 flex items-center gap-1 border border-slate-200/60 dark:border-slate-700/60"
              title="Toggle Oldest First vs Newest First"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{sortOrder === 'OLDEST_FIRST' ? 'Oldest First' : 'Newest First'}</span>
            </button>
          </div>

          {/* Date Range Filter: From Date -> To Date */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-hidden focus:border-teal-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white outline-hidden focus:border-teal-600"
              />
            </div>
          </div>
        </div>

        {/* Financial Overview Grid strictly complying with Section 2 Financial Terminology */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Opening Balance</span>
            <span className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5 block truncate">
              Rs. {openingBalance.toLocaleString()}
            </span>
          </div>

          <div className="bg-teal-50 dark:bg-teal-950/30 p-3 rounded-2xl border border-teal-200 dark:border-teal-900">
            <span className="text-[10px] font-extrabold uppercase text-teal-800 dark:text-teal-300 block">
              Invoices ({invoiceCount} Posted)
            </span>
            <span className="text-sm font-black font-mono text-teal-900 dark:text-teal-200 mt-0.5 block truncate">
              Rs. {postedInvoicesTotal.toLocaleString()}
            </span>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900">
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 dark:text-emerald-300 block">
              Recovery ({confirmedRecoveries.length} Confirmed)
            </span>
            <span className="text-sm font-black font-mono text-emerald-900 dark:text-emerald-200 mt-0.5 block truncate">
              Rs. {confirmedRecoveriesTotal.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#1A2D42] p-3 rounded-2xl text-white shadow-xs">
            <span className="text-[10px] font-extrabold uppercase text-teal-300 block">Closing Balance</span>
            <span className="text-sm font-black font-mono text-white mt-0.5 block truncate">
              Rs. {closingBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Operational Credit & Health Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Outstanding Balance</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              Rs. {outstandingBalance.toLocaleString()}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Invoice Count</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {invoiceCount} Posted {pendingOrders.length > 0 ? `(${pendingOrders.length} Pending)` : ''}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Recovery Days</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {recoveryDays} Days
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Invoice Aging</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {invoiceAging}
            </span>
          </div>
        </div>

        {/* Authoritative Financial Rule Verification Banner */}
        <div className="px-3.5 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
          <span className="text-teal-900 dark:text-teal-200 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Opening ({openingBalance.toLocaleString()}) + Invoices ({postedInvoicesTotal.toLocaleString()}) - Recovery ({confirmedRecoveriesTotal.toLocaleString()}) = Closing ({closingBalance.toLocaleString()}) PKR
          </span>
          <span className="text-teal-700 dark:text-teal-400 font-extrabold uppercase text-[10px]">
            Audited Khata Rule
          </span>
        </div>
      </div>

      {/* Ledger Transactions Table with Centered National Light Watermark */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <DocumentCenterWatermark title="CUSTOMER KHATA LEDGER" />
        <div className="relative z-10">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <NationalLightHeaderBrand size="sm" />
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Account Statement History ({filteredTimelineEntries.length} Transactions)
            </span>
            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
              Invoices (+), Recovery (-), Balance
            </span>
          </div>
        </div>

        {filteredTimelineEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#0D9488]" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Ledger Entries</p>
            <p className="mt-1">Only the opening balance of Rs. {openingBalance.toLocaleString()} is currently on file.</p>
          </div>
        ) : (
          <div className="w-full">
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 pl-4">Date</th>
                    <th className="py-3 px-2">Reference</th>
                    <th className="py-3 px-2">Type</th>
                    <th className="py-3 px-2">Particulars</th>
                    <th className="py-3 px-2 text-right">Debit (+)</th>
                    <th className="py-3 px-2 text-right">Credit (-)</th>
                    <th className="py-3 px-2 text-right">Balance</th>
                    <th className="py-3 pr-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTimelineEntries.map((item) => {
                    const isDebit = item.debit > 0;
                    const dateObj = new Date(item.date);
                    const rawOrder = item.type === 'INVOICE' ? customerOrders.find(o => o.id === item.rawId || o.orderNumber === item.rawId) : null;
                    const rawRecovery = item.type === 'RECOVERY' ? customerRecoveries.find(r => r.id === item.rawId) : null;
                    const canManage = rawOrder
                      ? (canUserEditEntry(rawOrder, currentUser).allowed || canUserDeleteEntry(rawOrder, currentUser).allowed)
                      : rawRecovery
                      ? (canUserEditEntry(rawRecovery, currentUser).allowed || canUserDeleteEntry(rawRecovery, currentUser).allowed)
                      : false;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 pl-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {dateObj.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-4 px-2 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {item.reference}
                        </td>
                        <td className="py-4 px-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide border ${
                            isDebit 
                              ? 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800' 
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          }`}>
                            {isDebit ? 'Invoice' : 'Recovery'}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={item.description}>
                          {item.description}
                        </td>
                        <td className="py-4 px-2 text-right font-mono tabular-nums font-bold text-teal-700 dark:text-teal-400">
                          {isDebit ? `Rs. ${item.debit.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-4 px-2 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                          {!isDebit ? `Rs. ${item.credit.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-4 px-2 text-right font-mono tabular-nums font-black text-slate-900 dark:text-white">
                          Rs. {item.runningBalance?.toLocaleString()}
                        </td>
                        <td className="py-4 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedDetailEntry(item)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                              title="View Transaction Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => setSelectedEntryForManage({
                                  type: item.type === 'INVOICE' ? 'ORDER' : 'RECOVERY',
                                  data: rawOrder || rawRecovery,
                                })}
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                                title="Edit or Cancel / Reverse Entry"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< md) - Zero Horizontal Scroll */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTimelineEntries.map((item) => {
                const isDebit = item.debit > 0;
                const dateObj = new Date(item.date);
                return (
                  <div key={item.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums font-bold text-xs text-slate-900 dark:text-white uppercase">
                            {item.reference}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${
                            isDebit 
                              ? 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40' 
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40'
                          }`}>
                            {isDebit ? 'Invoiced' : 'Recovered'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {dateObj.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-black font-mono tabular-nums ${isDebit ? 'text-teal-700 dark:text-teal-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          {isDebit ? `+ Rs. ${item.debit.toLocaleString()}` : `- Rs. ${item.credit.toLocaleString()}`}
                        </div>
                        <div className="text-[10px] font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          Bal: Rs. {item.runningBalance?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60">
                      {item.description}
                    </div>
                    {item.isPending && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tighter">
                          Pending Shahzad Approval
                        </span>
                        {isApprover && (
                          <button
                            type="button"
                            onClick={() => {
                              setApprovingId(item.id);
                              if (item.type === 'INVOICE' && onApproveOrder) {
                                onApproveOrder(item.rawId, 'SHAHZAD');
                              } else if (item.type === 'RECOVERY' && onApproveRecovery) {
                                onApproveRecovery(item.rawId, 'SHAHZAD');
                              }
                              setTimeout(() => setApprovingId(null), 1200);
                            }}
                            disabled={approvingId === item.id}
                            className="h-8 px-3 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-black text-[10px] flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
                          >
                            <Check className="w-3 h-3" />
                            <span>{approvingId === item.id ? 'Wait...' : 'Approve'}</span>
                          </button>
                        )}
                      </div>
                    )}
                    {(() => {
                      const rawOrder = item.type === 'INVOICE' ? customerOrders.find(o => o.id === item.rawId || o.orderNumber === item.rawId) : null;
                      const rawRecovery = item.type === 'RECOVERY' ? customerRecoveries.find(r => r.id === item.rawId) : null;
                      const canManage = rawOrder
                        ? (canUserEditEntry(rawOrder, currentUser).allowed || canUserDeleteEntry(rawOrder, currentUser).allowed)
                        : rawRecovery
                        ? (canUserEditEntry(rawRecovery, currentUser).allowed || canUserDeleteEntry(rawRecovery, currentUser).allowed)
                        : false;

                      if (!canManage) return null;

                      return (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedEntryForManage({
                              type: item.type === 'INVOICE' ? 'ORDER' : 'RECOVERY',
                              data: rawOrder || rawRecovery,
                            })}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit / Cancel</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Edit or Delete / Reverse Daily Entry Modal */}
      {selectedEntryForManage && (
        <EditOrDeleteEntryModal
          isOpen={Boolean(selectedEntryForManage)}
          onClose={() => setSelectedEntryForManage(null)}
          entryType={selectedEntryForManage.type}
          entryData={selectedEntryForManage.data}
          currentUser={currentUser}
          onSave={(type, id, updates) => {
            if (type === 'ORDER' && onSaveOrderEdit) {
              onSaveOrderEdit(id, updates);
            } else if (type === 'RECOVERY' && onSaveRecoveryEdit) {
              onSaveRecoveryEdit(id, updates);
            }
          }}
          onDeleteOrReverse={(type, id, reason) => {
            if (type === 'ORDER' && onCancelOrReverseOrder) {
              onCancelOrReverseOrder(id, reason);
            } else if (type === 'RECOVERY' && onCancelOrReverseRecovery) {
              onCancelOrReverseRecovery(id, reason);
            }
          }}
        />
      )}

      {/* Transaction Details Inspector Modal */}
      {selectedDetailEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Transaction Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailEntry(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Reference:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedDetailEntry.reference}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Date:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedDetailEntry.date}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Type:</span>
                <span className="font-bold text-teal-700 dark:text-teal-400">{selectedDetailEntry.type}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Debit (+):</span>
                <span className="font-bold text-teal-700 dark:text-teal-400">PKR {selectedDetailEntry.debit?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Credit (-):</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">PKR {selectedDetailEntry.credit?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Running Balance:</span>
                <span className="font-bold text-slate-900 dark:text-white">PKR {selectedDetailEntry.runningBalance?.toLocaleString()}</span>
              </div>
              <div className="py-2">
                <span className="text-slate-400 block mb-1">Description / Particulars:</span>
                <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  {selectedDetailEntry.description}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedDetailEntry(null)}
                className="w-full py-2.5 bg-slate-900 text-white dark:bg-slate-800 font-bold text-xs rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
