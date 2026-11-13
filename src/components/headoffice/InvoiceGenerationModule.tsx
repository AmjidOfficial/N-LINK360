/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Department 7: Invoice Generation & Billing
 * National Lights (Pvt.) Ltd. - Peshawar Head Office
 *
 * Stage Transition: PACKED -> INVOICED (Applies 15% Commercial Discount, posts to Ledger & deducts inventory)
 */

import React, { useState, useMemo } from 'react';
import { Receipt, Search, FileText, Download, Eye, CheckCircle2 } from 'lucide-react';
import { Customer, SalesOrder } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { calculateInvoiceMetrics } from '../../hooks/useSkuInvoicePricing';
import { downloadSalesInvoicePdf } from '../../utils/exportInvoicePdf';

interface InvoiceGenerationModuleProps {
  currentUser: NLinkUser;
  orders: SalesOrder[];
  customers?: Customer[];
  onPostInvoice: (order: SalesOrder) => void;
  onPreviewInvoicePdf?: (order: SalesOrder, customer: Customer) => void;
}

export const InvoiceGenerationModule: React.FC<InvoiceGenerationModuleProps> = ({
  currentUser,
  orders,
  customers = [],
  onPostInvoice,
  onPreviewInvoicePdf,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subTab, setSubTab] = useState<'READY_TO_INVOICE' | 'POSTED_INVOICES'>('READY_TO_INVOICE');

  // Strict fulfillment queue: orders confirmed PACKED and not yet invoiced
  const readyForInvoicing = useMemo(() => {
    return orders.filter((o) => o.status === 'PACKED' && !o.invoiceNumber);
  }, [orders]);

  const postedInvoices = useMemo(() => {
    return orders.filter(
      (o) =>
        Boolean(o.invoiceNumber) ||
        o.status === 'INVOICED' ||
        o.status === 'DISPATCHED' ||
        o.status === 'IN_TRANSIT' ||
        o.status === 'DELIVERED' ||
        o.status === 'PARTIALLY_DELIVERED'
    );
  }, [orders]);

  const activeList = (subTab === 'READY_TO_INVOICE' ? readyForInvoicing : postedInvoices).filter(
    (o) =>
      (o.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Department 7 &middot; Invoice Generation &amp; Billing
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Commercial Invoicing (Net TP @ 15% Discount)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Generates official GST/Commercial invoices from packed orders, prevents duplicate billing, and posts net debits to Customer Khata Ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('READY_TO_INVOICE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              subTab === 'READY_TO_INVOICE'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Packed &amp; Ready ({readyForInvoicing.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('POSTED_INVOICES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              subTab === 'POSTED_INVOICES'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Posted Invoices ({postedInvoices.length})
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice #, order #, dealer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {activeList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <FileText className="w-9 h-9 mx-auto mb-2 opacity-40" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              {subTab === 'READY_TO_INVOICE' ? 'No packed orders awaiting invoice generation' : 'No posted invoices found'}
            </p>
          </div>
        ) : (
          activeList.map((order) => {
            const cust = customers.find((c) => c.id === order.customerId || c.companyName === order.customerName);
            const metrics = calculateInvoiceMetrics(order);
            const prevBal = cust?.currentBalance ?? cust?.openingBalance ?? 0;

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {order.invoiceNumber ? `${order.invoiceNumber} · ` : ''}Order #{order.orderNumber}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {order.status}
                    </span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-semibold">
                    {order.customerName} &middot; {cust?.town || order.customerTown || 'Commercial Market'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                    Gross: Rs. {metrics.grossSubtotal.toLocaleString()} &middot; 15% Discount: -Rs. {metrics.discount15.toLocaleString()} &middot; Net Payable:{' '}
                    <strong className="text-slate-900 dark:text-white">Rs. {metrics.netInvoiceTotal.toLocaleString()}</strong>
                    {cust && ` · Prev Ledger Bal: Rs. ${prevBal.toLocaleString()}`}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {subTab === 'READY_TO_INVOICE' ? (
                    <button
                      type="button"
                      onClick={() => onPostInvoice(order)}
                      className="btn-primary py-2.5 px-5 rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Generate &amp; Post Invoice</span>
                    </button>
                  ) : (
                    <>
                      {cust && onPreviewInvoicePdf && (
                        <button
                          type="button"
                          onClick={() => onPreviewInvoicePdf(order, cust)}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                      )}
                      {cust && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadSalesInvoicePdf({
                              customer: cust,
                              order,
                              previousBalance: prevBal,
                              preparedByName: currentUser.fullName,
                            })
                          }
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </button>
                      )}
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold px-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Posted</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
