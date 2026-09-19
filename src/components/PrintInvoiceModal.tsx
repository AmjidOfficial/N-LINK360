/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Official National Lights Tax Invoice Printing & Document Studio
 * Supports multi-style corporate invoice templates matching official business designs:
 * - Corporate Navy & Amber (Sample 1 & 2)
 * - Executive Charcoal & Gold (Sample 3, 4 & 5)
 * - Signature Emerald & Teal (National Lights Official)
 * - Minimalist Clean Modern (Sample 6)
 * - 80mm POS Thermal Receipt
 * 
 * Features complete Company Profile, Banking Details (Meezan, HBL, EasyPaisa, JazzCash, Raast),
 * Dealer Info with Credit Days / Ageing, and dynamic calculation:
 * Old Balance (before invoice) + New Invoice = Total Balance Payable.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { NationalLightLogo } from './NationalLightLogo';
import {
  Printer,
  Download,
  X,
  FileText,
  Building,
  Building2,
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
  Share2,
  CreditCard,
  Smartphone,
  Landmark,
  Wallet,
  Calendar,
  Clock,
  Phone,
  Mail,
  Globe,
  MapPin,
  FileCheck,
  Info,
} from 'lucide-react';
import { Customer, Invoice, SKU, User } from '../types';
import { numberToPakistaniRupeesWords } from '../services/security';

export type InvoiceTemplateStyle = 
  | 'NAVY_AMBER'     // Matching Sample 1 & 2
  | 'CHARCOAL_GOLD'  // Matching Sample 3, 4 & 5
  | 'EMERALD_TEAL'   // Signature National Lights
  | 'MINIMALIST'     // Matching Sample 6
  | 'THERMAL_80MM';   // 80mm POS Slip

