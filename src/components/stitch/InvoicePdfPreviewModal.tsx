/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Interactive Vector PDF Live Preview & Direct Multi-Channel Dispatch Modal
 * Supports Single Invoice Preview & Multi-Invoice Bulk Manifest Bundles with WhatsApp & Email Integration.
 */

import React, { useState } from 'react';
import { Customer, SalesOrder } from '../../types';
import {
  buildInvoiceWhatsAppText,
  buildInvoiceEmailUrl,
  buildBulkInvoiceWhatsAppText,
} from '../../utils/exportInvoicePdf';

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

  if (!isOpen) return null;

  const isBulk = Boolean(bulkInvoices && bulkInvoices.length > 0);
  const title = isBulk
    ? `Bulk PDF Manifest (${bulkInvoices?.length} Invoices)`
    : `Invoice Receipt Preview — ${(order?.orderNumber || 'ORD-0000').replace('ORD-', 'INV-')}`;

  const subtitle = isBulk
    ? `Consolidated Multi-Order Dispatch Bundle • Rs. ${bulkInvoices?.reduce((sum, b) => sum + (b.order.totalAmount || 0), 0).toLocaleString()} PKR`
    : `${customer?.companyName || 'Valued Customer'} • Rs. ${Number(order?.totalAmount || 0).toLocaleString()} PKR`;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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
      const totalAmt = bulkInvoices.reduce((sum, b) => sum + (b.order.totalAmount || 0), 0);
      const subject = `National Lights Bulk Invoices Manifest — ${bulkInvoices.length} Orders (Rs. ${totalAmt.toLocaleString()} PKR)`;
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
    if (iframe && iframe.contentWindow) {
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

  return (
    <div
      id="invoice-pdf-preview-modal"
      className="fixed inset-0 bg-[#001428]/80 dark:bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 lg:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-5xl h-[92vh] max-h-[900px] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-scaleUp">
        
        {/* Modal Top Header Bar */}
        <div className="bg-gradient-to-r from-[#006b5f] via-[#0b4841] to-[#0f2942] p-4 sm:p-5 flex items-center justify-between border-b border-teal-500/20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-[24px]">
                {isBulk ? 'folder_zip' : 'picture_as_pdf'}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg truncate text-white">{title}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#76f4e0] text-[#003830]">
                  Live Vector PDF
                </span>
              </div>
              <p className="text-xs text-teal-100/80 truncate">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="close-pdf-preview-btn"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              title="Close Preview"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Main Body: Interactive Live PDF Document Viewport */}
        <div className="flex-1 bg-slate-950/90 relative overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4">
          {pdfDataUrl ? (
            <iframe
              id="pdf-preview-iframe"
              src={pdfDataUrl}
              title="National Lights PDF Invoice Receipt Preview"
              className="w-full h-full rounded-xl border border-slate-800 shadow-2xl bg-white"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-10 h-10 rounded-full border-3 border-teal-500 border-t-transparent animate-spin" />
              <p className="text-sm font-medium">Rendering vector PDF document...</p>
            </div>
          )}

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="absolute top-4 inset-x-0 mx-auto max-w-md bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 justify-center z-10 animate-slideDown">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Controls Toolbar */}
        <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Document metadata pill */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="material-symbols-outlined text-[16px] text-teal-400">verified_user</span>
            <span>Auth: Shahzad Ullah</span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-slate-300 truncate max-w-[200px]">{pdfFilename}</span>
          </div>

          {/* Action Buttons Grid */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* WhatsApp Send Button */}
            <button
              type="button"
              id="pdf-preview-whatsapp-btn"
              onClick={handleWhatsAppSend}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
              title="Send invoice details directly to customer via WhatsApp"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span className="hidden xs:inline">WhatsApp</span>
            </button>

            {/* Email Send Button */}
            <button
              type="button"
              id="pdf-preview-email-btn"
              onClick={() => setShowEmailInputModal(true)}
              className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
              title="Send invoice details via Email"
            >
              <span className="material-symbols-outlined text-[18px]">mail</span>
              <span className="hidden xs:inline">Email</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              id="pdf-preview-print-btn"
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer active:scale-95"
              title="Print document"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span className="hidden xs:inline">Print</span>
            </button>

            {/* Primary Action: Download PDF */}
            <button
              type="button"
              id="pdf-preview-download-btn"
              onClick={() => {
                onDownload();
                showToast(`✓ Downloaded ${pdfFilename}`);
              }}
              className="px-4 py-2.5 bg-[#006b5f] hover:bg-[#005047] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Email Destination Prompt Sub-modal */}
        {showEmailInputModal && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-20">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-400">mark_email_read</span>
                  <h3 className="font-bold text-sm text-white">Send Invoice via Email</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailInputModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailInputModal(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEmailSend}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
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
