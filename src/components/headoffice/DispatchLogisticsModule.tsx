/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Department 8: Dispatch & Logistics Management
 * National Lights (Pvt.) Ltd. - Peshawar Head Office
 *
 * Stage Transitions:
 * 1. Ready for Dispatch (INVOICED) -> DISPATCHED (assign warehouse, transporter, vehicle, driver, bilty)
 * 2. In Transit (DISPATCHED / IN_TRANSIT) -> DELIVERED / PARTIALLY_DELIVERED (POD receiver & shortage/damage log)
 */

import React, { useState, useMemo } from 'react';
import { Truck, Search, CheckCircle2, MapPin, PackageCheck, X } from 'lucide-react';
import { SalesOrder } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';

interface DispatchLogisticsModuleProps {
  currentUser: NLinkUser;
  orders: SalesOrder[];
  onAssignDispatch: (
    orderId: string,
    payload: {
      warehouseName: string;
      transporterName: string;
      vehicleNumber: string;
      driverName: string;
      driverPhone: string;
      bilityNumber: string;
      dispatchNoteNumber: string;
    }
  ) => void;
  onConfirmDelivery: (
    orderId: string,
    payload: {
      status: 'DELIVERED' | 'PARTIALLY_DELIVERED';
      deliveryReceiverName: string;
      deliveryNotes: string;
      shortageReported?: number;
      damageReported?: number;
    }
  ) => void;
}

