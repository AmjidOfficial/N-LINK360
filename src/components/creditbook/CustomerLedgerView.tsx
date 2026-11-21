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

  const filteredDebitTotal = useMemo(
    () => filteredTimelineEntries.reduce((sum, e) => sum + (e.debit || 0), 0),
    [filteredTimelineEntries]
  );
  const filteredCreditTotal = useMemo(
    () => filteredTimelineEntries.reduce((sum, e) => sum + (e.credit || 0), 0),
    [filteredTimelineEntries]
  );

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={onBack}
            className="btn-outline min-h-[44px] px-3 py-2 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Customer 360</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenSalesAuditModal && (
              <button
                type="button"
                onClick={onOpenSalesAuditModal}
                className="btn-outline min-h-[44px] sm:min-h-[38px] px-3 py-1.5 text-xs"
                title="Audit and verify Today's Sales Entries at Net TP (15% Less)"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Net TP Audit</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleWhatsAppStatement}
              className="btn-outline min-h-[44px] sm:min-h-[38px] px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300"
              title="Share statement on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="btn-outline min-h-[44px] sm:min-h-[38px] px-3 py-1.5 text-xs"
              title="Export to Excel Spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="btn-outline min-h-[44px] sm:min-h-[38px] px-3 py-1.5 text-xs"
              title="Print Ledger Statement"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="btn-primary min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 text-xs"
              title="Download Vector Ledger PDF"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Exporting...' : 'PDF'}</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#16A34A] dark:text-emerald-400" />
            Customer Ledger &amp; Khata Statement
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Authorized financial statement for <strong>{customer.companyName}</strong> ({customer.customerCode})
          </p>
        </div>

        {/* Search & Filter Control Bar */}
        <div className="space-y-2.5 pt-2 border-t border-[#E2E8F0] dark:border-slate-700/80">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions by reference, description, amount..."
                aria-label="Search ledger transactions"
                className="w-full min-h-[44px] pl-10 pr-11 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-white rounded-xl border border-[#E2E8F0] dark:border-slate-700 focus:border-[#16A34A] outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear ledger search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Direction Filter Toggle */}
            <div className="flex items-center gap-1 p-1 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setDirectionFilter('ALL')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  directionFilter === 'ALL'
                    ? 'bg-[#16A34A] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter('DEBIT_ONLY')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  directionFilter === 'DEBIT_ONLY'
                    ? 'bg-[#EA580C] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                Debits
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter('CREDIT_ONLY')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  directionFilter === 'CREDIT_ONLY'
                    ? 'bg-[#16A34A] text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                Credits
              </button>
            </div>

            {/* Sort Order Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'OLDEST_FIRST' ? 'NEWEST_FIRST' : 'OLDEST_FIRST'))}
              className="min-h-[44px] px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border border-[#E2E8F0] dark:border-slate-700"
              title="Toggle Oldest First vs Newest First"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400" />
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
                className="w-full min-h-[44px] px-3 py-1.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-xs font-mono tabular-nums text-[#0F172A] dark:text-white outline-hidden focus:border-[#16A34A]"
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
                className="w-full min-h-[44px] px-3 py-1.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-xs font-mono tabular-nums text-[#0F172A] dark:text-white outline-hidden focus:border-[#16A34A]"
              />
            </div>
          </div>
        </div>

        {/* Financial Overview Grid strictly complying with Section 2 Financial Terminology */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 items-stretch">
          <div className="h-full flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 min-w-0">
            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">Opening Balance</span>
            <span className="text-sm font-bold font-mono tabular-nums text-[#0F172A] dark:text-white mt-1 block truncate">
              PKR {openingBalance.toLocaleString()}
            </span>
          </div>

          <div className="h-full flex flex-col justify-between bg-orange-50/70 dark:bg-orange-950/30 p-3 rounded-xl border border-orange-200 dark:border-orange-800/60 min-w-0">
            <span className="text-[10px] font-bold uppercase text-orange-700 dark:text-orange-300 block">
              Invoices ({invoiceCount} Posted)
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-orange-900 dark:text-orange-200 mt-1 block truncate">
              PKR {postedInvoicesTotal.toLocaleString()}
            </span>
          </div>

          <div className="h-full flex flex-col justify-between bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 min-w-0">
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block">
              Recovery ({confirmedRecoveries.length} Confirmed)
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-emerald-800 dark:text-emerald-200 mt-1 block truncate">
              -PKR {confirmedRecoveriesTotal.toLocaleString()} CR
            </span>
          </div>

          <div className="h-full flex flex-col justify-between bg-[#0F172A] dark:bg-[#0B1120] p-3 rounded-xl border border-slate-700/80 text-white shadow-xs min-w-0">
            <span className="text-[10px] font-bold uppercase text-emerald-400 block">Closing Balance</span>
            <span className="text-sm font-bold font-mono tabular-nums text-white mt-1 block truncate">
              PKR {closingBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Dealer Ledger & Recovery Analytics Visual Strip */}
        {(() => {
          const creditLimit = customer.creditLimit ?? 250000;
          const utilPct = creditLimit > 0 ? Math.min(100, Math.round((Math.max(0, closingBalance) / creditLimit) * 100)) : 0;
          const availableHeadroom = Math.max(0, creditLimit - closingBalance);
          const totalGrossExposure = Math.max(0, openingBalance) + postedInvoicesTotal;
          const realizationPct = totalGrossExposure > 0
            ? Math.min(100, Math.round((confirmedRecoveriesTotal / totalGrossExposure) * 100))
            : confirmedRecoveriesTotal > 0
            ? 100
            : 0;

          const cashTotal = confirmedRecoveries
            .filter((r) => !r.paymentMode || r.paymentMode === 'CASH')
            .reduce((s, r) => s + (r.amount || 0), 0);
          const onlineTotal = confirmedRecoveries
            .filter((r) => r.paymentMode === 'ONLINE_TRANSFER')
            .reduce((s, r) => s + (r.amount || 0), 0);
          const chequeTotal = confirmedRecoveries
            .filter((r) => r.paymentMode === 'CHEQUE')
            .reduce((s, r) => s + (r.amount || 0), 0);
          const otherTotal = Math.max(0, confirmedRecoveriesTotal - cashTotal - onlineTotal - chequeTotal);
          const channelDenom = Math.max(1, confirmedRecoveriesTotal);

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 items-stretch">
              {/* 1. Credit Limit Utilization Meter */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Credit Utilization</span>
                  <span className={`font-mono tabular-nums ${
                    utilPct >= 90
                      ? 'text-rose-600 dark:text-rose-400'
                      : utilPct >= 70
                      ? 'text-[#EA580C] dark:text-orange-400'
                      : 'text-[#16A34A] dark:text-emerald-400'
                  }`}>
                    {utilPct}% Used
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(utilPct > 0 ? 4 : 0, utilPct)}%`,
                      backgroundColor: utilPct >= 90 ? '#DC2626' : utilPct >= 70 ? '#F97316' : '#16A34A',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  <span>Limit: {creditLimit.toLocaleString()}</span>
                  <span className="text-[#16A34A] dark:text-emerald-400 font-semibold">
                    Free: {availableHeadroom.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 2. Cashflow Realization Progress */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Recovery Realization</span>
                  <span className="font-mono tabular-nums text-[#16A34A] dark:text-emerald-400">
                    {realizationPct}% Settled
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-orange-200/80 dark:bg-orange-950/60 overflow-hidden flex">
                  <div
                    className="h-full bg-[#16A34A] transition-all duration-300"
                    style={{ width: `${realizationPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  <span>Billed: {totalGrossExposure.toLocaleString()}</span>
                  <span className="text-[#16A34A] dark:text-emerald-400 font-semibold">
                    Rec: {confirmedRecoveriesTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 3. Recovery Channel Mix */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Payment Channel Mix</span>
                  <span className="font-mono tabular-nums text-[#0F172A] dark:text-slate-200">
                    {confirmedRecoveries.length} Slips
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                  {confirmedRecoveriesTotal > 0 ? (
                    <>
                      {cashTotal > 0 && (
                        <div
                          className="h-full bg-[#16A34A]"
                          style={{ width: `${Math.round((cashTotal / channelDenom) * 100)}%` }}
                          title={`Cash: PKR ${cashTotal.toLocaleString()}`}
                        />
                      )}
                      {onlineTotal > 0 && (
                        <div
                          className="h-full bg-[#F97316]"
                          style={{ width: `${Math.round((onlineTotal / channelDenom) * 100)}%` }}
                          title={`Online Transfer: PKR ${onlineTotal.toLocaleString()}`}
                        />
                      )}
                      {chequeTotal > 0 && (
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${Math.round((chequeTotal / channelDenom) * 100)}%` }}
                          title={`Cheque: PKR ${chequeTotal.toLocaleString()}`}
                        />
                      )}
                      {otherTotal > 0 && (
                        <div
                          className="h-full bg-slate-500"
                          style={{ width: `${Math.round((otherTotal / channelDenom) * 100)}%` }}
                          title={`Other: PKR ${otherTotal.toLocaleString()}`}
                        />
                      )}
                    </>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-1 text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-400 truncate">
                  <span className="truncate">
                    Cash {confirmedRecoveriesTotal > 0 ? Math.round((cashTotal / channelDenom) * 100) : 0}%
                    {' · '}Bank {confirmedRecoveriesTotal > 0 ? Math.round((onlineTotal / channelDenom) * 100) : 0}%
                    {chequeTotal > 0 ? ` · Chq ${Math.round((chequeTotal / channelDenom) * 100)}%` : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Operational Credit & Health Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 items-stretch">
          <div className="h-full flex flex-col justify-between p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 min-w-0">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">Outstanding Balance</span>
            <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-slate-100 mt-0.5 truncate">
              PKR {outstandingBalance.toLocaleString()}
            </span>
          </div>
          <div className="h-full flex flex-col justify-between p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 min-w-0">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">Invoice Count</span>
            <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-slate-100 mt-0.5 truncate">
              {invoiceCount} Posted {pendingOrders.length > 0 ? `(${pendingOrders.length} Pending)` : ''}
            </span>
          </div>
          <div className="h-full flex flex-col justify-between p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 min-w-0">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">Recovery Days</span>
            <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-slate-100 mt-0.5 truncate">
              {recoveryDays} Days
            </span>
          </div>
          <div className="h-full flex flex-col justify-between p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/80 min-w-0">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">Invoice Aging</span>
            <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-slate-100 mt-0.5 truncate">
              {invoiceAging}
            </span>
          </div>
        </div>

        {/* Authoritative Financial Rule Verification Banner */}
        <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
          <span className="text-[#0F172A] dark:text-emerald-200 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400 shrink-0" />
            Opening ({openingBalance.toLocaleString()}) + Invoices ({postedInvoicesTotal.toLocaleString()}) - Recovery ({confirmedRecoveriesTotal.toLocaleString()}) = Closing ({closingBalance.toLocaleString()}) PKR
          </span>
          <span className="text-[#16A34A] dark:text-emerald-400 font-bold uppercase text-[10px]">
            Audited Khata Rule
          </span>
        </div>
      </div>

      {/* Ledger Transactions Table with Centered National Light Watermark */}
      <div className="relative bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs overflow-hidden">
        <DocumentCenterWatermark title="CUSTOMER KHATA LEDGER" />
        <div className="relative z-10">
        <div className="p-4 bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
          <NationalLightHeaderBrand size="sm" />
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-slate-200 tabular-nums">
              Account Statement History ({filteredTimelineEntries.length} Transactions)
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
              Invoices (+), Recovery (-), Balance
            </span>
          </div>
        </div>

        {filteredTimelineEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#16A34A]" />
            <p className="font-bold text-sm text-[#0F172A] dark:text-slate-200">No Ledger Entries</p>
            <p className="mt-1 tabular-nums">Only the opening balance of PKR {openingBalance.toLocaleString()} is currently on file.</p>
          </div>
        ) : (
          <div className="w-full">
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-xs text-left">
                <thead>
                  <tr className="bg-[#0F172A] dark:bg-[#0B1120] text-[10px] font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700/80">
                    <th className="py-3 pl-4 pr-3 frozen-first-col bg-[#0F172A] dark:bg-[#0B1120]">Date</th>
                    <th className="py-3 px-2">Reference</th>
                    <th className="py-3 px-2 text-center">Type</th>
                    <th className="py-3 px-2">Particulars</th>
                    <th className="py-3 px-2 text-right">Debit (+)</th>
                    <th className="py-3 px-2 text-right">Credit (-)</th>
                    <th className="py-3 px-2 text-right">Balance</th>
                    <th className="py-3 pr-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
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
                      <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 pl-4 pr-3 frozen-first-col font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {dateObj.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-2 font-mono tabular-nums font-bold text-[#0F172A] dark:text-white whitespace-nowrap">
                          {item.reference}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                            isDebit 
                              ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                          }`}>
                            {isDebit ? 'Invoice' : 'Recovery'}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title={item.description}>
                          {item.description}
                        </td>
                        <td className="py-3.5 px-2 text-right font-mono tabular-nums font-bold text-[#0F172A] dark:text-orange-300 whitespace-nowrap">
                          {isDebit ? `PKR ${item.debit.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3.5 px-2 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {!isDebit ? `-PKR ${item.credit.toLocaleString()} CR` : '—'}
                        </td>
                        <td className="py-3.5 px-2 text-right font-mono tabular-nums font-bold text-[#0F172A] dark:text-white whitespace-nowrap">
                          PKR {(item.runningBalance ?? 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedDetailEntry(item)}
                              aria-label="View Transaction Details"
                              className="w-10 h-10 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center cursor-pointer transition-colors"
                              title="View Transaction Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => setSelectedEntryForManage({
                                  type: item.type === 'INVOICE' ? 'ORDER' : 'RECOVERY',
                                  data: rawOrder || rawRecovery,
                                })}
                                aria-label="Edit or Cancel Entry"
                                className="w-10 h-10 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center cursor-pointer transition-colors"
                                title="Edit or Cancel / Reverse Entry"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F8FAFC] dark:bg-[#0F172A] border-t-2 border-[#E2E8F0] dark:border-slate-700 font-bold text-xs">
                    <td className="py-3.5 pl-4 pr-3 frozen-first-col bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-white uppercase tracking-wider text-[10px]">
                      Totals ({filteredTimelineEntries.length})
                    </td>
                    <td className="py-3.5 px-2 text-slate-500 dark:text-slate-400" colSpan={3}>
                      Filtered Statement Totals
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono tabular-nums text-[#0F172A] dark:text-orange-300 whitespace-nowrap">
                      PKR {filteredDebitTotal.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      -PKR {filteredCreditTotal.toLocaleString()} CR
                    </td>
                    <td className="py-3.5 px-2 text-right font-mono tabular-nums text-[#0F172A] dark:text-white whitespace-nowrap">
                      PKR {closingBalance.toLocaleString()}
                    </td>
                    <td className="py-3.5 pr-4" />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Card View (< md) - Zero Horizontal Scroll */}
            <div className="md:hidden divide-y divide-[#E2E8F0] dark:divide-slate-800">
              {filteredTimelineEntries.map((item) => {
                const isDebit = item.debit > 0;
                const dateObj = new Date(item.date);
                return (
                  <div key={item.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono tabular-nums font-bold text-xs text-[#0F172A] dark:text-white uppercase">
                            {item.reference}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                            isDebit 
                              ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                          }`}>
                            {isDebit ? 'Invoiced' : 'Recovered'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {dateObj.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xs font-bold font-mono tabular-nums ${isDebit ? 'text-[#0F172A] dark:text-orange-300' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          {isDebit ? `+PKR ${item.debit.toLocaleString()}` : `-PKR ${item.credit.toLocaleString()} CR`}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                          Bal: PKR {(item.runningBalance ?? 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-[#F8FAFC] dark:bg-[#0F172A] p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
                      {item.description}
                    </div>
                    {item.isPending && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight">
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
                            className="btn-primary min-h-[44px] px-3.5 text-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
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
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailEntry(item)}
                            className="btn-outline min-h-[44px] px-3 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedEntryForManage({
                              type: item.type === 'INVOICE' ? 'ORDER' : 'RECOVERY',
                              data: rawOrder || rawRecovery,
                            })}
                            className="btn-outline min-h-[44px] px-3 text-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-[#E2E8F0] dark:border-slate-700/80 shadow-2xl w-full max-w-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-700/80">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#16A34A] dark:text-emerald-400" />
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Transaction Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailEntry(null)}
                aria-label="Close transaction details"
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono tabular-nums">
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0] dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Reference</span>
                <span className="font-bold text-[#0F172A] dark:text-white">{selectedDetailEntry.reference}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0] dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Date</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedDetailEntry.date}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0] dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Type</span>
                <span className={`font-bold ${selectedDetailEntry.type === 'INVOICE' ? 'text-[#EA580C] dark:text-orange-400' : 'text-[#16A34A] dark:text-emerald-400'}`}>
                  {selectedDetailEntry.type}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0] dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Debit (+)</span>
                <span className="font-bold text-[#0F172A] dark:text-orange-300">PKR {selectedDetailEntry.debit?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0] dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Credit (-)</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">-PKR {selectedDetailEntry.credit?.toLocaleString()} CR</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0] dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Running Balance</span>
                <span className="font-bold text-[#0F172A] dark:text-white">PKR {selectedDetailEntry.runningBalance?.toLocaleString()}</span>
              </div>
              <div className="py-2">
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Description / Particulars</span>
                <p className="text-slate-700 dark:text-slate-300 bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 font-sans">
                  {selectedDetailEntry.description}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedDetailEntry(null)}
                className="btn-outline w-full min-h-[44px] text-xs"
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
