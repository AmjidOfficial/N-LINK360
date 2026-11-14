/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Distributor Transfer & Market Handover Module
 * Provides comprehensive enterprise UI for:
 * 1. Distributor Replacement & Territory Splits (e.g. 60/40 market splits)
 * 2. Market Bills Receivable Handover (Preserving original invoice history & numbers)
 * 3. Physical Stock Transfer (Carton, loose pieces, batch & valuation)
 * 4. Executive Sign-offs (Shahzad Ullah sole signing authority)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  DistributorTransferRequest,
  DistributorTransferType,
  DistributorTransferStatus,
  Customer,
  SalesOrder,
  InventoryBalance,
  TransferredBillItem,
  TransferredStockItem,
} from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { NLINK_OFFICIAL_PRODUCTS } from '../../data/nlink-products';
import { isAuthorizedApproverEmail } from '../../services/production-users';
import {
  getStoredDistributorTransfers,
  createDistributorTransfer,
  approveDistributorTransfer,
} from '../../services/distributorTransferService';
import { triggerHaptic } from '../../utils/haptics';
import {
  ArrowRightLeft,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  FileText,
  Package,
  ShieldCheck,
  Search,
  Filter,
  Users,
  AlertTriangle,
  Receipt,
  Download,
  Share2,
  Check,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';

export interface DistributorTransferModuleProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  inventoryBalances?: InventoryBalance[];
  onUpdateCustomers?: (updated: Customer[]) => void;
  onToastMessage?: (msg: string) => void;
}

