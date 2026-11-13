/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Customer Order History Component (Mobile Experience)
 * Fetches and displays a comprehensive chronological list of past sales orders
 * for the selected customer, displaying status, date, item breakdowns, and quick export actions.
 */

import React, { useState, useMemo } from 'react';
import { Customer, SalesOrder } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import {
  ArrowLeft,
  Search,
  Calendar,
  Receipt,
  Download,
  Eye,
  MessageCircle,
  Package,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  Plus,
} from 'lucide-react';
import { downloadSalesInvoicePdf, buildInvoiceWhatsAppText } from '../../utils/exportInvoicePdf';
import { triggerHaptic } from '../../utils/haptics';

export interface OrderHistoryViewProps {
  customer: Customer;
  currentUser?: NLinkUser;
  orders?: SalesOrder[];
  onBack: () => void;
  onOpenNewOrder?: () => void;
  onPreviewInvoicePdf?: (order: SalesOrder, customer: Customer) => void;
  onWhatsAppShareInvoice?: (order: SalesOrder, customer: Customer) => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  customer,
  currentUser,
  orders = [],
  onBack,
  onOpenNewOrder,
  onPreviewInvoicePdf,
  onWhatsAppShareInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'OTHER'>('ALL');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);

  // Filter orders strictly for the selected customer
  const customerOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (!o || o.status === 'REJECTED') return false;
        const matchId =
          (customer?.id && (o.customerId === customer.id || o.customerId === customer.customerCode)) ||
          (customer?.customerCode && (o.customerCode === customer.customerCode || o.customerId === customer.customerCode));
        const matchName =
          customer?.companyName &&
          o.customerName &&
          o.customerName.toLowerCase().trim() === customer.companyName.toLowerCase().trim();
        return matchId || matchName;
      })
      .sort((a, b) => new Date(b.orderDate || b.createdAt || '').getTime() - new Date(a.orderDate || a.createdAt || '').getTime());
  }, [orders, customer]);

  // Filtered orders by search query and status filter
  const filteredOrders = useMemo(() => {
    return customerOrders.filter((order) => {
      const isApproved =
        order.status === 'APPROVED' ||
        order.status === 'INVOICED' ||
        order.status === 'DELIVERED' ||
        order.shahzadApproval === 'APPROVED' ||
        order.dualApprovalStatus === 'DUAL_APPROVED';

      const isPending = !isApproved && order.status !== 'REJECTED';

      if (selectedStatusFilter === 'APPROVED' && !isApproved) return false;
      if (selectedStatusFilter === 'PENDING' && !isPending) return false;
      if (selectedStatusFilter === 'OTHER' && (isApproved || isPending)) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchNum = (order.orderNumber || order.id || '').toLowerCase().includes(q);
      const matchItems = (order.items || []).some(
        (i) => (i.skuName || '').toLowerCase().includes(q) || (i.skuCode || '').toLowerCase().includes(q)
      );
      const matchDate = (order.orderDate || order.createdAt || '').includes(q);

      return matchNum || matchItems || matchDate;
    });
  }, [customerOrders, selectedStatusFilter, searchQuery]);

  // KPI Calculations
  const totalOrdersCount = customerOrders.length;
  const totalOrdersVolume = useMemo(() => {
    return customerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [customerOrders]);

  const approvedVolume = useMemo(() => {
    return customerOrders
      .filter((o) => o.status === 'APPROVED' || o.shahzadApproval === 'APPROVED' || o.dualApprovalStatus === 'DUAL_APPROVED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [customerOrders]);

  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalOrdersVolume / totalOrdersCount) : 0;

  const toggleExpand = (orderId: string) => {
    triggerHaptic('light');
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const handleDownloadPdf = async (order: SalesOrder) => {
    triggerHaptic('medium');
    setIsDownloadingId(order.id);
    try {
      await downloadSalesInvoicePdf({
        customer,
        order,
        previousBalance: customer.currentBalance ?? customer.openingBalance ?? 0,
      });
    } catch (err) {
      console.error('Invoice PDF generation failed:', err);
    } finally {
      setIsDownloadingId(null);
    }
  };

  const handleWhatsAppShare = (order: SalesOrder) => {
    triggerHaptic('light');
    if (onWhatsAppShareInvoice) {
      onWhatsAppShareInvoice(order, customer);
      return;
    }
    const text = buildInvoiceWhatsAppText(customer, order, { officerName: currentUser?.fullName });
    const encoded = encodeURIComponent(text);
    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const waNumber = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
    const url = waNumber ? `https://wa.me/${waNumber}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onBack();
              }}
              className="p-2 -ml-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              aria-label="Back to Customer 360"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {customer.companyName || 'Rasheed Electric'}
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                  {customer.customerCode || 'NL-PEW-RE01'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Order History • {customer.town || customer.city || 'Peshawar'}
              </p>
            </div>
          </div>

          {onOpenNewOrder && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenNewOrder();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Book Order</span>
            </button>
          )}
        </div>

        {/* Quick Search Input */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders by invoice #, date, or SKU name..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-transparent focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all outline-hidden"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              selectedStatusFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Orders ({customerOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('APPROVED')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              selectedStatusFilter === 'APPROVED'
                ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Approved ({customerOrders.filter((o) => o.status === 'APPROVED' || o.shahzadApproval === 'APPROVED').length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('PENDING')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              selectedStatusFilter === 'PENDING'
                ? 'bg-amber-600 text-white font-semibold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Pending Review (
            {customerOrders.filter((o) => o.status !== 'APPROVED' && o.shahzadApproval !== 'APPROVED').length})
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider block">
              Total Orders
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">
              {totalOrdersCount}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              PKR {totalOrdersVolume.toLocaleString()}
            </span>
          </div>

          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider block">
              Approved
            </span>
            <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
              PKR {approvedVolume.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block">Verified Sales</span>
          </div>

          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider block">
              Avg Order
            </span>
            <span className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
              PKR {avgOrderValue.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block">Per Booking</span>
          </div>
        </div>

        {/* Orders Listing */}
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Sales Orders Found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try adjusting your search query' : 'No past orders recorded for this customer yet.'}
            </p>
            {onOpenNewOrder && (
              <button
                type="button"
                onClick={onOpenNewOrder}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Book First Order
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const orderId = order.id || order.orderNumber;
              const isExpanded = expandedOrderId === orderId;
              const isApproved =
                order.status === 'APPROVED' ||
                order.status === 'INVOICED' ||
                order.status === 'DELIVERED' ||
                order.shahzadApproval === 'APPROVED' ||
                order.dualApprovalStatus === 'DUAL_APPROVED';

              const items = order.items || [];
              const totalItemsCount = items.reduce((sum, i) => sum + (i.orderedQuantity || i.quantity || 1), 0);

              return (
                <div
                  key={orderId}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden transition-all"
                >
                  {/* Card Header & Summary */}
                  <div className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                            {order.orderNumber || order.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : order.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            }`}
                          >
                            {isApproved ? 'Approved' : order.status || 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {order.orderDate || order.createdAt?.slice(0, 10) || '2026-11-02'}
                          </span>
                          <span>•</span>
                          <span>{order.salesUserName || 'Shahzad Ullah'}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white block font-mono">
                          Rs. {(order.totalAmount || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {items.length} {items.length === 1 ? 'Product' : 'Products'} ({totalItemsCount} units)
                        </span>
                      </div>
                    </div>

                    {/* Toggle Items Breakdown Button */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleExpand(orderId)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'Hide Items Breakdown' : 'View Items Breakdown'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Action Icons */}
                      <div className="flex items-center gap-1">
                        {onPreviewInvoicePdf && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              onPreviewInvoicePdf(order, customer);
                            }}
                            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Preview Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isDownloadingId === order.id}
                          onClick={() => handleDownloadPdf(order)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Download PDF Invoice"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWhatsAppShare(order)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Items List */}
                  {isExpanded && (
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 border-t border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in duration-150">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                        Order Items &amp; Pricing Breakdown
                      </span>
                      {items.length === 0 ? (
                        <p className="text-xs text-slate-400">No items listed for this order.</p>
                      ) : (
                        <div className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                          {items.map((item, idx) => (
                            <div key={item.id || idx} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">
                                    {item.skuCode || 'NL-SKU'}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                                    {item.skuName || 'National Light Product'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Qty: {item.orderedQuantity || item.quantity || 0} units
                                  {item.cartons ? ` (${item.cartons} ctn)` : ''} @ Rs. {(item.unitPrice || 0).toLocaleString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                                  Rs. {(item.lineTotal || (item.orderedQuantity || 1) * (item.unitPrice || 0)).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
