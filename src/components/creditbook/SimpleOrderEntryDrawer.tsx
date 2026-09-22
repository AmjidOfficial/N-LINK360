/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Simple Order Entry Drawer
 * Streamlined multi-SKU product ordering interface matching CreditBook UX:
 * - Direct category & SKU search
 * - Carton & Piece quantity calculators with Trade Price calculation
 * - Order summary & projected balance preview
 * - Direct "Download PDF" & "WhatsApp" options upon booking
 */

import React, { useState, useMemo } from 'react';
import { Customer, SalesOrder, SalesOrderItem } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { NLINK_OFFICIAL_PRODUCTS, NLinkSKU } from '../../data/nlink-products';
import {
  X,
  Plus,
  Trash2,
  Receipt,
  Download,
  MessageCircle,
  Eye,
  CheckCircle2,
  TrendingUp,
  Package,
  Layers,
  Search,
  ShoppingCart,
} from 'lucide-react';

export interface SimpleOrderEntryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  currentUser: NLinkUser;
  onPlaceOrder: (order: SalesOrder) => void;
  onDownloadPdf?: (order: SalesOrder, customer: Customer) => void;
  onPreviewPdf?: (order: SalesOrder, customer: Customer) => void;
  onWhatsAppShare?: (order: SalesOrder, customer: Customer) => void;
}

interface OrderItemRow {
  skuId: string;
  skuCode: string;
  skuName: string;
  category: string;
  cartons: number;
  piecesPerCarton: number;
  loosePieces: number;
  totalPieces: number;
  tradePrice: number;
  lineTotal: number;
}

