import React, { useState } from 'react';
import { SKU } from '../types';
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
  Scale, 
  CheckCircle, 
  AlertCircle, 
  Layers,
  Calculator,
  Download,
  Printer
} from 'lucide-react';

interface ProductMasterTabProps {
  skus?: SKU[];
  onAddSKU?: (newSku: SKU) => void;
  onUpdateSKU?: (sku: SKU) => void;
}

export const ProductMasterTab: React.FC<ProductMasterTabProps> = ({
  skus = [],
  onAddSKU,
  onUpdateSKU
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  
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
  const [formDescription, setFormDescription] = useState('');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formPackaging, setFormPackaging] = useState('Carton');
  const [formUnitsPerPack, setFormUnitsPerPack] = useState(1);
  const [formPacksPerCarton, setFormPacksPerCarton] = useState(50);
  const [formWeight, setFormWeight] = useState(0.25);
  const [formTradeRate, setFormTradeRate] = useState(300);
  const [formRetailPrice, setFormRetailPrice] = useState(450);
  const [formTax, setFormTax] = useState(18); // Default GST 18%
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Hardcoded existing mock brands & categories for filter menus
  const brands = ['National Lights', 'Glow Gold', 'Minimal Tech', 'Royal Lights'];
  const categories = ['LED Bulbs', 'Flood Lights', 'SMD Panels', 'Cables & Wires'];

  const handleAddSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSkuCode || !formName) {
      alert('SKU Code and Name are mandatory.');
      return;
    }

    const newSku: SKU = {
      id: `sku-new-${Date.now()}`,
      productId: `p-new-${Date.now()}`,
      productName: formName,
      skuCode: formSkuCode.toUpperCase().trim(),
      name: formName.trim(),
      packagingUnit: formPackaging.toUpperCase(),
      cartonQuantity: formUnitsPerPack * formPacksPerCarton,
      tradePrice: formTradeRate,
      retailPrice: formRetailPrice,
      minimumPrice: Math.round(formTradeRate * 0.95), // dealer price default
      reorderLevel: 250,
      isActive: formStatus === 'ACTIVE',
      // Complete product master fields:
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
    } else {
      // Fallback local addition alert
      alert(`SKU ${newSku.skuCode} registered successfully in the local workspace master!`);
      skus.push(newSku);
    }

    setShowAddModal(false);
    // Reset form
    setFormSkuCode('');
    setFormName('');
    setFormDescription('');
  };

  // Filtered list
  const filteredSKUs = skus.filter(sku => {
    const matchesSearch = 
      sku.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.skuCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Fallbacks for optional brand/category
    const skuBrand = sku.brandName || 'National Lights';
    const skuCategory = sku.categoryName || 'LED Bulbs';

    const matchesBrand = selectedBrand === 'ALL' || skuBrand === selectedBrand;
    const matchesCategory = selectedCategory === 'ALL' || skuCategory === selectedCategory;

    return matchesSearch && matchesBrand && matchesCategory;
  });

  const selectedSimSku = skus.find(s => s.id === simulatorSkuId) || skus[0];
  const simUnitsPerPack = selectedSimSku?.unitsPerPack || 1;
  const simPacksPerCarton = selectedSimSku?.packsPerCarton || (selectedSimSku?.cartonQuantity || 50);

  // Run simulation calculations
  const simBreakdown = selectedSimSku 
    ? unitsToCartonsAndPacks(simulatorUnits, simUnitsPerPack, simPacksPerCarton) 
    : { cartons: 0, packs: 0, units: 0 };

  const calculatedSimUnits = selectedSimSku 
    ? cartonsAndPacksToUnits(simCartons, simPacks, simLooseUnits, simUnitsPerPack, simPacksPerCarton)
    : 0;

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner & Actions */}
      <div className="bg-primary text-deep-green hover:bg-primary/90 rounded-2xl p-6 relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-12">
          <Package className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="bg-secondary/80 text-deep-green px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                Corporate Master Data
              </span>
              <h1 className="text-2xl font-black text-white mt-1">Unified Product SKU Master</h1>
              <p className="text-sm text-slate-300 max-w-2xl">
                Enforcing a single source of truth for packaging configuration, trade rates, and weight metrics. 
                Used deterministically across sales, invoices, and logistics.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-secondary/80 hover:bg-amber-300 text-deep-green font-extrabold text-xs rounded-xl shadow-md transition-all self-stretch sm:self-auto text-center justify-center"
            >
              <Plus className="w-4 h-4" /> Register New SKU
            </button>
          </div>
        </div>
      </div>

      {/* 2. Central Packaging Conversion Simulator Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <Calculator className="w-5 h-5 text-deep-teal" />
          <div>
            <h3 className="font-bold text-text-primary text-sm">Centralized Packaging Conversion Simulator</h3>
            <p className="text-xs text-slate-500">Live operational test-bed verifying the core Units ⇄ Packs ⇄ Cartons conversion matrix.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Sku Selector & Settings */}
          <div className="md:col-span-4 bg-bg-secondary p-4 rounded-xl border border-slate-200 space-y-4">
            <div>
              <label className="text-xs text-slate-600 font-semibold block mb-1">Target SKU for Simulation</label>
              <select
                value={simulatorSkuId}
                onChange={(e) => {
                  setSimulatorSkuId(e.target.value);
                  const selected = skus.find(s => s.id === e.target.value);
                  if (selected) {
                    setSimulatorUnits(selected.cartonQuantity * 2);
                    setSimCartons(2);
                    setSimPacks(0);
                    setSimLooseUnits(0);
                  }
                }}
                className="w-full p-2 bg-white border rounded-lg text-xs font-medium focus:ring-1 focus:ring-amber-500"
              >
                {skus.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.skuCode}] {s.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedSimSku && (
              <div className="space-y-2 text-xs font-mono bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block border-b pb-1">SKU Config Profile</span>
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
                <div className="flex justify-between border-t pt-1.5 text-text-primary font-sans">
                  <span className="font-semibold text-slate-600">Total Units/Carton:</span>
                  <span className="font-bold text-amber-600">{simUnitsPerPack * simPacksPerCarton} Pcs</span>
                </div>
              </div>
            )}

            <div className="flex border rounded-lg overflow-hidden text-xs">
              <button
                onClick={() => setSimulationMode('UNITS_TO_PKG')}
                className={`flex-1 py-2 text-center font-bold ${simulationMode === 'UNITS_TO_PKG' ? 'bg-primary text-deep-green hover:bg-primary/90' : 'bg-white hover:bg-slate-100 text-slate-600'}`}
              >
                Units → Packaging
              </button>
              <button
                onClick={() => setSimulationMode('PKG_TO_UNITS')}
                className={`flex-1 py-2 text-center font-bold ${simulationMode === 'PKG_TO_UNITS' ? 'bg-primary text-deep-green hover:bg-primary/90' : 'bg-white hover:bg-slate-100 text-slate-600'}`}
              >
                Packaging → Units
              </button>
            </div>
          </div>

          {/* Interactive Calculator Area */}
          <div className="md:col-span-8 p-5 rounded-xl border border-dashed border-slate-300 bg-bg-secondary/40 flex flex-col justify-between min-h-[180px]">
            {simulationMode === 'UNITS_TO_PKG' ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-semibold block">Input Quantity in Raw Units (Loose Pcs)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={simulatorUnits}
                      min={0}
                      onChange={(e) => setSimulatorUnits(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-48 px-3 py-2 border rounded-lg font-mono text-sm font-bold bg-white focus:outline-none focus:border-secondary"
                    />
                    <span className="flex items-center text-xs text-slate-500 font-medium font-sans">Total single-unit components</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-primary text-deep-green hover:bg-primary/90 rounded-lg text-center shadow-sm">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Cartons / Bags</span>
                    <span className="text-xl font-bold font-mono text-deep-teal">{simBreakdown.cartons}</span>
                  </div>
                  <div className="p-3 bg-slate-800 text-white rounded-lg text-center shadow-sm">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Inner Packs</span>
                    <span className="text-xl font-bold font-mono text-sky-400">{simBreakdown.packs}</span>
                  </div>
                  <div className="p-3 bg-slate-700 text-white rounded-lg text-center shadow-sm">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Loose Units (Pcs)</span>
                    <span className="text-xl font-bold font-mono text-slate-300">{simBreakdown.units}</span>
                  </div>
                </div>

                <div className="pt-2 text-xs font-semibold text-slate-700 font-sans">
                  Calculated Output: <span className="font-mono font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded ml-1">
                    {formatPackaging(simulatorUnits, simUnitsPerPack, simPacksPerCarton, selectedSimSku?.packagingUnit)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Cartons / Bags</label>
                    <input
                      type="number"
                      value={simCartons}
                      min={0}
                      onChange={(e) => setSimCartons(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border rounded-lg font-mono text-sm font-semibold text-center bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Inner Packs</label>
                    <input
                      type="number"
                      value={simPacks}
                      min={0}
                      onChange={(e) => setSimPacks(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border rounded-lg font-mono text-sm font-semibold text-center bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Loose Pieces</label>
                    <input
                      type="number"
                      value={simLooseUnits}
                      min={0}
                      onChange={(e) => setSimLooseUnits(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 border rounded-lg font-mono text-sm font-semibold text-center bg-white"
                    />
                  </div>
                </div>

                <div className="p-4 bg-primary text-deep-green hover:bg-primary/90 rounded-lg flex justify-between items-center shadow-sm">
                  <div>
                    <span className="text-xs text-slate-400 block">Calculated Net Raw Quantity:</span>
                    <span className="text-lg font-mono font-bold text-deep-teal">{calculatedSimUnits} Pcs</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    ({simCartons} × {simUnitsPerPack * simPacksPerCarton}) + ({simPacks} × {simUnitsPerPack}) + {simLooseUnits}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 3. Search, Filter and Inventory Listing Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKUs by name, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg-secondary border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Brand Filter */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="text-xs p-1.5 border rounded-lg bg-bg-secondary font-medium"
            >
              <option value="ALL">All Brands</option>
              {brands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs p-1.5 border rounded-lg bg-bg-secondary font-medium"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end">
            <span className="text-xs text-slate-400 font-semibold flex items-center">
              Showing {filteredSKUs.length} of {skus.length} SKUs
            </span>
          </div>
        </div>

        {/* Master Data Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-secondary text-slate-600 font-bold border-b">
              <tr>
                <th className="py-2.5 px-3">SKU Code</th>
                <th className="py-2.5 px-3">Product Name & Spec</th>
                <th className="py-2.5 px-3">Brand & Category</th>
                <th className="py-2.5 px-3 text-center">Packaging Breakdown</th>
                <th className="py-2.5 px-3 text-right">Trade Rate</th>
                <th className="py-2.5 px-3 text-right">Retail Price</th>
                <th className="py-2.5 px-3 text-center">Tax %</th>
                <th className="py-2.5 px-3 text-center">Weight</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredSKUs.map((sku) => {
                const brand = sku.brandName || 'National Lights';
                const category = sku.categoryName || 'LED Bulbs';
                const weight = sku.weight || 0.25;
                const tax = sku.taxRate || 18;
                const innerPackUnits = sku.unitsPerPack || 1;
                const innerPacksPerCtn = sku.packsPerCarton || (sku.cartonQuantity || 50);

                return (
                  <tr key={sku.id} className="hover:bg-bg-secondary/75 font-sans">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-700">{sku.skuCode}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-text-primary">{sku.name}</div>
                      <span className="text-[10px] text-slate-400 block font-sans">UoM: Pcs · Reorder: {sku.reorderLevel} Pcs</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-700 block">{brand}</span>
                      <span className="text-[10px] text-slate-400 block">{category}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-bold">
                        1 {sku.packagingUnit || 'CARTON'} ({innerPacksPerCtn} Pks × {innerPackUnits} Pcs)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-text-primary">
                      PKR {sku.tradePrice.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-600">
                      PKR {sku.retailPrice.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-indigo-600 font-semibold">{tax}% GST</td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-600">{weight} kg</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sku.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {sku.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. SKU Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-surface-card/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-primary text-deep-green hover:bg-primary/90 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-deep-teal" />
                <h3 className="font-extrabold text-sm">Register New Corporate SKU</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSkuSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                
                <div className="col-span-2">
                  <label className="text-slate-600 font-semibold block mb-1">SKU Name & Technical Spec*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 18W LED Round Panel (Cool Daylight)"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:border-secondary font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">SKU Code (Unique ID)*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SKU-NL-PNL18-CD"
                    value={formSkuCode}
                    onChange={(e) => setFormSkuCode(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:border-secondary font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-1.5 border rounded-lg focus:outline-none focus:border-secondary font-medium"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Brand Name</label>
                  <select
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full p-1.5 border rounded-lg focus:outline-none focus:border-secondary font-medium"
                  >
                    {brands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Product Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-1.5 border rounded-lg focus:outline-none focus:border-secondary font-medium"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Packaging (Type)</label>
                  <select
                    value={formPackaging}
                    onChange={(e) => setFormPackaging(e.target.value)}
                    className="w-full p-1.5 border rounded-lg focus:outline-none"
                  >
                    <option value="Carton">Carton</option>
                    <option value="Bag">Bag</option>
                    <option value="Box">Box</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Packs per Carton/Bag</label>
                  <input
                    type="number"
                    min={1}
                    value={formPacksPerCarton}
                    onChange={(e) => setFormPacksPerCarton(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Units per Pack</label>
                  <input
                    type="number"
                    min={1}
                    value={formUnitsPerPack}
                    onChange={(e) => setFormUnitsPerPack(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Net Unit Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={formWeight}
                    onChange={(e) => setFormWeight(Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Trade Rate (PKR)*</label>
                  <input
                    type="number"
                    min={1}
                    value={formTradeRate}
                    onChange={(e) => setFormTradeRate(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Retail Price (PKR)*</label>
                  <input
                    type="number"
                    min={1}
                    value={formRetailPrice}
                    onChange={(e) => setFormRetailPrice(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Standard Sales Tax Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formTax}
                    onChange={(e) => setFormTax(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full px-3 py-1.5 border rounded-lg focus:outline-none font-mono font-semibold"
                  />
                </div>

              </div>

              <div className="pt-4 flex gap-2 border-t text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-surface-card hover:bg-slate-800 text-deep-teal font-extrabold rounded-lg transition-colors shadow-md"
                >
                  Save to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
