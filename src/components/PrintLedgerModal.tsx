/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Official National Lights Dealer Account Ledger & Statement Studio
 * Includes full Company Profile, Banking Details (Meezan Bank, HBL, EasyPaisa, JazzCash, Raast),
 * Dealer / Distributor Info, Credit Terms (Ageing), and Balance Calculations:
 * Opening Balance + Invoices (Debits) - Payments (Credits) = Net Closing Balance.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { NationalLightLogo } from './NationalLightLogo';
import {
  Printer,
  X,
  FileSpreadsheet,
  Share2,
  Calendar,
  Building,
  Building2,
  ShieldCheck,
  Download,
  CreditCard,
  Landmark,
  Smartphone,
  Wallet,
  Loader2,
  QrCode,
  FileText,
} from 'lucide-react';
import { Customer, LedgerEntry } from '../types';

interface PrintLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  ledgerEntries: LedgerEntry[];
  startDate?: string;
  endDate?: string;
}

export const PrintLedgerModal: React.FC<PrintLedgerModalProps> = ({
  isOpen,
  onClose,
  customer,
  ledgerEntries,
  startDate = '',
  endDate = '',
}) => {
  const [shareSuccess, setShareSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Company Profile defaults
  const companyInfo = {
    name: 'National Lights (Pvt) Ltd.',
    tagline: 'Illuminating Innovation — Premium Commercial & Architectural LED Solutions',
    headOffice: '18-Brandreth Road, Lahore, Pakistan',
    plant: '24-KM Multan Road Industrial Zone, Lahore',
    phone: '+92 42 37654321 / 0300-8456789',
    uan: '042-111-654-000',
    email: 'accounts@nationallights.com.pk',
    website: 'www.nationallights.com.pk',
    ntn: '2894102-7',
    strn: '03-00-2894-102-7',
  };

  // Banking Details
  const bankDetails = {
    bank1Name: 'Meezan Bank Ltd',
    bank1Branch: 'Brandreth Road Branch, Lahore',
    bank1Title: 'National Lights (Pvt) Ltd',
    bank1Account: '0215-0105893201',
    bank1Iban: 'PK68 MEZN 0002 1501 0589 3201',

    bank2Name: 'Habib Bank Limited (HBL)',
    bank2Branch: 'Main Market Branch, Lahore',
    bank2Title: 'National Lights (Pvt) Ltd',
    bank2Account: '1029-7901234503',
    bank2Iban: 'PK36 HABB 0010 2979 0123 4503',

    easyPaisaNumber: '0300-8456789 (National Lights Corp)',
    jazzCashNumber: '0321-4567890 (National Lights Pvt Ltd)',
    raastId: '03008456789 / billing@nationallights',
  };

  if (!isOpen || !customer) return null;

  const openingBalance = customer.openingBalance || 0;
  const latestBalance = ledgerEntries.length > 0 
    ? ledgerEntries[ledgerEntries.length - 1].runningBalance 
    : (customer.currentBalance || openingBalance);

  const totalDebits = ledgerEntries.reduce((acc, curr) => acc + (curr.debitAmount || 0), 0);
  const totalCredits = ledgerEntries.reduce((acc, curr) => acc + (curr.creditAmount || 0), 0);

  // Transmit strictly to this selected dealer WhatsApp
  const handleShareToDealer = () => {
    if (!customer) return;
    const rawPhone = (customer.phone || '03004123456').replace(/\D/g, '');
    const phoneWithCountry = rawPhone.startsWith('92') ? rawPhone : rawPhone.startsWith('0') ? `92${rawPhone.slice(1)}` : `92${rawPhone}`;
    
    const statementSummary = `*NATIONAL LIGHTS (PVT) LTD - ACCOUNT LEDGER STATEMENT*\n\n` +
      `*Dealer Account:* ${customer.companyName} (${customer.customerCode})\n` +
      `*Contact Person:* ${customer.contactPerson || 'Proprietor'} (${customer.phone})\n` +
      `*Territory:* ${customer.territory || customer.city || 'Lahore'}\n` +
      `*Credit Terms (Ageing):* ${customer.creditDays || 30} Days (Limit: PKR ${(customer.creditLimit || 0).toLocaleString()})\n` +
      `*Statement Period:* ${startDate || 'All Time'} to ${endDate || 'Present'}\n\n` +
      `*FINANCIAL RECONCILIATION SUMMARY:*\n` +
      `• *Opening Balance (Old Arrears):* PKR ${openingBalance.toLocaleString()}\n` +
      `• *Total New Invoices (Debits):* PKR ${totalDebits.toLocaleString()}\n` +
      `• *Total Payments Made (Credits):* PKR ${totalCredits.toLocaleString()}\n` +
      `--------------------------------------\n` +
      `• *NET OUTSTANDING CLOSING BALANCE:* *PKR ${latestBalance.toLocaleString()}*\n` +
      `--------------------------------------\n\n` +
      `*OFFICIAL BANKING PAYMENT DETAILS:*\n` +
      `🏦 *Meezan Bank Ltd* | Title: National Lights (Pvt) Ltd\n` +
      `• A/C No: ${bankDetails.bank1Account} | IBAN: ${bankDetails.bank1Iban}\n` +
      `🏦 *HBL Bank* | A/C No: ${bankDetails.bank2Account}\n` +
      `📱 *EasyPaisa Till:* ${bankDetails.easyPaisaNumber}\n` +
      `⚡ *Raast ID:* ${bankDetails.raastId}\n\n` +
      `_Generated from N-Link 360 Enterprise. Strictly confidential._`;

    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(statementSummary)}`;
    window.open(whatsappUrl, '_blank');
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 5000);
  };

  // Download crisp high-resolution PDF
  const downloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const container = document.querySelector('.ledger-print-container') as HTMLElement;
      if (!container) {
        throw new Error('Ledger print container element not found');
      }

      const canvas = await html2canvas(container, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight));

      const filename = `Ledger_${customer.customerCode || 'NL'}_${customer.companyName?.replace(/\s+/g, '_') || 'Statement'}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Entry Type', 'Reference #', 'Particulars', 'Debit (PKR)', 'Credit (PKR)', 'Running Balance (PKR)'];
    const rows = ledgerEntries.map(e => [
      e.entryDate || e.createdAt?.slice(0, 10) || '',
      e.entryType || '',
      e.referenceNumber || '',
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.debitAmount || 0,
      e.creditAmount || 0,
      e.runningBalance || 0
    ]);

    const csvContent = [
      `"NATIONAL LIGHTS (PVT) LTD - OFFICIAL STATEMENT OF ACCOUNT"`,
      `"Customer: ${customer.companyName} (${customer.customerCode})"`,
      `"Territory: ${customer.territory || customer.city} | Credit Terms: ${customer.creditDays || 30} Days"`,
      `"Period: ${startDate || 'Start'} to ${endDate || 'Current'}"`,
      `"Opening Balance: PKR ${openingBalance}"`,
      `"Closing Balance: PKR ${latestBalance}"`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Statement_${customer.customerCode}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="flex w-full max-w-6xl max-h-[94vh] flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 my-auto">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900 px-4 sm:px-6 py-3 text-white gap-3 shrink-0" data-no-print>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 font-black text-slate-950 shadow-md">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                <span>Official Statement of Account & Ledger Studio</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Verified
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {customer.companyName} ({customer.customerCode}) • Net Outstanding: PKR {latestBalance.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Share to Dealer WhatsApp */}
            <button
              type="button"
              onClick={handleShareToDealer}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500 bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition-all shadow-sm active:scale-95"
              title="Send running ledger statement directly to dealer WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5 text-white" />
              <span>Share to Dealer</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition-all shadow-sm"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            {/* Export PDF */}
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

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-xs font-black text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-md active:scale-95 transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print Ledger</span>
            </button>

            {/* Close */}
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
              Statement of account with complete banking details dispatched to {customer.companyName} ({customer.phone || 'Verified Channel'})
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">Protected Transmission</span>
          </div>
        )}

        {/* Printable Document Sheet */}
        <div className="p-4 sm:p-8 bg-slate-100 overflow-y-auto max-h-[84vh] flex justify-center">
          <div className="ledger-print-container mx-auto w-full max-w-[210mm] bg-white shadow-2xl border border-slate-200 text-slate-900 font-sans print-area print:shadow-none print:border-none print:p-0 overflow-hidden">
            
            {/* Top Navy & Amber Angled Header */}
            <div className="relative z-10">
              <div className="bg-[#0f1d38] h-3 w-full"></div>
              <div className="relative bg-[#0f1d38] px-6 sm:px-10 py-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                
                {/* Amber Angled polygon logo block */}
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

                {/* Right Title */}
                <div className="ml-auto text-right pl-4">
                  <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-amber-400">
                    STATEMENT OF ACCOUNT
                  </h1>
                  <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                    NTN: {companyInfo.ntn} • STRN: {companyInfo.strn}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Period: {startDate || 'Account Inception'} to {endDate || new Date().toISOString().slice(0, 10)}
                  </div>
                </div>
              </div>
            </div>

            {/* Document Body */}
            <div className="px-6 sm:px-10 py-6 space-y-6">
              
              {/* Dealer & Company Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                {/* Customer Details */}
                <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>DEALER / DISTRIBUTOR INFORMATION:</span>
                  </div>
                  <div className="font-black text-base text-slate-900">{customer.companyName}</div>
                  <div className="text-xs text-slate-600">{customer.address}</div>
                  <div className="text-xs text-slate-600">
                    Territory: <span className="font-bold text-slate-800">{customer.territory || customer.city || 'Lahore'}</span> | Zone: <span className="font-bold text-slate-800">{customer.zone || 'North'}</span>
                  </div>
                  <div className="text-xs text-slate-700">
                    Contact: <span className="font-bold">{customer.contactPerson}</span> (Phone: {customer.phone})
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Dealer Code: <span className="font-bold text-slate-800">{customer.customerCode}</span> | NTN/CNIC: {customer.taxNumber || customer.cnic || 'Unregistered'}
                  </div>
                </div>

                {/* Account & Credit Ageing Metrics */}
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    CREDIT & AGEING STATUS:
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Credit Terms (Ageing):</span>
                    <span className="font-bold text-slate-900">{customer.creditDays || 30} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Credit Limit:</span>
                    <span className="font-mono font-bold text-slate-900">PKR {(customer.creditLimit || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Opening Balance (Old):</span>
                    <span className="font-mono font-bold text-slate-800">PKR {openingBalance.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-sm text-[#0f1d38]">
                    <span>NET CLOSING BALANCE:</span>
                    <span className="font-mono text-amber-600">PKR {latestBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Ledger Transactions Table */}
              <div className="overflow-hidden rounded-xl border border-slate-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0f1d38] text-white font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-24">Date</th>
                      <th className="py-2.5 px-3 w-24">Type</th>
                      <th className="py-2.5 px-3 w-28">Ref #</th>
                      <th className="py-2.5 px-3">Transaction Particulars</th>
                      <th className="py-2.5 px-3 w-24 text-right">Debit (PKR)</th>
                      <th className="py-2.5 px-3 w-24 text-right">Credit (PKR)</th>
                      <th className="py-2.5 px-3 w-28 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No transactions recorded in this statement period.
                        </td>
                      </tr>
                    ) : (
                      ledgerEntries.map((e, idx) => (
                        <tr key={e.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                            {e.entryDate || e.createdAt?.slice(0, 10)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              e.entryType === 'INVOICE' 
                                ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                                : e.entryType === 'PAYMENT' || e.entryType === 'RECOVERY'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {e.entryType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{e.referenceNumber}</td>
                          <td className="py-2.5 px-3 text-slate-700">{e.description}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                            {e.debitAmount ? e.debitAmount.toFixed(2) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {e.creditAmount ? e.creditAmount.toFixed(2) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                            {e.runningBalance.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-xs border-t-2 border-slate-900">
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase">Period Totals:</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700">PKR {totalDebits.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">PKR {totalCredits.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">PKR {latestBalance.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Financial Reconciliation & Company Banking Details */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                
                {/* Left: Banking Accounts Information */}
                <div className="md:col-span-7 space-y-3">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
                    <div className="text-[11px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                      <Landmark className="w-4 h-4" />
                      <span>OFFICIAL COMPANY BANKING ACCOUNTS (FOR RECOVERY):</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* Meezan Bank */}
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

                      {/* HBL Bank */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{bankDetails.bank2Name}</span>
                          <span className="text-[10px] text-slate-500">{bankDetails.bank2Branch}</span>
                        </div>
                        <div className="flex justify-between font-mono text-[11px] mt-0.5">
                          <span>A/C: <strong>{bankDetails.bank2Account}</strong></span>
                          <span className="text-slate-500">IBAN: <strong>{bankDetails.bank2Iban}</strong></span>
                        </div>
                      </div>

                      {/* EasyPaisa & JazzCash */}
                      <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/80 flex justify-between text-[11px]">
                        <div>
                          <div className="font-bold text-emerald-800">EasyPaisa Till:</div>
                          <div className="font-mono font-bold text-slate-800">{bankDetails.easyPaisaNumber}</div>
                        </div>
                        <div>
                          <div className="font-bold text-rose-800">JazzCash & Raast:</div>
                          <div className="font-mono font-bold text-slate-800">{bankDetails.jazzCashNumber}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Summary Reconciliation Calculation */}
                <div className="md:col-span-5 space-y-3">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Previous Opening Balance:</span>
                      <span className="font-mono font-bold text-slate-800">PKR {openingBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>+ Total Invoices (Debits):</span>
                      <span className="font-mono font-bold text-rose-700">+ PKR {totalDebits.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>- Total Recoveries (Credits):</span>
                      <span className="font-mono font-bold text-emerald-700">- PKR {totalCredits.toFixed(2)}</span>
                    </div>

                    <div className="border-t-2 border-slate-900 pt-2 flex items-center justify-between text-base font-black text-[#0f1d38]">
                      <span className="uppercase tracking-tight text-xs sm:text-sm">CLOSING BALANCE PAYABLE:</span>
                      <span className="font-mono text-lg font-black text-amber-600">
                        PKR {latestBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 border border-slate-200 rounded-xl flex items-center gap-3">
                    <QrCode className="w-10 h-10 text-slate-900 shrink-0" />
                    <div className="text-[10px] text-slate-600 leading-tight">
                      <div className="font-bold text-slate-900">VERIFIED LEDGER STATEMENT</div>
                      <div>National Lights (Pvt) Ltd ERP</div>
                      <div className="text-[9px] font-mono text-slate-400">Doc Ref: NL-LEDGER-{customer.customerCode}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs border-t border-slate-200">
                <div className="space-y-1">
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">Prepared By</div>
                  <div className="text-[10px] text-slate-400">Billing Desk</div>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">Audited By</div>
                  <div className="text-[10px] text-slate-400">Accounts & Recovery Dept</div>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">Dealer Acknowledgment</div>
                  <div className="text-[10px] text-slate-400">Sign & Stamp</div>
                </div>
              </div>

              {/* Bottom Decorative Footer Ribbon */}
              <div className="pt-2">
                <div className="relative bg-[#0f1d38] rounded-xl px-6 py-3 text-white flex items-center justify-between overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1/3 bg-amber-500 [clip-path:polygon(0_0,100%_0,75%_100%,0_100%)] flex items-center pl-6">
                    <span className="text-xs font-black text-slate-950 uppercase">National Lights 360</span>
                  </div>
                  <div className="ml-auto text-[10px] text-slate-300 font-mono">
                    {companyInfo.website} • UAN: {companyInfo.uan}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
