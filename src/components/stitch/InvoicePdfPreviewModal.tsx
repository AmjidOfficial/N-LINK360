/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Interactive Vector PDF Live Preview & Direct Multi-Channel Dispatch Modal
 * Supports Single Invoice Preview & Multi-Invoice Bulk Manifest Bundles with WhatsApp & Email Integration.
 * Renders a crisp HTML Receipt Preview on mobile viewports (where inline blob: PDFs fail in WebViews)
 * and the interactive vector PDF iframe on desktop.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  FolderArchive,
  X,
  MessageCircle,
  Mail,
  Printer,
  Download,
  CheckCircle2,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { Customer, SalesOrder } from '../../types';
import {
  buildInvoiceWhatsAppText,
  buildInvoiceEmailUrl,
  buildBulkInvoiceWhatsAppText,
} from '../../utils/exportInvoicePdf';
import { NationalLightHeaderBrand, DocumentCenterWatermark } from '../NationalLightLogo';
import { formatKarachiDate, formatKarachiDateTime } from '../../utils/dateTime';

export interface InvoicePdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDataUrl: string;
  pdfFilename: string;
  pdfBlob?: Blob;
  order?: SalesOrder | any;
  customer?: Customer;
  bulkInvoices?: { customer: Customer; order: SalesOrder | any }[];
  officerName?: string;
  onDownload: () => void;
}

