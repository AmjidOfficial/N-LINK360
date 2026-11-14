/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Lights Operational Dispatch & Invoicing Workflow
 * 
 * Implements the 5-Step Entry & Fulfillment Pipeline:
 * Step 1: Sales Team enters Sales Data / Sales Entry / Recovery Entry
 * Step 2: Create Dispatch Note (Bility, Vehicle, Transporter, Warehouse)
 * Step 3: Dispatched Team checks Stock Availability:
 *         - If stocks available -> Accept SKU & proceed
 *         - If any SKU missing or not available -> Leave this SKU & proceed with available stocks
 * Step 4: Create Invoice with 15% discount on all products
 * Step 5: Add Invoice to Customer Ledger (Net 15% Less)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Customer, SalesOrder, InventoryBalance, SKU } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { downloadSalesInvoicePdf } from '../../utils/exportInvoicePdf';
import {
  X,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  BookOpen,
  ArrowRight,
  PackageCheck,
  AlertCircle,
  Download,
  Building2,
  ShieldCheck,
  Clock,
  Warehouse,
  ChevronRight,
} from 'lucide-react';

export interface DispatchInvoiceCompletionPayload {
  orderId: string;
  dispatchNoteNumber: string;
  warehouseName: string;
  transporterName: string;
  vehicleNumber: string;
  bilityNumber: string;
  dispatchedItems: any[];
  omittedItems: any[];
  grossSubtotal: number;
  discount15: number;
  netInvoiceTotal: number;
  previousBalance: number;
  projectedBalance: number;
}

interface OperationalDispatchInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder | null;
  customer: Customer | null;
  inventoryBalances?: InventoryBalance[];
  skus?: SKU[];
  currentUser: NLinkUser;
  onCompleteDispatchAndInvoice: (payload: DispatchInvoiceCompletionPayload) => void;
}