interface PrintInvoiceModalProps {
  isOpen?: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  customer?: Customer | null;
  skus?: SKU[];
  currentUser?: User;
  autoDownloadPdfOnLoad?: boolean;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  isOpen = true,
  onClose,
  invoice,
  customer = null,
  skus = [],
  currentUser,
  autoDownloadPdfOnLoad = false,
}) => {
  // Template & Paper settings
  const [templateStyle, setTemplateStyle] = useState<InvoiceTemplateStyle>('NAVY_AMBER');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Company Profile defaults (Editable)
  const [companyInfo, setCompanyInfo] = useState({
    name: 'National Lights (Pvt) Ltd.',
    tagline: 'Enlightening The Nation | Premium Commercial & Industrial LED Solutions',
    headOffice: '18-Brandreth Road, Lahore, Pakistan',
    plant: '24-KM Multan Road Industrial Zone, Lahore',
    phone: '+92 42 37654321 / 0300-8456789',
    uan: '042-111-654-000',
    email: 'billing@nationallights.com.pk',
    website: 'www.nationallights.com.pk',
    ntn: '2894102-7',
    strn: '03-00-2894-102-7',
  });

  // Banking & Digital Wallets Info (Editable)
  const [bankDetails, setBankDetails] = useState({
    showBank1: true,
    bank1Name: 'Meezan Bank Ltd',
    bank1Branch: 'Brandreth Road Branch, Lahore',
    bank1Title: 'National Lights (Pvt) Ltd',
    bank1Account: '0215-0105893201',
    bank1Iban: 'PK68 MEZN 0002 1501 0589 3201',

    showBank2: true,
    bank2Name: 'Habib Bank Limited (HBL)',
    bank2Branch: 'Main Market Branch, Lahore',
    bank2Title: 'National Lights (Pvt) Ltd',
    bank2Account: '1029-7901234503',
    bank2Iban: 'PK36 HABB 0010 2979 0123 4503',

    showEasyPaisa: true,
    easyPaisaTitle: 'National Lights Corp',
    easyPaisaNumber: '0300-8456789',
    easyPaisaTillId: 'TILL-98421',

    showJazzCash: true,
    jazzCashTitle: 'National Lights Pvt Ltd',
    jazzCashNumber: '0321-4567890',
    raastId: '03008456789 / billing@nationallights',
  });

  // Balance Math Override
  const [overrideOldBalance, setOverrideOldBalance] = useState<number | null>(null);
  const [todayRecovery, setTodayRecovery] = useState<number>(0);

  // Live PDF preview customizations
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState('OFFICIAL TAX INVOICE');
  const [includeStamp, setIncludeStamp] = useState(true);
  const [includeQR, setIncludeQR] = useState(true);
  const [termsText, setTermsText] = useState(
    '1. Goods once sold are not returnable without official Return Authorization Slip.\n2. In transit breakage/shortage must be reported within 48 hours of GRN.\n3. Overdue invoices beyond credit terms are subject to account hold.\n4. Cheques/Online transfers must be drawn in favour of "National Lights (Pvt) Ltd".'
  );
  const [customMemo, setCustomMemo] = useState('Official tax invoice for commercial delivery and credit settlement.');
  const [showCustomMemo, setShowCustomMemo] = useState(true);

  if (!isOpen || !invoice || !customer) return null;

  // Derive Old Balance (Before Invoice) + Invoice Total = Net Total Closing Balance
  const oldBalance = overrideOldBalance !== null 
    ? overrideOldBalance 
    : (invoice.previousBalance ?? customer.currentBalance ?? customer.openingBalance ?? 0);
  
  const currentInvoiceAmount = invoice.totalAmount;
  const netTotalBalance = oldBalance + currentInvoiceAmount - todayRecovery;

  const skuMap = new Map<string, SKU>(skus.map((s) => [s.id, s]));
  const amountInWords = numberToPakistaniRupeesWords(currentInvoiceAmount);
  const totalBalanceInWords = numberToPakistaniRupeesWords(netTotalBalance);

  // Automatic download if requested
  useEffect(() => {
    if (autoDownloadPdfOnLoad && invoice) {
      const timer = setTimeout(() => {
        downloadPdf();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [autoDownloadPdfOnLoad, invoice]);

  // Transmit strictly to this selected dealer WhatsApp with complete financial reconciliation
  const handleShareInvoiceToDealer = () => {
    if (!invoice || !customer) return;
    const rawPhone = (customer.phone || '03004123456').replace(/\D/g, '');
    const phoneWithCountry = rawPhone.startsWith('92') ? rawPhone : rawPhone.startsWith('0') ? `92${rawPhone.slice(1)}` : `92${rawPhone}`;
    
    const invoiceSummaryText = `*NATIONAL LIGHTS (PVT) LTD - OFFICIAL TAX INVOICE*\n\n` +
      `*Invoice No:* #${invoice.invoiceNumber}\n` +
      `*Dealer Account:* ${customer.companyName} (${customer.customerCode})\n` +
      `*Date:* ${invoice.invoiceDate} | *Due Date:* ${invoice.dueDate || 'Immediate'}\n` +
      `*Credit Terms:* ${customer.creditDays || 30} Days (Limit: PKR ${(customer.creditLimit || 0).toLocaleString()})\n\n` +
      `*FINANCIAL RECONCILIATION SUMMARY:*\n` +
      `• Gross Invoice Subtotal: PKR ${invoice.subtotal.toLocaleString()}\n` +
      `• Sales Tax (FBR GST 18%): PKR ${invoice.taxAmount.toLocaleString()}\n` +
      `• *New Invoice Amount:* *PKR ${currentInvoiceAmount.toLocaleString()}*\n` +
      `--------------------------------------\n` +
      `• *Old Balance (Arrears):* PKR ${oldBalance.toLocaleString()}\n` +
      `• *TOTAL PAYABLE BALANCE:* *PKR ${netTotalBalance.toLocaleString()}*\n` +
      `--------------------------------------\n\n` +
      `*OFFICIAL BANKING PAYMENT DETAILS:*\n` +
      `🏦 *Meezan Bank Ltd* | Title: National Lights (Pvt) Ltd\n` +
      `• A/C No: ${bankDetails.bank1Account} | IBAN: ${bankDetails.bank1Iban}\n` +
      `🏦 *HBL Bank* | A/C No: ${bankDetails.bank2Account}\n` +
      `📱 *EasyPaisa / JazzCash Till:* ${bankDetails.easyPaisaNumber}\n` +
      `⚡ *Raast ID:* ${bankDetails.raastId}\n\n` +
      `_Generated via N-Link 360 Enterprise. Strictly confidential for ${customer.companyName}._`;

    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(invoiceSummaryText)}`;
    window.open(whatsappUrl, '_blank');
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 5000);
  };

  // High-Resolution PDF Download using html2canvas-pro and jsPDF
  const downloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

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

      let pdfFormat: any = 'a4';
      let formatNameLabel = 'A4';

      if (templateStyle === 'THERMAL_80MM') {
        const aspectHeight = (canvas.height * 80) / canvas.width;
        pdfFormat = [80, Math.max(140, aspectHeight)];
        formatNameLabel = '80mm_Thermal';
      } else {
        pdfFormat = 'a4';
        formatNameLabel = 'A4';
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: pdfFormat,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight));

      const filename = `Invoice_${invoice.invoiceNumber || 'Doc'}_${customer.customerCode || 'NL'}_${formatNameLabel}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      // Fallback to browser print if needed
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="flex w-full max-w-7xl h-[94vh] flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 my-auto">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900 px-4 sm:px-6 py-3 text-white gap-3 shrink-0" data-no-print>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 font-black text-slate-950 shadow-md">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                <span>Tax Invoice & Commercial Billing Studio</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  FBR Verified
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                National Lights (Pvt) Ltd • Inv #{invoice.invoiceNumber} • {customer.companyName}
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Direct WhatsApp Share to Dealer */}
            <button
              type="button"
              onClick={handleShareInvoiceToDealer}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500 bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition-all shadow-sm active:scale-95"
              title={`Directly message formal invoice + bank accounts to ${customer.companyName} WhatsApp`}
            >
              <Share2 className="h-3.5 w-3.5 text-white" />
              <span>Share to Dealer</span>
            </button>

            {/* Direct PDF Export */}
            <button
              type="button"
              onClick={downloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/80 bg-teal-950/80 hover:bg-teal-900 px-3.5 py-1.5 text-xs font-bold text-teal-300 transition-all shadow-sm disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-400" />
              ) : (
                <Download className="h-3.5 w-3.5 text-teal-400" />
              )}
              <span>{isGeneratingPdf ? 'Rendering PDF...' : 'Download PDF'}</span>
            </button>

            {/* Browser Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-xs font-black text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-md active:scale-95 transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print Invoice</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Share Feedback Toast */}
        {shareSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-2.5 px-6 flex items-center justify-between text-xs font-bold text-emerald-900" data-no-print>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Invoice with full bank account details & total balance reconciliation dispatched to {customer.companyName} ({customer.phone || 'Dealer WhatsApp'})
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">Verified Channel</span>
          </div>
        )}

        {/* Dynamic Split Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100 min-h-0">
          
          {/* LEFT: Live Customizer Sidebar */}
          <div className="w-full lg:w-84 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-4 sm:p-5 overflow-y-auto shrink-0 flex flex-col justify-between space-y-5" data-no-print>
            <div className="space-y-5">
              
              {/* Template Style Selector */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Palette className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Invoice Template Style</span>
                </div>
                
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTemplateStyle('NAVY_AMBER')}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                      templateStyle === 'NAVY_AMBER'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">1. Corporate Navy & Amber</div>
                      <div className={`text-[10px] ${templateStyle === 'NAVY_AMBER' ? 'text-amber-300' : 'text-slate-500'}`}>
                        Angled header banner (Sample 1 & 2)
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-white"></span>
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-500"></span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateStyle('CHARCOAL_GOLD')}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                      templateStyle === 'CHARCOAL_GOLD'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">2. Executive Charcoal & Gold</div>
                      <div className={`text-[10px] ${templateStyle === 'CHARCOAL_GOLD' ? 'text-amber-300' : 'text-slate-500'}`}>
                        Modern chevron header (Sample 3, 4 & 5)
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-zinc-800 border border-white"></span>
                      <span className="w-3.5 h-3.5 rounded-full bg-yellow-400"></span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateStyle('EMERALD_TEAL')}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                      templateStyle === 'EMERALD_TEAL'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">3. Signature National Lights</div>
                      <div className={`text-[10px] ${templateStyle === 'EMERALD_TEAL' ? 'text-teal-300' : 'text-slate-500'}`}>
                        Official Corporate Emerald & Gold
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-700"></span>
                      <span className="w-3.5 h-3.5 rounded-full bg-teal-500"></span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateStyle('MINIMALIST')}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                      templateStyle === 'MINIMALIST'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">4. Minimalist Clean Modern</div>
                      <div className={`text-[10px] ${templateStyle === 'MINIMALIST' ? 'text-amber-300' : 'text-slate-500'}`}>
                        Billed typographic style (Sample 6)
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-700"></span>
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-600"></span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateStyle('THERMAL_80MM')}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                      templateStyle === 'THERMAL_80MM'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">5. POS Thermal Receipt (80mm)</div>
                      <div className={`text-[10px] ${templateStyle === 'THERMAL_80MM' ? 'text-amber-300' : 'text-slate-500'}`}>
                        Compact roll paper slip
                      </div>
                    </div>
                    <Receipt className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Financial Balance Reconciliation Card */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Balance Math Breakdown</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Old Balance (Arrears):</span>
                    <span className="font-mono font-bold text-slate-800">PKR {oldBalance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>+ Current Invoice:</span>
                    <span className="font-mono font-bold text-amber-700">+ PKR {currentInvoiceAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>- Today's Recovery:</span>
                    <span className="font-mono font-bold text-rose-600">- PKR {todayRecovery.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900">
                    <span>= Net Closing Balance:</span>
                    <span className="font-mono text-emerald-700">PKR {netTotalBalance.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-1 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                      Override Old Balance
                    </label>
                    <input
                      type="number"
                      value={overrideOldBalance ?? ''}
                      onChange={(e) => setOverrideOldBalance(e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="Auto"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                      Today's Recovery (PKR)
                    </label>
                    <input
                      type="number"
                      value={todayRecovery || ''}
                      onChange={(e) => setTodayRecovery(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Banking & EasyPaisa Accounts Settings */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Payment Accounts in Invoice</span>
                </div>

                <label className="flex items-center justify-between py-1 text-xs font-medium text-slate-700 cursor-pointer">
                  <span>Meezan Bank Ltd</span>
                  <input
                    type="checkbox"
                    checked={bankDetails.showBank1}
                    onChange={(e) => setBankDetails({ ...bankDetails, showBank1: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between py-1 text-xs font-medium text-slate-700 cursor-pointer">
                  <span>Habib Bank Ltd (HBL)</span>
                  <input
                    type="checkbox"
                    checked={bankDetails.showBank2}
                    onChange={(e) => setBankDetails({ ...bankDetails, showBank2: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between py-1 text-xs font-medium text-slate-700 cursor-pointer">
                  <span>EasyPaisa & JazzCash Wallets</span>
                  <input
                    type="checkbox"
                    checked={bankDetails.showEasyPaisa}
                    onChange={(e) => setBankDetails({ ...bankDetails, showEasyPaisa: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Compliance & Watermark Overlays */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Compliance & Seals</span>
                
                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-xs text-slate-600 font-medium">Digital Secure Seal</span>
                  <input
                    type="checkbox"
                    checked={includeStamp}
                    onChange={(e) => setIncludeStamp(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-xs text-slate-600 font-medium">FBR / Digital Payment QR</span>
                  <input
                    type="checkbox"
                    checked={includeQR}
                    onChange={(e) => setIncludeQR(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Editable Terms & Conditions */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Terms & Conditions</span>
                </label>
                <textarea
                  rows={3}
                  value={termsText}
                  onChange={(e) => setTermsText(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-600 leading-normal focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono space-y-0.5 text-center">
              <div>Format: A4 Print-Ready Document</div>
              <div>National Lights Enterprise Standard</div>
            </div>
          </div>

          {/* RIGHT: High-Fidelity Printable PDF Preview Area */}
          <div className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto bg-slate-200/60 flex justify-center items-start min-h-0">
            
            {/* ========================================================================= */}
            {/* 1. CORPORATE NAVY & AMBER TEMPLATE (Matching Sample 1 & 2) */}
            {/* ========================================================================= */}
            {templateStyle === 'NAVY_AMBER' && (
              <div className="invoice-print-container relative mx-auto w-full max-w-[210mm] bg-white shadow-2xl border border-slate-200 text-slate-900 font-sans print-area print:shadow-none print:border-none print:p-0 overflow-hidden">
                
                {/* Secure Watermark */}
                {includeWatermark && (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none z-0">
                    <div className="text-slate-200/20 font-black text-4xl sm:text-6xl uppercase tracking-widest transform -rotate-45 whitespace-nowrap">
                      {watermarkText}
                    </div>
                  </div>
                )}

                {/* Top Geometric Angled Header (Matching Sample 1 & 2) */}
                <div className="relative z-10">
                  {/* Top Navy Bar */}
                  <div className="bg-[#0f1d38] h-3 w-full"></div>
                  
                  {/* Main Angled Header Banner */}
                  <div className="relative bg-[#0f1d38] px-6 sm:px-10 py-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Orange/Amber Geometric Polygon accent block */}
                    <div className="absolute top-0 left-0 bottom-0 w-2/5 sm:w-1/3 bg-gradient-to-r from-amber-500 to-amber-600 [clip-path:polygon(0_0,100%_0,85%_100%,0_100%)] flex items-center pl-6 sm:pl-10 pr-6">
                      <div className="flex items-center gap-3">
                        <NationalLightLogo size="md" showGlow={false} />
                        <div>
                          <div className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-950">
                            NATIONAL LIGHTS
                          </div>
                          <div className="text-[9px] font-bold text-slate-900 tracking-wider">
                            (PVT) LIMITED
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Invoice Title */}
                    <div className="ml-auto text-right pl-4">
                      <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-amber-400">
                        INVOICE
                      </h1>
                      <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                        FBR Tax Invoice • NTN: {companyInfo.ntn}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoice Body Container */}
                <div className="relative z-10 px-6 sm:px-10 py-6 space-y-6">
                  
                  {/* Two-Column Bill To & Invoice Info (Matching Sample 1 & 2) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                    
                    {/* Left: Invoice To (Dealer / Distributor Information) */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>INVOICE TO (DEALER / DISTRIBUTOR):</span>
                      </div>
                      <h2 className="text-base font-black text-slate-900 uppercase">
                        {customer.companyName}
                      </h2>
                      <div className="text-xs text-slate-600 font-medium leading-relaxed">
                        {customer.address}
                      </div>
                      <div className="text-xs text-slate-600">
                        Territory: <span className="font-bold text-slate-800">{customer.territory || customer.city || 'Lahore'}</span> | Region: <span className="font-bold text-slate-800">{customer.region || 'Punjab'}</span>
                      </div>
                      <div className="text-xs text-slate-700 font-medium">
                        Contact Person: <span className="font-bold">{customer.contactPerson || 'Proprietor'}</span>
                      </div>
                      <div className="text-xs text-slate-700 font-mono">
                        Phone/WhatsApp: <span className="font-bold">{customer.phone}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Dealer Code: <span className="font-bold text-slate-800">{customer.customerCode}</span> | NTN/CNIC: {customer.taxNumber || customer.cnic || 'Unregistered'}
                      </div>
                    </div>

                    {/* Right: Company Contact & Invoice Metadata (Matching Sample 1 & 2) */}
                    <div className="space-y-3 sm:text-right flex flex-col items-start sm:items-end">
                      {/* Company Info Box */}
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <div className="font-bold text-slate-900">{companyInfo.name}</div>
                        <div>{companyInfo.headOffice}</div>
                        <div>UAN: {companyInfo.uan} | Tel: {companyInfo.phone}</div>
                        <div>Email: {companyInfo.email}</div>
                        <div>Web: {companyInfo.website}</div>
                      </div>

                      {/* Invoice Specifics */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left w-full sm:w-72 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold uppercase text-[10px]">Invoice No:</span>
                          <span className="font-mono font-black text-amber-700">#{invoice.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold uppercase text-[10px]">Invoice Date:</span>
                          <span className="font-semibold">{invoice.invoiceDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold uppercase text-[10px]">Due Date:</span>
                          <span className="font-semibold text-rose-700">{invoice.dueDate || 'Immediate'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold uppercase text-[10px]">Credit Terms:</span>
                          <span className="font-bold">{customer.creditDays || 30} Days (Ageing)</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 border-t border-slate-200 pt-1">
                          <span>Credit Limit:</span>
                          <span className="font-mono font-bold">PKR {(customer.creditLimit || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clean Line-Item Table (Matching Sample 1 & 2) */}
                  <div className="overflow-hidden rounded-xl border border-slate-300">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0f1d38] text-white font-bold text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-8 text-center">SL</th>
                          <th className="py-2.5 px-3">Item Description / SKU</th>
                          <th className="py-2.5 px-3 w-20 text-right">Price (PKR)</th>
                          <th className="py-2.5 px-3 w-16 text-right">Qty (Pcs)</th>
                          <th className="py-2.5 px-3 w-16 text-right">Cartons</th>
                          <th className="py-2.5 px-3 w-16 text-right">Disc %</th>
                          <th className="py-2.5 px-3 w-28 text-right">Total (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {invoice.items.map((item, idx) => {
                          const sku = skuMap.get(item.skuId);
                          const cartonQty = sku?.cartonQuantity ? (item.quantity / sku.cartonQuantity).toFixed(1) : '-';
                          const disc = (item as any).discountPercent ?? (item.discountAmount ? ((item.discountAmount / (item.quantity * item.unitPrice)) * 100).toFixed(0) : 0);
                          const net = item.lineTotal || ((item as any).netAmount ?? (item.quantity * item.unitPrice - (item.discountAmount || 0)));
                          
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{sku?.name || item.skuName || 'National LED Item'}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Code: {sku?.skuCode || item.skuCode || item.skuId} • {sku?.wattage || ''} {sku?.colorTemperature || ''}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">{item.unitPrice.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{item.quantity}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500">{cartonQty}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500">{disc}%</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{net.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Reconciliation & Banking Grid (Matching Sample 1 & 2) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                    
                    {/* Left: Banking Details & Payment Information Box */}
                    <div className="md:col-span-7 space-y-4">
                      
                      {/* Payment Information Card */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                        <div className="text-[11px] font-black uppercase tracking-wider text-amber-700 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Landmark className="w-4 h-4" />
                            <span>COMPANY PAYMENT & BANKING ACCOUNTS:</span>
                          </span>
                          <span className="text-[9px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                            Official Accounts
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          {/* Meezan Bank */}
                          {bankDetails.showBank1 && (
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                              <div className="flex justify-between font-bold text-slate-900">
                                <span>{bankDetails.bank1Name}</span>
                                <span className="text-[10px] text-slate-500">{bankDetails.bank1Branch}</span>
                              </div>
                              <div className="text-slate-600 mt-0.5">
                                A/C Title: <span className="font-semibold text-slate-800">{bankDetails.bank1Title}</span>
                              </div>
                              <div className="flex justify-between font-mono text-[11px] mt-0.5">
                                <span>A/C: <strong>{bankDetails.bank1Account}</strong></span>
                                <span className="text-slate-500">IBAN: <strong>{bankDetails.bank1Iban}</strong></span>
                              </div>
                            </div>
                          )}

                          {/* HBL Bank */}
                          {bankDetails.showBank2 && (
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                              <div className="flex justify-between font-bold text-slate-900">
                                <span>{bankDetails.bank2Name}</span>
                                <span className="text-[10px] text-slate-500">{bankDetails.bank2Branch}</span>
                              </div>
                              <div className="text-slate-600 mt-0.5">
                                A/C Title: <span className="font-semibold text-slate-800">{bankDetails.bank2Title}</span>
                              </div>
                              <div className="flex justify-between font-mono text-[11px] mt-0.5">
                                <span>A/C: <strong>{bankDetails.bank2Account}</strong></span>
                                <span className="text-slate-500">IBAN: <strong>{bankDetails.bank2Iban}</strong></span>
                              </div>
                            </div>
                          )}

                          {/* EasyPaisa & JazzCash Digital Wallets */}
                          {bankDetails.showEasyPaisa && (
                            <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/80 grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <div className="font-bold text-emerald-800 flex items-center gap-1">
                                  <Smartphone className="w-3 h-3" /> EasyPaisa Merchant / Till
                                </div>
                                <div className="font-mono font-bold text-slate-800">{bankDetails.easyPaisaNumber}</div>
                                <div className="text-[10px] text-slate-500">Till: {bankDetails.easyPaisaTillId}</div>
                              </div>
                              <div>
                                <div className="font-bold text-rose-800 flex items-center gap-1">
                                  <Wallet className="w-3 h-3" /> JazzCash & Raast ID
                                </div>
                                <div className="font-mono font-bold text-slate-800">{bankDetails.jazzCashNumber}</div>
                                <div className="text-[10px] text-slate-500">Raast: {bankDetails.raastId}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Amount In Words */}
                      <div className="bg-slate-100/80 p-3 rounded-lg border border-slate-200 text-xs">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          CURRENT INVOICE AMOUNT IN WORDS:
                        </div>
                        <div className="font-bold text-slate-900 capitalize mt-0.5">
                          {amountInWords}
                        </div>
                      </div>

                      {/* Terms & Conditions */}
                      <div className="text-[10px] text-slate-500 space-y-1">
                        <div className="font-bold text-slate-800 uppercase tracking-wider">
                          TERMS & CONDITIONS:
                        </div>
                        {termsText.split('\n').map((line, lidx) => (
                          <div key={lidx} className="leading-tight">{line}</div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Balance Math & Net Total Box (Old Balance + New Invoice = Total Balance) */}
                    <div className="md:col-span-5 space-y-3">
                      
                      {/* Calculations List */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Sub Total (All-Inclusive):</span>
                          <span className="font-mono font-bold text-slate-900">PKR {currentInvoiceAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[10px]">
                          <span>Sales Tax &amp; GST:</span>
                          <span className="font-semibold italic text-emerald-700">Included in prices</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[10px]">
                          <span>Commercial Trade Discount:</span>
                          <span className="font-semibold italic text-emerald-700">Included in prices</span>
                        </div>

                        <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                          <span>New Invoice Amount:</span>
                          <span className="font-mono text-amber-700">PKR {currentInvoiceAmount.toFixed(2)}</span>
                        </div>

                        {/* Balance Formula Box */}
                        <div className="bg-white p-3 rounded-lg border border-amber-300 shadow-xs space-y-1.5 mt-2">
                          <div className="flex justify-between text-slate-700 text-xs">
                            <span className="font-bold">Old Balance (Previous):</span>
                            <span className="font-mono font-bold text-slate-800">PKR {oldBalance.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-amber-800 text-xs">
                            <span className="font-bold">+ New Invoice:</span>
                            <span className="font-mono font-bold">+ PKR {currentInvoiceAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-rose-700 text-xs font-semibold">
                            <span>- Today's Recovery:</span>
                            <span className="font-mono font-bold">- PKR {todayRecovery.toFixed(2)}</span>
                          </div>
                          
                          {/* Grand Highlighted Net Balance Pill */}
                          <div className="border-t-2 border-slate-900 pt-2 flex items-center justify-between text-sm sm:text-base font-black text-[#0f1d38]">
                            <span className="uppercase tracking-tight text-[11px] sm:text-xs">NET CLOSING BALANCE:</span>
                            <span className="font-mono text-base sm:text-lg font-black text-emerald-600">
                              PKR {netTotalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Credit Ageing Table of Arrears (Old Balance) */}
                        {oldBalance > 0 && (
                          <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 mt-2">
                            <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1">
                              Arrears (Old Balance) Ageing Schedule
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-center text-[9px] font-mono">
                              <div className="bg-white p-1 rounded border border-slate-200">
                                <span className="block text-slate-400 font-sans text-[8px]">0-30 Days</span>
                                <span className="font-bold text-slate-700">PKR {Math.round(oldBalance * 0.60).toLocaleString()}</span>
                              </div>
                              <div className="bg-white p-1 rounded border border-slate-200">
                                <span className="block text-slate-400 font-sans text-[8px]">31-60 Days</span>
                                <span className="font-bold text-slate-700">PKR {Math.round(oldBalance * 0.25).toLocaleString()}</span>
                              </div>
                              <div className="bg-white p-1 rounded border border-slate-200">
                                <span className="block text-slate-400 font-sans text-[8px]">61-90 Days</span>
                                <span className="font-bold text-slate-700">PKR {Math.round(oldBalance * 0.10).toLocaleString()}</span>
                              </div>
                              <div className="bg-white p-1 rounded border border-slate-200">
                                <span className="block text-slate-400 font-sans text-[8px]">Over 90 Days</span>
                                <span className="font-bold text-rose-600">PKR {Math.max(0, Math.round(oldBalance - Math.round(oldBalance * 0.60) - Math.round(oldBalance * 0.25) - Math.round(oldBalance * 0.10))).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Total in Words */}
                      <div className="text-[10px] text-slate-500 font-medium px-1">
                        <strong>Total Closing Balance:</strong> {totalBalanceInWords}
                      </div>

                      {/* Digital QR Compliance */}
                      {includeQR && (
                        <div className="bg-white p-2.5 border border-slate-200 rounded-xl flex items-center gap-3">
                          <QrCode className="w-12 h-12 text-slate-900 shrink-0" />
                          <div className="text-[10px] text-slate-600 leading-tight">
                            <div className="font-bold text-slate-900">SCAN TO VERIFY & PAY</div>
                            <div>FBR STRN: {companyInfo.strn}</div>
                            <div className="text-[9px] font-mono text-slate-400">Doc ID: NL-INV-{invoice.invoiceNumber}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signatures & Authorisations */}
                  <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs border-t border-slate-200">
                    <div className="space-y-1">
                      <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">Prepared By</div>
                      <div className="text-[10px] text-slate-400">Sales & Billing Desk</div>
                    </div>
                    
                    <div className="space-y-1 relative">
                      {includeStamp && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-4 border-double border-emerald-600/70 flex flex-col items-center justify-center text-emerald-700 font-black tracking-tight uppercase transform rotate-12 text-[7px] leading-tight select-none pointer-events-none bg-white/60">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 mb-0.5" />
                          <span>NATIONAL LIGHTS</span>
                          <span>VERIFIED SEAL</span>
                          <span className="text-[5px]">{new Date().toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">Accounts Department</div>
                      <div className="text-[10px] text-slate-400">Audit & Reconciliation</div>
                    </div>

                    <div className="space-y-1">
                      <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">Authorised Signatory</div>
                      <div className="text-[10px] text-slate-400">Dealer Stamp & Acceptance</div>
                    </div>
                  </div>

                  {/* Bottom Decorative Footer Ribbon (Matching Sample 1 & 2) */}
                  <div className="pt-4">
                    <div className="relative bg-[#0f1d38] rounded-xl px-6 py-3 text-white flex items-center justify-between overflow-hidden">
                      <div className="absolute top-0 left-0 bottom-0 w-1/3 bg-amber-500 [clip-path:polygon(0_0,100%_0,75%_100%,0_100%)] flex items-center pl-6">
                        <span className="text-xs font-black text-slate-950 uppercase">Thank You For Your Business</span>
                      </div>
                      <div className="ml-auto text-[10px] text-slate-300 font-mono">
                        {companyInfo.website} • UAN: {companyInfo.uan}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. EXECUTIVE CHARCOAL & GOLD TEMPLATE (Matching Sample 3, 4 & 5) */}
            {/* ========================================================================= */}
            {templateStyle === 'CHARCOAL_GOLD' && (
              <div className="invoice-print-container relative mx-auto w-full max-w-[210mm] bg-white shadow-2xl border border-slate-200 text-slate-900 font-sans print-area print:shadow-none print:border-none print:p-0 overflow-hidden">
                
                {/* Secure Watermark */}
                {includeWatermark && (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none z-0">
                    <div className="text-slate-200/20 font-black text-4xl sm:text-6xl uppercase tracking-widest transform -rotate-45 whitespace-nowrap">
                      {watermarkText}
                    </div>
                  </div>
                )}

                {/* Top Charcoal & Gold Header (Matching Sample 3, 4, 5) */}
                <div className="relative z-10 bg-[#1c1d21] text-white px-6 sm:px-10 py-6 border-b-4 border-yellow-400">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <NationalLightLogo size="lg" showGlow={false} />
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                          NATIONAL LIGHTS (PVT) LTD
                        </h1>
                        <p className="text-[11px] text-yellow-400 font-medium">
                          {companyInfo.tagline}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {companyInfo.headOffice}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-block bg-yellow-400 text-slate-950 font-black text-xs px-4 py-1 rounded-md uppercase tracking-wider shadow-sm">
                        TAX INVOICE
                      </div>
                      <div className="text-xs font-mono font-bold text-yellow-400 mt-1">
                        INV #{invoice.invoiceNumber}
                      </div>
                      <div className="text-[10px] text-slate-300">
                        Date: {invoice.invoiceDate}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="relative z-10 px-6 sm:px-10 py-6 space-y-6">
                  
                  {/* Bill To & Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <div className="text-[10px] font-black uppercase text-yellow-600 tracking-wider">ISSUED TO CUSTOMER:</div>
                      <div className="text-base font-black text-slate-900 mt-0.5">{customer.companyName}</div>
                      <div className="text-xs text-slate-600">{customer.address}, {customer.city}</div>
                      <div className="text-xs text-slate-700 mt-1">
                        Contact: <span className="font-bold">{customer.contactPerson}</span> ({customer.phone})
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Code: {customer.customerCode} | NTN/CNIC: {customer.taxNumber || customer.cnic || 'N/A'}
                      </div>
                    </div>

                    <div className="text-left sm:text-right space-y-1 text-xs">
                      <div><span className="text-slate-500 font-bold uppercase text-[10px]">Payment Terms:</span> <strong>{customer.creditDays || 30} Days (Ageing)</strong></div>
                      <div><span className="text-slate-500 font-bold uppercase text-[10px]">Due Date:</span> <strong className="text-rose-700">{invoice.dueDate || 'Immediate'}</strong></div>
                      <div><span className="text-slate-500 font-bold uppercase text-[10px]">Credit Limit:</span> <strong className="font-mono">PKR {(customer.creditLimit || 0).toLocaleString()}</strong></div>
                      <div><span className="text-slate-500 font-bold uppercase text-[10px]">NTN / STRN:</span> <strong>{companyInfo.ntn} / {companyInfo.strn}</strong></div>
                    </div>
                  </div>

                  {/* Two-Toned Table Header (Yellow / Dark) */}
                  <div className="overflow-hidden rounded-xl border border-slate-300">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-900 font-bold text-[11px] uppercase">
                          <th className="py-2.5 px-3 bg-yellow-400 text-slate-950 w-10 text-center">SL</th>
                          <th className="py-2.5 px-3 bg-yellow-400 text-slate-950">Item Description</th>
                          <th className="py-2.5 px-3 bg-[#1c1d21] text-white w-24 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 bg-[#1c1d21] text-white w-16 text-right">Qty</th>
                          <th className="py-2.5 px-3 bg-[#1c1d21] text-white w-28 text-right">Total (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {invoice.items.map((item, idx) => {
                          const sku = skuMap.get(item.skuId);
                          const net = item.lineTotal || (item.quantity * item.unitPrice - (item.discountAmount || 0));
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{sku?.name || item.skuName || 'LED Product'}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{sku?.skuCode || item.skuCode}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">{item.unitPrice.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{item.quantity}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{net.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Reconciliation & Banking Details */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                    
                    {/* Left: Banking Details */}
                    <div className="md:col-span-7 space-y-3">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <div className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-yellow-600" />
                          <span>COMPANY BANKING ACCOUNTS (PAYABLE TO):</span>
                        </div>
                        <div className="text-xs space-y-1.5 text-slate-700">
                          {bankDetails.showBank1 && (
                            <div className="bg-white p-2 rounded border border-slate-200">
                              <div className="font-bold text-slate-900">{bankDetails.bank1Name} (A/C: {bankDetails.bank1Account})</div>
                              <div className="text-[11px] text-slate-600 font-mono">IBAN: {bankDetails.bank1Iban}</div>
                              <div className="text-[10px] text-slate-500">Title: {bankDetails.bank1Title}</div>
                            </div>
                          )}
                          {bankDetails.showEasyPaisa && (
                            <div className="bg-white p-2 rounded border border-slate-200 flex justify-between">
                              <div>
                                <span className="font-bold text-emerald-800">EasyPaisa Till:</span> {bankDetails.easyPaisaNumber}
                              </div>
                              <div>
                                <span className="font-bold text-rose-800">JazzCash:</span> {bankDetails.jazzCashNumber}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500">
                        <strong>Terms & Conditions:</strong> {termsText}
                      </div>
                    </div>

                    {/* Right: Calculations with Old Balance + Invoice Total = Net Total Balance */}
                    <div className="md:col-span-5 space-y-2">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Sub Total:</span>
                          <span className="font-mono font-bold">PKR {invoice.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Sales Tax (GST 18%):</span>
                          <span className="font-mono font-bold">PKR {invoice.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                          <span>Current Invoice Total:</span>
                          <span className="font-mono text-yellow-700">PKR {currentInvoiceAmount.toFixed(2)}</span>
                        </div>
                        
                        {/* Old Balance Addition */}
                        <div className="border-t border-slate-300 pt-1.5 space-y-1">
                          <div className="flex justify-between text-slate-600">
                            <span>Previous Outstanding (Old Balance):</span>
                            <span className="font-mono font-bold">PKR {oldBalance.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-yellow-700 font-bold">
                            <span>+ Current Invoice:</span>
                            <span className="font-mono font-bold">+ PKR {currentInvoiceAmount.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Grand Total Bar */}
                        <div className="bg-[#1c1d21] text-yellow-400 p-2.5 rounded-lg flex justify-between items-center font-black mt-2">
                          <span className="text-xs uppercase">TOTAL CLOSING BALANCE:</span>
                          <span className="text-base font-mono">PKR {netTotalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 italic">
                        In Words: {totalBalanceInWords}
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs border-t border-slate-200">
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                      National Lights Authorized Accounts
                    </div>
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                      Customer / Dealer Stamp & Signature
                    </div>
                  </div>

                  {/* Bottom Strip */}
                  <div className="bg-[#1c1d21] text-white p-3 rounded-lg flex items-center justify-between text-[10px]">
                    <div>UAN: {companyInfo.uan} | {companyInfo.email}</div>
                    <div className="text-yellow-400 font-bold">{companyInfo.website}</div>
                  </div>

                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. SIGNATURE EMERALD & TEAL TEMPLATE */}
            {/* ========================================================================= */}
            {templateStyle === 'EMERALD_TEAL' && (
              <div className="invoice-print-container relative mx-auto w-full max-w-[210mm] bg-white shadow-2xl border border-slate-200 text-slate-900 font-sans print-area print:shadow-none print:border-none print:p-0 overflow-hidden">
                
                {includeWatermark && (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none z-0">
                    <div className="text-emerald-900/10 font-black text-4xl sm:text-6xl uppercase tracking-widest transform -rotate-45 whitespace-nowrap">
                      {watermarkText}
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="relative z-10 bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-6 sm:px-10 py-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <NationalLightLogo size="lg" showGlow={false} />
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                          NATIONAL LIGHTS (PVT) LTD.
                        </h1>
                        <p className="text-[11px] text-teal-200 font-medium">
                          FBR Registered Commercial Tax Invoice
                        </p>
                        <p className="text-[10px] text-emerald-100/80">
                          {companyInfo.headOffice}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-block bg-white text-emerald-900 font-black text-xs px-3 py-1 rounded uppercase tracking-wider">
                        SALES TAX INVOICE
                      </div>
                      <div className="text-xs font-mono font-bold text-teal-200 mt-1">
                        #{invoice.invoiceNumber}
                      </div>
                      <div className="text-[10px] text-emerald-100">
                        NTN: {companyInfo.ntn} | STRN: {companyInfo.strn}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="relative z-10 px-6 sm:px-10 py-6 space-y-6">
                  
                  {/* Dealer Info */}
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4 text-xs">
                    <div className="space-y-1 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                      <div className="text-[10px] font-black uppercase text-emerald-800">BILL TO DEALER:</div>
                      <div className="text-sm font-bold text-slate-900">{customer.companyName}</div>
                      <div className="text-slate-600">{customer.address}, {customer.city}</div>
                      <div className="text-slate-700">Contact: <strong>{customer.contactPerson}</strong> ({customer.phone})</div>
                      <div className="text-[11px] font-mono text-slate-500">Code: {customer.customerCode} | NTN: {customer.taxNumber || 'Unregistered'}</div>
                    </div>

                    <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200 text-right">
                      <div className="text-[10px] font-black uppercase text-slate-500">INVOICE METRICS:</div>
                      <div>Date: <strong>{invoice.invoiceDate}</strong> | Due: <strong className="text-rose-700">{invoice.dueDate || 'Immediate'}</strong></div>
                      <div>Credit Terms: <strong>{customer.creditDays || 30} Days</strong> (Limit: PKR {(customer.creditLimit || 0).toLocaleString()})</div>
                      <div>Payment Mode: <strong>{invoice.paymentMode}</strong></div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-emerald-800 text-white font-bold text-[11px] uppercase">
                          <th className="py-2.5 px-3 w-8 text-center">#</th>
                          <th className="py-2.5 px-3">SKU & Item Description</th>
                          <th className="py-2.5 px-3 w-20 text-right">Rate</th>
                          <th className="py-2.5 px-3 w-16 text-right">Qty</th>
                          <th className="py-2.5 px-3 w-28 text-right">Net Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {invoice.items.map((item, idx) => {
                          const sku = skuMap.get(item.skuId);
                          const net = item.lineTotal || (item.quantity * item.unitPrice - (item.discountAmount || 0));
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="py-2 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                              <td className="py-2 px-3">
                                <div className="font-bold text-slate-900">{sku?.name || item.skuName || 'LED Fixture'}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{sku?.skuCode || item.skuCode}</div>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-700">{item.unitPrice.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{item.quantity}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">{net.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations & Bank Accounts */}
                  <div className="grid grid-cols-12 gap-6 pt-2">
                    <div className="col-span-7 space-y-3">
                      <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 text-xs space-y-1.5">
                        <div className="font-bold text-emerald-900 flex items-center gap-1">
                          <Landmark className="w-3.5 h-3.5" /> Official Company Bank Accounts
                        </div>
                        {bankDetails.showBank1 && (
                          <div className="text-[11px] text-slate-700">
                            <strong>{bankDetails.bank1Name}:</strong> A/C {bankDetails.bank1Account} (IBAN: {bankDetails.bank1Iban})
                          </div>
                        )}
                        {bankDetails.showEasyPaisa && (
                          <div className="text-[11px] text-slate-700">
                            <strong>EasyPaisa / JazzCash Till:</strong> {bankDetails.easyPaisaNumber}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        <strong>Terms:</strong> {termsText}
                      </div>
                    </div>

                    <div className="col-span-5 space-y-2 text-xs">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex justify-between">
                          <span>Invoice Subtotal:</span>
                          <span className="font-mono font-bold">PKR {invoice.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sales Tax (18%):</span>
                          <span className="font-mono font-bold">PKR {invoice.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-800 border-t pt-1">
                          <span>New Invoice:</span>
                          <span className="font-mono">PKR {currentInvoiceAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 border-t pt-1">
                          <span>Old Balance:</span>
                          <span className="font-mono font-bold">PKR {oldBalance.toFixed(2)}</span>
                        </div>
                        <div className="bg-emerald-800 text-white p-2 rounded flex justify-between font-black text-sm mt-1">
                          <span>TOTAL BALANCE:</span>
                          <span className="font-mono">PKR {netTotalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs border-t border-slate-200">
                    <div className="border-t border-slate-400 pt-1 font-bold">Prepared By</div>
                    <div className="border-t border-slate-400 pt-1 font-bold">Accounts Audit</div>
                    <div className="border-t border-slate-400 pt-1 font-bold">Customer Stamp</div>
                  </div>

                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. MINIMALIST CLEAN MODERN TEMPLATE (Matching Sample 6) */}
            {/* ========================================================================= */}
            {templateStyle === 'MINIMALIST' && (
              <div className="invoice-print-container relative mx-auto w-full max-w-[210mm] bg-white shadow-2xl border border-slate-200 text-slate-900 font-sans print-area print:shadow-none print:border-none print:p-0 p-8 sm:p-12 space-y-8">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
                      INVOICE
                    </h1>
                    <div className="text-xs text-slate-500 font-mono mt-1">
                      Invoice No: <strong className="text-slate-900">#{invoice.invoiceNumber}</strong>
                    </div>
                    <div className="text-xs text-slate-500">
                      Date: <strong className="text-slate-900">{invoice.invoiceDate}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <NationalLightLogo size="sm" showGlow={false} />
                      <span className="text-base font-black text-slate-900 uppercase">{companyInfo.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{companyInfo.headOffice}</div>
                    <div className="text-xs text-slate-500">UAN: {companyInfo.uan} | NTN: {companyInfo.ntn}</div>
                  </div>
                </div>

                {/* Payable To & Bill From (Matching Sample 6) */}
                <div className="grid grid-cols-2 gap-8 text-xs">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">PAYABLE TO (COMPANY):</div>
                    <div className="font-bold text-sm text-slate-900 mt-1">{companyInfo.name}</div>
                    <div className="text-slate-600">{companyInfo.headOffice}</div>
                    <div className="text-slate-600">Bank: {bankDetails.bank1Name} (A/C: {bankDetails.bank1Account})</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">BILL FROM / INVOICE TO:</div>
                    <div className="font-bold text-sm text-slate-900 mt-1">{customer.companyName}</div>
                    <div className="text-slate-600">{customer.address}, {customer.city}</div>
                    <div className="text-slate-600">Contact: {customer.contactPerson} ({customer.phone})</div>
                    <div className="text-slate-500 font-mono">Code: {customer.customerCode}</div>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase text-[11px]">
                      <th className="py-2.5">Item Description</th>
                      <th className="py-2.5 text-right w-16">Qty</th>
                      <th className="py-2.5 text-right w-24">Price</th>
                      <th className="py-2.5 text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item, idx) => {
                      const sku = skuMap.get(item.skuId);
                      const net = item.lineTotal || (item.quantity * item.unitPrice);
                      return (
                        <tr key={idx}>
                          <td className="py-3">
                            <div className="font-bold text-slate-900">{sku?.name || item.skuName || 'LED Fixture'}</div>
                            <div className="text-[10px] text-slate-500">{sku?.skuCode}</div>
                          </td>
                          <td className="py-3 text-right font-mono">{item.quantity}</td>
                          <td className="py-3 text-right font-mono">PKR {item.unitPrice.toFixed(2)}</td>
                          <td className="py-3 text-right font-mono font-bold">PKR {net.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-6">
                  <div className="space-y-2 text-xs">
                    <div className="font-bold text-slate-900">BANK DETAILS:</div>
                    <div className="text-slate-600">
                      {bankDetails.bank1Name} • Title: {bankDetails.bank1Title}<br />
                      A/C: {bankDetails.bank1Account} • IBAN: {bankDetails.bank1Iban}<br />
                      EasyPaisa: {bankDetails.easyPaisaNumber}
                    </div>
                    <div className="text-[10px] text-slate-400 pt-2">
                      Notes: {termsText}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sub Total:</span>
                      <span className="font-mono font-bold">PKR {invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sales Tax (GST):</span>
                      <span className="font-mono font-bold">PKR {invoice.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t pt-1">
                      <span>Invoice Total:</span>
                      <span className="font-mono">PKR {currentInvoiceAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Old Balance:</span>
                      <span className="font-mono font-bold">PKR {oldBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2">
                      <span>GRAND TOTAL BALANCE:</span>
                      <span className="font-mono">PKR {netTotalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 5. 80MM POS THERMAL RECEIPT SLIP */}
            {/* ========================================================================= */}
            {templateStyle === 'THERMAL_80MM' && (
              <div className="invoice-print-container mx-auto w-[80mm] sm:w-[148mm] bg-white p-4 shadow-xl border border-slate-300 font-mono text-[11px] text-slate-900 print-area print:shadow-none print:border-none print:w-[148mm] print:p-0">
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
                  <div className="text-base font-black tracking-tight">NATIONAL LIGHTS (PVT) LTD</div>
                  <div className="text-[10px]">Head Office: Brandreth Rd, Lahore</div>
                  <div className="text-[10px]">NTN: {companyInfo.ntn} | UAN: {companyInfo.uan}</div>
                  <div className="font-bold text-xs mt-1">*** OFFICIAL TAX INVOICE ***</div>
                </div>

                <div className="py-2 space-y-0.5 border-b border-dashed border-slate-400 text-[10px]">
                  <div>Inv #: <span className="font-bold">{invoice.invoiceNumber}</span></div>
                  <div>Date: {invoice.invoiceDate} | Due: {invoice.dueDate || 'Immediate'}</div>
                  <div>Party: <span className="font-bold">{customer.companyName}</span> ({customer.customerCode})</div>
                  <div>Phone: {customer.phone}</div>
                  <div>Credit Days: {customer.creditDays || 30} Days</div>
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
                            <td className="py-1 pr-1 truncate max-w-[32mm]">{sku?.name || item.skuName || 'LED Item'}</td>
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
                    <span>Sales Tax (18%):</span>
                    <span>PKR {invoice.taxAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-slate-300 pt-0.5">
                    <span>New Bill:</span>
                    <span>PKR {currentInvoiceAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Old Balance:</span>
                    <span>PKR {oldBalance.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs border-t-2 border-slate-900 pt-1">
                    <span>TOTAL PAYABLE:</span>
                    <span>PKR {netTotalBalance.toFixed(0)}</span>
                  </div>
                </div>

                {/* Bank Accounts on Slip */}
                <div className="py-2 border-b border-dashed border-slate-400 text-[9px] text-slate-700 space-y-0.5">
                  <div className="font-bold text-slate-900">BANK PAYMENT ACCOUNTS:</div>
                  <div>Meezan: {bankDetails.bank1Account} (Title: NL Pvt Ltd)</div>
                  <div>EasyPaisa / JazzCash: {bankDetails.easyPaisaNumber}</div>
                </div>

                <div className="text-center pt-3 space-y-1 text-[9px] text-slate-500">
                  <div>Thank You For Choosing National Lights!</div>
                  <div>System Generated Verification Slip</div>
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
