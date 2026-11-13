/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - 58mm SPEED-X Thermal Receipt & WhatsApp Invoice Modal
 * Modeled strictly after the Dukan360 SPEED-X Mini Thermal Printer & WhatsApp Billing flow
 */

import React, { useState } from 'react';

export interface ThermalReceiptItem {
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
}

export interface ThermalReceiptData {
  invoiceNumber: string;
  date: string;
  time: string;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  customerName: string;
  customerPhone?: string;
  items: ThermalReceiptItem[];
  totalBill: number;
  discount?: number;
  netPayable: number;
  paidAmount: number;
  remainingBalance: number;
  paymentType: 'CASH' | 'UDHAAR' | 'ONLINE';
}

interface ThermalReceiptWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ThermalReceiptData | null;
}

export const ThermalReceiptWhatsAppModal: React.FC<ThermalReceiptWhatsAppModalProps> = ({
  isOpen,
  onClose,
  receiptData,
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string>(
    receiptData?.customerPhone?.replace(/[^0-9]/g, '') || ''
  );
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !receiptData) return null;

  const storeName = receiptData.storeName || 'NATIONAL LIGHT PAKISTAN';
  const storeAddress = receiptData.storeAddress || 'Millat Road / Commercial Market, Peshawar';
  const storePhone = receiptData.storePhone || '+92 300 9123456';

  // Construct formatted WhatsApp message text
  const generateWhatsAppMessage = () => {
    let msg = `*${storeName}*\n`;
    msg += `${storeAddress}\n`;
    msg += `Ph: ${storePhone}\n\n`;
    msg += `*SALES INVOICE*\n`;
    msg += `Inv No: ${receiptData.invoiceNumber}\n`;
    msg += `Date: ${receiptData.date} ${receiptData.time}\n`;
    msg += `Customer: ${receiptData.customerName}`;
    if (receiptData.customerPhone) {
      msg += ` (${receiptData.customerPhone})`;
    }
    msg += `\n\n*INVOICE DETAILS*\n`;

    receiptData.items.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.name}*\n`;
      msg += `   ${item.quantity} ${item.unit} x Rs. ${item.rate.toLocaleString()} = Rs. ${item.total.toLocaleString()}\n`;
    });

    msg += `\n--------------------------------\n`;
    msg += `*TOTAL BILL:* Rs. ${receiptData.totalBill.toLocaleString()}\n`;
    if (receiptData.discount && receiptData.discount > 0) {
      msg += `Discount: Rs. ${receiptData.discount.toLocaleString()}\n`;
      msg += `*NET PAYABLE:* Rs. ${receiptData.netPayable.toLocaleString()}\n`;
    }
    msg += `*Status:* ${receiptData.paymentType === 'CASH' ? 'Full Paid (Cash)' : 'Udhaar (Credit)'}\n`;
    msg += `*Paid Amount:* Rs. ${receiptData.paidAmount.toLocaleString()}\n`;
    if (receiptData.remainingBalance > 0) {
      msg += `*Khata Balance:* Rs. ${receiptData.remainingBalance.toLocaleString()}\n`;
    }
    msg += `--------------------------------\n`;
    msg += `_Shukriya! Phir zaroor aayen._\n`;
    msg += `_Powered by N-LINK 360_`;

    return msg;
  };

  const handleSendWhatsApp = () => {
    const rawNumber = phoneNumber.replace(/[^0-9]/g, '');
    let finalPhone = rawNumber;
    if (finalPhone.startsWith('03')) {
      finalPhone = '92' + finalPhone.substring(1);
    } else if (finalPhone.length === 10 && finalPhone.startsWith('3')) {
      finalPhone = '92' + finalPhone;
    }

    const message = generateWhatsAppMessage();
    const encoded = encodeURIComponent(message);
    const url = finalPhone ? `https://wa.me/${finalPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    const message = generateWhatsAppMessage();
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint58mm = () => {
    window.print();
  };

  return (
    <div
      id="thermal-receipt-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* 58mm Thermal Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #pos-58mm-thermal-ticket, #pos-58mm-thermal-ticket * {
            visibility: visible;
          }
          #pos-58mm-thermal-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm !important;
            max-width: 58mm !important;
            padding: 2mm !important;
            margin: 0 !important;
            font-size: 10px !important;
            line-height: 1.2 !important;
            color: #000 !important;
            background: #fff !important;
            font-family: monospace !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-slate-100 dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-300 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top App Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#001428] text-white border-b border-slate-700 no-print">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#76f4e0]">receipt</span>
            <span className="text-xs font-bold uppercase tracking-wider">Invoice Preview (58mm)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto p-4 flex flex-col items-center">
          {/* Simulated 58mm Physical Thermal Ticket */}
          <div
            id="pos-58mm-thermal-ticket"
            className="w-full bg-white text-slate-900 p-4 rounded-xl shadow-md border border-slate-200 font-mono text-[11px] leading-tight select-all"
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              <div className="w-10 h-10 mx-auto mb-1 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                NL
              </div>
              <h4 className="font-extrabold text-[13px] text-black tracking-tight">{storeName}</h4>
              <p className="text-[10px] text-slate-600 mt-0.5">{storeAddress}</p>
              <p className="text-[10px] text-slate-600 font-bold">Ph: {storePhone}</p>
              <div className="mt-1.5 inline-block border border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                SALES INVOICE
              </div>
            </div>

            {/* Meta */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Inv No:</span>
                <span className="font-bold">{receiptData.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{receiptData.date} {receiptData.time}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-bold truncate max-w-[140px]">{receiptData.customerName}</span>
              </div>
              {receiptData.customerPhone && (
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{receiptData.customerPhone}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-dashed border-slate-400">
              <div className="flex justify-between font-black text-[10px] pb-1 border-b border-slate-200">
                <span>ITEM</span>
                <span>QTY x RATE</span>
                <span>TOTAL</span>
              </div>
              <div className="divide-y divide-slate-100 mt-1 space-y-1">
                {receiptData.items.map((item, idx) => (
                  <div key={idx} className="pt-1">
                    <div className="font-bold text-black">{item.name}</div>
                    <div className="flex justify-between text-slate-700 text-[10px]">
                      <span>{item.quantity} {item.unit} x {item.rate}</span>
                      <span className="font-bold text-black">Rs. {item.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-2 space-y-1 text-[11px]">
              <div className="flex justify-between font-bold">
                <span>TOTAL BILL:</span>
                <span className="text-[12px] font-black">Rs. {receiptData.totalBill.toLocaleString()}</span>
              </div>

              {receiptData.discount ? (
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>DISCOUNT:</span>
                  <span>-Rs. {receiptData.discount.toLocaleString()}</span>
                </div>
              ) : null}

              <div className="flex justify-between font-bold border-t border-slate-200 pt-1">
                <span>PAID ({receiptData.paymentType}):</span>
                <span>Rs. {receiptData.paidAmount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between font-black text-black">
                <span>BALANCE:</span>
                <span>Rs. {receiptData.remainingBalance.toLocaleString()}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-dashed border-slate-400 text-center text-[9px] text-slate-600 space-y-1">
              <p className="font-bold text-black">Shukriya! Phir zaroor aayen.</p>
              <p className="text-[8px] text-slate-400">Powered by SPEED-X & N-LINK 360</p>
            </div>
          </div>

          {/* WhatsApp Direct Input Card */}
          <div className="w-full bg-white dark:bg-slate-800 p-3.5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700 mt-3 no-print">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Customer WhatsApp Number
            </label>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                placeholder="e.g. 03138426436"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleCopyText}
                className="px-2.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Copy bill text"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls matching Dukan360 Video */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 no-print">
          <button
            type="button"
            onClick={handlePrint58mm}
            className="w-full bg-slate-800 hover:bg-slate-900 active:scale-98 text-white font-bold py-2.5 px-3 rounded-xl shadow-xs text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print (58mm)</span>
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2.5 px-3 rounded-xl shadow-xs text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span>Share Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
};