export const DistributorTransferModule: React.FC<DistributorTransferModuleProps> = ({
  currentUser,
  customers = [],
  orders = [],
  inventoryBalances = [],
  onUpdateCustomers,
  onToastMessage,
}) => {
  // Transfer Records State
  const [transfers, setTransfers] = useState<DistributorTransferRequest[]>(() =>
    getStoredDistributorTransfers()
  );

  // Active Tab Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // New Handover Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  // Form State
  const [transferType, setTransferType] = useState<DistributorTransferType>('TERRITORY_SPLIT');
  const [sourceDistributorName, setSourceDistributorName] = useState('Peshawar Central Distributors');
  const [targetDistributorName, setTargetDistributorName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('KPK');
  const [selectedTown, setSelectedTown] = useState('All Towns');
  const [reasonNotes, setReasonNotes] = useState('');

  // Selected Dealers & Receivables for Transfer
  const [selectedDealerIds, setSelectedDealerIds] = useState<string[]>([]);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);

  // Selected Stock Items for Transfer
  const [stockItems, setStockItems] = useState<TransferredStockItem[]>([]);
  const [selectedSkuCode, setSelectedSkuCode] = useState('');
  const [skuCartons, setSkuCartons] = useState<number>(5);

  // Inspect Transfer Details Modal
  const [inspectTransfer, setInspectTransfer] = useState<DistributorTransferRequest | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isModalOpen || typeof window === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isModalOpen]);

  // Is Shahzad Ullah Executive Approver
  const isShahzad = isAuthorizedApproverEmail(currentUser?.email, currentUser);

  // Filtered Transfer List
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && (t.status === 'SUBMITTED' || t.status === 'DRAFT')) ||
        (statusFilter === 'APPROVED' && t.status === 'APPROVED') ||
        (statusFilter === 'COMPLETED' && t.status === 'COMPLETED');

      const matchSearch =
        !searchQuery ||
        t.transferNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.sourceDistributorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.targetDistributorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.region.toLowerCase().includes(searchQuery.toLowerCase());

      return matchStatus && matchSearch;
    });
  }, [transfers, statusFilter, searchQuery]);

  // Outstanding Bills available for transfer from current orders
  const availableOutstandingOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status === 'APPROVED' &&
        (o.shahzadApproval === 'APPROVED' || o.dualApprovalStatus === 'DUAL_APPROVED') &&
        (o.totalAmount || 0) > 0
    );
  }, [orders]);

  // Toggle Dealer Selection
  const toggleDealerSelection = (dealerId: string) => {
    triggerHaptic('light');
    setSelectedDealerIds((prev) =>
      prev.includes(dealerId) ? prev.filter((id) => id !== dealerId) : [...prev, dealerId]
    );
  };

  // Toggle Bill Selection
  const toggleBillSelection = (orderId: string) => {
    triggerHaptic('light');
    setSelectedBillIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Add Stock Item to Handover
  const handleAddStockItem = () => {
    if (!selectedSkuCode) return;
    const sku = NLINK_OFFICIAL_PRODUCTS.find((s) => s.skuCode === selectedSkuCode);
    if (!sku) return;

    const cartons = Math.max(1, skuCartons);
    const pcsPerCarton = sku.cartonQuantity || 50;
    const totalPieces = cartons * pcsPerCarton;
    const valuation = totalPieces * sku.tradePrice;

    const newItem: TransferredStockItem = {
      skuId: sku.id,
      skuCode: sku.skuCode,
      skuName: sku.name,
      category: sku.categoryLabel,
      cartons,
      piecesPerCarton: pcsPerCarton,
      loosePieces: 0,
      totalPieces,
      unitPrice: sku.tradePrice,
      valuationTotal: valuation,
    };

    setStockItems((prev) => [...prev.filter((i) => i.skuCode !== sku.skuCode), newItem]);
    setSelectedSkuCode('');
    setSkuCartons(5);
  };

  // Total Receivables Valuation
  const totalReceivablesValuation = useMemo(() => {
    return availableOutstandingOrders
      .filter((o) => selectedBillIds.includes(o.id))
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [availableOutstandingOrders, selectedBillIds]);

  // Total Stock Valuation
  const totalStockValuation = useMemo(() => {
    return stockItems.reduce((sum, i) => sum + i.valuationTotal, 0);
  }, [stockItems]);

  // Submit New Handover Request
  const handleSubmitNewTransfer = () => {
    if (!targetDistributorName.trim()) {
      setFormError('Please enter Target Distributor Name before submitting.');
      setActiveStep(1);
      return;
    }
    setFormError(null);

    const billsPayload: TransferredBillItem[] = availableOutstandingOrders
      .filter((o) => selectedBillIds.includes(o.id))
      .map((o) => {
        const cust = customers.find((c) => c.id === o.customerId);
        return {
          invoiceId: o.id,
          invoiceNumber: o.orderNumber || o.id,
          customerCode: o.customerCode || cust?.customerCode || 'DL-CUST',
          companyName: o.customerName || cust?.companyName || 'Retail Dealer',
          originalInvoiceDate: (o.orderDate || o.createdAt || '').slice(0, 10),
          originalAmount: o.totalAmount || 0,
          paidAmount: 0,
          outstandingAmount: o.totalAmount || 0,
          transferredAmount: o.totalAmount || 0,
          notes: `Transferred to ${targetDistributorName}`,
        };
      });

    const newReq = createDistributorTransfer({
      transferType,
      sourceDistributorId: 'dist-source-01',
      sourceDistributorName,
      targetDistributorId: `dist-target-${Date.now()}`,
      targetDistributorName,
      region: selectedRegion,
      towns: selectedTown === 'All Towns' ? ['Peshawar', 'Nowshera'] : [selectedTown],
      transferredDealerIds: selectedDealerIds,
      transferredDealersCount: selectedDealerIds.length,
      bills: billsPayload,
      totalTransferredReceivables: totalReceivablesValuation,
      stockItems,
      totalStockValuation,
      effectiveDate: new Date().toISOString().slice(0, 10),
      reason: reasonNotes || 'Market handover & territory realignment',
      initiatedBy: currentUser.fullName,
      initiatedAt: new Date().toISOString(),
    });

    setTransfers(getStoredDistributorTransfers());
    setIsModalOpen(false);
    setActiveStep(1);
    setSelectedDealerIds([]);
    setSelectedBillIds([]);
    setStockItems([]);
    setTargetDistributorName('');
    setReasonNotes('');

    if (onToastMessage) {
      onToastMessage(
        `✓ Distributor Handover Request #${newReq.transferNumber} submitted for Shahzad Ullah's review.`
      );
    }
  };

  // Executive Approval Handler
  const handleApproveTransfer = (transferId: string) => {
    setActionError(null);
    try {
      const res = approveDistributorTransfer(transferId, currentUser.email, currentUser);
      setTransfers(getStoredDistributorTransfers());

      if (res.request && onUpdateCustomers) {
        // Apply dealer reassignments if dealers were selected
        const updatedCusts = customers.map((c) => {
          if (res.request.transferredDealerIds.includes(c.id)) {
            return {
              ...c,
              assignedDistributorName: res.request.targetDistributorName,
            };
          }
          return c;
        });
        onUpdateCustomers(updatedCusts);
      }

      if (onToastMessage) {
        onToastMessage(res.message);
      }
    } catch (err: any) {
      setActionError(`Approval Error: ${err?.message || err}`);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {actionError && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-between gap-2"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-500 hover:text-rose-700 px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* 1. Header Banner & Action Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-800 text-white flex items-center justify-center shadow-sm shrink-0">
            <ArrowRightLeft className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Distributor Replacement &amp; Market Handover Engine
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Enterprise Module
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Territory splits, market bill transfers, stock handovers &amp; executive approvals
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-lg bg-[#0052FF] hover:bg-[#003ECC] text-white font-semibold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Handover Request</span>
        </button>
      </div>

      {/* 2. Filters & Status Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs w-full sm:w-auto">
            {(['ALL', 'PENDING', 'APPROVED', 'COMPLETED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-[11px] ${
                  statusFilter === tab
                    ? 'bg-white dark:bg-slate-700 text-teal-900 dark:text-teal-200 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {tab === 'ALL'
                  ? `All Transfers (${transfers.length})`
                  : tab === 'PENDING'
                  ? 'Pending Review'
                  : tab === 'APPROVED'
                  ? 'Approved'
                  : 'Completed'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transfer #, distributor, town..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold outline-none focus:border-teal-600"
            />
          </div>
        </div>
      </div>

      {/* 3. Transfer Records List */}
      <div className="space-y-3">
        {filteredTransfers.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center text-slate-400 border border-slate-200 dark:border-slate-800 space-y-2">
            <ArrowRightLeft className="w-8 h-8 mx-auto opacity-40 text-slate-500" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No distributor transfer records found</p>
            <p className="text-xs">Click &quot;+ New Handover Request&quot; to initiate a market transfer or territory split.</p>
          </div>
        ) : (
          filteredTransfers.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-500 transition-all space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-xl text-xs font-black font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {req.transferNumber}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    {req.transferType.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Effective: {req.effectiveDate}
                  </span>
                </div>

                {/* Status Badge & Actions */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      req.status === 'APPROVED' || req.status === 'COMPLETED'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : req.status === 'REJECTED'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {req.status}
                  </span>

                  {isShahzad && req.status === 'SUBMITTED' && (
                    <button
                      type="button"
                      onClick={() => handleApproveTransfer(req.id)}
                      className="px-3 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Source & Target Distributor Flow Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Source Distributor (Relinquishing)
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white block mt-0.5">
                    {req.sourceDistributorName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Target Distributor (Receiving)
                  </span>
                  <span className="text-xs font-black text-teal-800 dark:text-teal-300 block mt-0.5">
                    {req.targetDistributorName}
                  </span>
                </div>
              </div>

              {/* Metrics Ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Transferred Dealers</span>
                  <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                    {req.transferredDealersCount} Shops
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Receivables Transferred</span>
                  <span className="text-sm font-black font-mono text-teal-800 dark:text-teal-200">
                    Rs. {req.totalTransferredReceivables.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">Stock Valuation</span>
                  <span className="text-sm font-black font-mono text-emerald-800 dark:text-emerald-300">
                    Rs. {req.totalStockValuation.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Reason & Sign-off footer */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Reason: {req.reason}</span>
                <span className="font-bold text-teal-800 dark:text-teal-300">
                  Executive Approver: {req.executiveApprovedBy || 'Awaiting Shahzad Ullah'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. NEW HANDOVER REQUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Initiate Distributor Replacement &amp; Market Handover
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Step {activeStep} of 4 &bull; Preserves historical invoices &amp; double-entry ledger rules
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Close handover modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Step 1: Handover Type & Target Distributor */}
            {activeStep === 1 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                    Select Handover Mode
                  </label>
                  <select
                    value={transferType}
                    onChange={(e) => setTransferType(e.target.value as any)}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs"
                  >
                    <option value="TERRITORY_SPLIT">Territory Split (e.g. 60/40 Market Split)</option>
                    <option value="COMPLETE_REPLACEMENT">Complete Distributor Replacement</option>
                    <option value="MARKET_BILLS_HANDOVER">Market Receivables Bills Transfer</option>
                    <option value="STOCK_TRANSFER">Physical Stock Transfer Only</option>
                    <option value="COMBINED_HANDOVER">Combined Market &amp; Stock Handover</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Source Distributor (Relinquishing)
                    </label>
                    <input
                      type="text"
                      value={sourceDistributorName}
                      onChange={(e) => setSourceDistributorName(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Target Distributor (Receiving) *
                    </label>
                    <input
                      type="text"
                      value={targetDistributorName}
                      onChange={(e) => setTargetDistributorName(e.target.value)}
                      placeholder="e.g. Nowshera Prime Traders"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-xs text-teal-800 dark:text-teal-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Handover Notes &amp; Reason
                  </label>
                  <textarea
                    value={reasonNotes}
                    onChange={(e) => setReasonNotes(e.target.value)}
                    placeholder="Enter reason for market handover or territory realignment..."
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold h-20"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Interactive Territory Split & Dealer Selection */}
            {activeStep === 2 && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 dark:text-white">
                    Select Shops to Reassign ({selectedDealerIds.length} Selected)
                  </span>
                  <span className="text-[11px] text-teal-800 dark:text-teal-300 font-bold">
                    Checkboxes preserve historical ledger invoices
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 border border-slate-100 dark:border-slate-800 rounded-2xl p-2">
                  {customers.map((c) => {
                    const isSelected = selectedDealerIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleDealerSelection(c.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-teal-800"
                          />
                          <div>
                            <span className="font-bold block">{c.companyName}</span>
                            <span className="text-[10px] text-slate-400">
                              {c.customerCode} &bull; {c.town || c.city}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs">
                          Rs. {(c.currentBalance ?? c.openingBalance ?? 0).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Market Receivables Bills Transfer */}
            {activeStep === 3 && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 dark:text-white">
                    Select Outstanding Invoices ({selectedBillIds.length} Bills &bull; Rs. {totalReceivablesValuation.toLocaleString()})
                  </span>
                  <span className="text-[11px] text-slate-400">Original invoice # preserved</span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 border border-slate-100 dark:border-slate-800 rounded-2xl p-2">
                  {availableOutstandingOrders.map((o) => {
                    const isSelected = selectedBillIds.includes(o.id);
                    return (
                      <div
                        key={o.id}
                        onClick={() => toggleBillSelection(o.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-emerald-700"
                          />
                          <div>
                            <span className="font-bold block">Invoice #{o.orderNumber || o.id}</span>
                            <span className="text-[10px] text-slate-400">
                              Dealer: {o.customerName} &bull; Date: {(o.orderDate || o.createdAt || '').slice(0, 10)}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-xs">
                          Rs. {(o.totalAmount || 0).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Physical Stock Transfer */}
            {activeStep === 4 && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 dark:text-white">
                    Physical Stock Handover ({stockItems.length} SKUs &bull; Rs. {totalStockValuation.toLocaleString()})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedSkuCode}
                    onChange={(e) => setSelectedSkuCode(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  >
                    <option value="">Select SKU Product...</option>
                    {NLINK_OFFICIAL_PRODUCTS.map((sku) => (
                      <option key={sku.skuCode} value={sku.skuCode}>
                        {sku.name} ({sku.skuCode})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={skuCartons}
                    onChange={(e) => setSkuCartons(parseInt(e.target.value) || 1)}
                    placeholder="Cartons"
                    className="w-24 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />

                  <button
                    type="button"
                    onClick={handleAddStockItem}
                    className="px-3 py-2.5 rounded-xl bg-teal-800 text-white font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {stockItems.length > 0 && (
                  <div className="space-y-1 border border-slate-100 dark:border-slate-800 p-2 rounded-2xl">
                    {stockItems.map((item) => (
                      <div key={item.skuCode} className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <span>{item.skuName} ({item.cartons} Cartons = {item.totalPieces} Pcs)</span>
                        <span className="font-mono font-bold">Rs. {item.valuationTotal.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Navigation Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              {activeStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => prev - 1)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs cursor-pointer"
                >
                  &larr; Back
                </button>
              ) : <div />}

              {activeStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => prev + 1)}
                  className="px-4 py-2 rounded-xl bg-teal-800 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitNewTransfer}
                  className="px-5 py-2.5 rounded-lg bg-[#0052FF] hover:bg-[#003ECC] text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors"
                >
                  Submit Handover Request
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
