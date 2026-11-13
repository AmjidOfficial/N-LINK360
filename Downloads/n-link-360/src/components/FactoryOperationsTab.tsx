import React, { useState } from 'react';
import { SKU, InventoryTransaction, InventoryBalance, Warehouse } from '../types';
import { 
  Building, 
  Plus, 
  ArrowRightLeft, 
  CheckCircle, 
  Clock, 
  Calendar, 
  AlertCircle,
  FileText,
  Boxes,
  Database,
  ArrowUpRight
} from 'lucide-react';

interface FactoryOperationsTabProps {
  skus?: SKU[];
  inventoryBalances?: InventoryBalance[];
  onAddTransaction?: (tx: Partial<InventoryTransaction>) => void;
}

export interface ProductionBatch {
  id: string;
  batchCode: string;
  date: string;
  factoryName: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  quantity: number;
  status: 'PENDING_QA' | 'APPROVED' | 'REJECTED';
}

export interface FactoryTransfer {
  id: string;
  transferCode: string;
  date: string;
  sourceFactory: string;
  destinationWarehouseName: string;
  skuId: string;
  skuCode: string;
  quantity: number;
  status: 'IN_TRANSIT' | 'COMPLETED';
}

export const FactoryOperationsTab: React.FC<FactoryOperationsTabProps> = ({
  skus = [],
  inventoryBalances = [],
  onAddTransaction = (_tx: Partial<InventoryTransaction>) => {}
}) => {
  // Mock corporate structure data
  const factories = ['Lahore Central Plant', 'Faisalabad Industrial Unit'];
  const warehouses = ['Lahore Central Warehouse', 'Multan Transit Warehouse', 'Rawalpindi Regional Depot'];

  // State
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([
    { id: 'b-1', batchCode: 'BAT-2026-0801', date: '2026-08-15', factoryName: 'Lahore Central Plant', skuId: 'sku-1', skuCode: 'SKU-NL-BLB12-CW', skuName: '12W LED Bulb (Cool Daylight)', quantity: 1500, status: 'APPROVED' },
    { id: 'b-2', batchCode: 'BAT-2026-0802', date: '2026-08-20', factoryName: 'Lahore Central Plant', skuId: 'sku-2', skuCode: 'SKU-NL-BLB18-CW', skuName: '18W LED Bulb (Cool Daylight)', quantity: 2000, status: 'APPROVED' },
    { id: 'b-3', batchCode: 'BAT-2026-0803', date: '2026-08-24', factoryName: 'Faisalabad Industrial Unit', skuId: 'sku-3', skuCode: 'SKU-NL-FLD50-WA', skuName: '50W LED Flood Light (Warm White)', quantity: 500, status: 'PENDING_QA' }
  ]);

  const [transfers, setTransfers] = useState<FactoryTransfer[]>([
    { id: 't-1', transferCode: 'TRF-2026-001', date: '2026-08-18', sourceFactory: 'Lahore Central Plant', destinationWarehouseName: 'Lahore Central Warehouse', skuId: 'sku-1', skuCode: 'SKU-NL-BLB12-CW', quantity: 1000, status: 'COMPLETED' },
    { id: 't-2', transferCode: 'TRF-2026-002', date: '2026-08-22', sourceFactory: 'Lahore Central Plant', destinationWarehouseName: 'Lahore Central Warehouse', skuId: 'sku-2', skuCode: 'SKU-NL-BLB18-CW', quantity: 1500, status: 'COMPLETED' }
  ]);

  // Form states
  const [showProdModal, setShowProdModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [formFactory, setFormFactory] = useState(factories[0]);
  const [formSkuId, setFormSkuId] = useState(skus[0]?.id || '');
  const [formQty, setFormQty] = useState(500);
  const [formQA, setFormQA] = useState<'PENDING_QA' | 'APPROVED'>('APPROVED');

  const [formTransferSource, setFormTransferSource] = useState(factories[0]);
  const [formTransferDest, setFormTransferDest] = useState(warehouses[0]);
  const [formTransferSkuId, setFormTransferSkuId] = useState(skus[0]?.id || '');
  const [formTransferQty, setFormTransferQty] = useState(200);

  // Derived Factory Stocks (Simulated Finished Goods before Transfer)
  const factoryStocks = skus.map(sku => {
    // Total produced (Approved) - Total transferred
    const approvedProduced = productionBatches
      .filter(p => p.skuId === sku.id && p.status === 'APPROVED')
      .reduce((sum, p) => sum + p.quantity, 0);

    const transferred = transfers
      .filter(t => t.skuId === sku.id)
      .reduce((sum, t) => sum + t.quantity, 0);

    const currentFG = Math.max(0, approvedProduced - transferred);
    return {
      skuId: sku.id,
      skuCode: sku.skuCode,
      name: sku.name,
      currentFG
    };
  });

  const handleProductionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sku = skus.find(s => s.id === formSkuId);
    if (!sku) return;

    const newBatch: ProductionBatch = {
      id: `batch-${Date.now()}`,
      batchCode: `BAT-2026-${String(productionBatches.length + 1).padStart(4, '0')}`,
      date: new Date().toISOString().split('T')[0],
      factoryName: formFactory,
      skuId: formSkuId,
      skuCode: sku.skuCode,
      skuName: sku.name,
      quantity: formQty,
      status: formQA
    };

    setProductionBatches([newBatch, ...productionBatches]);

    // If approved immediately, it adds to Factory inventory!
    if (newBatch.status === 'APPROVED') {
      onAddTransaction({
        transactionType: 'PRODUCTION_IN',
        skuId: formSkuId,
        quantity: formQty,
        notes: `Production output Batch: ${newBatch.batchCode} at ${formFactory}`,
        referenceModule: 'FACTORY_PRODUCTION',
        referenceId: newBatch.id
      });
    }

    setShowProdModal(false);
  };

  const handleQAApproval = (batchId: string) => {
    setProductionBatches(prev => prev.map(p => {
      if (p.id === batchId && p.status === 'PENDING_QA') {
        // Post transaction for approved stock
        onAddTransaction({
          transactionType: 'PRODUCTION_IN',
          skuId: p.skuId,
          quantity: p.quantity,
          notes: `Batch ${p.batchCode} passed Quality Assurance. Added to FG stock.`,
          referenceModule: 'FACTORY_PRODUCTION',
          referenceId: p.id
        });
        return { ...p, status: 'APPROVED' };
      }
      return p;
    }));
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sku = skus.find(s => s.id === formTransferSkuId);
    if (!sku) return;

    const fg = factoryStocks.find(f => f.skuId === formTransferSkuId)?.currentFG || 0;
    if (formTransferQty > fg) {
      alert(`Transfer failed: Insufficient Factory Finished Goods stock. Requested: ${formTransferQty}, Available: ${fg}`);
      return;
    }

    const newTransfer: FactoryTransfer = {
      id: `trf-${Date.now()}`,
      transferCode: `TRF-2026-${String(transfers.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      sourceFactory: formTransferSource,
      destinationWarehouseName: formTransferDest,
      skuId: formTransferSkuId,
      skuCode: sku.skuCode,
      quantity: formTransferQty,
      status: 'COMPLETED'
    };

    setTransfers([newTransfer, ...transfers]);

    // Create dual-leg inventory transaction or single stock-in in warehouse
    // Since warehouse is our central inventory balance, transfer from Factory to Warehouse
    // INCREASES Warehouse inventory!
    onAddTransaction({
      transactionType: 'TRANSFER_IN',
      skuId: formTransferSkuId,
      quantity: formTransferQty,
      notes: `Finished goods transferred from ${formTransferSource} to ${formTransferDest}. Bcode: ${newTransfer.transferCode}`,
      referenceModule: 'FACTORY_TRANSFER',
      referenceId: newTransfer.id
    });

    setShowTransferModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Metrics Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total Batches Logged</span>
            <span className="text-2xl font-bold font-mono text-text-primary mt-1">{productionBatches.length}</span>
            <span className="text-[10px] text-slate-400 block mt-1">MTD Industrial Batches</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Factory FG Stock Available</span>
            <span className="text-2xl font-bold font-mono text-indigo-700 mt-1">
              {factoryStocks.reduce((sum, f) => sum + f.currentFG, 0).toLocaleString()} Pcs
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Awaiting dispatch/transfer</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total Transferred MTD</span>
            <span className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              {transfers.reduce((sum, t) => sum + t.quantity, 0).toLocaleString()} Pcs
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Dispatched to central depots</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-deep-teal">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Factory Stock (FG) Status */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="border-b pb-2">
            <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-600" />
              Finished Goods Stock (At Factory)
            </h3>
            <p className="text-[11px] text-slate-500">Inventory held at manufacturing plants before depot delivery.</p>
          </div>

          <div className="space-y-3">
            {factoryStocks.map(f => (
              <div key={f.skuId} className="p-3 bg-bg-secondary rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px]">
                    {f.skuCode}
                  </span>
                  <span className="font-semibold text-slate-800 block mt-1 truncate max-w-[180px]">{f.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-text-primary block">{f.currentFG.toLocaleString()} Pcs</span>
                  <span className="text-[9px] text-slate-400 font-sans uppercase font-semibold">Held at Plant</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowTransferModal(true)}
              className="w-full py-2 bg-surface-card hover:bg-slate-800 text-deep-teal font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <ArrowRightLeft className="w-4 h-4" /> Transfer to Central Warehouse
            </button>
          </div>
        </div>

        {/* Right Column: Production Logging & Quality Assurance Batches */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-deep-teal" />
                Production Batches & QA Audit
              </h3>
              <p className="text-[11px] text-slate-500">Track and authorize industrial output batches before release.</p>
            </div>
            <button
              onClick={() => setShowProdModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Log Batch
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-secondary text-slate-600 font-bold border-b">
                <tr>
                  <th className="py-2 px-2">Batch Code</th>
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">Factory</th>
                  <th className="py-2 px-2">SKU</th>
                  <th className="py-2 px-2 text-right">Qty Produced</th>
                  <th className="py-2 px-2 text-center">Status</th>
                  <th className="py-2 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {productionBatches.map(b => (
                  <tr key={b.id} className="hover:bg-bg-secondary/50 font-sans text-[11px]">
                    <td className="py-2 px-2 font-mono font-bold text-text-primary">{b.batchCode}</td>
                    <td className="py-2 px-2 text-slate-500 font-mono">{b.date}</td>
                    <td className="py-2 px-2 text-slate-700 font-medium">{b.factoryName}</td>
                    <td className="py-2 px-2 text-indigo-700 font-mono font-semibold">{b.skuCode}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-text-primary">{b.quantity.toLocaleString()} Pcs</td>
                    <td className="py-2 px-2 text-center font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        b.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {b.status === 'PENDING_QA' ? (
                        <button
                          onClick={() => handleQAApproval(b.id)}
                          className="px-2 py-1 bg-secondary hover:bg-deep-teal text-white font-bold text-[10px] rounded transition-colors"
                        >
                          Approve QA
                        </button>
                      ) : (
                        <span className="text-deep-teal text-[10px] font-semibold flex items-center justify-center gap-0.5 font-sans">
                          ✓ QA Pass
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 2. Factory-to-Warehouse Transfers History Log */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="border-b pb-2">
          <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
            <ArrowRightLeft className="w-4 h-4 text-deep-teal" />
            Depot Delivery & Transfers History
          </h3>
          <p className="text-xs text-slate-500">Audit trail of finished goods dispatched to central storage depots.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-secondary text-slate-600 font-bold border-b">
              <tr>
                <th className="py-2 px-3">Transfer Code</th>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Source Plant</th>
                <th className="py-2 px-3">Destination Depot</th>
                <th className="py-2 px-3">SKU</th>
                <th className="py-2 px-3 text-right">Transfer Qty</th>
                <th className="py-2 px-3 text-center">Logistics Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {transfers.map(t => (
                <tr key={t.id} className="hover:bg-bg-secondary/50 font-sans">
                  <td className="py-2.5 px-3 font-mono font-bold text-text-primary">{t.transferCode}</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">{t.date}</td>
                  <td className="py-2.5 px-3 text-slate-700">{t.sourceFactory}</td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">{t.destinationWarehouseName}</td>
                  <td className="py-2.5 px-3 text-indigo-700 font-mono font-bold">{t.skuCode}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-text-primary">{t.quantity.toLocaleString()} Pcs</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Modals */}
      {showProdModal && (
        <div className="fixed inset-0 bg-surface-card/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-primary text-deep-green hover:bg-primary/90 px-6 py-4 flex justify-between items-center">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Boxes className="w-5 h-5 text-deep-teal" /> Log Factory Production Output
              </h3>
              <button onClick={() => setShowProdModal(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>
            <form onSubmit={handleProductionSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Manufacturing Plant*</label>
                <select
                  value={formFactory}
                  onChange={(e) => setFormFactory(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  {factories.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Target Product SKU*</label>
                <select
                  value={formSkuId}
                  onChange={(e) => setFormSkuId(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  {skus.map(s => (
                    <option key={s.id} value={s.id}>[{s.skuCode}] {s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Quantity Produced (Units)*</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formQty}
                  onChange={(e) => setFormQty(Math.max(1, parseInt(e.target.value) || 100))}
                  className="w-full p-2 border rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Quality Assurance Inspection Status</label>
                <select
                  value={formQA}
                  onChange={(e) => setFormQA(e.target.value as any)}
                  className="w-full p-2 border rounded-lg font-semibold text-indigo-700 bg-indigo-50"
                >
                  <option value="APPROVED">PASSED & APPROVED (Add to Stock)</option>
                  <option value="PENDING_QA">PENDING QA AUDIT</option>
                </select>
              </div>

              <div className="pt-3 flex gap-2 border-t">
                <button type="button" onClick={() => setShowProdModal(false)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-surface-card hover:bg-slate-800 text-deep-teal font-bold rounded-lg shadow">Post Batch Output</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 bg-surface-card/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-primary text-deep-green hover:bg-primary/90 px-6 py-4 flex justify-between items-center">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-deep-teal" /> Dispatch FG to Depot
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>
            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Source Plant*</label>
                <select
                  value={formTransferSource}
                  onChange={(e) => setFormTransferSource(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  {factories.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Destination Central Depot/Warehouse*</label>
                <select
                  value={formTransferDest}
                  onChange={(e) => setFormTransferDest(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  {warehouses.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Select SKU to Transfer*</label>
                <select
                  value={formTransferSkuId}
                  onChange={(e) => setFormTransferSkuId(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  {skus.map(s => {
                    const fg = factoryStocks.find(f => f.skuId === s.id)?.currentFG || 0;
                    return (
                      <option key={s.id} value={s.id}>
                        [{s.skuCode}] {s.name} (FG: {fg} Pcs available)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Transfer Quantity (Units)*</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formTransferQty}
                  onChange={(e) => setFormTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2 border rounded-lg font-mono font-bold"
                />
              </div>

              <div className="pt-3 flex gap-2 border-t">
                <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-surface-card hover:bg-slate-800 text-deep-teal font-bold rounded-lg shadow">Confirm Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
