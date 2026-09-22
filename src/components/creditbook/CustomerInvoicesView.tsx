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

export interface CustomerInvoicesViewProps {
  customer: Customer;
  currentUser: NLinkUser;
  orders: SalesOrder[];
  onBack: () => void;
  onPreviewPdf?: (order: SalesOrder, customer: Customer) => void;
}

export const CustomerInvoicesView: React.FC<CustomerInvoicesViewProps> = ({
  customer,
  currentUser,
  orders,
  onBack,
  onPreviewPdf,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesOrder | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Filter orders for this customer
  const customerOrders = orders
    .filter((o) => o.customerId === customer.id || o.customerName === customer.companyName)
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
    setIsDownloading(order.id || order.orderNumber);
    try {
      await downloadSalesInvoicePdf({
        customer,
        order,
        previousBalance: customer.currentBalance ?? customer.openingBalance ?? 0,
        preparedByName: currentUser.fullName,
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleWhatsApp = (order: SalesOrder) => {
    const text = buildInvoiceWhatsAppText(customer, order, {
      officerName: currentUser.fullName,
      officerPhone: currentUser.phone,
    });
    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Customer 360</span>
          </button>

          <span className="text-xs font-mono font-bold text-slate-500">
            {customerOrders.length} Invoices
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              Invoices &amp; Bills
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Tax invoices issued to <strong>{customer.companyName}</strong> ({customer.town || customer.city})
            </p>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
            />
          </div>
        </div>

        {/* Status Filter Bar (Specification: All, Pending, Approved, Rejected) */}
        <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>All Invoices</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === 'ALL'
                  ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {customerOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === 'APPROVED'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === 'PENDING'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
              }`}
            >
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-700 text-white shadow-xs'
                : rejectedCount > 0
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 hover:bg-rose-200 border border-rose-300 animate-pulse'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/40'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected Orders</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
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
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-black text-rose-950 dark:text-rose-100 text-xs uppercase tracking-wide">
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Invoices Found</p>
            <p className="mt-1">No sales orders or invoices match your filter.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isApproved = order.status === 'APPROVED';
            const isRejected = order.status === 'REJECTED';
            const isPending = !isApproved && !isRejected;
            const orderDate = new Date(order.orderDate || order.createdAt || '');

            return (
              <div
                key={order.id || order.orderNumber}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-300 dark:hover:border-teal-700 transition-all space-y-3"
              >
                {/* Top Row: Invoice #, Date & Status */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
                      #{order.orderNumber || order.id?.slice(-6)}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isApproved
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                          : isRejected
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200'
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

                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {orderDate.toLocaleDateString('en-PK', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Rejection Details & Reason if Rejected */}
                {isRejected && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-900 dark:text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-black text-rose-800 dark:text-rose-300">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Executive Sign-Off Rejection (Shahzad Ullah)</span>
                    </div>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                      Reason: {order.rejectionReason || 'Sanctioned credit ceiling reached. Settle past due balance before re-booking.'}
                    </p>
                  </div>
                )}

                {/* Line Items Brief */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {order.items?.length || 1} Line Items
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {order.items?.map((i) => `${i.skuName} (${i.orderedQuantity} pcs)`).join(', ') || 'National Lights Official SKUs'}
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Invoice Amount</span>
                    <span className="text-base font-black font-mono text-teal-800 dark:text-teal-300">
                      Rs. {Number(order.totalAmount || 0).toLocaleString()} PKR
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(order)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                    <span>View Bill</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleWhatsApp(order)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {onPreviewPdf && (
                      <button
                        type="button"
                        onClick={() => onPreviewPdf(order, customer)}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 hover:bg-teal-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDownload(order)}
                      disabled={isDownloading === (order.id || order.orderNumber)}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Download className={`w-3.5 h-3.5 ${isDownloading === (order.id || order.orderNumber) ? 'animate-bounce' : ''}`} />
                      <span>{isDownloading === (order.id || order.orderNumber) ? 'Generating...' : 'Download PDF'}</span>
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
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-6 h-6 text-teal-300" />
                <div>
                  <h2 className="text-base font-black text-white">
                    Invoice #{selectedInvoice.orderNumber}
                  </h2>
                  <span className="text-[11px] text-teal-200">{customer.companyName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer</span>
                  <span className="font-bold text-slate-900 dark:text-white">{customer.companyName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Date</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {new Date(selectedInvoice.orderDate || selectedInvoice.createdAt || '').toLocaleDateString('en-PK')}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Product SKU</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedInvoice.items?.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.skuName}</p>
                        <p className="text-[10px] text-slate-500">
                          {item.cartons || 0} Cartons &bull; {item.orderedQuantity} pcs &times; Rs. {item.unitPrice}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        Rs. {Number(item.lineTotal || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-teal-50 dark:bg-teal-950 p-3 border-t border-teal-200 dark:border-teal-900 flex justify-between items-center">
                  <span className="font-bold text-teal-900 dark:text-teal-200">Total Invoice Net</span>
                  <span className="font-mono font-black text-sm text-teal-900 dark:text-teal-200">
                    Rs. {Number(selectedInvoice.totalAmount || 0).toLocaleString()} PKR
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleWhatsApp(selectedInvoice)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDownload(selectedInvoice);
                  setSelectedInvoice(null);
                }}
                className="px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-300" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
