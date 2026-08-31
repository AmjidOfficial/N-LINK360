/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Official National Lights Tax Invoice Printing & Document Generator
 * Supports Formal A4 Sales Tax Invoicing and 80mm POS Thermal Receipt modes with Live PDF Customizer.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Printer,
  Download,
  X,
  FileText,
  Building,
  ShieldCheck,
  QrCode,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Palette,
  Layers,
  Settings,
  Edit3,
} from 'lucide-react';
import { Customer, Invoice, SKU, User } from '../types';
import { numberToPakistaniRupeesWords } from '../services/security';

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  customer: Customer | null;
  skus: SKU[];
  currentUser?: User;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  customer,
  skus,
  currentUser,
}) => {
  type PaperFormat = 'A4_FORMAL' | 'A5_COMPACT' | 'LETTER_STANDARD' | 'THERMAL_80MM';
  const [printMode, setPrintMode] = useState<PaperFormat>('A5_COMPACT');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Live PDF preview customizations
  const [accentColor, setAccentColor] = useState<'EMERALD' | 'TEAL' | 'GOLD' | 'CHARCOAL'>('EMERALD');
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState('N-LINK 360 SECURE');
  const [includeStamp, setIncludeStamp] = useState(true);
  const [includeQR, setIncludeQR] = useState(true);
  const [termsText, setTermsText] = useState(
    '1. Goods once sold will not be taken back without official Return Authorization Slip.\n2. Claims for transit breakage or shortage must be reported within 48 hours of GRN.\n3. Overdue invoices beyond credit terms are subject to automated account lock.'
  );
  const [customMemo, setCustomMemo] = useState('Official verified invoice for secure credit settlement.');
  const [showCustomMemo, setShowCustomMemo] = useState(true);

  if (!isOpen || !invoice || !customer) return null;

  const skuMap = new Map<string, SKU>(skus.map((s) => [s.id, s]));
  const amountInWords = numberToPakistaniRupeesWords(invoice.totalAmount);

  // Dynamic branding classes definition
  const branding = {
    EMERALD: {
      primaryBg: 'bg-emerald-800 hover:bg-emerald-900',
      textAccent: 'text-emerald-800',
      textAccentHover: 'hover:text-emerald-900',
      borderAccent: 'border-emerald-800',
      logoBg: 'bg-emerald-50',
      logoText: 'text-emerald-800',
      logoBorder: 'border-emerald-900',
      bannerBg: 'bg-emerald-850',
      tableHeaderBg: 'bg-emerald-50/70',
      tableHeaderBorder: 'border-emerald-900',
      tableHeaderText: 'text-emerald-900',
      highlightBg: 'bg-emerald-50/50',
      colorName: 'Corporate Emerald',
    },
    TEAL: {
      primaryBg: 'bg-teal-700 hover:bg-teal-800',
      textAccent: 'text-teal-700',
      textAccentHover: 'hover:text-teal-850',
      borderAccent: 'border-teal-700',
      logoBg: 'bg-teal-50',
      logoText: 'text-teal-700',
      logoBorder: 'border-teal-800',
      bannerBg: 'bg-teal-700',
      tableHeaderBg: 'bg-teal-50/70',
      tableHeaderBorder: 'border-teal-800',
      tableHeaderText: 'text-teal-900',
      highlightBg: 'bg-teal-50/50',
      colorName: 'N-LINK Signature Teal',
    },
    GOLD: {
      primaryBg: 'bg-amber-700 hover:bg-amber-800',
      textAccent: 'text-amber-800',
      textAccentHover: 'hover:text-amber-950',
      borderAccent: 'border-amber-700',
      logoBg: 'bg-amber-50',
      logoText: 'text-amber-800',
      logoBorder: 'border-amber-900',
      bannerBg: 'bg-amber-700',
      tableHeaderBg: 'bg-amber-50/70',
      tableHeaderBorder: 'border-amber-900',
      tableHeaderText: 'text-amber-950',
      highlightBg: 'bg-amber-50/50',
      colorName: 'Premium Amber Gold',
    },
    CHARCOAL: {
      primaryBg: 'bg-slate-800 hover:bg-slate-900',
      textAccent: 'text-slate-800',
      textAccentHover: 'hover:text-slate-950',
      borderAccent: 'border-slate-800',
      logoBg: 'bg-slate-100',
      logoText: 'text-slate-800',
      logoBorder: 'border-slate-800',
      bannerBg: 'bg-slate-800',
      tableHeaderBg: 'bg-slate-100',
      tableHeaderBorder: 'border-slate-800',
      tableHeaderText: 'text-slate-800',
      highlightBg: 'bg-slate-100/50',
      colorName: 'Standard Dark Charcoal',
    },
  }[accentColor];

  const downloadPdf = async (formatOverride?: PaperFormat) => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    const selectedFormat = formatOverride || printMode;

    try {
      const container = document.querySelector('.invoice-print-container') as HTMLElement;
      if (!container) {
        throw new Error('Print container element not found');
      }

      const canvas = await html2canvas(container, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');

      let pdfFormat: any = 'a5';
      let formatNameLabel = 'A5';

      if (selectedFormat === 'A4_FORMAL') {
        pdfFormat = 'a4';
        formatNameLabel = 'A4';
      } else if (selectedFormat === 'LETTER_STANDARD') {
        pdfFormat = 'letter';
        formatNameLabel = 'Letter';
      } else if (selectedFormat === 'THERMAL_80MM') {
        const aspectHeight = (canvas.height * 80) / canvas.width;
        pdfFormat = [80, Math.max(120, aspectHeight)];
        formatNameLabel = '80mm_Thermal';
      } else {
        pdfFormat = 'a5';
        formatNameLabel = 'A5';
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pdfFormat,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));

      const filename = `Invoice_${invoice.invoiceNumber || 'Doc'}_${formatNameLabel}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = async () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="flex w-full max-w-6xl h-[90vh] flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 my-auto">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-900 px-4 sm:px-6 py-3 text-white gap-3 shrink-0" data-no-print>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 font-black text-white shadow-md">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Invoice Print Studio & Document Generator</div>
              <div className="text-[11px] text-slate-400">National Lights Official Commercial Billing System</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Paper Size Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <span className="text-[10px] font-black uppercase text-slate-400 px-1.5 hidden sm:inline">Format:</span>
              <button
                type="button"
                onClick={() => setPrintMode('A5_COMPACT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  printMode === 'A5_COMPACT' ? 'bg-teal-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
                title="A5 Compact Commercial Invoice (148 x 210 mm)"
              >
                A5
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('A4_FORMAL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  printMode === 'A4_FORMAL' ? 'bg-teal-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
                title="A4 Standard Sales Tax Invoice (210 x 297 mm)"
              >
                A4 Tax
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('LETTER_STANDARD')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  printMode === 'LETTER_STANDARD' ? 'bg-teal-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
                title="US Letter Standard Document (215.9 x 279.4 mm)"
              >
                Letter
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('THERMAL_80MM')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  printMode === 'THERMAL_80MM' ? 'bg-teal-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
                title="80mm POS Thermal Receipt Slip"
              >
                80mm POS
              </button>
            </div>

            <button
              type="button"
              onClick={() => downloadPdf(printMode)}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 text-xs font-bold text-slate-200 border border-slate-700 shadow-md active:scale-95 transition-all disabled:opacity-60"
              title="Generate and Download PDF file for selected paper format"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
              ) : (
                <Download className="h-4 w-4 text-teal-400" />
              )}
              <span>{isGeneratingPdf ? 'Generating...' : `Export PDF`}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-1.5 text-xs font-black text-white hover:from-teal-600 hover:to-emerald-700 shadow-md active:scale-95 transition-all disabled:opacity-60"
              title="Send document to system browser printer dialog"
            >
              <Printer className="h-4 w-4" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Split Workspace */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100 min-h-0">
          
          {/* LEFT: Live Customizer Sidebar */}
          <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-5 overflow-y-auto shrink-0 flex flex-col justify-between" data-no-print>
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Settings className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">PDF Live Customizer</span>
              </div>

              {/* Theme Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Branding Color Accent</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['EMERALD', 'TEAL', 'GOLD', 'CHARCOAL'] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccentColor(color)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-center border transition-all ${
                        accentColor === color
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {color === 'EMERALD' && 'Emerald'}
                      {color === 'TEAL' && 'Teal'}
                      {color === 'GOLD' && 'Gold'}
                      {color === 'CHARCOAL' && 'Charcoal'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Watermark Selector */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Watermark overlay</span>
                  <input
                    type="checkbox"
                    checked={includeWatermark}
                    onChange={(e) => setIncludeWatermark(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </div>
                {includeWatermark && (
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value.toUpperCase())}
                    placeholder="WATERMARK TEXT"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                )}
              </div>

              {/* Stamps & Compliance Overlays */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Compliance overlays</span>
                
                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-xs text-slate-600 font-medium">Digital Secure Stamp</span>
                  <input
                    type="checkbox"
                    checked={includeStamp}
                    onChange={(e) => setIncludeStamp(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-xs text-slate-600 font-medium">FBR STRN QR Code</span>
                  <input
                    type="checkbox"
                    checked={includeQR}
                    onChange={(e) => setIncludeQR(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Dynamic Memo Customizer */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Custom Ledger Memo</span>
                  <input
                    type="checkbox"
                    checked={showCustomMemo}
                    onChange={(e) => setShowCustomMemo(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </div>
                {showCustomMemo && (
                  <textarea
                    rows={2}
                    value={customMemo}
                    onChange={(e) => setCustomMemo(e.target.value)}
                    placeholder="Type custom note..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 leading-snug focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                  />
                )}
              </div>

              {/* Editable Terms & Conditions */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Terms & Conditions</span>
                </label>
                <textarea
                  rows={4}
                  value={termsText}
                  onChange={(e) => setTermsText(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-600 leading-normal focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono space-y-1 text-center">
              <div>Preview Format: {printMode}</div>
              <div>Branding Profile: {branding.colorName}</div>
            </div>
          </div>

          {/* RIGHT: High-Fidelity Printable PDF Preview Area */}
          <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-slate-200/50 flex justify-center items-start min-h-0">
            {/* ================= FORMAL TAX INVOICE (A4 / A5 / Letter) ================= */}
            {(printMode === 'A4_FORMAL' || printMode === 'A5_COMPACT' || printMode === 'LETTER_STANDARD') && (
              <div className={`invoice-print-container relative mx-auto w-full bg-white p-6 sm:p-10 shadow-xl border border-slate-200 text-text-primary font-sans print-area print:shadow-none print:border-none print:p-0 ${
                printMode === 'A5_COMPACT' ? 'max-w-[148mm]' : printMode === 'A4_FORMAL' ? 'max-w-[210mm]' : 'max-w-[215.9mm]'
              }`}>
                
                {/* PDF Secure Watermark Layer */}
                {includeWatermark && (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none z-0">
                    <div className="text-slate-200/25 font-black text-3xl sm:text-5xl uppercase tracking-widest transform -rotate-45 whitespace-nowrap">
                      {watermarkText}
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${branding.logoBg} font-black text-2xl ${branding.logoText} border ${branding.logoBorder} shadow-xs`}>
                      NL
                    </div>
                    <div>
                      <h1 className={`text-xl font-black tracking-tight ${branding.textAccent} uppercase`}>National Lights (Pvt) Ltd.</h1>
                      <p className="text-[11px] text-slate-600 font-medium leading-tight">
                        Premium Commercial, Industrial & Architectural LED Solutions
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Head Office: 18-Brandreth Road, Lahore | Plant: 24-KM Multan Road, Lahore
                      </p>
                    </div>
                  </div>

                  <div className="text-right sm:text-right w-full sm:w-auto">
                    <div className={`inline-block rounded-md ${branding.bannerBg} px-3 py-1 text-xs font-black uppercase tracking-wider text-white`}>
                      SALES TAX INVOICE
                    </div>
                    <div className="mt-1 text-[11px] font-mono font-bold text-slate-800">
                      NTN: <span className="font-semibold">2894102-7</span> | STRN: <span className="font-semibold">03-00-2894-102-7</span>
                    </div>
                    <div className="text-[10px] text-slate-500">FBR Registered Taxpayer</div>
                  </div>
                </div>

                {/* Invoice & Customer Meta Grid */}
                <div className="relative z-10 grid grid-cols-2 gap-4 border-b border-slate-200 py-4 text-xs">
                  {/* Bill To */}
                  <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">BILL TO CUSTOMER</div>
                    <div className={`font-bold text-sm ${branding.textAccent}`}>{customer.companyName}</div>
                    <div className="text-slate-600 leading-relaxed">{customer.address}</div>
                    <div className="text-slate-600">
                      City: <span className="font-semibold">{customer.city || 'Lahore'}</span> | Contact: <span className="font-semibold">{customer.contactPerson}</span>
                    </div>
                    <div className="text-slate-600 font-mono text-[11px] mt-1">
                      Phone: {customer.phone} | NTN/CNIC: {customer.taxNumber || customer.cnic || 'Unregistered'}
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200/70 text-right flex flex-col justify-between items-end">
                    <div className="w-full">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">INVOICE PARTICULARS</div>
                      <div className="font-mono font-bold text-sm text-amber-700">INV #{invoice.invoiceNumber}</div>
                      <div className="text-slate-600">
                        Date: <span className="font-semibold">{invoice.invoiceDate}</span>
                      </div>
                      <div className="text-slate-600">
                        Order Ref: <span className="font-semibold">{invoice.salesOrderId || 'Direct Sale'}</span>
                      </div>
                      <div className="text-slate-600 font-mono text-[11px]">
                        Payment Mode: <span className="font-bold text-text-primary">{invoice.paymentMode}</span>
                      </div>
                    </div>

                    {/* QR Code Compliance Overlaid */}
                    {includeQR && (
                      <div className="mt-2 p-1 bg-white border border-slate-200 rounded flex items-center gap-1.5 text-[9px] text-slate-500 font-mono self-end">
                        <QrCode className="w-8 h-8 text-slate-800 shrink-0" />
                        <div className="text-left">
                          <span className="font-black text-slate-700 block text-[8px] leading-tight">FBR REGISTERED</span>
                          <span>ID: NL-{invoice.invoiceNumber}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="relative z-10 py-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b-2 ${branding.tableHeaderBorder} ${branding.tableHeaderBg} ${branding.tableHeaderText} font-bold text-[11px]`}>
                        <th className="py-2 px-2 w-8 text-center">#</th>
                        <th className="py-2 px-2 w-28">SKU Code</th>
                        <th className="py-2 px-2">Item Description</th>
                        <th className="py-2 px-2 w-16 text-right">Cartons</th>
                        <th className="py-2 px-2 w-16 text-right">Qty (Pcs)</th>
                        <th className="py-2 px-2 w-24 text-right">Rate (PKR)</th>
                        <th className="py-2 px-2 w-16 text-right">Disc %</th>
                        <th className="py-2 px-2 w-28 text-right">Total (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {invoice.items.map((item, idx) => {
                        const sku = skuMap.get(item.skuId);
                        const cartonQty = sku?.cartonQuantity ? (item.quantity / sku.cartonQuantity).toFixed(1) : '-';
                        const disc = (item as any).discountPercent ?? (item.discountAmount ? ((item.discountAmount / (item.quantity * item.unitPrice)) * 100).toFixed(0) : 0);
                        const net = item.lineTotal || ((item as any).netAmount ?? (item.quantity * item.unitPrice - (item.discountAmount || 0)));
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                            <td className="py-2.5 px-2 font-mono font-bold text-slate-800">{sku?.skuCode || item.skuCode || item.skuId}</td>
                            <td className="py-2.5 px-2 font-medium text-text-primary">
                              {sku?.name || item.skuName || 'National LED Item'}
                              <div className="text-[10px] text-slate-500 font-normal">
                                {sku?.wattage || ''} {sku?.colorTemperature || ''} {sku?.voltage || ''}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-600">{cartonQty}</td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-text-primary">{item.quantity}</td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-700">{item.unitPrice.toFixed(2)}</td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-500">{disc}%</td>
                            <td className={`py-2.5 px-2 text-right font-mono font-bold ${branding.textAccent}`}>
                              {net.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Financial Calculation Summary */}
                <div className="relative z-10 grid grid-cols-12 gap-4 border-t-2 border-slate-900 pt-4">
                  {/* Left Words & Terms */}
                  <div className="col-span-7 space-y-3">
                    <div className={`rounded-lg ${branding.highlightBg} p-3 border ${branding.borderAccent}/20`}>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">AMOUNT IN WORDS</div>
                      <div className="text-xs font-bold text-text-primary capitalize">{amountInWords}</div>
                    </div>

                    {showCustomMemo && customMemo.trim() !== '' && (
                      <div className="rounded-md bg-amber-50/50 p-2.5 border border-amber-200/60 text-[10px] font-medium text-amber-900 italic">
                        <strong>Memo:</strong> {customMemo}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 space-y-1">
                      <p className="font-bold text-slate-700 uppercase tracking-wide">TERMS & CONDITIONS:</p>
                      {termsText.split('\n').map((line, lidx) => (
                        <p key={lidx}>{line}</p>
                      ))}
                    </div>
                  </div>

                  {/* Right Calculations */}
                  <div className="col-span-5 space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                      <span>Gross Subtotal:</span>
                      <span className="font-mono font-bold text-text-primary">PKR {invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                      <span>Sales Tax (FBR 18%):</span>
                      <span className="font-mono font-bold text-text-primary">PKR {invoice.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between py-2 border-b-2 border-slate-900 text-sm font-black ${branding.textAccent} ${branding.highlightBg} px-2 rounded`}>
                      <span>NET INVOICE TOTAL:</span>
                      <span className="font-mono">PKR {invoice.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-[11px] text-slate-500">
                      <span>Customer Closing Ledger:</span>
                      <span className="font-mono font-bold text-slate-800">PKR {(customer.currentBalance || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Signatures Footer with dynamic stamp overlay */}
                <div className="relative z-10 grid grid-cols-4 gap-4 pt-16 text-center text-xs border-t border-slate-200 mt-8">
                  <div className="space-y-1">
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">Prepared By</div>
                    <div className="text-[10px] text-slate-400">Billing Desk</div>
                  </div>
                  <div className="space-y-1 relative">
                    {includeStamp && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-4 border-double border-emerald-600/60 flex flex-col items-center justify-center text-emerald-600/60 font-black tracking-tight uppercase transform rotate-12 text-[7px] leading-tight select-none pointer-events-none bg-white/40 backdrop-blur-3xs">
                        <ShieldCheck className="w-4 h-4 text-emerald-600/70 mb-0.5 animate-pulse" />
                        <span>N-LINK 360</span>
                        <span>SECURE SEAL</span>
                        <span className="text-[5px]">{new Date().toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">Checked By</div>
                    <div className="text-[10px] text-slate-400">Accounts Department</div>
                  </div>
                  <div className="space-y-1">
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">Dispatched By</div>
                    <div className="text-[10px] text-slate-400">Warehouse In-Charge</div>
                  </div>
                  <div className="space-y-1">
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">Customer Receiver</div>
                    <div className="text-[10px] text-slate-400">Sign & Stamp</div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= 80MM POS THERMAL RECEIPT ================= */}
            {printMode === 'THERMAL_80MM' && (
              <div className="invoice-print-container mx-auto w-[80mm] sm:w-[148mm] bg-white p-4 shadow-lg border border-slate-300 font-mono text-[11px] text-text-primary print-area print:shadow-none print:border-none print:w-[148mm] print:p-0">
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
                  <div className="text-base font-black tracking-tight">NATIONAL LIGHTS</div>
                  <div className="text-[10px]">Head Office: Brandreth Rd, Lahore</div>
                  <div className="text-[10px]">NTN: 2894102-7 | UAN: 042-111-654</div>
                  <div className="font-bold text-xs mt-1">*** CASH / CREDIT MEMO ***</div>
                </div>

                <div className="py-2 space-y-0.5 border-b border-dashed border-slate-400 text-[10px]">
                  <div>Inv #: <span className="font-bold">{invoice.invoiceNumber}</span></div>
                  <div>Date: {invoice.invoiceDate}</div>
                  <div>Party: <span className="font-bold">{customer.companyName}</span></div>
                  <div>Phone: {customer.phone}</div>
                  <div>Payment: {invoice.paymentMode}</div>
                </div>

                <div className="py-2 border-b border-dashed border-slate-400">
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-300 font-bold">
                        <th className="py-1">Item</th>
                        <th className="py-1 text-right">Qty</th>
                        <th className="py-1 text-right">Rate</th>
                        <th className="py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.items.map((item, idx) => {
                        const sku = skuMap.get(item.skuId);
                        return (
                          <tr key={idx}>
                            <td className="py-1 pr-1 truncate max-w-[32mm]">{sku?.name || item.skuName || item.skuCode || 'LED Item'}</td>
                            <td className="py-1 text-right">{item.quantity}</td>
                            <td className="py-1 text-right">{item.unitPrice}</td>
                            <td className="py-1 text-right font-bold">{((item.lineTotal || item.quantity * item.unitPrice)).toFixed(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="py-2 space-y-1 text-right border-b border-dashed border-slate-400 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>PKR {invoice.subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sales Tax:</span>
                    <span>PKR {invoice.taxAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs border-t border-slate-900 pt-1">
                    <span>TOTAL:</span>
                    <span>PKR {invoice.totalAmount.toFixed(0)}</span>
                  </div>
                </div>

                {showCustomMemo && customMemo.trim() !== '' && (
                  <div className="py-2 border-b border-dashed border-slate-400 text-[9px] text-slate-600 italic">
                    Memo: {customMemo}
                  </div>
                )}

                <div className="text-center pt-3 space-y-1 text-[9px] text-slate-500">
                  <div>Thank You For Choosing National Lights!</div>
                  <div>Software Generated Verification Slip</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