export const InvoicePdfPreviewModal: React.FC<InvoicePdfPreviewModalProps> = ({
  isOpen,
  onClose,
  pdfDataUrl,
  pdfFilename,
  order,
  customer,
  bulkInvoices,
  officerName = 'Field Officer',
  onDownload,
}) => {
  const [showEmailInputModal, setShowEmailInputModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(
    customer?.email || (customer as any)?.emailAddress || ''
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const isBulk = Boolean(bulkInvoices && bulkInvoices.length > 0);
  const invoiceNumber = (order?.orderNumber || 'ORD-0000').replace('ORD-', 'INV-');
  const title = isBulk
    ? `Bulk Manifest (${bulkInvoices?.length} Invoices)`
    : `Invoice ${invoiceNumber}`;

  const totalBulkAmount =
    bulkInvoices?.reduce((sum, b) => sum + (b.order.totalAmount || 0), 0) || 0;

  const subtitle = isBulk
    ? `Consolidated Dispatch · PKR ${totalBulkAmount.toLocaleString()}`
    : `${customer?.companyName || 'Valued Customer'} · PKR ${Number(order?.totalAmount || 0).toLocaleString()}`;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // WhatsApp Dispatch Handler
  const handleWhatsAppSend = () => {
    if (isBulk && bulkInvoices) {
      const text = buildBulkInvoiceWhatsAppText(
        bulkInvoices.map((b) => ({ customer: b.customer, order: b.order })),
        officerName
      );
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      showToast('Opening WhatsApp with Bulk Manifest Summary...');
    } else if (customer && order) {
      const text = buildInvoiceWhatsAppText(customer, order, { officerName });
      const phoneClean = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
      const waUrl = phoneClean
        ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
      showToast(`Opening WhatsApp for ${customer.companyName}...`);
    }
  };

  // Email Dispatch Handler
  const handleEmailSend = () => {
    if (isBulk && bulkInvoices) {
      const subject = `National Lights Bulk Invoices Manifest — ${bulkInvoices.length} Orders (PKR ${totalBulkAmount.toLocaleString()})`;
      const body = buildBulkInvoiceWhatsAppText(
        bulkInvoices.map((b) => ({ customer: b.customer, order: b.order })),
        officerName
      );
      window.location.href = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setShowEmailInputModal(false);
      showToast('Launching email client with invoice particulars...');
    } else if (customer && order) {
      const mailUrl = buildInvoiceEmailUrl(customer, order, recipientEmail, officerName);
      window.location.href = mailUrl;
      setShowEmailInputModal(false);
      showToast(`Launching email client for ${customer.companyName}...`);
    }
  };

  // Print Handler - triggers dedicated @media print view targeting .invoice-print-container
  const handlePrint = () => {
    window.print();
  };

  const orderItems: any[] = Array.isArray(order?.items) ? order.items : [];
  const grossTotal = orderItems.reduce(
    (sum, it) => sum + Number(it.grossLineTotal || it.lineTotal || it.totalPrice || it.total || (it.quantity || it.orderedQuantity || 0) * (it.unitPrice || it.rate || 0)),
    0
  );
  const netTotal = Number(order?.totalAmount || grossTotal || 0);
  const discountAmount = Math.max(0, grossTotal - netTotal);

  return (
    <div
      id="invoice-pdf-preview-modal"
      className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 lg:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 w-full max-w-5xl h-[92vh] max-h-[900px] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#0F172A] dark:text-slate-100">
        {/* Modal Top Header Bar */}
        <div className="bg-[#0F172A] px-3.5 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3 border-b border-slate-800 shrink-0 text-white">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6] shrink-0">
              {isBulk ? <FolderArchive className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-sm sm:text-lg truncate text-white leading-tight">
                {title}
              </h2>
              <p className="text-xs text-slate-300 font-mono tabular-nums truncate mt-0.5">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            id="close-pdf-preview-btn"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] -mr-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 inline-flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Close Preview"
            aria-label="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 bg-[#F8FAFC] dark:bg-[#0B1120] relative overflow-y-auto flex flex-col items-center justify-start md:justify-center p-3 sm:p-4">
          {/* Print-Optimized Official National Lights Invoice Document (Visible on mobile screen, and always active during @media print) */}
          <div
            className={`${
              isMobileViewport
                ? 'relative w-full max-w-lg bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-4 text-[#0F172A] shadow-xs overflow-hidden'
                : 'hidden print:block w-full bg-white p-4 space-y-4 text-[#0F172A]'
            } invoice-print-container`}
          >
            <DocumentCenterWatermark title="NATIONAL LIGHT INVOICE" />
            <div className="relative z-10 space-y-4">
              <div className="pb-3 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
                <NationalLightHeaderBrand size="sm" />
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-[#0F172A] px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] inline-block">
                    {order?.status === 'INVOICED' ? 'OFFICIAL TAX INVOICE · INVOICED' : 'OFFICIAL SALES INVOICE'}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    Head Office: GF-71, Sheikh Yaseen Tower, Peshawar
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#3B82F6]">
                    National Lights (Pvt.) Ltd.
                  </div>
                  <div className="text-base font-bold text-[#0F172A] mt-0.5">{title}</div>
                  <div className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">
                    Invoice Date: {formatKarachiDate(order?.invoiceDate || order?.orderDate || new Date())}
                    {' · '}Order #{order?.orderNumber || order?.id || 'N/A'}
                    {' · '}Officer: {officerName}
                  </div>
                  {order?.createdAt && (
                    <div className="text-[10px] text-slate-500 font-mono tabular-nums mt-0.5">
                      Entered: {formatKarachiDateTime(order.createdAt)}
                      {(order?.postedAt || order?.invoicedAt || order?.shahzadApprovedAt) &&
                        ` · Posted: ${formatKarachiDateTime(order.postedAt || order.invoicedAt || order.shahzadApprovedAt)}`}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-slate-500">Net Payable</div>
                  <div className="font-mono font-bold text-base text-[#0F172A] tabular-nums">
                    PKR {(isBulk ? totalBulkAmount : netTotal).toLocaleString()}
                  </div>
                </div>
              </div>

              {isBulk && bulkInvoices ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    Included Invoices ({bulkInvoices.length})
                  </div>
                  <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#F8FAFC]">
                    {bulkInvoices.map((item, idx) => (
                      <div
                        key={item.order?.id || idx}
                        className="px-3 py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-[#0F172A] truncate">
                            {item.customer?.companyName || 'Dealer'}
                          </div>
                          <div className="font-mono tabular-nums text-[11px] text-slate-500">
                            {(item.order?.orderNumber || 'ORD').replace('ORD-', 'INV-')} ·{' '}
                            {item.customer?.town || ''}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-[#0F172A] shrink-0 tabular-nums">
                          PKR {Number(item.order?.totalAmount || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {customer && (
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#0F172A] text-sm">{customer.companyName}</span>
                        <span className="font-mono tabular-nums text-[11px] text-slate-600">
                          {customer.customerCode || customer.id}
                        </span>
                      </div>
                      <div className="text-slate-600">
                        {customer.address ? `${customer.address} · ` : ''}
                        {customer.town || customer.city || 'Region'}
                        {customer.phone ? ` · ${customer.phone}` : ''}
                      </div>
                    </div>
                  )}

                  {orderItems.length > 0 && (
                    <table className="w-full border border-[#E2E8F0] rounded-xl overflow-hidden bg-white text-xs">
                      <thead>
                        <tr className="bg-[#0F172A] text-white text-left">
                          <th className="px-3 py-2">SKU / Item</th>
                          <th className="px-2 py-2 text-center">Qty</th>
                          <th className="px-2 py-2 text-right">Rate</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderItems.map((it, idx) => (
                          <tr key={it.id || it.sku || idx} className="border-t border-[#E2E8F0]">
                            <td className="px-3 py-2">
                              <div className="font-medium text-[#0F172A]">
                                {it.skuName || it.productName || it.name || it.sku}
                              </div>
                              <div className="font-mono tabular-nums text-[10px] text-slate-500">
                                {it.skuCode || it.sku || 'NL-SKU'}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center font-mono text-slate-700 tabular-nums">
                              {it.cartons ? `${it.cartons}c` : ''}
                              {it.packs ? ` ${it.packs}p` : !it.cartons ? `${it.orderedQuantity || it.quantity || 0}` : ''}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-slate-700 tabular-nums">
                              PKR {Number(it.unitPrice || it.rate || 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-[#0F172A] tabular-nums">
                              PKR {Number(it.lineTotal || it.totalPrice || it.total || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div className="flex flex-col items-end gap-1 pt-2 border-t border-[#E2E8F0] text-xs font-mono tabular-nums">
                    {discountAmount > 0 && (
                      <>
                        <div className="text-slate-500">
                          Gross Subtotal: PKR {grossTotal.toLocaleString()}
                        </div>
                        <div className="text-emerald-700 font-semibold">
                          Trade Discount: -PKR {discountAmount.toLocaleString()} CR
                        </div>
                      </>
                    )}
                    <div className="text-sm font-bold text-[#0F172A]">
                      Net Invoice Payable: PKR {netTotal.toLocaleString()}
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 text-[#0F172A] font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Authorized Signatory: Shahzad Ullah (NSM)
                </span>
                <span className="font-mono truncate max-w-[180px]">{pdfFilename}</span>
              </div>
            </div>
          </div>

          {!isMobileViewport && (
            pdfDataUrl ? (
              <iframe
                id="pdf-preview-iframe"
                src={pdfDataUrl}
                title="National Lights PDF Invoice Receipt Preview"
                className="w-full h-full rounded-xl border border-[#E2E8F0] dark:border-slate-700 shadow-lg bg-white print:hidden"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-300 print:hidden">
                <div className="w-10 h-10 rounded-full border-3 border-[#3B82F6] border-t-transparent animate-spin" />
                <p className="text-sm font-medium">Rendering vector PDF document...</p>
              </div>
            )
          )}

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="absolute top-4 inset-x-4 mx-auto max-w-md bg-[#0F172A] border border-[#3B82F6]/60 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 justify-center z-10 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Controls Toolbar */}
        <div className="bg-white dark:bg-[#0F172A] border-t border-[#E2E8F0] dark:border-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Document metadata */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Auth: Shahzad Ullah</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="font-mono text-slate-500 dark:text-slate-400 truncate max-w-[220px]">{pdfFilename}</span>
          </div>

          {/* Action Buttons Grid (2x2 on narrow mobile, single row on sm+) */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="pdf-preview-whatsapp-btn"
              onClick={handleWhatsAppSend}
              className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              title="Send invoice details directly to customer via WhatsApp"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              id="pdf-preview-email-btn"
              onClick={() => setShowEmailInputModal(true)}
              className="btn-outline min-h-[44px] text-xs whitespace-nowrap"
              title="Send invoice details via Email"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>Email</span>
            </button>

            <button
              type="button"
              id="pdf-preview-print-btn"
              onClick={handlePrint}
              className="btn-outline min-h-[44px] text-xs whitespace-nowrap"
              title="Print document"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print</span>
            </button>

            <button
              type="button"
              id="pdf-preview-download-btn"
              onClick={() => {
                onDownload();
                showToast(`Downloaded ${pdfFilename}`);
              }}
              className="btn-primary min-h-[44px] text-xs whitespace-nowrap"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Email Destination Prompt Sub-modal */}
        {showEmailInputModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-20">
            <div className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#3B82F6]" />
                  <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">Send Invoice via Email</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailInputModal(false)}
                  aria-label="Close email prompt"
                  className="min-w-[44px] min-h-[44px] -mr-2 rounded-lg text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full min-h-[44px] px-3 py-2.5 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailInputModal(false)}
                  className="btn-outline min-h-[44px] text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEmailSend}
                  className="btn-primary min-h-[44px] text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open Email Client</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
