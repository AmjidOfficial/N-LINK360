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
    ? `Consolidated Dispatch · Rs. ${totalBulkAmount.toLocaleString()} PKR`
    : `${customer?.companyName || 'Valued Customer'} · Rs. ${Number(order?.totalAmount || 0).toLocaleString()} PKR`;

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
      const subject = `National Lights Bulk Invoices Manifest — ${bulkInvoices.length} Orders (Rs. ${totalBulkAmount.toLocaleString()} PKR)`;
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

  // Print Handler
  const handlePrint = () => {
    const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow && !isMobileViewport) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      } catch {
        window.print();
      }
    } else {
      window.print();
    }
  };

  const orderItems: any[] = Array.isArray(order?.items) ? order.items : [];

  return (
    <div
      id="invoice-pdf-preview-modal"
      className="fixed inset-0 bg-[#1B5E3A]/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 lg:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-[#C8E6C9] w-full max-w-5xl h-[92vh] max-h-[900px] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[#1B5E3A]">
        {/* Modal Top Header Bar */}
        <div className="bg-[#1B5E3A] px-3.5 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3 border-b border-[#2E6B46] shrink-0 text-white">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-[#A7C957]/40 flex items-center justify-center text-[#D9F99D] shrink-0">
              {isBulk ? <FolderArchive className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-sm sm:text-lg truncate text-white leading-tight">
                {title}
              </h2>
              <p className="text-xs text-[#D9F99D] truncate mt-0.5">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            id="close-pdf-preview-btn"
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Close Preview"
            aria-label="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 bg-[#F1F8E9] relative overflow-y-auto flex flex-col items-center justify-start md:justify-center p-3 sm:p-4">
          {isMobileViewport ? (
            /* Mobile-Friendly HTML Receipt Preview with Top Logo Header & Center Watermark */
            <div className="relative w-full max-w-lg bg-white border border-[#C8E6C9] rounded-2xl p-4 space-y-4 text-[#1B5E3A] shadow-xs invoice-print-container overflow-hidden">
              <DocumentCenterWatermark title="NATIONAL LIGHT INVOICE" />
              <div className="relative z-10 space-y-4">
              <div className="pb-3 border-b border-[#C8E6C9] flex items-center justify-between">
                <NationalLightHeaderBrand size="sm" />
                <span className="text-[10px] font-mono font-bold text-[#1B5E3A] px-2 py-0.5 rounded bg-[#F1F8E9] border border-[#C8E6C9]">
                  OFFICIAL TAX INVOICE
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#C8E6C9]">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#4CAF50]">
                    National Light Pakistan
                  </div>
                  <div className="text-base font-bold text-[#1B5E3A] mt-0.5">{title}</div>
                  <div className="text-xs text-[#5F8564] mt-0.5">
                    {order?.orderDate
                      ? new Date(order.orderDate).toLocaleDateString('en-PK', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : new Date().toLocaleDateString('en-PK')}
                    {' · '}Officer: {officerName}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-[#5F8564]">Grand Total</div>
                  <div className="font-mono font-bold text-base text-[#1B5E3A] tabular-nums">
                    Rs.{' '}
                    {(isBulk
                      ? totalBulkAmount
                      : Number(order?.totalAmount || 0)
                    ).toLocaleString()}
                  </div>
                </div>
              </div>

              {isBulk && bulkInvoices ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#3E6B48]">
                    Included Invoices ({bulkInvoices.length})
                  </div>
                  <div className="divide-y divide-[#C8E6C9] border border-[#C8E6C9] rounded-xl overflow-hidden bg-[#F1F8E9]/60">
                    {bulkInvoices.map((item, idx) => (
                      <div
                        key={item.order?.id || idx}
                        className="px-3 py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-[#1B5E3A] truncate">
                            {item.customer?.companyName || 'Dealer'}
                          </div>
                          <div className="font-mono text-[11px] text-[#5F8564]">
                            {(item.order?.orderNumber || 'ORD').replace('ORD-', 'INV-')} ·{' '}
                            {item.customer?.town || ''}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-[#1B5E3A] shrink-0 tabular-nums">
                          Rs. {Number(item.order?.totalAmount || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {customer && (
                    <div className="bg-[#F1F8E9] border border-[#C8E6C9] rounded-xl p-3 text-xs space-y-1">
                      <div className="font-bold text-[#1B5E3A] text-sm">{customer.companyName}</div>
                      <div className="text-[#3E6B48]">
                        {customer.town || customer.city || 'Region'}
                        {customer.phone ? ` · ${customer.phone}` : ''}
                      </div>
                    </div>
                  )}

                  {orderItems.length > 0 && (
                    <div className="border border-[#C8E6C9] rounded-xl overflow-hidden bg-white">
                      <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-[#1B5E3A] text-[11px] font-semibold text-white">
                        <div className="col-span-6">SKU / Item</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-4 text-right">Total</div>
                      </div>
                      <div className="divide-y divide-[#C8E6C9]">
                        {orderItems.map((it, idx) => (
                          <div
                            key={it.id || it.sku || idx}
                            className="grid grid-cols-12 gap-1 px-3 py-2 text-xs items-center"
                          >
                            <div className="col-span-6 min-w-0">
                              <div className="font-medium text-[#1B5E3A] truncate">
                                {it.productName || it.name || it.sku}
                              </div>
                              <div className="font-mono text-[10px] text-[#5F8564]">
                                @ Rs. {Number(it.unitPrice || it.rate || 0).toLocaleString()}
                              </div>
                            </div>
                            <div className="col-span-2 text-center font-mono text-[#3E6B48] tabular-nums">
                              {it.cartons ? `${it.cartons}c` : ''}
                              {it.packs ? ` ${it.packs}p` : !it.cartons ? `${it.quantity || 0}` : ''}
                            </div>
                            <div className="col-span-4 text-right font-mono font-semibold text-[#1B5E3A] tabular-nums">
                              Rs. {Number(it.totalPrice || it.total || 0).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="pt-2 border-t border-[#C8E6C9] flex items-center justify-between text-[11px] text-[#5F8564]">
                <span className="flex items-center gap-1.5 text-[#1B5E3A] font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#4CAF50]" />
                  Auth: Shahzad Ullah
                </span>
                <span className="font-mono truncate max-w-[160px]">{pdfFilename}</span>
              </div>
              </div>
            </div>
          ) : pdfDataUrl ? (
            <iframe
              id="pdf-preview-iframe"
              src={pdfDataUrl}
              title="National Lights PDF Invoice Receipt Preview"
              className="w-full h-full rounded-xl border border-[#C8E6C9] shadow-lg bg-white"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-[#1B5E3A]">
              <div className="w-10 h-10 rounded-full border-3 border-[#4CAF50] border-t-transparent animate-spin" />
              <p className="text-sm font-medium">Rendering vector PDF document...</p>
            </div>
          )}

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="absolute top-4 inset-x-4 mx-auto max-w-md bg-[#1B5E3A] border border-[#A7C957] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 justify-center z-10 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-[#D9F99D] shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Controls Toolbar */}
        <div className="bg-white border-t border-[#C8E6C9] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Document metadata */}
          <div className="hidden md:flex items-center gap-2 text-xs text-[#3E6B48]">
            <ShieldCheck className="w-4 h-4 text-[#4CAF50]" />
            <span>Auth: Shahzad Ullah</span>
            <span className="text-[#C8E6C9]">·</span>
            <span className="font-mono text-[#5F8564] truncate max-w-[220px]">{pdfFilename}</span>
          </div>

          {/* Action Buttons Grid (2x2 on narrow mobile, single row on sm+) */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="pdf-preview-whatsapp-btn"
              onClick={handleWhatsAppSend}
              className="min-h-[44px] px-3.5 py-2 bg-[#4CAF50] hover:bg-[#388E3C] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              title="Send invoice details directly to customer via WhatsApp"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              id="pdf-preview-email-btn"
              onClick={() => setShowEmailInputModal(true)}
              className="min-h-[44px] px-3.5 py-2 bg-[#F1F8E9] hover:bg-[#D9F99D]/60 text-[#1B5E3A] border border-[#C8E6C9] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              title="Send invoice details via Email"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>Email</span>
            </button>

            <button
              type="button"
              id="pdf-preview-print-btn"
              onClick={handlePrint}
              className="min-h-[44px] px-3.5 py-2 bg-[#F1F8E9] hover:bg-[#D9F99D]/60 text-[#1B5E3A] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-[#C8E6C9] cursor-pointer whitespace-nowrap"
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
              className="min-h-[44px] px-4 py-2 bg-[#1B5E3A] hover:bg-[#14462B] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Email Destination Prompt Sub-modal */}
        {showEmailInputModal && (
          <div className="absolute inset-0 bg-[#1B5E3A]/50 backdrop-blur-xs flex items-center justify-center p-4 z-20">
            <div className="bg-white border border-[#C8E6C9] rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#4CAF50]" />
                  <h3 className="font-bold text-sm text-[#1B5E3A]">Send Invoice via Email</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailInputModal(false)}
                  className="w-9 h-9 rounded-xl bg-[#F1F8E9] text-[#1B5E3A] hover:bg-[#D9F99D] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3E6B48] mb-1.5">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2.5 bg-[#F1F8E9] border border-[#C8E6C9] rounded-xl text-sm text-[#1B5E3A] focus:outline-none focus:border-[#4CAF50]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailInputModal(false)}
                  className="min-h-[44px] px-3.5 py-2 bg-[#F1F8E9] border border-[#C8E6C9] text-[#1B5E3A] rounded-xl text-xs font-semibold hover:bg-[#D9F99D]/50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEmailSend}
                  className="min-h-[44px] px-4 py-2 bg-[#1B5E3A] hover:bg-[#14462B] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
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