export const SimpleOrderEntryDrawer: React.FC<SimpleOrderEntryDrawerProps> = ({
  isOpen,
  onClose,
  customer,
  currentUser,
  onPlaceOrder,
  onDownloadPdf,
  onPreviewPdf,
  onWhatsAppShare,
}) => {
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [orderNotes, setOrderNotes] = useState('');
  const [bookedOrder, setBookedOrder] = useState<SalesOrder | null>(null);

  // Available SKU catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    NLINK_OFFICIAL_PRODUCTS.forEach((sku) => {
      if (sku.categoryLabel) set.add(sku.categoryLabel);
    });
    return ['ALL', ...Array.from(set)];
  }, []);

  const filteredSkus = useMemo(() => {
    return NLINK_OFFICIAL_PRODUCTS.filter((sku) => {
      const matchCat =
        selectedCategory === 'ALL' || sku.categoryLabel === selectedCategory;
      const matchSearch =
        !searchQuery ||
        sku.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sku.skuCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sku.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Add SKU to order
  const handleAddSku = (sku: NLinkSKU) => {
    const existingIndex = items.findIndex((i) => i.skuCode === sku.skuCode);
    if (existingIndex >= 0) {
      // Increment cartons by 1
      const updated = [...items];
      const row = updated[existingIndex];
      const newCartons = row.cartons + 1;
      const totalPcs = newCartons * row.piecesPerCarton + row.loosePieces;
      row.cartons = newCartons;
      row.totalPieces = totalPcs;
      row.lineTotal = totalPcs * row.tradePrice;
      setItems(updated);
    } else {
      const pcsPerCarton = sku.cartonQuantity || 20;
      const unitPrice = sku.tradePrice || 500;
      const initialCartons = 1;
      const totalPcs = initialCartons * pcsPerCarton;
      setItems([
        ...items,
        {
          skuId: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.name,
          category: sku.categoryLabel,
          cartons: initialCartons,
          piecesPerCarton: pcsPerCarton,
          loosePieces: 0,
          totalPieces: totalPcs,
          tradePrice: unitPrice,
          lineTotal: totalPcs * unitPrice,
        },
      ]);
    }
  };

  const handleUpdateItem = (
    index: number,
    cartons: number,
    loosePieces: number,
    tradePrice?: number
  ) => {
    const updated = [...items];
    const row = updated[index];
    const safeCartons = Math.max(0, cartons);
    const safeLoose = Math.max(0, loosePieces);
    const totalPcs = safeCartons * row.piecesPerCarton + safeLoose;
    const price = tradePrice !== undefined ? tradePrice : row.tradePrice;

    row.cartons = safeCartons;
    row.loosePieces = safeLoose;
    row.totalPieces = totalPcs;
    row.tradePrice = price;
    row.lineTotal = totalPcs * price;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const grossSubtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const totalCartons = items.reduce((sum, i) => sum + i.cartons, 0);
  const totalPieces = items.reduce((sum, i) => sum + i.totalPieces, 0);

  const previousBalance = customer.currentBalance ?? customer.openingBalance ?? 0;
  const projectedBalance = previousBalance + grossSubtotal;

  const handleBookOrder = () => {
    if (items.length === 0) return;

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const orderItems: SalesOrderItem[] = items.map((i) => ({
      skuId: i.skuId,
      skuCode: i.skuCode,
      skuName: i.skuName,
      cartons: i.cartons,
      piecesPerCarton: i.piecesPerCarton,
      looseQuantity: i.loosePieces,
      quantity: i.totalPieces,
      unitPrice: i.tradePrice,
      totalAmount: i.lineTotal,
    }));

    const newOrder: SalesOrder = {
      id: orderNumber,
      orderNumber,
      orderDate: nowIso.slice(0, 10),
      createdAt: nowIso,
      customerId: customer.id,
      customerName: customer.companyName,
      customerCode: customer.customerCode || 'NL-DLR',
      salesUserId: currentUser.id,
      salesUserName: currentUser.fullName,
      status: 'SUBMITTED',
      subtotal: grossSubtotal,
      totalAmount: grossSubtotal,
      discountAmount: 0,
      taxAmount: 0,
      creditCheckStatus: 'GREEN',
      items: orderItems,
      notes: orderNotes,
      shahzadApproval: 'PENDING',
      dualApprovalStatus: 'PENDING_DUAL_APPROVAL',
    };

    onPlaceOrder(newOrder);
    setBookedOrder(newOrder);
  };

  const handleResetAndClose = () => {
    setItems([]);
    setOrderNotes('');
    setBookedOrder(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-800 dark:text-teal-400">
              National Light Official Sales Booking
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {customer.companyName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Town: <strong>{customer.town || customer.city}</strong> &bull; Current Bal: Rs. {previousBalance.toLocaleString()}
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {bookedOrder ? (
            /* SUCCESS CONFIRMATION STATE */
            <div className="space-y-4 py-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Order Successfully Booked!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Order <strong>#{bookedOrder.orderNumber}</strong> has been logged for <strong>{customer.companyName}</strong>.
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 rounded-full text-amber-900 dark:text-amber-200 text-xs font-bold">
                  ⏳ Awaiting Shahzad Ullah&apos;s Executive Approval
                </div>
              </div>

              {/* Order Summary Box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Amount:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    Rs. {Number(bookedOrder.totalAmount || 0).toLocaleString()} PKR
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SKU Count:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {bookedOrder.items?.length || 0} Items
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Booked By:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {currentUser.fullName}
                  </span>
                </div>
              </div>

              {/* Actions Grid: PDF & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                {onPreviewPdf && (
                  <button
                    type="button"
                    onClick={() => onPreviewPdf(bookedOrder, customer)}
                    className="py-3 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Live Preview</span>
                  </button>
                )}

                {onDownloadPdf && (
                  <button
                    type="button"
                    onClick={() => onDownloadPdf(bookedOrder, customer)}
                    className="py-3 px-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                )}

                {onWhatsAppShare && (
                  <button
                    type="button"
                    onClick={() => onWhatsAppShare(bookedOrder, customer)}
                    className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full mt-2 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition-colors"
              >
                Done / Back to Customer
              </button>
            </div>
          ) : (
            /* ACTIVE ORDER FORM */
            <div className="space-y-4 text-xs">
              {/* Product SKU Selector Section */}
              <div className="space-y-2.5">
                <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  Select SKUs to Add
                </span>

                {/* Search & Category Filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search SKU name, wattage, or code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c === 'ALL' ? 'All Categories' : c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SKU Catalog Chips Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {filteredSkus.slice(0, 16).map((sku) => {
                    const isAdded = items.some((i) => i.skuCode === sku.skuCode);

                    return (
                      <button
                        key={sku.id}
                        type="button"
                        onClick={() => handleAddSku(sku)}
                        className={`p-2.5 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                          isAdded
                            ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900 dark:text-white truncate block text-[11px]">
                            {sku.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            TP: Rs. {sku.tradePrice.toLocaleString()} &bull; {sku.cartonQuantity} pcs/ctn
                          </span>
                        </div>
                        <Plus className="w-4 h-4 text-teal-700 shrink-0 ml-1" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Items Table / Rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Order Items ({items.length})
                  </span>
                  <span className="text-[11px] font-bold text-teal-800 dark:text-teal-400">
                    {totalCartons} Cartons &bull; {totalPieces} Pcs
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-1 opacity-40" />
                    <p className="font-bold text-xs">No SKUs Added Yet</p>
                    <p className="text-[10px] mt-0.5">Click any product above to add it to this order.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {items.map((row, idx) => (
                      <div
                        key={row.skuCode}
                        className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white text-xs block">
                              {row.skuName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {row.skuCode} &bull; Rs. {row.tradePrice} / pc &bull; {row.piecesPerCarton} pcs/ctn
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quantity Inputs */}
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <div>
                            <label className="text-[9px] font-extrabold uppercase text-slate-400 block">
                              Cartons
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={row.cartons}
                              onChange={(e) =>
                                handleUpdateItem(
                                  idx,
                                  parseInt(e.target.value, 10) || 0,
                                  row.loosePieces
                                )
                              }
                              className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-extrabold uppercase text-slate-400 block">
                              Loose (Pcs)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={row.loosePieces}
                              onChange={(e) =>
                                handleUpdateItem(
                                  idx,
                                  row.cartons,
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                            />
                          </div>

                          <div className="text-right">
                            <label className="text-[9px] font-extrabold uppercase text-slate-400 block">
                              Line Total
                            </label>
                            <span className="font-mono font-black text-slate-900 dark:text-white text-xs block mt-1">
                              Rs. {row.lineTotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Financial Calculation Summary */}
              {items.length > 0 && (
                <div className="bg-teal-50/80 dark:bg-teal-950/40 p-4 rounded-2xl border border-teal-200 dark:border-teal-800/60 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Previous Account Balance:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      Rs. {previousBalance.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold">
                    <span className="text-teal-900 dark:text-teal-200">Gross Order Total:</span>
                    <span className="font-mono font-black text-teal-900 dark:text-teal-200 text-sm">
                      Rs. {grossSubtotal.toLocaleString()} PKR
                    </span>
                  </div>

                  <div className="pt-2 border-t border-teal-200 dark:border-teal-800/60 flex justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Projected Closing Balance:</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white">
                      Rs. {projectedBalance.toLocaleString()} PKR
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                  Order Remarks / Delivery Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Urgent dispatch via Swat Goods"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              {/* Primary Submit CTA */}
              <button
                type="button"
                onClick={handleBookOrder}
                disabled={items.length === 0}
                className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                  items.length === 0
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-teal-800 hover:bg-teal-900 text-white active:scale-98 shadow-teal-950/20'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>CONFIRM &amp; BOOK ORDER (Rs. {grossSubtotal.toLocaleString()})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
