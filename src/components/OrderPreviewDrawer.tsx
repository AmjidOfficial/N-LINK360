import React, { useState, useMemo } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  Package,
  Receipt,
  Percent,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Minus,
  FileText,
  Building2,
  ArrowRight,
  Calculator,
} from 'lucide-react';
import { Customer, SKU } from '../types';

export interface OrderPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  orderQuantities: Record<string, number>;
  skus: SKU[];
  onUpdateQuantity: (skuId: string, qty: number) => void;
  onConfirmOrder: (orderDetails: {
    discountPercent: number;
    discountAmount: number;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    remarks: string;
  }) => Promise<void>;
  submitting?: boolean;
}

export const OrderPreviewDrawer: React.FC<OrderPreviewDrawerProps> = ({
  isOpen,
  onClose,
  customer,
  orderQuantities,
  skus,
  onUpdateQuantity,
  onConfirmOrder,
  submitting = false,
}) => {
  const [isFullExpanded, setIsFullExpanded] = useState(false);
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>('');

  // Extract selected items with details
  const lineItems = useMemo(() => {
    return Object.entries(orderQuantities)
      .filter(([_, qty]) => Number(qty || 0) > 0)
      .map(([skuId, qty]) => {
        const sku = skus.find((s) => s.id === skuId);
        const quantityNum = Number(qty || 0);
        const unitPrice = Number(sku?.tradePrice || sku?.retailPrice || 0);
        const packs = Number(sku?.packsPerCarton || 50);
        const unitsPerPack = Number(sku?.unitsPerPack || 1);
        const totalUnitsPerCarton = packs * unitsPerPack;
        const cartons = totalUnitsPerCarton > 0 ? (quantityNum / totalUnitsPerCarton).toFixed(2) : '1';

        const lineGross = quantityNum * unitPrice;
        // Line-level item discount (inherits overall discount)
        const lineDiscount = Math.round(lineGross * (overallDiscountPercent / 100));
        const lineTaxable = lineGross - lineDiscount;
        // 18% FBR Standard Sales Tax (GST)
        const lineGst = Math.round(lineTaxable * 0.18);
        const lineNet = lineTaxable + lineGst;

        return {
          skuId,
          skuCode: sku?.skuCode || 'SKU',
          skuName: sku?.name || 'Item',
          brand: sku?.brandName || sku?.category || 'National Lights',
          packagingUnit: sku?.packagingUnit || 'CARTON',
          totalUnitsPerCarton,
          cartons,
          quantity: quantityNum,
          unitPrice,
          lineGross,
          lineDiscount,
          lineTaxable,
          lineGst,
          lineNet,
          currentStock: Number(sku?.currentStock || 100),
        };
      });
  }, [orderQuantities, skus, overallDiscountPercent]);

  // Aggregate math calculations
  const totals = useMemo(() => {
    const totalSKUs = lineItems.length;
    const totalPieces = lineItems.reduce((acc, i) => acc + i.quantity, 0);
    const grossSubtotal = lineItems.reduce((acc, i) => acc + i.lineGross, 0);
    const discountAmount = Math.round(grossSubtotal * (overallDiscountPercent / 100));
    const taxableSubtotal = grossSubtotal - discountAmount;
    const taxAmount = Math.round(taxableSubtotal * 0.18); // 18% FBR GST
    const grandTotal = taxableSubtotal + taxAmount;

    return {
      totalSKUs,
      totalPieces,
      grossSubtotal,
      discountAmount,
      taxableSubtotal,
      taxAmount,
      grandTotal,
    };
  }, [lineItems, overallDiscountPercent]);

  // Commercial credit analysis
  const creditAnalysis = useMemo(() => {
    const creditLimit = Number(customer.creditLimit || 0);
    const currentBalance = Number(customer.currentBalance || 0);
    const availableCredit = Math.max(0, creditLimit - currentBalance);
    const projectedOutstanding = currentBalance + totals.grandTotal;
    const overCredit = projectedOutstanding > creditLimit;
    const exposureRatio = creditLimit > 0 ? (projectedOutstanding / creditLimit) * 100 : 100;

    let tier: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';
    if (overCredit) {
      // If over limit by more than 15%, RED
      tier = projectedOutstanding > creditLimit * 1.15 ? 'RED' : 'AMBER';
    }

    return {
      creditLimit,
      currentBalance,
      availableCredit,
      projectedOutstanding,
      overCredit,
      exposureRatio,
      tier,
    };
  }, [customer, totals.grandTotal]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (totals.totalPieces === 0) return;
    await onConfirmOrder({
      discountPercent: overallDiscountPercent,
      discountAmount: totals.discountAmount,
      subtotal: totals.grossSubtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.grandTotal,
      remarks,
    });
  };

  return (
    <div
      id="order-preview-drawer-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200"
    >
      {/* Drawer Container */}
      <div
        id="order-preview-drawer-content"
        className={`w-full max-w-2xl mx-auto bg-white rounded-t-3xl border-t border-x border-slate-200 shadow-2xl flex flex-col transition-all duration-300 ${
          isFullExpanded ? 'h-[92vh]' : 'max-h-[85vh] h-auto'
        }`}
      >
        {/* Drawer Drag Bar / Header */}
        <div className="p-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/80 rounded-t-3xl">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 flex items-center gap-1">
                <Receipt className="w-3 h-3" />
                Order Preview
              </span>
              <span className="text-xs font-bold text-slate-500 truncate">
                {totals.totalSKUs} SKUs · {totals.totalPieces} pcs
              </span>
            </div>
            <h2 className="text-base font-black text-slate-900 truncate mt-0.5">
              {customer.companyName}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Code: <span className="font-mono font-bold text-slate-700">{customer.customerCode || customer.id}</span> · {customer.city || customer.town || 'Assigned Territory'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullExpanded(!isFullExpanded)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title={isFullExpanded ? 'Collapse Drawer' : 'Expand Fullscreen'}
            >
              {isFullExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. Commercial Credit Health Alert Banner */}
          <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
            creditAnalysis.tier === 'GREEN'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : creditAnalysis.tier === 'AMBER'
              ? 'bg-amber-50/90 border-amber-200 text-amber-900'
              : 'bg-rose-50/90 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-extrabold flex items-center gap-1.5">
                {creditAnalysis.tier === 'GREEN' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                <span>Commercial Credit Assessment ({creditAnalysis.tier})</span>
              </span>
              <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-full bg-white/80 border">
                Exposure: {creditAnalysis.exposureRatio.toFixed(0)}%
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-medium text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Credit Limit</span>
                <span className="font-bold font-mono">Rs. {creditAnalysis.creditLimit.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Current Ledger Bal</span>
                <span className="font-bold font-mono">Rs. {creditAnalysis.currentBalance.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Order Total (w/ GST)</span>
                <span className="font-bold font-mono text-teal-700">Rs. {totals.grandTotal.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Projected Balance</span>
                <span className={`font-bold font-mono ${creditAnalysis.overCredit ? 'text-rose-700 font-black' : ''}`}>
                  Rs. {creditAnalysis.projectedOutstanding.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Line-Item Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-teal-600" />
                <span>Line-Item Breakdown & Tax Math ({lineItems.length} SKUs)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Verify SKU lines before booking</span>
            </div>

            {lineItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No SKUs selected yet. Go back to SKU list to add items.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lineItems.map((item) => (
                  <div key={item.skuId} className="p-3.5 sm:p-4 hover:bg-slate-50/50 transition-colors text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-sm">{item.skuName}</span>
                          <span className="text-[10px] font-mono text-slate-400">({item.skuCode})</span>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.brand}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-3">
                          <span>Trade Price: <strong className="font-mono text-slate-800">Rs. {item.unitPrice.toLocaleString()}</strong></span>
                          <span>Carton: <strong>{item.cartons} ctn</strong> ({item.totalUnitsPerCarton} pcs/ctn)</span>
                        </div>
                      </div>

                      {/* Line Item Stepper Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.skuId, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-12 text-center font-mono font-bold text-xs tabular-nums text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.skuId, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.skuId, 0)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-colors ml-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Detailed Math for this Line: Gross -> Discount -> GST (18%) -> Line Net */}
                    <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Gross Line</span>
                        <span className="font-mono font-bold text-slate-700">Rs. {item.lineGross.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">
                          Discount ({overallDiscountPercent}%)
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          -Rs. {item.lineDiscount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">FBR GST (18%)</span>
                        <span className="font-mono font-bold text-teal-700">+Rs. {item.lineGst.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Line Net Total</span>
                        <span className="font-mono font-black text-slate-900">Rs. {item.lineNet.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Discount Adjustment Control */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-teal-600" />
                <span>Trade Discount Calculation</span>
              </label>
              <div className="flex items-center gap-1.5">
                {[0, 2.5, 5, 7.5, 10].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setOverallDiscountPercent(pct)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      overallDiscountPercent === pct
                        ? 'bg-teal-700 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={25}
                step={0.5}
                value={overallDiscountPercent}
                onChange={(e) => setOverallDiscountPercent(Number(e.target.value))}
                className="flex-1 accent-teal-600 cursor-pointer"
              />
              <span className="w-14 text-right font-mono font-extrabold text-xs text-teal-800">
                {overallDiscountPercent}%
              </span>
            </div>
          </div>

          {/* 4. Complete FBR 18% Tax & Invoice Breakdown Math Card */}
          <div className="bg-white p-4.5 rounded-2xl border-2 border-teal-600/30 shadow-sm space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-teal-600" />
                <span>Final Order & Tax Audit Breakdown</span>
              </span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                18% FBR GST STANDARD
              </span>
            </div>

            <div className="space-y-1.5 font-medium text-slate-600">
              <div className="flex justify-between">
                <span>Gross Order Value ({totals.totalPieces} units):</span>
                <span className="font-mono font-bold text-slate-800">
                  Rs. {totals.grossSubtotal.toLocaleString()}
                </span>
              </div>

              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Special Trade Discount ({overallDiscountPercent}%):</span>
                  <span className="font-mono font-bold">- Rs. {totals.discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-slate-100 pt-1.5 font-semibold text-slate-700">
                <span>Taxable Value (Subtotal Excl. Tax):</span>
                <span className="font-mono font-bold text-slate-900">
                  Rs. {totals.taxableSubtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-teal-700 font-semibold">
                <span>Sales Tax (18% FBR GST):</span>
                <span className="font-mono font-bold">+ Rs. {totals.taxAmount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between border-t-2 border-slate-200 pt-2 text-sm">
                <span className="font-black text-slate-900 uppercase">Grand Total Payable:</span>
                <span className="font-mono font-black text-teal-700 text-base">
                  Rs. {totals.grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Remarks Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Special Delivery Instructions / Remarks (Optional)</span>
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Deliver via standard cargo, urgent dispatch required..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Sticky Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/90 rounded-b-3xl flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer transition-colors"
          >
            EDIT QUANTITIES
          </button>

          <button
            type="button"
            disabled={submitting || totals.totalPieces === 0}
            onClick={handleSubmit}
            className="flex-2 py-3.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {submitting ? (
              <span>SUBMITTING ORDER…</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRM ORDER (Rs. {totals.grandTotal.toLocaleString()})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
