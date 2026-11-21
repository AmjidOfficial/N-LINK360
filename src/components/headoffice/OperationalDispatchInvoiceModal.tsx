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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-4xl max-h-[94vh] rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-slate-700/80 bg-[#0F172A] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#16A34A]/20 border border-[#16A34A]/40 text-[#4ADE80] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">
                  5-Step Dispatch &amp; Invoicing Pipeline
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#16A34A]/20 text-emerald-200 border border-[#16A34A]/40">
                  National Lights ERP
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                Order <strong className="font-mono tabular-nums text-white">#{order.orderNumber}</strong> &middot; Dealer: <strong>{customer.companyName}</strong> ({customer.town || customer.city})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dispatch pipeline modal"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Step Stepper Header */}
        <div className="bg-[#F8FAFC] dark:bg-[#1E293B] border-b border-[#E2E8F0] dark:border-slate-700/80 px-4 sm:px-5 py-3 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[540px] max-w-3xl mx-auto text-xs gap-2">
            {/* Step 1 */}
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap">
              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                ✓
              </span>
              <span>1. Sales Entry</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`min-h-[36px] flex items-center gap-1.5 font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                currentStep === 2
                  ? 'text-[#16A34A] dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                currentStep === 2 ? 'bg-[#16A34A] text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                2
              </span>
              <span>2. Dispatch Note</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`min-h-[36px] flex items-center gap-1.5 font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                currentStep === 3
                  ? 'text-[#16A34A] dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                currentStep === 3 ? 'bg-[#16A34A] text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                3
              </span>
              <span>3. Stock Check</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            {/* Step 4 */}
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className={`min-h-[36px] flex items-center gap-1.5 font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                currentStep === 4
                  ? 'text-[#16A34A] dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                currentStep === 4 ? 'bg-[#16A34A] text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                4
              </span>
              <span>4. Invoice (-15%)</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            {/* Step 5 */}
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className={`min-h-[36px] flex items-center gap-1.5 font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                currentStep === 5
                  ? 'text-[#16A34A] dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                currentStep === 5 ? 'bg-[#16A34A] text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/70 dark:bg-[#1E293B] p-4 rounded-2xl border border-emerald-200 dark:border-slate-700/80">
                <div className="flex items-center gap-3">
                  <Warehouse className="w-6 h-6 text-[#16A34A] shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Step 2: Create Commercial Dispatch Note
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Configure delivery logistics, transport vehicle, and warehouse fulfillment origin.
                    </p>
                  </div>
                </div>
                <span className="font-mono tabular-nums font-bold text-xs bg-white dark:bg-[#0F172A] px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-emerald-300 self-start sm:self-auto">
                  {dispatchNoteNumber}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Fulfillment Warehouse
                  </label>
                  <select
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#1E293B] font-semibold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#16A34A]"
                  >
                    <option value="Central Peshawar Warehouse">Central Peshawar Warehouse</option>
                    <option value="Rawalpindi Regional Depot">Rawalpindi Regional Depot</option>
                    <option value="Multan Transit Hub">Multan Transit Hub</option>
                    <option value="Lahore Logistics Terminal">Lahore Logistics Terminal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Transporter / Goods Carrier
                  </label>
                  <input
                    type="text"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#1E293B] font-semibold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#16A34A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Commercial Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#1E293B] font-mono tabular-nums font-bold text-[#0F172A] dark:text-white uppercase focus:outline-none focus:border-[#16A34A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Freight Bility / Consignment Number
                  </label>
                  <input
                    type="text"
                    value={bilityNumber}
                    onChange={(e) => setBilityNumber(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#1E293B] font-mono tabular-nums font-bold text-[#0F172A] dark:text-white uppercase focus:outline-none focus:border-[#16A34A]"
                  />
                </div>
              </div>

              <div className="bg-[#F8FAFC] dark:bg-[#1E293B] p-4 rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {order.items?.length || 0} Order Line Items prepared for physical verification.
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn-primary min-h-[44px]"
                >
                  <span>Proceed to Stock Check (Step 3)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: STOCK AVAILABILITY CHECK & SKU FILTER */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-start sm:items-center justify-between gap-3 bg-orange-50 dark:bg-[#1E293B] p-4 rounded-2xl border border-orange-200 dark:border-orange-500/40">
                <div className="flex items-center gap-3">
                  <PackageCheck className="w-6 h-6 text-[#F97316] shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Step 3: Dispatched Team Stock Availability Check
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Operational Rule: If any SKU is missing or not available, <strong>leave this SKU</strong> and proceed with available stocks for Invoicing &amp; Stocks Dispatched.
                    </p>
                  </div>
                </div>
              </div>

              {/* SKU Stock Verification Table */}
              <div className="responsive-table-container border border-[#E2E8F0] dark:border-slate-700/80 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse frozen-first-col">
                  <thead className="bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">SKU &amp; Description</th>
                      <th className="py-2.5 px-3 text-right">Ordered</th>
                      <th className="py-2.5 px-3 text-right">In Warehouse</th>
                      <th className="py-2.5 px-3 text-center">Availability</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
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
                          <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white block">
                            {item.skuCode}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.skuName}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-[#0F172A] dark:text-white whitespace-nowrap">
                          {item.qty} pcs
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {item.cartons || Math.floor(item.qty / 20)} ctn
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                          <span className={item.availableQty > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {item.availableQty.toLocaleString()} pcs
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {item.availableQty >= item.qty ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              ✓ Available
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              Out of Stock
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleSku(item.key)}
                            className={`min-h-[38px] px-3 py-1.5 rounded-xl font-semibold text-xs cursor-pointer transition-all active:scale-95 ${
                              item.accepted
                                ? 'bg-[#16A34A] text-white hover:bg-[#15803D] shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
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
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-[#0F172A] dark:text-white block">
                    Stock Verification Summary:
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {acceptedItems.length} SKUs Accepted for Invoicing &middot; {omittedItems.length} SKUs Left Behind (Out of Stock / Missing)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="btn-outline min-h-[44px]"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="btn-primary min-h-[44px]"
                  >
                    <span>Proceed to Invoice (-15%)</span>
                    <ArrowRight className="w-4 h-4" />
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
              <div className="bg-emerald-50/70 dark:bg-[#1E293B] p-4 rounded-2xl border border-emerald-200 dark:border-emerald-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className="w-6 h-6 text-[#10B981] shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Step 4: Create Commercial Invoice (15% Less on All Products)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Official policy applied: 15% trade discount deducted from gross catalog rates across all fulfilled SKUs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Breakdown Table */}
              <div className="responsive-table-container border border-[#E2E8F0] dark:border-slate-700/80 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse frozen-first-col">
                  <thead className="bg-[#0F172A] text-white font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">SKU &amp; Description</th>
                      <th className="py-2.5 px-3 text-right">Qty (Pcs)</th>
                      <th className="py-2.5 px-3 text-right">Trade Rate</th>
                      <th className="py-2.5 px-3 text-right">Less 15% Disc</th>
                      <th className="py-2.5 px-3 text-right">Net Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                    {acceptedItems.map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white block">
                            {item.skuCode}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.skuName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#0F172A] dark:text-white whitespace-nowrap">
                          {item.qty.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          PKR {item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                          -PKR {item.lineDiscount.toLocaleString()} CR
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#0F172A] dark:text-white whitespace-nowrap">
                          PKR {item.lineNet.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#F8FAFC] dark:bg-[#1E293B] border-t border-[#E2E8F0] dark:border-slate-700 font-mono tabular-nums text-xs font-bold">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-slate-700 dark:text-slate-200">
                        Invoice Totals ({acceptedItems.length} SKUs)
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        -PKR {discount15.toLocaleString()} CR
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#0F172A] dark:text-white whitespace-nowrap">
                        PKR {netInvoiceTotal.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Invoice Financial Summary Box */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white dark:bg-[#0F172A] p-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Gross Merchandise Subtotal</span>
                  <span className="text-base font-bold font-mono tabular-nums text-[#0F172A] dark:text-white">
                    PKR {grossSubtotal.toLocaleString()}
                  </span>
                </div>

                <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold block">Invoice Discount (Less 15%)</span>
                  <span className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                    -PKR {discount15.toLocaleString()} CR
                  </span>
                </div>

                <div className="bg-orange-50/70 dark:bg-[#0F172A] p-3 rounded-xl border border-orange-200 dark:border-[#EA580C]/50">
                  <span className="text-[10px] text-[#EA580C] dark:text-orange-400 uppercase font-bold block">Net Invoice Total (Payable)</span>
                  <span className="text-base font-bold font-mono tabular-nums text-[#0F172A] dark:text-white">
                    PKR {netInvoiceTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn-outline min-h-[44px]"
                >
                  Back to Stock Check
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="btn-primary min-h-[44px]"
                >
                  <span>Proceed to Ledger Posting</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: ADD INVOICE TO LEDGER */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-emerald-50/70 dark:bg-[#1E293B] p-4 rounded-2xl border border-emerald-200 dark:border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-[#16A34A] shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Step 5: Post Invoice to Customer Ledger
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      The Net Invoice Amount (after 15% discount) will be debited to {customer.companyName}&apos;s account.
                    </p>
                  </div>
                </div>
                <ShieldCheck className="w-6 h-6 text-[#10B981] shrink-0" />
              </div>

              {/* Ledger Math Box */}
              <div className="bg-[#F8FAFC] dark:bg-[#1E293B] p-5 rounded-2xl border border-[#E2E8F0] dark:border-slate-700/80 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-[#E2E8F0] dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Previous Account Balance:</span>
                  <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
                    PKR {previousBalance.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-[#E2E8F0] dark:border-slate-700">
                  <span className="text-[#EA580C] dark:text-orange-400 font-bold">
                    + New Invoice Debit (15% Less on All Products):
                  </span>
                  <span className="font-mono tabular-nums font-bold text-[#EA580C] dark:text-orange-400">
                    +PKR {netInvoiceTotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5 bg-white dark:bg-[#0F172A] px-3 rounded-xl border border-[#E2E8F0] dark:border-slate-700 font-bold">
                  <span className="text-[#0F172A] dark:text-white">
                    Projected Customer Ledger Balance:
                  </span>
                  <span className="font-mono tabular-nums font-bold text-base text-[#0F172A] dark:text-white">
                    PKR {projectedBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Operational Rule Audit Notice */}
              <div className="bg-[#F8FAFC] dark:bg-[#1E293B] p-3.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700/80 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                <strong>Audit Compliance Check:</strong> Dispatched stocks ({acceptedItems.length} SKUs) will be automatically deducted from {warehouseName}. {omittedItems.length > 0 ? `${omittedItems.length} missing SKU(s) are excluded from this invoice.` : 'All ordered SKUs fulfilled.'}
              </div>

              {/* Final Execution Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="btn-outline min-h-[44px]"
                >
                  Back to Invoice
                </button>

                <button
                  type="button"
                  onClick={handleExecuteFulfillment}
                  className="btn-primary min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4" />
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
