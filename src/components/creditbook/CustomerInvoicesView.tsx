/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Customer Invoices View
 * Date-wise invoices list with:
 * - View detailed invoice modal
 * - Download Official Vector Tax Invoice PDF
 * - WhatsApp share formatted invoice text
 * - Print invoice
 */

import React, { useState } from 'react';
import { Customer, SalesOrder } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import {
  ArrowLeft,
  Receipt,
  Download,
  Eye,
  MessageCircle,
  MessageSquare,
  Printer,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  X,
} from 'lucide-react';
import { downloadSalesInvoicePdf, buildInvoiceWhatsAppText } from '../../utils/exportInvoicePdf';
import { formatKarachiDate, formatKarachiDateTime } from '../../utils/dateTime';
import { NationalLightHeaderBrand, DocumentCenterWatermark } from '../NationalLightLogo';

export interface CustomerInvoicesViewProps {
  customer: Customer;
  currentUser?: NLinkUser;
  orders?: SalesOrder[];
  invoices?: SalesOrder[];
  onBack: () => void;
  onPreviewPdf?: (order: SalesOrder, customer: Customer) => void;
  onPreviewInvoicePdf?: (order: SalesOrder, customer: Customer) => void;
  onOpenNewOrder?: () => void;
  onDownloadInvoicePdf?: (order: SalesOrder, customer: Customer) => void;
  onWhatsAppShareInvoice?: (order: SalesOrder, customer: Customer) => void;
}

