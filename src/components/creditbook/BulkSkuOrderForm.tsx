/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Bulk SKU Order Form
 * Unified all-SKU ordering sheet across Field Mobile, Head Office, and Customer 360:
 * Columns: SKU | Invoice Rate | Order QTY | Total Amount
 * Only Order QTY needs to be entered.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Customer, SalesOrder, SalesOrderItem } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { NLINK_OFFICIAL_PRODUCTS } from '../../data/nlink-products';
import { triggerHaptic } from '../../utils/haptics';
import { generateUniqueOrderId, generateUniqueOrderItemId, generateIdempotencyUuid } from '../../utils/idGenerator';
import {
  Search,
  ShoppingBag,
  CheckCircle2,
  Download,
  Eye,
  MessageCircle,
  RotateCcw,
  Building2,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

export interface BulkSkuOrderFormProps {
  currentUser: NLinkUser;
  availableCustomers: Customer[];
  preselectedCustomer?: Customer | null;
  onPlaceOrder: (order: SalesOrder) => void;
  onDownloadPdf?: (order: SalesOrder, customer: Customer) => void;
  onPreviewPdf?: (order: SalesOrder, customer: Customer) => void;
  onWhatsAppShare?: (order: SalesOrder, customer: Customer) => void;
  onOrderCompleted?: (order: SalesOrder) => void;
  stickyTopOffsetClass?: string;
}

export const BulkSkuOrderForm: React.FC<BulkSkuOrderFormProps> = ({
  currentUser,
  availableCustomers,
  preselectedCustomer = null,
  onPlaceOrder,
  onDownloadPdf,
  onPreviewPdf,
  onWhatsAppShare,
  onOrderCompleted,
  stickyTopOffsetClass = 'top-0',
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomer?.id || availableCustomers[0]?.id || ''
  );
  const [skuEntries, setSkuEntries] = useState<Record<string, { cartons: number; packs: number }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [bookedOrder, setBookedOrder] = useState<{
    order: SalesOrder;
    customer: Customer;
  } | null>(null);
  const [draftIdempotencyKey, setDraftIdempotencyKey] = useState<string>(() => generateIdempotencyUuid());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const activeCustomer = useMemo(() => {
    if (preselectedCustomer) return preselectedCustomer;
    return (
      availableCustomers.find((c) => c.id === selectedCustomerId) ||
      availableCustomers[0] ||
      null
    );
  }, [preselectedCustomer, availableCustomers, selectedCustomerId]);

  const filteredSkus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return NLINK_OFFICIAL_PRODUCTS.filter((sku) => {
      if (sku.isActive === false) return false;
      const matchSearch =
        !q ||
        sku.name.toLowerCase().includes(q) ||
        sku.skuCode.toLowerCase().includes(q) ||
        sku.categoryLabel.toLowerCase().includes(q);
      return matchSearch;
    });
  }, [searchQuery]);

  const handleUnitChange = (skuId: string, field: 'cartons' | 'packs', rawValue: string) => {
    const parsed = rawValue === '' ? 0 : Math.max(0, Math.floor(Number(rawValue) || 0));
    setSkuEntries((prev) => {
      const current = prev[skuId] || { cartons: 0, packs: 0 };
      return {
        ...prev,
        [skuId]: {
          ...current,
          [field]: parsed,
        },
      };
    });
  };

  /**
   * High-Speed Arrow Key Navigation with Wrap-Around
   * Up/Down/Left/Right/Enter navigation across SKU table rows and Carton/Pack columns.
   */
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: 0 | 1 // 0: Cartons, 1: Packs
  ) => {
    const totalRows = filteredSkus.length;
    if (totalRows === 0) return;

    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Wraps around to top row
      targetRow = (rowIndex + 1) % totalRows;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Wraps around to bottom row
      targetRow = (rowIndex - 1 + totalRows) % totalRows;
    } else if (e.key === 'ArrowRight') {
      if (colIndex === 0) {
        e.preventDefault();
        targetCol = 1;
      } else {
        e.preventDefault();
        targetRow = (rowIndex + 1) % totalRows;
        targetCol = 0;
      }
    } else if (e.key === 'ArrowLeft') {
      if (colIndex === 1) {
        e.preventDefault();
        targetCol = 0;
      } else {
        e.preventDefault();
        targetRow = (rowIndex - 1 + totalRows) % totalRows;
        targetCol = 1;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (colIndex === 0) {
        targetCol = 1;
      } else {
        targetRow = (rowIndex + 1) % totalRows;
        targetCol = 0;
      }
    } else {
      return;
    }

    const nextEl = document.querySelector<HTMLInputElement>(
      `input[data-sku-row="${targetRow}"][data-sku-col="${targetCol}"]`
    );
    if (nextEl) {
      nextEl.focus();
      nextEl.select();
      nextEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  };

  const orderSummary = useMemo(() => {
    let activeSkuCount = 0;
    let totalCartons = 0;
    let totalPacks = 0;
    let totalQty = 0;
    let grossAmount = 0;
    let netAmount = 0;

    NLINK_OFFICIAL_PRODUCTS.forEach((sku) => {
      const entry = skuEntries[sku.id];
      const ctn = entry?.cartons || 0;
      const pks = entry?.packs || 0;
      const pcsPerCarton = sku.cartonQuantity || 20;
      const qty = (ctn * pcsPerCarton) + pks;
      if (qty > 0) {
        const grossRate = sku.tradePrice || 0;
        const netRate = sku.retailPrice || Math.round(grossRate * 0.85);
        activeSkuCount += 1;
        totalCartons += ctn;
        totalPacks += pks;
        totalQty += qty;
        grossAmount += qty * grossRate;
        netAmount += qty * netRate;
      }
    });

    const discountAmount = grossAmount - netAmount;

    return { activeSkuCount, totalCartons, totalPacks, totalQty, grossAmount, netAmount, discountAmount };
  }, [skuEntries]);

  const handleSubmitOrder = () => {
    if (!activeCustomer || orderSummary.totalQty <= 0 || submitLockRef.current || isSubmitting) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const orderNumber = generateUniqueOrderId();
      const nowIso = new Date().toISOString();

      const orderItems: SalesOrderItem[] = NLINK_OFFICIAL_PRODUCTS.filter((sku) => {
        const entry = skuEntries[sku.id];
        const ctn = entry?.cartons || 0;
        const pks = entry?.packs || 0;
        const pcsPerCarton = sku.cartonQuantity || 20;
        return (ctn * pcsPerCarton) + pks > 0;
      }).map((sku, idx) => {
        const entry = skuEntries[sku.id] || { cartons: 0, packs: 0 };
        const ctn = entry.cartons || 0;
        const pks = entry.packs || 0;
        const pcsPerCarton = sku.cartonQuantity || 20;
        const qty = (ctn * pcsPerCarton) + pks;
        const grossRate = sku.tradePrice || 0;
        const netRate = sku.retailPrice || Math.round(grossRate * 0.85);
        const lineTotal = qty * netRate;
        return {
          id: generateUniqueOrderItemId(orderNumber, idx),
          orderId: orderNumber,
          skuId: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.name,
          orderedQuantity: qty,
          discountPercent: 15,
          lineTotal,
          cartons: ctn,
          piecesPerCarton: pcsPerCarton,
          looseQuantity: pks,
          quantity: qty,
          unitPrice: netRate,
          totalAmount: lineTotal,
        };
      });

      const newOrder: SalesOrder = {
        id: orderNumber,
        idempotencyKey: draftIdempotencyKey,
        orderNumber,
        orderDate: nowIso.slice(0, 10),
        createdAt: nowIso,
        customerId: activeCustomer.id,
        customerName: activeCustomer.companyName,
        customerCode: activeCustomer.customerCode || 'NL-DLR',
        salesUserId: currentUser.id,
        salesUserName: currentUser.fullName,
        status: 'SUBMITTED',
        subtotal: orderSummary.grossAmount,
        totalAmount: orderSummary.netAmount,
        netAmount: orderSummary.netAmount,
        netTotal: orderSummary.netAmount,
        discountAmount: orderSummary.discountAmount,
        taxAmount: 0,
        creditCheckStatus: 'GREEN',
        items: orderItems,
        notes: orderNotes ? `${orderNotes} | Net TP (@ 15% Less)` : 'Net TP (@ 15% Less)',
        shahzadApproval: 'PENDING',
        dualApprovalStatus: 'PENDING_DUAL_APPROVAL',
      };

      triggerHaptic('success');
      onPlaceOrder(newOrder);
      setBookedOrder({ order: newOrder, customer: activeCustomer });
      if (onOrderCompleted) {
        onOrderCompleted(newOrder);
      }
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const handleResetForm = () => {
    triggerHaptic('light');
    setSkuEntries({});
    setOrderNotes('');
    setBookedOrder(null);
    setDraftIdempotencyKey(generateIdempotencyUuid());
    submitLockRef.current = false;
    setIsSubmitting(false);
  };

  if (bookedOrder) {
    const { order, customer } = bookedOrder;
    return (
      <div className="bg-white dark:bg-[#111C33] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#10B981] mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
            Order #{order.orderNumber} Booked
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {customer.companyName} &middot; Awaiting Shahzad Ullah&apos;s Approval
          </p>
        </div>

        <div className="max-w-md mx-auto bg-[#F8FAFC] dark:bg-slate-800/60 rounded-xl p-3.5 border border-[#E2E8F0] dark:border-slate-700 text-xs space-y-1.5 text-left">
          <div className="flex justify-between">
            <span className="text-slate-500">Order Amount</span>
            <span className="font-mono tabular-nums font-bold text-[#0F172A] dark:text-white">
              Rs. {Number(order.totalAmount || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">SKUs Ordered</span>
            <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200">
              {order.items?.length || 0}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {onPreviewPdf && (
            <button
              type="button"
              onClick={() => onPreviewPdf(order, customer)}
              className="btn-outline text-xs"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
          )}
          {onDownloadPdf && (
            <button
              type="button"
              onClick={() => onDownloadPdf(order, customer)}
              className="btn-primary text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          )}
          {onWhatsAppShare && (
            <button
              type="button"
              onClick={() => onWhatsAppShare(order, customer)}
              className="btn-outline text-xs text-emerald-700 dark:text-emerald-300"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleResetForm}
            className="btn-ghost text-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Order</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full overflow-x-hidden">
      {/* Dealer / Distributor Selector & High-Visibility Full-Width Search */}
      <div className="bg-white rounded-2xl border border-[#C8E6C9] p-3.5 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 gap-3">
          {/* Dealer Selector */}
          <div className="min-w-0">
            <label className="block text-[11px] font-semibold text-[#3E6B48] mb-1">
              Dealer / Distributor
            </label>
            {preselectedCustomer ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F1F8E9] border border-[#C8E6C9] text-xs font-bold text-[#1B5E3A] min-w-0">
                <Building2 className="w-4 h-4 text-[#4CAF50] shrink-0" />
                <span className="truncate">{preselectedCustomer.companyName}</span>
                <span className="text-[11px] font-normal text-[#5F8564] ml-auto shrink-0">
                  {preselectedCustomer.town || preselectedCustomer.city}
                </span>
              </div>
            ) : (
              <select
                value={activeCustomer?.id || ''}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-[#F1F8E9] border border-[#C8E6C9] text-xs font-semibold text-[#1B5E3A] outline-none focus:border-[#4CAF50]"
              >
                {availableCustomers.length === 0 ? (
                  <option value="">No Dealers / Distributors in Active Town</option>
                ) : (
                  availableCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.town || c.city})
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* High-Visibility Full-Width Real-Time Search SKU */}
          <div className="min-w-0">
            <label className="block text-[11px] font-semibold text-[#3E6B48] mb-1">
              Search SKU (Real-Time Filter)
            </label>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-[#1B5E3A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type SKU name or code to filter..."
                  aria-label="Search SKU name or code"
                  className="w-full min-h-[46px] pl-10 pr-10 py-2.5 rounded-xl bg-[#F1F8E9] border-2 border-[#4CAF50]/70 text-sm font-semibold text-[#1B5E3A] placeholder:text-[#5F8564] outline-none focus:border-[#1B5E3A] focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[#3E6B48] hover:text-[#1B5E3A] hover:bg-[#D9F99D]/60 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery((q) => q.trim())}
                className="min-h-[46px] px-4 py-2 rounded-xl bg-[#1B5E3A] hover:bg-[#14462B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Quick Navigation Hint */}
      <div className="flex items-center justify-between px-2 text-[10px] text-[#5F8564] font-medium">
        <span>↑ ↓ ← → Arrow keys move between Cartons &amp; Packs (Down wraps around to top)</span>
        <span className="hidden sm:inline">Enter key advances</span>
      </div>

      {/* Full Large-Screen All-SKU 5-Column CSS Grid: SKU | Rate | Ctn | Packs | Total */}
      <div className="bg-white rounded-2xl border border-[#C8E6C9] overflow-x-hidden shadow-xs w-full min-w-0 flex flex-col">
        <div className="w-full min-w-0 h-[70vh] sm:h-[74vh] md:h-[78vh] max-h-[calc(100dvh-200px)] overflow-y-auto overflow-x-hidden overscroll-contain">
          {/* Pinned Sticky Header Row (high z-index, zero horizontal scroll) */}
          <div className="sticky top-0 z-30 bg-[#1B5E3A] text-white text-[10px] sm:text-xs font-bold grid grid-cols-12 items-center gap-1.5 px-2 sm:px-3 py-3 shadow-md w-full min-w-0 overflow-x-hidden select-none">
            <div className="col-span-4 min-w-0 truncate">SKU ITEM</div>
            <div className="col-span-2 min-w-0 text-right truncate">RATE</div>
            <div className="col-span-2 min-w-0 text-center truncate">CTN</div>
            <div className="col-span-2 min-w-0 text-center truncate">PACKS</div>
            <div className="col-span-2 min-w-0 text-right truncate">TOTAL</div>
          </div>

          {/* Responsive SKU Grid Rows */}
          <div className="divide-y divide-[#C8E6C9] w-full min-w-0 overflow-x-hidden">
            {filteredSkus.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No SKUs match your search query.
              </div>
            ) : (
              filteredSkus.map((sku, idx) => {
                const entry = skuEntries[sku.id] || { cartons: 0, packs: 0 };
                const ctn = entry.cartons || 0;
                const pks = entry.packs || 0;
                const pcsPerCarton = sku.cartonQuantity || 20;
                const qty = (ctn * pcsPerCarton) + pks;
                const rate = sku.retailPrice || Math.round((sku.tradePrice || 0) * 0.85);
                const lineTotal = qty * rate;
                const hasQty = qty > 0;

                return (
                <div
                  key={sku.id}
                  className={`grid grid-cols-12 items-center gap-1.5 px-2 sm:px-3 py-2.5 transition-colors w-full min-w-0 ${
                    hasQty
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900'
                      : 'bg-white dark:bg-[#111C33] border-b border-slate-100 dark:border-slate-800'
                  }`}
                >
                  {/* Col 1: SKU Name */}
                  <div className="col-span-4 min-w-0 pr-1">
                    <div className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs leading-tight line-clamp-2">{sku.name}</div>
                    <div className="text-[9px] text-slate-500 font-mono truncate">{sku.skuCode}</div>
                  </div>

                  {/* Col 2: Rate */}
                  <div className="col-span-2 min-w-0 text-right font-mono tabular-nums text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {rate.toLocaleString()}
                  </div>

                  {/* Col 3: Cartons */}
                  <div className="col-span-2 min-w-0 flex justify-center">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={`${sku.name} Cartons`}
                      data-sku-row={idx}
                      data-sku-col={0}
                      value={ctn === 0 ? '' : ctn}
                      placeholder="0"
                      onChange={(e) => handleUnitChange(sku.id, 'cartons', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => handleKeyDown(e, idx, 0)}
                      className="w-full max-w-[56px] min-h-[44px] text-center font-mono text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Col 4: Packs */}
                  <div className="col-span-2 min-w-0 flex justify-center">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={`${sku.name} Packs`}
                      data-sku-row={idx}
                      data-sku-col={1}
                      value={pks === 0 ? '' : pks}
                      placeholder="0"
                      onChange={(e) => handleUnitChange(sku.id, 'packs', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                      className="w-full max-w-[56px] min-h-[44px] text-center font-mono text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Col 5: Total */}
                  <div className="col-span-2 min-w-0 text-right text-[11px] sm:text-xs font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums truncate">
                    {lineTotal > 0 ? lineTotal.toLocaleString() : '—'}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sticky Order Summary & Submit Footer */}
        <div className="p-3.5 border-t border-[#C8E6C9] bg-[#F1F8E9] rounded-b-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-[#5F8564] block text-[10px]">Selected SKUs</span>
              <span className="font-mono tabular-nums font-bold text-[#1B5E3A]">
                {orderSummary.activeSkuCount}
              </span>
            </div>
            <div>
              <span className="text-[#5F8564] block text-[10px]">Ctn + Packs</span>
              <span className="font-mono tabular-nums font-bold text-[#1B5E3A]">
                {orderSummary.totalCartons} Ctn + {orderSummary.totalPacks} Pks
              </span>
            </div>
            <div>
              <span className="text-[#5F8564] block text-[10px]">Total Amount</span>
              <span className="font-mono tabular-nums font-bold text-sm text-[#4CAF50]">
                Rs. {orderSummary.grossAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {orderSummary.totalQty > 0 && (
              <button
                type="button"
                onClick={handleResetForm}
                className="btn-outline text-xs flex-1 sm:flex-none"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              disabled={!activeCustomer || orderSummary.totalQty <= 0 || isSubmitting}
              onClick={handleSubmitOrder}
              className="btn-primary min-h-[44px] text-xs flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Order'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
