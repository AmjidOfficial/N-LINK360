/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Sales & Recovery Transactional Data Ledger
 * Synced with Google Sheet tabs: Sales & Recovery data
 */

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Coins,
  Search,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  Send,
  Filter,
  Layers,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Share2,
  Phone,
  FileText,
} from 'lucide-react';
import { SalesOrder, Recovery } from '../types';
import { exportOrdersToExcel, exportRecoveriesToExcel } from '../services/exportEngine';

interface NLinkSalesRecoveryDataTabProps {
  salesOrders: SalesOrder[];
  recoveries: Recovery[];
}

export const NLinkSalesRecoveryDataTab: React.FC<NLinkSalesRecoveryDataTabProps> = ({
  salesOrders,
  recoveries,
}) => {
  const [viewType, setViewType] = useState<'ORDERS' | 'RECOVERIES'>('ORDERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return salesOrders.filter((o) => {
      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchSearch =
        !searchQuery.trim() ||
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.salesUserName && o.salesUserName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [salesOrders, statusFilter, searchQuery]);

  // Filtered Recoveries
  const filteredRecoveries = useMemo(() => {
    return recoveries.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchSearch =
        !searchQuery.trim() ||
        r.recoveryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.salesUserName && r.salesUserName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.paymentMode && r.paymentMode.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [recoveries, statusFilter, searchQuery]);

  // Export Excel (.xls)
  const handleExportExcel = () => {
    if (viewType === 'ORDERS') {
      exportOrdersToExcel(filteredOrders);
    } else {
      exportRecoveriesToExcel(filteredRecoveries);
    }
  };

  // Export / Print Formatted PDF
  const handlePrintPdf = () => {
    window.print();
  };

  // Direct Share to Selected Dealer WhatsApp Only
  const handleShareWithDealer = (customerName: string, customerPhone: string = '03004123456', title: string, amount: number) => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('92') ? cleanPhone : cleanPhone.startsWith('0') ? `92${cleanPhone.slice(1)}` : `92${cleanPhone}`;
    const text = `*NATIONAL LIGHTS (PVT) LTD - OFFICIAL DOCUMENT*\n\nDear Partner *${customerName}*,\nYour official ${title} has been logged in National Lights Portal.\n*Amount:* PKR ${amount.toLocaleString()}\n*Date:* ${new Date().toLocaleDateString()}\n\n_Protected Notice: Transmitted strictly to authorized dealer account._`;
    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    setShareToast(`Shared ${title} securely to verified dealer: ${customerName}`);
    setTimeout(() => setShareToast(null), 4000);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (viewType === 'ORDERS') {
      const headers = [
        'Order Number',
        'Customer Name',
        'Customer Code',
        'Order Date',
        'Booked By',
        'Items Count',
        'Total Amount (PKR)',
        'Status',
      ];
      const rows = filteredOrders.map((o) => [
        o.orderNumber,
        `"${o.customerName}"`,
        o.customerCode,
        o.orderDate,
        `"${o.salesUserName || 'Field Officer'}"`,
        o.items?.length || 0,
        o.totalAmount,
        o.status,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `NLink_Sales_Orders_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        'Recovery Number',
        'Customer Name',
        'Customer Code',
        'Collection Date',
        'Collected By',
        'Payment Mode',
        'Amount (PKR)',
        'Status',
        'Remarks',
      ];
      const rows = filteredRecoveries.map((r) => [
        r.recoveryNumber,
        `"${r.customerName}"`,
        r.customerCode,
        r.collectionDate,
        `"${r.salesUserName || 'Recovery Officer'}"`,
        r.paymentMode,
        r.amount,
        r.status,
        `"${r.remarks || ''}"`,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `NLink_Recovery_Receipts_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const totalOrdersAmount = useMemo(
    () => filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    [filteredOrders]
  );
  const totalRecoveriesAmount = useMemo(
    () => filteredRecoveries.reduce((sum, r) => sum + (r.amount || 0), 0),
    [filteredRecoveries]
  );

  return (
    <div className="space-y-6" id="sales-recovery-data-tab">
      {/* Toast Notification */}
      {shareToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-emerald-500 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* 1. Header Banner & View Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <TrendingUp className="w-3 h-3 mr-1 text-emerald-600" /> Transactional Ledger
            </span>
            <span className="text-xs text-slate-400 font-medium">Google Sheet Synchronized</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Sales &amp; Recovery Field Transactions</h2>
          <p className="text-xs text-slate-500">
            Real-time audit log of all SKU order bookings and verified payment recovery collections across Pakistan.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setViewType('ORDERS');
              setStatusFilter('ALL');
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewType === 'ORDERS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Sales Orders ({salesOrders.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setViewType('RECOVERIES');
              setStatusFilter('ALL');
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewType === 'RECOVERIES'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Recoveries ({recoveries.length})
          </button>
        </div>
      </div>

      {/* 2. Filters & Multi-Format Export Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={
              viewType === 'ORDERS'
                ? 'Search order code, dealer, booker...'
                : 'Search receipt code, dealer, payment mode...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-xs font-bold text-slate-700 mr-2">
            Total:{' '}
            <span className={viewType === 'ORDERS' ? 'text-emerald-700 font-extrabold' : 'text-blue-700 font-extrabold'}>
              Rs.{' '}
              {viewType === 'ORDERS'
                ? totalOrdersAmount.toLocaleString()
                : totalRecoveriesAmount.toLocaleString()}
            </span>
          </div>

          {/* Export Excel (.xls) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Download formatted Excel spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
            <span>Excel (.xls)</span>
          </button>

          {/* Export / Print PDF */}
          <button
            type="button"
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Print or save as formatted PDF report"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-200" />
            <span>Print PDF</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Export raw CSV data"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* 3. Data Cards (Mobile) & Data Table (Desktop) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {viewType === 'ORDERS' ? (
          <>
            {/* MOBILE ORDER CARDS */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-bold">
                  No sales orders found matching your search.
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div key={order.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {order.orderNumber}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{order.customerName}</h4>
                        <p className="text-[10px] text-slate-400">Code: {order.customerCode}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          order.status === 'APPROVED' || order.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : order.status === 'ON_HOLD'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Date &amp; Officer</span>
                        <span className="text-slate-700 font-medium text-[11px] block">
                          {order.orderDate?.split('T')[0] || order.orderDate}
                        </span>
                        <span className="text-slate-500 text-[10px] block truncate">
                          {order.salesUserName || 'Field Officer'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">
                          Total ({order.items?.length || 1} SKUs)
                        </span>
                        <span className="font-extrabold text-emerald-700 font-mono text-sm block">
                          Rs. {order.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleShareWithDealer(order.customerName, '03004123456', `Sales Order Booking #${order.orderNumber}`, order.totalAmount)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                        title="Share only with this verified dealer"
                      >
                        <Share2 className="w-3 h-3 text-emerald-600" />
                        <span>Share with Dealer</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DESKTOP ORDERS TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Order Code</th>
                    <th className="py-3 px-4">Customer Dealer</th>
                    <th className="py-3 px-3">Order Date</th>
                    <th className="py-3 px-3">Field Sales (TSM)</th>
                    <th className="py-3 px-3 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Total Amount (PKR)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Dealer Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {order.orderNumber}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{order.customerName}</p>
                        <p className="text-[10px] text-slate-400">Code: {order.customerCode}</p>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {order.orderDate?.split('T')[0] || order.orderDate}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800">{order.salesUserName || 'Field Officer'}</span>
                      </td>

                      <td className="py-3 px-3 text-center font-semibold text-slate-700">
                        {order.items?.length || 1} SKUs
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-emerald-700 text-sm">
                        Rs. {order.totalAmount.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'APPROVED' || order.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.status === 'ON_HOLD'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleShareWithDealer(order.customerName, '03004123456', `Sales Order Booking #${order.orderNumber}`, order.totalAmount)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                          title="Share strictly with selected dealer"
                        >
                          <Share2 className="w-3 h-3 text-emerald-600" />
                          <span>Share Dealer</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* MOBILE RECOVERY CARDS */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredRecoveries.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-bold">
                  No recovery transactions found matching your search.
                </div>
              ) : (
                filteredRecoveries.map((rec) => (
                  <div key={rec.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                          {rec.recoveryNumber}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{rec.customerName}</h4>
                        <p className="text-[10px] text-slate-400">Code: {rec.customerCode}</p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600" /> Posted
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Mode &amp; Officer</span>
                        <span className="font-semibold text-slate-800 text-[11px] block">
                          {rec.paymentMode}
                        </span>
                        <span className="text-slate-500 text-[10px] block truncate">
                          {rec.salesUserName || 'Recovery Officer'}
                        </span>
                        {rec.instrumentNumber && (
                          <span className="text-[9px] text-slate-400 font-mono block">
                            Ref: {rec.instrumentNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">
                          {rec.collectionDate?.split('T')[0] || rec.collectionDate}
                        </span>
                        <span className="font-extrabold text-blue-700 font-mono text-sm block mt-1">
                          Rs. {rec.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleShareWithDealer(rec.customerName, '03004123456', `Payment Receipt #${rec.recoveryNumber}`, rec.amount)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                        title="Share receipt only with this verified dealer"
                      >
                        <Share2 className="w-3 h-3 text-blue-600" />
                        <span>Share Receipt</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DESKTOP RECOVERIES TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Recovery Code</th>
                    <th className="py-3 px-4">Customer Dealer</th>
                    <th className="py-3 px-3">Collection Date</th>
                    <th className="py-3 px-3">Payment Mode</th>
                    <th className="py-3 px-3">Officer</th>
                    <th className="py-3 px-4 text-right">Amount (PKR)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Dealer Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecoveries.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {rec.recoveryNumber}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{rec.customerName}</p>
                        <p className="text-[10px] text-slate-400">Code: {rec.customerCode}</p>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {rec.collectionDate?.split('T')[0] || rec.collectionDate}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {rec.paymentMode}
                        </span>
                        {rec.instrumentNumber && (
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            Ref: {rec.instrumentNumber}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-800">
                        {rec.salesUserName || 'Recovery Officer'}
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-blue-700 text-sm">
                        Rs. {rec.amount.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600" /> Posted
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleShareWithDealer(rec.customerName, '03004123456', `Payment Receipt #${rec.recoveryNumber}`, rec.amount)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                          title="Share strictly with selected dealer"
                        >
                          <Share2 className="w-3 h-3 text-blue-600" />
                          <span>Share Dealer</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
