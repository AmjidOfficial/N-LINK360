/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Department 6: Packing & Loading Management
 * National Lights (Pvt.) Ltd. - Peshawar Head Office
 *
 * Stage Transition: APPROVED -> PACKED (Strict sequence before Department 7 Invoice Generation)
 */

import React, { useState, useMemo } from 'react';
import { PackageCheck, Search, CheckCircle2, ClipboardCheck, X } from 'lucide-react';
import { SalesOrder, InventoryBalance } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';

interface PackingLoadingModuleProps {
  currentUser: NLinkUser;
  orders: SalesOrder[];
  inventoryBalances?: InventoryBalance[];
  onConfirmPacking: (orderId: string, packingRecord: NonNullable<SalesOrder['packingRecord']>) => void;
}

export const PackingLoadingModule: React.FC<PackingLoadingModuleProps> = ({
  currentUser,
  orders,
  inventoryBalances = [],
  onConfirmPacking,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewQueue, setViewQueue] = useState<'AWAITING_PACKING' | 'PACKED_HISTORY'>('AWAITING_PACKING');
  const [activeOrder, setActiveOrder] = useState<SalesOrder | null>(null);
  const [loadingRemarks, setLoadingRemarks] = useState('');
  const [itemQuantities, setItemQuantities] = useState<
    Record<string, { picked: number; packed: number; damaged: number; cartons: number }>
  >({});

  const awaitingOrders = useMemo(() => {
    return orders.filter(
      (o) => (o.status === 'APPROVED' || (o.shahzadApproval === 'APPROVED' && !o.packingRecord && o.status !== 'PACKED' && o.status !== 'INVOICED' && o.status !== 'DISPATCHED' && o.status !== 'DELIVERED' && o.status !== 'REJECTED' && o.status !== 'CANCELLED'))
    );
  }, [orders]);

  const packedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'PACKED' || Boolean(o.packingRecord));
  }, [orders]);

  const list = (viewQueue === 'AWAITING_PACKING' ? awaitingOrders : packedOrders).filter(
    (o) =>
      (o.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openPackingChecklist = (order: SalesOrder) => {
    const initial: Record<string, { picked: number; packed: number; damaged: number; cartons: number }> = {};
    (order.items || []).forEach((it, idx) => {
      const key = it.id || it.skuId || `item-${idx}`;
      const ordered = Number(it.orderedQuantity || it.quantity || 1);
      const cartons = it.cartons || Math.max(1, Math.ceil(ordered / (it.unitsPerCartonSnapshot || 20)));
      initial[key] = { picked: ordered, packed: ordered, damaged: 0, cartons };
    });
    setItemQuantities(initial);
    setLoadingRemarks('');
    setActiveOrder(order);
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    const lineRecords = (activeOrder.items || []).map((it, idx) => {
      const key = it.id || it.skuId || `item-${idx}`;
      const ordered = Number(it.orderedQuantity || it.quantity || 1);
      const q = itemQuantities[key] || { picked: ordered, packed: ordered, damaged: 0, cartons: 1 };
      const packedQty = Math.max(0, Math.min(ordered, q.packed));
      const shortQuantity = Math.max(0, ordered - packedQty);
      return {
        skuId: it.skuId,
        skuCode: it.skuCode,
        skuName: it.skuName,
        orderedQuantity: ordered,
        pickedQuantity: Math.max(0, q.picked),
        packedQuantity: packedQty,
        shortQuantity,
        damagedQuantity: Math.max(0, q.damaged),
        cartons: Math.max(1, q.cartons),
      };
    });

    const totalCartons = lineRecords.reduce((sum, r) => sum + r.cartons, 0) || 1;

    onConfirmPacking(activeOrder.id, {
      packedBy: currentUser.fullName,
      packedAt: new Date().toISOString(),
      totalCartons,
      loadingRemarks: loadingRemarks.trim() || 'Verified & packed for invoicing',
      items: lineRecords,
    });
    setActiveOrder(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Department 6 &middot; Packing &amp; Loading Operations
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Picking, Packing &amp; Loading Verification
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verify warehouse picking and carton counts on approved orders before releasing to Department 7 (Invoice Generation).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewQueue('AWAITING_PACKING')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              viewQueue === 'AWAITING_PACKING'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Ready for Packing ({awaitingOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setViewQueue('PACKED_HISTORY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              viewQueue === 'PACKED_HISTORY'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Packed Orders ({packedOrders.length})
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order # or customer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <CheckCircle2 className="w-9 h-9 mx-auto mb-2 opacity-40 text-emerald-500" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              {viewQueue === 'AWAITING_PACKING' ? 'No approved orders awaiting packing' : 'No packed orders recorded yet'}
            </p>
          </div>
        ) : (
          list.map((order) => (
            <div key={order.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    Order #{order.orderNumber}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                    {order.customerName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Booked by {order.salesUserName} &middot; {order.orderDate || order.createdAt.slice(0, 10)}
                  </div>
                </div>
                <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {order.status}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">
                  SKUs: <strong className="text-slate-900 dark:text-white font-mono">{order.items?.length || 0}</strong>
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  Rs. {(order.netAmount ?? order.totalAmount ?? 0).toLocaleString()}
                </span>
              </div>

              {order.packingRecord && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Packed by <strong>{order.packingRecord.packedBy}</strong> &middot; {order.packingRecord.totalCartons} cartons &middot; {order.packingRecord.loadingRemarks}
                </div>
              )}

              {viewQueue === 'AWAITING_PACKING' && (
                <button
                  type="button"
                  onClick={() => openPackingChecklist(order)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Verify Picking &amp; Mark PACKED</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Picking & Packing Verification Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-xs">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Packing Checklist &middot; Order #{activeOrder.orderNumber}
                </h3>
                <p className="text-slate-500">{activeOrder.customerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirm} className="p-5 space-y-4 overflow-y-auto">
              {(activeOrder.items || []).length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                  Bulk lump-sum order without SKU lines. Confirming will transition Order #{activeOrder.orderNumber} to <strong>PACKED</strong> status for Department 7 Invoicing.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase text-slate-500">
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3 text-center">Ordered</th>
                        <th className="py-2 px-3 text-center">Stock Avail</th>
                        <th className="py-2 px-3 text-center">Packed Qty</th>
                        <th className="py-2 px-3 text-center">Damaged</th>
                        <th className="py-2 px-3 text-center">Cartons</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(activeOrder.items || []).map((it, idx) => {
                        const key = it.id || it.skuId || `item-${idx}`;
                        const ordered = Number(it.orderedQuantity || it.quantity || 1);
                        const q = itemQuantities[key] || { picked: ordered, packed: ordered, damaged: 0, cartons: 1 };
                        const bal = inventoryBalances.find((b) => b.skuId === it.skuId || b.skuCode === it.skuCode);
                        const avail = bal ? bal.availableQuantity : 0;
                        return (
                          <tr key={key}>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-900 dark:text-white">{it.skuName}</div>
                              <div className="text-[10px] font-mono text-slate-500">{it.skuCode}</div>
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold">{ordered}</td>
                            <td className={`py-2 px-3 text-center font-mono font-bold ${avail < ordered ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {avail}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={ordered}
                                value={q.packed}
                                onChange={(e) =>
                                  setItemQuantities((prev) => ({
                                    ...prev,
                                    [key]: { ...q, picked: Number(e.target.value), packed: Number(e.target.value) },
                                  }))
                                }
                                className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-mono"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                value={q.damaged}
                                onChange={(e) =>
                                  setItemQuantities((prev) => ({
                                    ...prev,
                                    [key]: { ...q, damaged: Number(e.target.value) },
                                  }))
                                }
                                className="w-14 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-mono"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min={1}
                                value={q.cartons}
                                onChange={(e) =>
                                  setItemQuantities((prev) => ({
                                    ...prev,
                                    [key]: { ...q, cartons: Math.max(1, Number(e.target.value)) },
                                  }))
                                }
                                className="w-14 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-mono"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Loading &amp; Supervisor Remarks</label>
                <input
                  type="text"
                  value={loadingRemarks}
                  onChange={(e) => setLoadingRemarks(e.target.value)}
                  placeholder="Carton seal #, bay number, or shortage explanation"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Confirm Packing (Ready for Invoice)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