export const CustomerInvoicesView: React.FC<CustomerInvoicesViewProps> = ({
  customer,
  currentUser,
  orders,
  invoices,
  onBack,
  onPreviewPdf,
  onPreviewInvoicePdf,
  onOpenNewOrder,
  onDownloadInvoicePdf,
  onWhatsAppShareInvoice,
}) => {
  const triggerPreview = onPreviewInvoicePdf || onPreviewPdf;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesOrder | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Safe fallback list of orders / invoices
  const safeOrdersList = orders || invoices || [];

  // Filter orders for this customer safely
  const customerOrders = (safeOrdersList || [])
    .filter((o) => o && (
      o.customerId === customer?.id ||
      o.customerId === customer?.customerCode ||
      o.customerCode === customer?.customerCode ||
      (o.customerName && customer?.companyName && o.customerName.toLowerCase().trim() === customer.companyName.toLowerCase().trim())
    ))
    .sort((a, b) => new Date(b.orderDate || b.createdAt || '').getTime() - new Date(a.orderDate || a.createdAt || '').getTime());

  // Status counts
  const approvedCount = customerOrders.filter(
    (o) => o.status === 'APPROVED' || o.shahzadApproval === 'APPROVED'
  ).length;
  const rejectedCount = customerOrders.filter(
    (o) => o.status === 'REJECTED' || o.shahzadApproval === 'REJECTED'
  ).length;
  const pendingCount = customerOrders.filter(
    (o) =>
      o.status !== 'APPROVED' &&
      o.status !== 'REJECTED' &&
      o.shahzadApproval !== 'APPROVED' &&
      o.shahzadApproval !== 'REJECTED'
  ).length;

  const filteredOrders = customerOrders.filter((o) => {
    const isApproved = o.status === 'APPROVED' || o.shahzadApproval === 'APPROVED';
    const isRejected = o.status === 'REJECTED' || o.shahzadApproval === 'REJECTED';
    const isPending = !isApproved && !isRejected;

    // Status filter check
    if (statusFilter === 'APPROVED' && !isApproved) return false;
    if (statusFilter === 'REJECTED' && !isRejected) return false;
    if (statusFilter === 'PENDING' && !isPending) return false;

    // Search query check
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (o.orderNumber || '').toLowerCase().includes(query) ||
      (o.id || '').toLowerCase().includes(query) ||
      (o.status || '').toLowerCase().includes(query) ||
      (o.rejectionReason || '').toLowerCase().includes(query)
    );
  });

  const handleDownload = async (order: SalesOrder) => {
    if (onDownloadInvoicePdf) {
      onDownloadInvoicePdf(order, customer);
      return;
    }
    setIsDownloading(order.id || order.orderNumber);
    try {
      await downloadSalesInvoicePdf({
        customer,
        order,
        previousBalance: customer?.currentBalance ?? customer?.openingBalance ?? 0,
        preparedByName: currentUser?.fullName || 'Field Officer',
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleWhatsApp = (order: SalesOrder) => {
    if (onWhatsAppShareInvoice) {
      onWhatsAppShareInvoice(order, customer);
      return;
    }
    const text = buildInvoiceWhatsAppText(customer, order, {
      officerName: currentUser?.fullName || 'Field Officer',
      officerPhone: currentUser?.phone || '',
    });
    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSms = (order: SalesOrder) => {
    const text = buildInvoiceWhatsAppText(customer, order, {
      officerName: currentUser?.fullName || 'Field Officer',
      officerPhone: currentUser?.phone || '',
    }).replace(/\*/g, '');
    const cleanPhone = (customer.phone || '').replace(/[^0-9+]/g, '');
    const smsUrl = cleanPhone
      ? `sms:${cleanPhone}?body=${encodeURIComponent(text)}`
      : `sms:?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            type="button"
            onClick={onBack}
            className="btn-outline min-h-[44px] px-3 py-2 text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Customer 360</span>
          </button>

          <span className="text-xs font-mono tabular-nums font-bold text-slate-500 dark:text-slate-400">
            {customerOrders.length} Invoices
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#16A34A] dark:text-emerald-400" />
              Invoices &amp; Bills
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Tax invoices issued to <strong>{customer.companyName}</strong> ({customer.town || customer.city})
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoice #..."
              aria-label="Search invoice number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-11 py-2 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-xs text-[#0F172A] dark:text-white focus:border-[#16A34A] outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear invoice search"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-[#E2E8F0] dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>All Invoices</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                statusFilter === 'ALL'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {customerOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('APPROVED')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                statusFilter === 'APPROVED'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'PENDING'
                ? 'bg-[#F97316] text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                statusFilter === 'PENDING'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
              }`}
            >
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : rejectedCount > 0
                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 hover:bg-rose-200 border border-rose-300 dark:border-rose-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/40'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected Orders</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                statusFilter === 'REJECTED'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-bold'
              }`}
            >
              {rejectedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Rejected Alert Notice Banner if filter is REJECTED or has rejected orders */}
      {statusFilter === 'REJECTED' && rejectedCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-3 shadow-xs">
          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-rose-950 dark:text-rose-100 text-xs uppercase tracking-wide">
              {rejectedCount} Rejected Order{rejectedCount > 1 ? 's' : ''} Identified
            </h3>
            <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5">
              These orders were returned by Shahzad Ullah (Executive Office) due to credit limits, overdue recovery balances, or item allocation holds. Field officers can review notes below and book revised replacement orders.
            </p>
          </div>
        </div>
      )}

      {/* Invoices List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-8 border border-[#E2E8F0] dark:border-slate-700/80 text-center text-slate-500 dark:text-slate-400 text-xs">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#16A34A]" />
            <p className="font-bold text-sm text-[#0F172A] dark:text-slate-200">No Invoices Found</p>
            <p className="mt-1">No sales orders or invoices match your filter.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isApproved = order.status === 'APPROVED';
            const isRejected = order.status === 'REJECTED';

            return (
              <div
                key={order.id || order.orderNumber}
                onClick={() => setSelectedInvoice(order)}
                className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-slate-700/80 shadow-xs hover:border-[#16A34A] dark:hover:border-emerald-500/70 transition-all space-y-3 cursor-pointer"
              >
                {/* Top Row: Invoice #, Date & Status */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                      #{order.orderNumber || order.id?.slice(-6)}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 border ${
                        isApproved
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                          : isRejected
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Approved (ShahzadUllah)
                        </>
                      ) : isRejected ? (
                        <>
                          <XCircle className="w-3 h-3" /> Rejected
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> Pending ShahzadUllah
                        </>
                      )}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1 font-mono tabular-nums">
                      <Calendar className="w-3.5 h-3.5" />
                      Invoice: {formatKarachiDate(order.invoiceDate || order.orderDate || order.createdAt)}
                    </span>
                    {order.createdAt && (
                      <span className="text-[10px] font-mono tabular-nums text-slate-400 block">
                        Entered: {formatKarachiDateTime(order.createdAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rejection Details & Reason if Rejected */}
                {isRejected && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-900 dark:text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300">
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Executive Sign-Off Rejection (Shahzad Ullah)</span>
                    </div>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                      Reason: {order.rejectionReason || 'Sanctioned credit ceiling reached. Settle past due balance before re-booking.'}
                    </p>
                  </div>
                )}

                {/* Line Items Brief */}
                <div className="bg-[#F8FAFC] dark:bg-[#0F172A] p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-[#0F172A] dark:text-slate-200 block tabular-nums">
                      {order.items?.length || 1} Line Items
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {order.items?.map((i) => `${i.skuName} (${i.orderedQuantity} pcs)`).join(', ') || 'National Lights Official SKUs'}
                    </span>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Invoice Amount</span>
                    <span className="text-base font-bold font-mono tabular-nums text-[#EA580C] dark:text-orange-400">
                      PKR {Number(order.totalAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div
                  className="flex items-center justify-between gap-2 pt-1 flex-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(order)}
                    className="btn-outline min-h-[44px] sm:min-h-[40px] px-3 py-1.5 text-xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400" />
                    <span>View Bill</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleWhatsApp(order)}
                      className="btn-outline min-h-[44px] sm:min-h-[40px] px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSms(order)}
                      className="btn-outline min-h-[44px] sm:min-h-[40px] px-3 py-1.5 text-xs text-[#EA580C] dark:text-orange-400"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Msg</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(order)}
                      disabled={isDownloading === (order.id || order.orderNumber)}
                      className="btn-primary min-h-[44px] sm:min-h-[40px] px-3.5 py-1.5 text-xs"
                    >
                      <Download className={`w-3.5 h-3.5 ${isDownloading === (order.id || order.orderNumber) ? 'animate-bounce' : ''}`} />
                      <span>{isDownloading === (order.id || order.orderNumber) ? 'Generating...' : 'PDF'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Full Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1E293B] w-full max-w-xl rounded-2xl shadow-2xl border border-[#E2E8F0] dark:border-slate-700/80 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#0F172A] dark:bg-[#0B1120] border-b border-slate-800 p-4 sm:p-5 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Receipt className="w-6 h-6 text-[#4ADE80] shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-white truncate font-mono tabular-nums">
                    Invoice #{selectedInvoice.orderNumber}
                  </h2>
                  <span className="text-[11px] text-slate-300 truncate block">{customer.companyName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                aria-label="Close invoice detail"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with Centered Watermark */}
            <div className="relative p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <DocumentCenterWatermark title="NATIONAL LIGHT INVOICE" />
              <div className="relative z-10 space-y-4">
              <div className="pb-3 border-b border-[#E2E8F0] dark:border-slate-700/80 flex items-center justify-between gap-2">
                <NationalLightHeaderBrand size="sm" />
                <span className="text-[10px] font-mono font-bold text-[#16A34A] dark:text-emerald-300 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60">
                  OFFICIAL TAX INVOICE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">Customer</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">{customer.companyName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">Date</span>
                  <span className="font-bold font-mono tabular-nums text-[#0F172A] dark:text-white">
                    {new Date(selectedInvoice.orderDate || selectedInvoice.createdAt || '').toLocaleDateString('en-PK')}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-[#E2E8F0] dark:border-slate-700/80 rounded-xl overflow-hidden">
                <div className="bg-[#0F172A] dark:bg-[#0B1120] px-3.5 py-2.5 text-[10px] font-bold uppercase text-slate-200 flex justify-between">
                  <span>Product SKU</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                  {selectedInvoice.items?.map((item, idx) => (
                    <div key={item.id || idx} className="p-3.5 flex justify-between items-center gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-[#0F172A] dark:text-white">{item.skuName}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {item.cartons || 0} Cartons &bull; {item.orderedQuantity} pcs &times; PKR {item.unitPrice}
                        </p>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white shrink-0">
                        PKR {Number(item.lineTotal || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-[#F8FAFC] dark:bg-[#0F172A] p-3.5 border-t border-[#E2E8F0] dark:border-slate-700 flex justify-between items-center">
                  <span className="font-bold text-[#0F172A] dark:text-slate-200">Total Invoice Net</span>
                  <span className="font-mono tabular-nums font-bold text-sm text-[#F97316] dark:text-orange-400">
                    PKR {Number(selectedInvoice.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#F8FAFC] dark:bg-[#0F172A] border-t border-[#E2E8F0] dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleWhatsApp(selectedInvoice)}
                  className="btn-outline min-h-[44px] px-3.5 text-xs text-emerald-700 dark:text-emerald-300"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSms(selectedInvoice)}
                  className="btn-outline min-h-[44px] px-3.5 text-xs text-[#EA580C] dark:text-orange-400"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Msg</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleDownload(selectedInvoice);
                  setSelectedInvoice(null);
                }}
                className="btn-primary min-h-[44px] px-4 text-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
