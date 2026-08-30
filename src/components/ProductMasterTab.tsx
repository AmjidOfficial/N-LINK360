/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Unified Product & SKU Master Architecture
 * Packaging Simulator & Immutable SKU Versioning Engine
 */

import React, { useState } from 'react';
import { SKU, SKUVersion } from '../types';
import { 
  formatPackaging, 
  unitsToCartonsAndPacks, 
  cartonsAndPacksToUnits 
} from '../lib/product-conversion';
import { 
  Package, 
  Plus, 
  Search, 
  Tag, 
  History,
  CheckCircle, 
  AlertCircle, 
  Layers,
  Calculator,
  Edit2,
  GitCommit,
  Calendar,
  ChevronRight,
  X
} from 'lucide-react';

interface ProductMasterTabProps {
  skus?: SKU[];
  skuVersions?: SKUVersion[];
  onAddSKU?: (newSku: SKU) => void;
  onUpdateSKU?: (sku: SKU) => void;
  onReviseSKU?: (skuId: string, updates: Partial<SKU>, reason: string) => void;
}

export const ProductMasterTab: React.FC<ProductMasterTabProps> = ({
  skus = [],
  skuVersions = [],
  onAddSKU,
  onUpdateSKU,
  onReviseSKU,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'SKU_LIST' | 'SIMULATOR' | 'VERSIONS'>('SKU_LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [selectedSkuForRevision, setSelectedSkuForRevision] = useState<SKU | null>(null);
  const [selectedSkuForAudit, setSelectedSkuForAudit] = useState<SKU | null>(null);
  
  // Interactive Packaging Simulator State
  const [simulatorSkuId, setSimulatorSkuId] = useState<string>(skus?.[0]?.id || '');
  const [simulatorUnits, setSimulatorUnits] = useState<number>(100);
  const [simCartons, setSimCartons] = useState<number>(0);
  const [simPacks, setSimPacks] = useState<number>(0);
  const [simLooseUnits, setSimLooseUnits] = useState<number>(0);
  const [simulationMode, setSimulationMode] = useState<'UNITS_TO_PKG' | 'PKG_TO_UNITS'>('UNITS_TO_PKG');

  // New SKU form state
  const [formSkuCode, setFormSkuCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('National Lights');
  const [formCategory, setFormCategory] = useState('LED Bulbs');
  const [formPackaging, setFormPackaging] = useState('Carton');
  const [formUnitsPerPack, setFormUnitsPerPack] = useState(1);
  const [formPacksPerCarton, setFormPacksPerCarton] = useState(50);
  const [formWeight, setFormWeight] = useState(0.25);
  const [formTradeRate, setFormTradeRate] = useState(300);
  const [formRetailPrice, setFormRetailPrice] = useState(450);
  const [formTax, setFormTax] = useState(18);
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Revision Form State
  const [revTradeRate, setRevTradeRate] = useState<number>(0);
  const [revRetailPrice, setRevRetailPrice] = useState<number>(0);
  const [revPacksPerCarton, setRevPacksPerCarton] = useState<number>(50);
  const [revUnitsPerPack, setRevUnitsPerPack] = useState<number>(1);
  const [revReason, setRevReason] = useState('Raw material price adjustment');

  // Dynamic Brands & Categories
  const brands = Array.from(new Set(skus.map(s => s.brandName || 'National Lights')));
  const categories = Array.from(new Set(skus.map(s => s.categoryName || 'LED Bulbs')));

  const handleAddSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSkuCode || !formName) {
      alert('SKU Code and Name are mandatory.');
      return;
    }

    const newSku: SKU = {
      id: `sku-${Date.now()}`,
      productId: `p-${Date.now()}`,
      productName: formName,
      skuCode: formSkuCode.toUpperCase().trim(),
      name: formName.trim(),
      packagingUnit: formPackaging.toUpperCase(),
      cartonQuantity: formUnitsPerPack * formPacksPerCarton,
      tradePrice: formTradeRate,
      retailPrice: formRetailPrice,
      minimumPrice: Math.round(formTradeRate * 0.95),
      reorderLevel: 250,
      isActive: formStatus === 'ACTIVE',
      brandName: formBrand,
      categoryName: formCategory,
      unitsPerPack: formUnitsPerPack,
      packsPerCarton: formPacksPerCarton,
      weight: formWeight,
      taxRate: formTax,
      status: formStatus
    };

    if (onAddSKU) {
      onAddSKU(newSku);
    }
    setShowAddModal(false);
    setFormSkuCode('');
    setFormName('');
  };

  const handleOpenReviseModal = (sku: SKU) => {
    setSelectedSkuForRevision(sku);
    setRevTradeRate(sku.tradePrice);
    setRevRetailPrice(sku.retailPrice);
    setRevPacksPerCarton(sku.packsPerCarton || 50);
    setRevUnitsPerPack(sku.unitsPerPack || 1);
    setRevReason('Fiscal tariff adjustment');
    setShowReviseModal(true);
  };

  const handleReviseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkuForRevision) return;

    if (onReviseSKU) {
      onReviseSKU(
        selectedSkuForRevision.id,
        {
          tradePrice: revTradeRate,
          retailPrice: revRetailPrice,
          packsPerCarton: revPacksPerCarton,
          unitsPerPack: revUnitsPerPack,
          cartonQuantity: revPacksPerCarton * revUnitsPerPack
        },
        revReason
      );
    }
    setShowReviseModal(false);
  };

  // Filtered list
  const filteredSKUs = skus.filter(sku => {
    const matchesSearch = 
      sku.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.skuCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const skuBrand = sku.brandName || 'National Lights';
    const skuCategory = sku.categoryName || 'LED Bulbs';

    const matchesBrand = selectedBrand === 'ALL' || skuBrand === selectedBrand;
    const matchesCategory = selectedCategory === 'ALL' || skuCategory === selectedCategory;

    return matchesSearch && matchesBrand && matchesCategory;
  });

  const selectedSimSku = skus.find(s => s.id === simulatorSkuId) || skus[0];
  const simUnitsPerPack = selectedSimSku?.unitsPerPack || 1;
  const simPacksPerCarton = selectedSimSku?.packsPerCarton || (selectedSimSku?.cartonQuantity || 50);

  const simBreakdown = selectedSimSku 
    ? unitsToCartonsAndPacks(simulatorUnits, simUnitsPerPack, simPacksPerCarton) 
    : { cartons: 0, packs: 0, units: 0 };

  const calculatedSimUnits = selectedSimSku 
    ? cartonsAndPacksToUnits(simCartons, simPacks, simLooseUnits, simUnitsPerPack, simPacksPerCarton)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-black text-indigo-300 border border-indigo-500/30">
                <Package className="h-3.5 w-3.5" />
                ENTERPRISE PRODUCT MASTER
              </span>
              <span className="text-xs text-slate-400 font-mono">SINGLE SOURCE OF TRUTH</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Unified Product & SKU Master
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Deterministic packaging conversions (Units ⇄ Packs ⇄ Cartons), multi-brand SKU registry, and immutable versioning for rate revisions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 px-4 py-2.5 text-xs font-black shadow-lg shadow-indigo-500/20 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Register New SKU
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
          {[
            { key: 'SKU_LIST', label: 'SKU Directory', icon: Package, count: skus.length },
            { key: 'SIMULATOR', label: 'Packaging Conversion Simulator', icon: Calculator },
            { key: 'VERSIONS', label: 'Price & Version Ledger', icon: History, count: skuVersions.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key as any)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  isActive
                    ? 'bg-white text-slate-900 shadow font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                      isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. SKU DIRECTORY */}
      {activeSubTab === 'SKU_LIST' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="text-xs p-2 border border-slate-200 rounded-xl bg-white font-medium"
              >
                <option value="ALL">All Brands</option>
                {brands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs p-2 border border-slate-200 rounded-xl bg-white font-medium"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredSKUs.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-black text-slate-800">No Product SKUs Found</h3>
              <p className="text-xs text-slate-500">Zero dummy SKUs are created. Register your first production SKU above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">SKU Code & Product</th>
                    <th className="px-4 py-3.5">Brand / Category</th>
                    <th className="px-4 py-3.5 text-center">Packaging Standard</th>
                    <th className="px-4 py-3.5 text-right">Trade Rate</th>
                    <th className="px-4 py-3.5 text-right">Retail Price</th>
                    <th className="px-4 py-3.5 text-center">GST %</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSKUs.map((sku) => {
                    const innerPackUnits = sku.unitsPerPack || 1;
                    const innerPacksPerCtn = sku.packsPerCarton || (sku.cartonQuantity || 50);

                    return (
                      <tr key={sku.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-700">{sku.skuCode}</span>
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-700 border border-indigo-200">
                              <GitCommit className="w-2.5 h-2.5" />
                              v{sku.currentVersionNumber || 1}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 mt-0.5">{sku.name}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-800 block">{sku.brandName || 'National Lights'}</span>
                          <span className="text-[10px] text-slate-400 block">{sku.categoryName || 'General'}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono">
                          <span className="inline-block bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                            1 {sku.packagingUnit || 'CARTON'} = {innerPacksPerCtn} Pks × {innerPackUnits} Pcs ({innerPacksPerCtn * innerPackUnits} Pcs)
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-black text-slate-900">
                          PKR {sku.tradePrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-600">
                          PKR {sku.retailPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-indigo-600">
                          {sku.taxRate || 18}%
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              sku.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {sku.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedSkuForAudit(sku)}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-xs font-bold transition cursor-pointer"
                              title="View Version Timeline & Audit History"
                            >
                              <History className="h-3 w-3 text-slate-500" />
                              <span>History</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReviseModal(sku)}
                              className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 text-xs font-bold transition cursor-pointer"
                              title="Revise Price / Packaging (Creates new immutable version)"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Revise</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. PACKAGING SIMULATOR */}
      {activeSubTab === 'SIMULATOR' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900">Centralized Packaging Conversion Simulator</h3>
            <p className="text-xs text-slate-500">Live operational test-bed verifying the core Units ⇄ Packs ⇄ Cartons conversion matrix.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target SKU for Simulation</label>
                <select
                  value={simulatorSkuId}
                  onChange={(e) => {
                    setSimulatorSkuId(e.target.value);
                    const selected = skus.find(s => s.id === e.target.value);
                    if (selected) {
                      setSimulatorUnits((selected.packsPerCarton || 50) * (selected.unitsPerPack || 1) * 2);
                      setSimCartons(2);
                      setSimPacks(0);
                      setSimLooseUnits(0);
                    }
                  }}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                >
                  {skus.map(s => (
                    <option key={s.id} value={s.id}>
                      [{s.skuCode}] {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSimSku && (
                <div className="space-y-2 text-xs font-mono bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block border-b pb-1 font-sans">SKU Config Profile</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Packaging Type:</span>
                    <span className="font-bold text-slate-800">{selectedSimSku.packagingUnit || 'CARTON'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Packs per Carton:</span>
                    <span className="font-bold text-slate-800">{selectedSimSku.packsPerCarton || 50} Packs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Units per Pack:</span>
                    <span className="font-bold text-slate-800">{selectedSimSku.unitsPerPack || 1} Pc(s)</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 text-slate-900 font-sans">
                    <span className="font-semibold text-slate-600">Total Units/Carton:</span>
                    <span className="font-bold text-indigo-600">{simUnitsPerPack * simPacksPerCarton} Pcs</span>
                  </div>
                </div>
              )}

              <div className="flex border border-slate-200 rounded-xl overflow-hidden text-xs">
                <button
                  onClick={() => setSimulationMode('UNITS_TO_PKG')}
                  className={`flex-1 py-2 text-center font-bold transition ${simulationMode === 'UNITS_TO_PKG' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                >
                  Units → Packaging
                </button>
                <button
                  onClick={() => setSimulationMode('PKG_TO_UNITS')}
                  className={`flex-1 py-2 text-center font-bold transition ${simulationMode === 'PKG_TO_UNITS' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                >
                  Packaging → Units
                </button>
              </div>
            </div>

            <div className="lg:col-span-8 p-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex flex-col justify-between min-h-[220px]">
              {simulationMode === 'UNITS_TO_PKG' ? (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Input Quantity in Raw Units (Loose Pcs)</label>
                    <input
                      type="number"
                      value={simulatorUnits}
                      min={0}
                      onChange={(e) => setSimulatorUnits(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-48 px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm font-bold bg-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-slate-900 text-white rounded-2xl text-center shadow">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Cartons / Bags</span>
                      <span className="text-2xl font-black font-mono text-emerald-400">{simBreakdown.cartons}</span>
                    </div>
                    <div className="p-4 bg-slate-800 text-white rounded-2xl text-center shadow">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Inner Packs</span>
                      <span className="text-2xl font-black font-mono text-sky-400">{simBreakdown.packs}</span>
                    </div>
                    <div className="p-4 bg-slate-700 text-white rounded-2xl text-center shadow">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Loose Units (Pcs)</span>
                      <span className="text-2xl font-black font-mono text-slate-200">{simBreakdown.units}</span>
                    </div>
                  </div>

                  <div className="pt-2 text-xs font-semibold text-slate-700">
                    Calculated Summary: <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg ml-1">
                      {formatPackaging(simulatorUnits, simUnitsPerPack, simPacksPerCarton, selectedSimSku?.packagingUnit)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Cartons</label>
                      <input
                        type="number"
                        value={simCartons}
                        min={0}
                        onChange={(e) => setSimCartons(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm font-bold text-center bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Inner Packs</label>
                      <input
                        type="number"
                        value={simPacks}
                        min={0}
                        onChange={(e) => setSimPacks(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm font-bold text-center bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Loose Pieces</label>
                      <input
                        type="number"
                        value={simLooseUnits}
                        min={0}
                        onChange={(e) => setSimLooseUnits(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm font-bold text-center bg-white"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center shadow">
                    <div>
                      <span className="text-xs text-slate-400 block">Calculated Net Raw Quantity:</span>
                      <span className="text-xl font-mono font-black text-emerald-400">{calculatedSimUnits} Pcs</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({simCartons} × {simUnitsPerPack * simPacksPerCarton}) + ({simPacks} × {simUnitsPerPack}) + {simLooseUnits}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SKU VERSION HISTORY LEDGER */}
      {activeSubTab === 'VERSIONS' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Immutable SKU Version & Price Revision Ledger</h2>
            <p className="text-xs text-slate-500">
              Preserves historical snapshots so prior invoices and sales orders retain exact historical pricing and packaging configurations.
            </p>
          </div>

          {skuVersions.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <History className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-black text-slate-800">No Historical Versions Recorded</h3>
              <p className="text-xs text-slate-500">When you revise a SKU price or packaging, an immutable version is stored here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">SKU ID & Version</th>
                    <th className="px-4 py-3.5">Snapshot Name</th>
                    <th className="px-4 py-3.5">Trade Price</th>
                    <th className="px-4 py-3.5">Packaging Snapshot</th>
                    <th className="px-4 py-3.5">Effective Range</th>
                    <th className="px-4 py-3.5">Revision Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {skuVersions.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-mono">
                        <span className="font-bold text-slate-900">{v.skuId}</span>
                        <span className="ml-2 rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.5 text-[10px] font-black">
                          v{v.versionNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{v.name}</td>
                      <td className="px-4 py-3.5 font-mono font-black text-slate-900">
                        PKR {v.tradePrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600">
                        {v.packsPerCarton} Pks × {v.unitsPerPack} Pcs ({v.cartonQuantity} Total)
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-500">
                        {v.effectiveFrom} {v.effectiveTo ? `to ${v.effectiveTo}` : '(Current)'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{v.revisionReason || 'Rate revision'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: REGISTER NEW SKU */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Register New Corporate SKU
                </h3>
                <p className="text-xs text-slate-500">Single master record used across orders, ledger, and logistics.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSkuSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Product Name & Spec *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 18W LED Round Panel (Cool Daylight)"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">SKU Code (Unique ID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SKU-NL-PNL18-CD"
                    value={formSkuCode}
                    onChange={(e) => setFormSkuCode(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Packaging Unit</label>
                  <select
                    value={formPackaging}
                    onChange={(e) => setFormPackaging(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Carton">Carton</option>
                    <option value="Bag">Bag</option>
                    <option value="Box">Box</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Packs per Carton *</label>
                  <input
                    type="number"
                    min={1}
                    value={formPacksPerCarton}
                    onChange={(e) => setFormPacksPerCarton(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Units per Pack *</label>
                  <input
                    type="number"
                    min={1}
                    value={formUnitsPerPack}
                    onChange={(e) => setFormUnitsPerPack(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trade Rate (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={formTradeRate}
                    onChange={(e) => setFormTradeRate(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-black focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Retail Price (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={formRetailPrice}
                    onChange={(e) => setFormRetailPrice(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-black text-white hover:bg-indigo-700 shadow"
                >
                  Save SKU Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVISE SKU & IMMUTABLE VERSION */}
      {showReviseModal && selectedSkuForRevision && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">Revise SKU Master & Price</h3>
                <p className="text-xs text-slate-500">
                  {selectedSkuForRevision.skuCode} - {selectedSkuForRevision.name}
                </p>
              </div>
              <button onClick={() => setShowReviseModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleReviseSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">New Trade Rate (PKR) *</label>
                <input
                  type="number"
                  value={revTradeRate}
                  onChange={(e) => setRevTradeRate(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-black focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">New Retail Price (PKR) *</label>
                <input
                  type="number"
                  value={revRetailPrice}
                  onChange={(e) => setRevRetailPrice(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Packs/Carton</label>
                  <input
                    type="number"
                    value={revPacksPerCarton}
                    onChange={(e) => setRevPacksPerCarton(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Units/Pack</label>
                  <input
                    type="number"
                    value={revUnitsPerPack}
                    onChange={(e) => setRevUnitsPerPack(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Revision Reason / Audit Note *</label>
                <input
                  type="text"
                  value={revReason}
                  onChange={(e) => setRevReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                A historical snapshot (Version {((selectedSkuForRevision as any).version || 1) + 1}) will be preserved in the immutable version ledger.
              </p>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReviseModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-black text-white hover:bg-indigo-700 shadow"
                >
                  Commit Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SKU VERSION AUDIT DRAWER MODAL */}
      {selectedSkuForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-700 border border-indigo-200">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">SKU Version Timeline & Audit Ledger</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedSkuForAudit.skuCode} · {selectedSkuForAudit.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSkuForAudit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-4 flex-1">
              <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800">
                    Active Production Specification
                  </span>
                  <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                    v{selectedSkuForAudit.currentVersionNumber || 1} (ACTIVE)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Trade Price</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      PKR {selectedSkuForAudit.tradePrice.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Retail MRP</span>
                    <span className="font-mono font-bold text-slate-700 text-sm">
                      PKR {selectedSkuForAudit.retailPrice.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Packing</span>
                    <span className="font-mono font-bold text-indigo-700 text-sm">
                      {(selectedSkuForAudit.packsPerCarton || 50) * (selectedSkuForAudit.unitsPerPack || 1)} pcs / ctn
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Historical Versions Timeline</h4>
                {(() => {
                  const itemVersions = skuVersions.filter(
                    (v) => v.skuId === selectedSkuForAudit.id || v.skuId === selectedSkuForAudit.skuCode
                  );

                  if (itemVersions.length === 0) {
                    return (
                      <div className="p-6 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                        <GitCommit className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">Initial Version (v1.0)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          No revisions have been committed for this SKU. All historical invoices and sales orders are tied to initial release.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5">
                      {itemVersions.map((ver, idx) => (
                        <div
                          key={ver.id || idx}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                v{ver.versionNumber}
                              </span>
                              <span className="text-xs font-bold text-slate-800">{ver.name || selectedSkuForAudit.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {ver.effectiveFrom} {ver.effectiveTo ? `→ ${ver.effectiveTo}` : '→ Current'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2 rounded-xl">
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">Trade Price</span>
                              <span className="font-mono font-bold text-slate-800">
                                PKR {ver.tradePrice.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">Carton Packing</span>
                              <span className="font-mono font-bold text-slate-800">
                                {ver.cartonQuantity || (ver.packsPerCarton * ver.unitsPerPack)} pcs
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block">Status</span>
                              <span className={`text-[10px] font-black ${ver.effectiveTo ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {ver.effectiveTo ? 'SUPERSEDED' : 'CURRENT ACTIVE'}
                              </span>
                            </div>
                          </div>

                          {ver.revisionReason && (
                            <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-1.5 rounded-lg border border-amber-100">
                              Reason: {ver.revisionReason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSkuForAudit(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
