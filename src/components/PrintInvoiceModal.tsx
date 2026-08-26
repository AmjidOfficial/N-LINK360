/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Official National Lights Tax Invoice Printing & Document Generator
 * Supports Formal A4 Sales Tax Invoicing and 80mm POS Thermal Receipt modes.
 */

import React, { useState } from 'react';
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
  const [printMode, setPrintMode] = useState<'A4_FORMAL' | 'THERMAL_80MM'>('A4_FORMAL');

  if (!isOpen || !invoice || !customer) return null;

  const skuMap = new Map<string, SKU>(skus.map((s) => [s.id, s]));
  const amountInWords = numberToPakistaniRupeesWords(invoice.totalAmount);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 my-auto">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 sm:px-6 py-3 text-white" data-no-print>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 font-black text-slate-950">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Invoice Document Viewer & Print Studio</div>
              <div className="text-[11px] text-slate-400">Official National Lights Commercial Billing</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Toggle */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg text-xs font-bold border border-slate-700">
              <button
                type="button"
                onClick={() => setPrintMode('A4_FORMAL')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  printMode === 'A4_FORMAL' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                A4 Formal Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('THERMAL_80MM')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  printMode === 'THERMAL_80MM' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                80mm Thermal Receipt
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-md transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print Now</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Area */}
        <div className="p-4 sm:p-8 bg-slate-100 overflow-y-auto max-h-[82vh]">
          {/* ================= A4 FORMAL TAX INVOICE ================= */}
          {printMode === 'A4_FORMAL' && (
            <div className="mx-auto w-full max-w-[210mm] bg-white p-6 sm:p-10 shadow-lg border border-slate-200 text-slate-900 font-sans print-area print:shadow-none print:border-none print:p-0">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 font-black text-2xl text-slate-950 border border-slate-900 shadow-sm">
                    NL
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">National Lights (Pvt) Ltd.</h1>
                    <p className="text-[11px] text-slate-600 font-medium leading-tight">
                      Premium Commercial, Industrial & Architectural LED Solutions
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Head Office: 18-Brandreth Road, Lahore | Plant: 24-KM Multan Road, Lahore
                    </p>
                  </div>
                </div>

                <div className="text-right sm:text-right w-full sm:w-auto">
                  <div className="inline-block rounded-md bg-slate-900 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                    SALES TAX INVOICE
                  </div>
                  <div className="mt-1 text-[11px] font-mono font-bold text-slate-800">
                    NTN: <span className="font-semibold">2894102-7</span> | STRN: <span className="font-semibold">03-00-2894-102-7</span>
                  </div>
                  <div className="text-[10px] text-slate-500">FBR Registered Taxpayer</div>
                </div>
              </div>

              {/* Invoice & Customer Meta Grid */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-200 py-4 text-xs">
                {/* Bill To */}
                <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">BILL TO CUSTOMER</div>
                  <div className="font-bold text-sm text-slate-950">{customer.companyName}</div>
                  <div className="text-slate-600">{customer.address}</div>
                  <div className="text-slate-600">
                    City: <span className="font-semibold">{customer.city || 'Lahore'}</span> | Contact: <span className="font-semibold">{customer.contactPerson}</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    Phone: {customer.phone} | NTN/CNIC: {customer.taxNumber || customer.cnic || 'Unregistered'}
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200/70 text-right">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">INVOICE PARTICULARS</div>
                  <div className="font-mono font-bold text-sm text-amber-700">INV #{invoice.invoiceNumber}</div>
                  <div className="text-slate-600">
                    Date: <span className="font-semibold">{invoice.invoiceDate}</span>
                  </div>
                  <div className="text-slate-600">
                    Order Ref: <span className="font-semibold">{invoice.salesOrderId || 'Direct Sale'}</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    Payment Mode: <span className="font-bold text-slate-900">{invoice.paymentMode}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-bold text-[11px]">
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
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                          <td className="py-2.5 px-2 font-mono font-bold text-slate-800">{sku?.skuCode || item.skuCode || item.skuId}</td>
                          <td className="py-2.5 px-2 font-medium text-slate-900">
                            {sku?.name || item.skuName || 'National LED Item'}
                            <div className="text-[10px] text-slate-500 font-normal">
                              {sku?.wattage || ''} {sku?.colorTemperature || ''} {sku?.voltage || ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-600">{cartonQty}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">{item.quantity}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-700">{item.unitPrice.toFixed(2)}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-500">{disc}%</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-950">
                            {net.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary */}
              <div className="grid grid-cols-12 gap-4 border-t-2 border-slate-900 pt-4">
                {/* Left Words & Terms */}
                <div className="col-span-7 space-y-3">
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/70">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">AMOUNT IN WORDS</div>
                    <div className="text-xs font-bold text-slate-900 capitalize">{amountInWords}</div>
                  </div>

                  <div className="text-[10px] text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700">TERMS & CONDITIONS:</p>
                    <p>1. Goods once sold will not be taken back without official Return Authorization Slip.</p>
                    <p>2. Claims for transit breakage or shortage must be reported within 48 hours of GRN.</p>
                    <p>3. Overdue invoices beyond credit terms are subject to automated account lock.</p>
                  </div>
                </div>

                {/* Right Calculations */}
                <div className="col-span-5 space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>Gross Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900">PKR {invoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>Sales Tax (FBR 18%):</span>
                    <span className="font-mono font-bold text-slate-900">PKR {invoice.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm font-black text-slate-950 bg-amber-50 px-2 rounded">
                    <span>NET INVOICE TOTAL:</span>
                    <span className="font-mono text-amber-900">PKR {invoice.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-[11px] text-slate-500">
                    <span>Customer Closing Ledger:</span>
                    <span className="font-mono font-bold text-slate-800">PKR {(customer.currentBalance || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Signatures Footer */}
              <div className="grid grid-cols-4 gap-4 pt-16 text-center text-xs border-t border-slate-200 mt-8">
                <div className="space-y-1">
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">Prepared By</div>
                  <div className="text-[10px] text-slate-400">Billing Desk</div>
                </div>
                <div className="space-y-1">
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
            <div className="mx-auto w-[80mm] bg-white p-4 shadow-lg border border-slate-300 font-mono text-[11px] text-slate-900 print-area print:shadow-none print:border-none print:w-[80mm] print:p-0">
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

              <div className="text-center pt-3 space-y-1 text-[9px] text-slate-500">
                <div>Thank You For Choosing National Lights!</div>
                <div>Software Generated Verification Slip</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
