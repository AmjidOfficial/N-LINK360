import React, { useMemo } from 'react';
import { X, Printer, QrCode, ShieldCheck, Receipt } from 'lucide-react';
import { Customer, SKU } from '../types';

export interface ThermalOrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  orderQuantities: Record<string, number>;
  skus: SKU[];
  salesUserName?: string;
  orderNumber?: string;
  overallDiscountPercent?: number;
}

export const ThermalOrderSummaryModal: React.FC<ThermalOrderSummaryModalProps> = ({
  isOpen,
  onClose,
  customer,
  orderQuantities,
  skus,
  salesUserName = 'Field Sales Officer',
  orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
  overallDiscountPercent = 0,
}) => {
  const lineItems = useMemo(() => {
    return Object.entries(orderQuantities)
      .filter(([_, qty]) => Number(qty || 0) > 0)
      .map(([skuId, qty]) => {
        const sku = skus.find((s) => s.id === skuId);
        const quantityNum = Number(qty || 0);
        const unitPrice = Number(sku?.tradePrice || sku?.retailPrice || 0);
        const lineGross = quantityNum * unitPrice;
        const lineDiscount = Math.round(lineGross * (overallDiscountPercent / 100));
        const lineNet = lineGross - lineDiscount;

        return {
          skuCode: sku?.skuCode || 'SKU',
          skuName: sku?.name || 'Item',
          quantity: quantityNum,
          unitPrice,
          lineNet,
        };
      });
  }, [orderQuantities, skus, overallDiscountPercent]);

  const totals = useMemo(() => {
    const totalPieces = lineItems.reduce((acc, i) => acc + i.quantity, 0);
    const grossSubtotal = lineItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
    const discountAmount = Math.round(grossSubtotal * (overallDiscountPercent / 100));
    const grandTotal = Math.max(0, grossSubtotal - discountAmount);

    return {
      totalPieces,
      grossSubtotal,
      discountAmount,
      grandTotal,
    };
  }, [lineItems, overallDiscountPercent]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDateTime = new Date().toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 print:p-0 print:bg-white">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 print:shadow-none print:border-none print:w-full print:max-w-none">
        
        {/* Modal Header Actions (Hidden on print) */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold tracking-wide uppercase">Thermal Printer Receipt View</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Receipt Paper Canvas (80mm Roll Format) */}
        <div className="p-5 font-mono text-xs text-slate-900 bg-white space-y-3 overflow-y-auto max-h-[75vh] print:max-h-none print:p-2">
          
          {/* Header */}
          <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-3">
            <h1 className="text-sm font-black uppercase tracking-wider text-slate-900">NATIONAL LIGHTS PAKISTAN</h1>
            <p className="text-[10px] font-bold text-slate-600">Enterprise Sales & Distribution 360</p>
            <p className="text-[9px] text-slate-500">Official Mobile Thermal Order Summary</p>
          </div>

          {/* Meta Details */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Order Ref:</span>
              <span className="font-bold">{orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date/Time:</span>
              <span>{currentDateTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sales Officer:</span>
              <span className="font-semibold truncate max-w-[180px]">{salesUserName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold truncate max-w-[180px]">{customer.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Store Code:</span>
              <span>{customer.customerCode || customer.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Town/City:</span>
              <span>{customer.town || customer.city || 'Assigned Area'}</span>
            </div>
          </div>

          {/* Items Header */}
          <div className="border-b border-slate-900 pb-1 font-bold text-[10px] grid grid-cols-12 gap-1 uppercase">
            <span className="col-span-6">Description</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-2 text-right">Rate</span>
            <span className="col-span-2 text-right">Total</span>
          </div>

          {/* Item Rows */}
          <div className="space-y-2 border-b border-dashed border-slate-400 pb-3">
            {lineItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1 text-[11px]">
                <div className="col-span-6 truncate font-medium" title={item.skuName}>
                  {idx + 1}. {item.skuName}
                </div>
                <div className="col-span-2 text-center font-bold">{item.quantity}</div>
                <div className="col-span-2 text-right">{item.unitPrice}</div>
                <div className="col-span-2 text-right font-bold">{item.lineNet.toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="space-y-1.5 text-xs border-b border-dashed border-slate-400 pb-3">
            <div className="flex justify-between text-slate-600">
              <span>Total Units / Pieces:</span>
              <span className="font-bold">{totals.totalPieces} pcs</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Gross Total Amount:</span>
              <span className="font-bold">Rs. {totals.grossSubtotal.toLocaleString()}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Trade Discount ({overallDiscountPercent}%):</span>
                <span className="font-bold">- Rs. {totals.discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-900">
              <span>GRAND TOTAL:</span>
              <span className="text-teal-700">Rs. {totals.grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Verification QR Code Section */}
          <div className="flex flex-col items-center justify-center py-2 space-y-1.5 border-b border-dashed border-slate-400 pb-3">
            <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-300 flex items-center justify-center">
              {/* Simulated Thermal QR Matrix SVG */}
              <svg className="w-24 h-24 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 2h6v6H2V2m2 2v2h2V4H4M16 2h6v6h-6V2m2 2v2h2V4h-2M2 16h6v6H2v-6m2 2v2h2v-2H4M18 14h4v4h-4v-4M14 14h2v2h-2v-2M14 18h2v4h-2v-4M10 14h2v6h-2v-6M10 10h4v2h-4v-2M14 10h2v2h-2v-2M18 10h4v2h-4v-2M18 18h2v2h-2v-2M22 14h2v2h-2v-2" />
              </svg>
            </div>
            <p className="text-[9px] text-slate-500 font-mono text-center">Scan to verify order with Shahzad Ullah</p>
            <p className="text-[8px] text-slate-400 font-mono">Hash: SHA256-{orderNumber}-{customer.id.slice(0, 6)}</p>
          </div>

          {/* Footer */}
          <div className="text-center space-y-1 pt-1 text-[10px] text-slate-500">
            <p className="font-bold text-slate-700">Status: PENDING SHAHZAD ULLAH APPROVAL</p>
            <p>Thank you for your business!</p>
            <p className="text-[9px] text-slate-400">N-LINK 360 Enterprise Mobile Client</p>
          </div>

        </div>

        {/* Modal Footer Action Buttons (Hidden on print) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Thermal Receipt</span>
          </button>
        </div>

      </div>
    </div>
  );
};