export const OperationalDispatchInvoiceModal: React.FC<OperationalDispatchInvoiceModalProps> = ({
  isOpen,
  onClose,
  order,
  customer,
  inventoryBalances = [],
  currentUser,
  onCompleteDispatchAndInvoice,
}) => {
  // Current Workflow Step: 2 (Dispatch Note), 3 (Stock Check & SKU Filter), 4 (Invoice Preview), 5 (Ledger Posting)
  const [currentStep, setCurrentStep] = useState<2 | 3 | 4 | 5>(2);

  // Step 2: Dispatch Note Inputs
  const [dispatchNoteNumber, setDispatchNoteNumber] = useState<string>(() => `DN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [warehouseName, setWarehouseName] = useState<string>('Central Peshawar Warehouse');
  const [transporterName, setTransporterName] = useState<string>('National Lights Express Fleet');
  const [vehicleNumber, setVehicleNumber] = useState<string>('LES-7821');
  const [bilityNumber, setBilityNumber] = useState<string>(() => `BIL-${Math.floor(10000 + Math.random() * 90000)}`);

  // Step 3: SKU Stock Selection State (which SKUs are accepted vs left/omitted)
  const [skuDecisions, setSkuDecisions] = useState<Record<string, { accepted: boolean; orderedQty: number; availableQty: number; isMissing: boolean }>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  // Initialize stock decisions when order changes
  useMemo(() => {
    if (!order || !order.items) return;
    const initialDecisions: Record<string, { accepted: boolean; orderedQty: number; availableQty: number; isMissing: boolean }> = {};

    order.items.forEach((item, idx) => {
      const key = item.skuId || item.skuCode || `item-${idx}`;
      const orderedQty = Number(item.orderedQuantity || item.quantity || 1);
      
      // Look up stock in warehouse balance
      const bal = inventoryBalances.find(
        (b) => b.skuId === item.skuId || b.skuCode === item.skuCode || (b as any).skuName === item.skuName
      );
      const availableQty = bal ? Number(bal.quantityOnHand ?? bal.availableQuantity ?? 500) : 500;
      const isMissing = availableQty <= 0 || availableQty < Math.min(10, orderedQty);

      // Operational Rule: If missing/unavailable, default to leaving this SKU (accepted = false)
      initialDecisions[key] = {
        accepted: !isMissing,
        orderedQty,
        availableQty,
        isMissing,
      };
    });

    setSkuDecisions(initialDecisions);
    setIsInitialized(true);
  }, [order, inventoryBalances]);

  if (!isOpen || !order || !customer) return null;

  const previousBalance = customer.currentBalance ?? customer.openingBalance ?? 0;

  // Compute accepted and omitted items
  const items = order.items || [];
  const processedItems = items.map((item, idx) => {
    const key = item.skuId || item.skuCode || `item-${idx}`;
    const decision = skuDecisions[key] || {
      accepted: true,
      orderedQty: Number(item.orderedQuantity || item.quantity || 1),
      availableQty: 500,
      isMissing: false,
    };
    const unitPrice = Number(item.unitPrice || 0);
    const qty = decision.orderedQty;
    const lineGross = qty * unitPrice;
    // Rule: 15% discount on all products specifically for Invoices
    const lineDiscount = Math.round(lineGross * 0.15);
    const lineNet = lineGross - lineDiscount;

    return {
      ...item,
      key,
      accepted: decision.accepted,
      availableQty: decision.availableQty,
      isMissing: decision.isMissing,
      qty,
      unitPrice,
      lineGross,
      lineDiscount,
      lineNet,
    };
  });

  const acceptedItems = processedItems.filter((i) => i.accepted);
  const omittedItems = processedItems.filter((i) => !i.accepted);

  // Financial calculations for accepted items (with 15% invoice discount for SKU-itemized orders)
  const hasItems = items.length > 0;
  const grossSubtotal = hasItems
    ? acceptedItems.reduce((sum, i) => sum + i.lineGross, 0)
    : Number(order.subtotal || order.totalAmount || 0);

  const discount15 = hasItems
    ? Math.round(grossSubtotal * 0.15) // 15% discount on all products
    : Number(order.discountAmount || 0);

  const netInvoiceTotal = hasItems
    ? (grossSubtotal - discount15)
    : Number(order.totalAmount || 0);

  const projectedBalance = previousBalance + netInvoiceTotal;

  const handleToggleSku = (key: string) => {
    setValidationError(null);
    setSkuDecisions((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: {
          ...current,
          accepted: !current.accepted,
        },
      };
    });
  };

  const handleExecuteFulfillment = () => {
    if (acceptedItems.length === 0) {
      setValidationError('Cannot create invoice: At least 1 SKU must be accepted for dispatch.');
      setCurrentStep(3);
      return;
    }
    setValidationError(null);

    const payload: DispatchInvoiceCompletionPayload = {
      orderId: order.id,
      dispatchNoteNumber,
      warehouseName,
      transporterName,
      vehicleNumber,
      bilityNumber,
      dispatchedItems: acceptedItems,
      omittedItems,
      grossSubtotal,
      discount15,
      netInvoiceTotal,
      previousBalance,
      projectedBalance,
    };

    onCompleteDispatchAndInvoice(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[94vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center shadow-md">
              <Truck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  5-Step Dispatch &amp; Invoicing Pipeline
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-300">
                  National Lights ERP
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Order <strong>#{order.orderNumber}</strong> &bull; Dealer: <strong>{customer.companyName}</strong> ({customer.town || customer.city})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5-Step Stepper Header */}
        <div className="bg-blue-50/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-5 py-3">
          <div className="flex items-center justify-between max-w-3xl mx-auto text-xs">
            {/* Step 1 */}
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 font-bold">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                ✓
              </span>
              <span className="hidden sm:inline">1. Sales Entry</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-1.5 font-bold cursor-pointer transition-colors ${
                currentStep === 2
                  ? 'text-teal-900 dark:text-teal-200'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 2 ? 'bg-teal-800 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
              }`}>
                2
              </span>
              <span>2. Dispatch Note</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`flex items-center gap-1.5 font-bold cursor-pointer transition-colors ${
                currentStep === 3
                  ? 'text-teal-900 dark:text-teal-200'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 3 ? 'bg-teal-800 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
              }`}>
                3
              </span>
              <span>3. Stock Check</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

            {/* Step 4 */}
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className={`flex items-center gap-1.5 font-bold cursor-pointer transition-colors ${
                currentStep === 4
                  ? 'text-teal-900 dark:text-teal-200'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 4 ? 'bg-teal-800 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
              }`}>
                4
              </span>
              <span>4. Invoice (-15%)</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

            {/* Step 5 */}
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className={`flex items-center gap-1.5 font-bold cursor-pointer transition-colors ${
                currentStep === 5
                  ? 'text-teal-900 dark:text-teal-200'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 5 ? 'bg-teal-800 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
              }`}>
                5
              </span>
              <span>5. Ledger Post</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {validationError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
          
          {/* ========================================================================= */}
          {/* STEP 2: CREATE DISPATCH NOTE */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between bg-teal-50 dark:bg-teal-950/40 p-4 rounded-2xl border border-teal-200 dark:border-teal-800">
                <div className="flex items-center gap-3">
                  <Warehouse className="w-6 h-6 text-teal-800 dark:text-teal-300" />
                  <div>
                    <h3 className="text-sm font-black text-teal-950 dark:text-teal-200">
                      Step 2: Create Commercial Dispatch Note
                    </h3>
                    <p className="text-xs text-teal-800 dark:text-teal-400">
                      Configure delivery logistics, transport vehicle, and warehouse fulfillment origin.
                    </p>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200">
                  {dispatchNoteNumber}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fulfillment Warehouse
                  </label>
                  <select
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Central Peshawar Warehouse">Central Peshawar Warehouse</option>
                    <option value="Rawalpindi Regional Depot">Rawalpindi Regional Depot</option>
                    <option value="Multan Transit Hub">Multan Transit Hub</option>
                    <option value="Lahore Logistics Terminal">Lahore Logistics Terminal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Transporter / Goods Carrier
                  </label>
                  <input
                    type="text"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Commercial Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Freight Bility / Consignment Number
                  </label>
                  <input
                    type="text"
                    value={bilityNumber}
                    onChange={(e) => setBilityNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white uppercase"
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {order.items?.length || 0} Order Line Items prepared for physical verification.
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Proceed to Stock Check (Step 3)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: STOCK AVAILABILITY CHECK & SKU FILTER */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-start sm:items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <PackageCheck className="w-6 h-6 text-amber-700 dark:text-amber-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-black text-amber-950 dark:text-amber-200">
                      Step 3: Dispatched Team Stock Availability Check
                    </h3>
                    <p className="text-xs text-amber-900/80 dark:text-amber-300/80">
                      Operational Rule: If any SKU is missing or not available, <strong>leave this SKU</strong> and proceed with available stocks for Invoicing &amp; Stocks Dispatched.
                    </p>
                  </div>
                </div>
              </div>

              {/* SKU Stock Verification Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">SKU &amp; Description</th>
                      <th className="py-2.5 px-3 text-center">Ordered</th>
                      <th className="py-2.5 px-3 text-center">In Warehouse</th>
                      <th className="py-2.5 px-3 text-center">Availability</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {processedItems.map((item) => (
                      <tr
                        key={item.key}
                        className={`transition-colors ${
                          !item.accepted
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 text-slate-400'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">
                            {item.skuCode}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {item.skuName}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {item.qty} pcs
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {item.cartons || Math.floor(item.qty / 20)} ctn
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span className={item.availableQty > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}>
                            {item.availableQty.toLocaleString()} pcs
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          {item.availableQty >= item.qty ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                              ✓ Available
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                              ⚠️ Out of Stock
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleSku(item.key)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95 ${
                              item.accepted
                                ? 'bg-teal-800 text-white hover:bg-teal-900 shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                            }`}
                          >
                            {item.accepted ? '✓ Dispatched' : 'Omitted (Leave SKU)'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Status Breakdown Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Stock Verification Summary:
                  </span>
                  <span className="text-slate-500">
                    {acceptedItems.length} SKUs Accepted for Invoicing &bull; {omittedItems.length} SKUs Left Behind (Out of Stock / Missing)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Proceed to Invoice (-15%) (Step 4)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: CREATE INVOICE (LESS 15% ON ALL PRODUCTS) */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className="w-6 h-6 text-emerald-800 dark:text-emerald-300" />
                  <div>
                    <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                      Step 4: Create Commercial Invoice (15% Less on All Products)
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-400">
                      Official policy applied: 15% trade discount deducted from gross catalog rates across all fulfilled SKUs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Breakdown Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#0052FF] text-white font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">SKU &amp; Description</th>
                      <th className="py-2.5 px-3 text-center">Qty (Pcs)</th>
                      <th className="py-2.5 px-3 text-right">Trade Rate</th>
                      <th className="py-2.5 px-3 text-right">Less 15% Disc</th>
                      <th className="py-2.5 px-3 text-right">Net Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {acceptedItems.map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">
                            {item.skuCode}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {item.skuName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {item.qty.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                          Rs. {item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-bold">
                          - Rs. {item.lineDiscount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                          Rs. {item.lineNet.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invoice Financial Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Merchandise Subtotal</span>
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                    Rs. {grossSubtotal.toLocaleString()}
                  </span>
                </div>

                <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                  <span className="text-[10px] text-rose-700 dark:text-rose-300 uppercase font-bold block">Invoice Discount (Less 15%)</span>
                  <span className="text-base font-black font-mono text-rose-700 dark:text-rose-300">
                    - Rs. {discount15.toLocaleString()}
                  </span>
                </div>

                <div className="bg-teal-50 dark:bg-teal-950/60 p-3 rounded-xl border border-teal-200 dark:border-teal-800">
                  <span className="text-[10px] text-teal-800 dark:text-teal-300 uppercase font-black block">Net Invoice Total (Payable)</span>
                  <span className="text-base font-black font-mono text-teal-900 dark:text-teal-200">
                    Rs. {netInvoiceTotal.toLocaleString()} PKR
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Back to Stock Check
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Proceed to Ledger Posting (Step 5)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: ADD INVOICE TO LEDGER */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-teal-50 dark:bg-teal-950/40 p-4 rounded-2xl border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-teal-800 dark:text-teal-300" />
                  <div>
                    <h3 className="text-sm font-black text-teal-950 dark:text-teal-200">
                      Step 5: Post Invoice to Customer Ledger
                    </h3>
                    <p className="text-xs text-teal-800 dark:text-teal-400">
                      The Net Invoice Amount (after 15% discount) will be debited to {customer.companyName}&apos;s account.
                    </p>
                  </div>
                </div>
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>

              {/* Ledger Math Box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Previous Account Balance:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    Rs. {previousBalance.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-emerald-800 dark:text-emerald-400 font-bold">
                    + New Invoice Debit (15% Less on All Products):
                  </span>
                  <span className="font-mono font-black text-teal-900 dark:text-teal-300">
                    + Rs. {netInvoiceTotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 bg-teal-100/60 dark:bg-teal-900/30 px-3 rounded-xl font-bold">
                  <span className="text-teal-950 dark:text-teal-200">
                    Projected Customer Ledger Balance:
                  </span>
                  <span className="font-mono font-black text-base text-teal-950 dark:text-teal-100">
                    Rs. {projectedBalance.toLocaleString()} PKR
                  </span>
                </div>
              </div>

              {/* Operational Rule Audit Notice */}
              <div className="bg-slate-100 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                <strong>Audit Compliance Check:</strong> Dispatched stocks ({acceptedItems.length} SKUs) will be automatically deducted from {warehouseName}. {omittedItems.length > 0 ? `${omittedItems.length} missing SKU(s) are excluded from this invoice.` : 'All ordered SKUs fulfilled.'}
              </div>

              {/* Final Execution Button */}
              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Back to Invoice
                </button>

                <button
                  type="button"
                  onClick={handleExecuteFulfillment}
                  className="px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                  <span>Accept Available Stocks, Dispatch &amp; Post to Ledger</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