export const DispatchLogisticsModule: React.FC<DispatchLogisticsModuleProps> = ({
  orders,
  onAssignDispatch,
  onConfirmDelivery,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [queueTab, setQueueTab] = useState<'READY_TO_DISPATCH' | 'IN_TRANSIT' | 'DELIVERED'>('READY_TO_DISPATCH');

  // Dispatch modal
  const [dispatchOrder, setDispatchOrder] = useState<SalesOrder | null>(null);
  const [warehouseName, setWarehouseName] = useState('Central Peshawar Warehouse');
  const [transporterName, setTransporterName] = useState('National Lights Express Fleet');
  const [vehicleNumber, setVehicleNumber] = useState('PRL-7821');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('+92 300 ');
  const [bilityNumber, setBilityNumber] = useState('');
  const [dispatchNoteNumber, setDispatchNoteNumber] = useState('');

  // Delivery POD modal
  const [podOrder, setPodOrder] = useState<SalesOrder | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<'DELIVERED' | 'PARTIALLY_DELIVERED'>('DELIVERED');
  const [receiverName, setReceiverName] = useState('');
  const [shortageReported, setShortageReported] = useState('0');
  const [damageReported, setDamageReported] = useState('0');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const readyToDispatch = useMemo(() => orders.filter((o) => o.status === 'INVOICED'), [orders]);
  const inTransit = useMemo(() => orders.filter((o) => o.status === 'DISPATCHED' || o.status === 'IN_TRANSIT'), [orders]);
  const delivered = useMemo(() => orders.filter((o) => o.status === 'DELIVERED' || o.status === 'PARTIALLY_DELIVERED'), [orders]);

  const currentList = (
    queueTab === 'READY_TO_DISPATCH' ? readyToDispatch : queueTab === 'IN_TRANSIT' ? inTransit : delivered
  ).filter(
    (o) =>
      (o.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.bilityNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openDispatchModal = (order: SalesOrder) => {
    setDispatchOrder(order);
    setWarehouseName(order.warehouseName || 'Central Peshawar Warehouse');
    setTransporterName(order.transporterName || 'National Lights Express Fleet');
    setVehicleNumber(order.vehicleNumber || 'PRL-7821');
    setDriverName(order.driverName || '');
    setDriverPhone(order.driverPhone || '+92 300 ');
    setBilityNumber(order.bilityNumber || `BIL-${Math.floor(10000 + Math.random() * 89999)}`);
    setDispatchNoteNumber(order.dispatchNoteNumber || `DN-2026-${Math.floor(1000 + Math.random() * 8999)}`);
  };

  const handleSubmitDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder) return;
    onAssignDispatch(dispatchOrder.id, {
      warehouseName,
      transporterName,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      driverName: driverName.trim() || 'Fleet Driver',
      driverPhone: driverPhone.trim(),
      bilityNumber: bilityNumber.trim().toUpperCase(),
      dispatchNoteNumber: dispatchNoteNumber.trim().toUpperCase(),
    });
    setDispatchOrder(null);
  };

  const openPodModal = (order: SalesOrder) => {
    setPodOrder(order);
    setDeliveryStatus('DELIVERED');
    setReceiverName(order.customerName);
    setShortageReported('0');
    setDamageReported('0');
    setDeliveryNotes('');
  };

  const handleSubmitPod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!podOrder) return;
    onConfirmDelivery(podOrder.id, {
      status: deliveryStatus,
      deliveryReceiverName: receiverName.trim() || 'Dealer Representative',
      deliveryNotes: deliveryNotes.trim() || 'Goods received cleanly',
      shortageReported: Math.max(0, Number(shortageReported) || 0),
      damageReported: Math.max(0, Number(damageReported) || 0),
    });
    setPodOrder(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Department 8 &middot; Dispatch &amp; Logistics
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Transporter Assignment, Bilty &amp; Proof of Delivery
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dispatch invoiced consignments, record transporter &amp; bilty numbers, and close POD delivery confirmations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setQueueTab('READY_TO_DISPATCH')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              queueTab === 'READY_TO_DISPATCH'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Ready to Dispatch ({readyToDispatch.length})
          </button>
          <button
            type="button"
            onClick={() => setQueueTab('IN_TRANSIT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              queueTab === 'IN_TRANSIT'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            In Transit ({inTransit.length})
          </button>
          <button
            type="button"
            onClick={() => setQueueTab('DELIVERED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              queueTab === 'DELIVERED'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Delivered ({delivered.length})
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
            placeholder="Search order #, invoice #, bilty, dealer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {currentList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <CheckCircle2 className="w-9 h-9 mx-auto mb-2 opacity-40 text-emerald-500" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No consignments in this logistics stage.</p>
          </div>
        ) : (
          currentList.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {order.invoiceNumber ? `${order.invoiceNumber} · ` : ''}Order #{order.orderNumber}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {order.status}
                  </span>
                </div>
                <div className="text-slate-700 dark:text-slate-300 font-semibold">
                  {order.customerName} &middot; Destination: {order.customerTown || order.town || 'Commercial Market'}
                </div>
                {order.dispatchNoteNumber && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    DN: {order.dispatchNoteNumber} &middot; Bilty: {order.bilityNumber || '-'} &middot; {order.transporterName} ({order.vehicleNumber})
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    Delivered {order.deliveredAt.slice(0, 10)} &middot; Received by: {order.deliveryReceiverName}
                    {order.shortageReported ? ` · Shortage: ${order.shortageReported}` : ''}
                    {order.damageReported ? ` · Damage: ${order.damageReported}` : ''}
                  </div>
                )}
              </div>

              <div className="shrink-0">
                {queueTab === 'READY_TO_DISPATCH' && (
                  <button
                    type="button"
                    onClick={() => openDispatchModal(order)}
                    className="btn-primary py-2.5 px-5 rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Assign Transport &amp; Dispatch</span>
                  </button>
                )}
                {queueTab === 'IN_TRANSIT' && (
                  <button
                    type="button"
                    onClick={() => openPodModal(order)}
                    className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Confirm Delivery (POD)</span>
                  </button>
                )}
                {queueTab === 'DELIVERED' && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <PackageCheck className="w-4 h-4" />
                    <span>{order.status}</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assign Dispatch Modal */}
      {dispatchOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Dispatch Consignment &middot; #{dispatchOrder.orderNumber}
                </h3>
                <p className="text-slate-500">{dispatchOrder.customerName}</p>
              </div>
              <button type="button" onClick={() => setDispatchOrder(null)} className="p-1.5 rounded-lg text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDispatch} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Dispatch Note #</label>
                  <input
                    type="text"
                    required
                    value={dispatchNoteNumber}
                    onChange={(e) => setDispatchNoteNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Bilty #</label>
                  <input
                    type="text"
                    required
                    value={bilityNumber}
                    onChange={(e) => setBilityNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Warehouse</label>
                  <select
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Central Peshawar Warehouse">Central Peshawar Warehouse</option>
                    <option value="Rawalpindi Regional Depot">Rawalpindi Regional Depot</option>
                    <option value="Lahore Logistics Terminal">Lahore Logistics Terminal</option>
                    <option value="Multan Transit Hub">Multan Transit Hub</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Transporter / Adda</label>
                  <input
                    type="text"
                    required
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Vehicle #</label>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono uppercase text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Driver Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver full name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Driver Phone</label>
                  <input
                    type="tel"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setDispatchOrder(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer">
                  <Truck className="w-4 h-4" />
                  <span>Confirm Dispatch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POD Delivery Confirmation Modal */}
      {podOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Proof of Delivery &middot; #{podOrder.orderNumber}
                </h3>
                <p className="text-slate-500">{podOrder.customerName}</p>
              </div>
              <button type="button" onClick={() => setPodOrder(null)} className="p-1.5 rounded-lg text-slate-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPod} className="space-y-3">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Delivery Outcome</label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value as 'DELIVERED' | 'PARTIALLY_DELIVERED')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                >
                  <option value="DELIVERED">DELIVERED (Full Receipt)</option>
                  <option value="PARTIALLY_DELIVERED">PARTIALLY DELIVERED (Shortage / Damage)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Receiver Name</label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {deliveryStatus === 'PARTIALLY_DELIVERED' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Shortage (Pcs)</label>
                    <input
                      type="number"
                      min={0}
                      value={shortageReported}
                      onChange={(e) => setShortageReported(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">Damaged (Pcs)</label>
                    <input
                      type="number"
                      min={0}
                      value={damageReported}
                      onChange={(e) => setDamageReported(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">POD Remarks</label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Signed receipt / delivery confirmation notes"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setPodOrder(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm POD</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
