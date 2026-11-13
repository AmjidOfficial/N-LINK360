/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Department 5: Inventory & Warehouse Management
 * National Lights (Pvt.) Ltd. - Peshawar Head Office
 */

import React, { useState, useMemo } from 'react';
import { PackageCheck, Search, PlusCircle, AlertTriangle, X, ArrowUpDown, ClipboardList } from 'lucide-react';
import { InventoryBalance, InventoryTransaction, InventoryTransactionType } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';

interface StockAdjustmentPayload {
  skuId: string;
  skuCode: string;
  skuName: string;
  transactionType: InventoryTransactionType;
  quantity: number;
  warehouseName: string;
  referenceId: string;
  notes: string;
}

interface InventoryWarehouseModuleProps {
  currentUser: NLinkUser;
  inventoryBalances: InventoryBalance[];
  inventoryTransactions?: InventoryTransaction[];
  onStockAdjustment?: (payload: StockAdjustmentPayload) => void;
}

export const InventoryWarehouseModule: React.FC<InventoryWarehouseModuleProps> = ({
  inventoryBalances,
  inventoryTransactions = [],
  onStockAdjustment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subTab, setSubTab] = useState<'STOCK' | 'TRANSACTIONS'>('STOCK');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW_STOCK' | 'DAMAGED'>('ALL');
  const [adjustModal, setAdjustModal] = useState<InventoryBalance | null>(null);
  const [txType, setTxType] = useState<InventoryTransactionType>('PRODUCTION_IN');
  const [qtyInput, setQtyInput] = useState('100');
  const [warehouseName, setWarehouseName] = useState('Central Peshawar Warehouse');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');

  const filteredBalances = useMemo(() => {
    return inventoryBalances.filter((bal) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (bal.skuName || '').toLowerCase().includes(q) ||
        (bal.skuCode || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (stockFilter === 'LOW_STOCK') return (bal.availableQuantity ?? 0) < 100;
      if (stockFilter === 'DAMAGED') return (bal.quantityDamaged ?? 0) > 0;
      return true;
    });
  }, [inventoryBalances, searchQuery, stockFilter]);

  const metrics = useMemo(() => {
    let totalOnHand = 0;
    let totalReserved = 0;
    let totalDamaged = 0;
    let lowStockCount = 0;
    inventoryBalances.forEach((b) => {
      totalOnHand += b.quantityOnHand || 0;
      totalReserved += b.quantityReserved || 0;
      totalDamaged += b.quantityDamaged || 0;
      if ((b.availableQuantity ?? 0) < 100) lowStockCount += 1;
    });
    return { totalOnHand, totalReserved, totalDamaged, lowStockCount };
  }, [inventoryBalances]);

  const handleOpenAdjust = (bal: InventoryBalance) => {
    setAdjustModal(bal);
    setTxType('PRODUCTION_IN');
    setQtyInput('100');
    setWarehouseName(bal.warehouseName || 'Central Peshawar Warehouse');
    setReferenceId(`ADJ-${Date.now().toString().slice(-6)}`);
    setNotes('');
  };

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal || !onStockAdjustment) return;
    const qty = Math.max(1, parseInt(qtyInput, 10) || 0);
    if (!qty) return;

    onStockAdjustment({
      skuId: adjustModal.skuId,
      skuCode: adjustModal.skuCode || adjustModal.skuId,
      skuName: adjustModal.skuName || 'SKU Item',
      transactionType: txType,
      quantity: qty,
      warehouseName,
      referenceId: referenceId.trim() || `STK-${Date.now().toString().slice(-5)}`,
      notes: notes.trim() || `${txType.replace(/_/g, ' ')} recorded via Warehouse Module`,
    });
    setAdjustModal(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Department 5 &middot; Inventory &amp; Warehouse Control
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Warehouse Stock Ledger &amp; Movements
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Live SKU stock balances, production inflows, damage write-offs, and invoice deductions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('STOCK')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              subTab === 'STOCK'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Stock Balances ({inventoryBalances.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('TRANSACTIONS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              subTab === 'TRANSACTIONS'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Movement Log ({inventoryTransactions.length})
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 font-semibold block">Total Units On Hand</span>
          <span className="text-xl font-black font-mono tabular-nums text-slate-900 dark:text-white mt-1 block">
            {metrics.totalOnHand.toLocaleString()}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 font-semibold block">Reserved / Packed</span>
          <span className="text-xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1 block">
            {metrics.totalReserved.toLocaleString()}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 font-semibold block">Damaged Units</span>
          <span className="text-xl font-black font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1 block">
            {metrics.totalDamaged.toLocaleString()}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 font-semibold block">Low Stock SKUs (&lt;100)</span>
          <span className="text-xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1 block">
            {metrics.lowStockCount}
          </span>
        </div>
      </div>

      {subTab === 'STOCK' ? (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKUs by name or code..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              {(['ALL', 'LOW_STOCK', 'DAMAGED'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStockFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                    stockFilter === f
                      ? 'bg-[#0B132B] dark:bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {f === 'ALL' ? 'All SKUs' : f === 'LOW_STOCK' ? 'Low Stock' : 'Has Damaged'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">SKU / Product</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4 text-center">Available</th>
                    <th className="py-3 px-4 text-center">Reserved</th>
                    <th className="py-3 px-4 text-center">Damaged</th>
                    <th className="py-3 px-4 text-right">On Hand</th>
                    {onStockAdjustment && <th className="py-3 px-4 text-right">Stock Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200">
                  {filteredBalances.length === 0 ? (
                    <tr>
                      <td colSpan={onStockAdjustment ? 7 : 6} className="text-center py-12 text-slate-400">
                        No inventory data matches the filter.
                      </td>
                    </tr>
                  ) : (
                    filteredBalances.map((bal) => {
                      const isLow = (bal.availableQuantity ?? 0) < 100;
                      return (
                        <tr key={bal.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{bal.skuName}</span>
                              {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{bal.skuCode}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {bal.warehouseName || 'Central Peshawar Warehouse'}
                          </td>
                          <td className={`py-3 px-4 text-center font-mono tabular-nums font-bold ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {bal.availableQuantity.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center font-mono tabular-nums text-amber-600 dark:text-amber-400">
                            {bal.quantityReserved.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center font-mono tabular-nums text-rose-600 dark:text-rose-400">
                            {bal.quantityDamaged.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                            {bal.quantityOnHand.toLocaleString()}
                          </td>
                          {onStockAdjustment && (
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenAdjust(bal)}
                                className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowUpDown className="w-3.5 h-3.5" />
                                <span>Adjust / Inward</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Date &amp; Ref</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inventoryTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No stock transactions recorded yet in this session.
                    </td>
                  </tr>
                ) : (
                  inventoryTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        <div>{tx.transactionNumber}</div>
                        <div>{tx.createdAt.slice(0, 16).replace('T', ' ')}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {tx.transactionType}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{tx.skuName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{tx.skuCode}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {tx.warehouseName || tx.warehouseId}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${tx.quantity >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.quantity >= 0 ? `+${tx.quantity}` : tx.quantity}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {tx.notes || tx.referenceId}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Stock Movement Entry</h3>
                <p className="text-slate-500 font-mono">{adjustModal.skuCode} &middot; {adjustModal.skuName}</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="space-y-3">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Movement Type</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as InventoryTransactionType)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="PRODUCTION_IN">PRODUCTION IN (+ Stock Received)</option>
                  <option value="ADJUSTMENT_IN">ADJUSTMENT IN (+ Audit Surplus)</option>
                  <option value="RETURN_IN">RETURN IN (+ Dealer Return)</option>
                  <option value="DAMAGE_OUT">DAMAGE WRITE-OFF (Move to Damaged)</option>
                  <option value="ADJUSTMENT_OUT">ADJUSTMENT OUT (- Audit Deficit)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Quantity (Pieces)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Reference / Batch #</label>
                  <input
                    type="text"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Warehouse</label>
                <select
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Central Peshawar Warehouse">Central Peshawar Warehouse</option>
                  <option value="Rawalpindi Regional Depot">Rawalpindi Regional Depot</option>
                  <option value="Lahore Logistics Terminal">Lahore Logistics Terminal</option>
                  <option value="Multan Transit Hub">Multan Transit Hub</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Production batch, physical audit or damage note"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post Stock Movement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
