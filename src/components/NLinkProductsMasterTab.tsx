/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Official N-Link Products & Price List Management
 */

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Download,
  Filter,
  Package,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Boxes,
  Zap,
} from 'lucide-react';
import { NLINK_OFFICIAL_PRODUCTS, NLINK_PRODUCT_CATEGORIES, NLinkSKU } from '../data/nlink-products';

export const NLinkProductsMasterTab: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'wattage' | 'price' | 'stock'>('wattage');

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return NLINK_OFFICIAL_PRODUCTS.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.skuCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.wattage.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'price') return a.tradePrice - b.tradePrice;
      if (sortBy === 'stock') return b.stockInHand - a.stockInHand;
      return a.wattageNumber - b.wattageNumber;
    });
  }, [selectedCategory, searchQuery, sortBy]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'SKU Code',
      'Product Name',
      'Category',
      'Wattage',
      'Trade Price TP (PKR)',
      'Retail Price RP (PKR)',
      'Minimum Price (PKR)',
      'Units Per Carton',
      'Stock In Hand',
      'Voltage Range',
      'Warranty (Months)',
    ];

    const rows = filteredProducts.map((p) => [
      p.skuCode,
      `"${p.name}"`,
      p.categoryLabel,
      p.wattage,
      p.tradePrice,
      p.retailPrice,
      p.minimumPrice,
      p.cartonQuantity,
      p.stockInHand,
      p.voltageRange,
      p.warrantyMonths,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NLink_Price_List_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="products-management-tab">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Zap className="w-3 h-3 mr-1 text-amber-600" /> National Lights Official Catalog
            </span>
            <span className="text-xs text-slate-400 font-medium">Standard Price List</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Products & SKU Price List Management</h2>
          <p className="text-xs text-slate-500">
            Authoritative N-Link product line with Trade Price (TP), Retail Price (RP), Master Carton Packing and Stock levels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Price List CSV
          </button>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name, wattage or SKU code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="wattage">Wattage (Asc)</option>
              <option value="price">Trade Price (Low to High)</option>
              <option value="stock">Stock in Hand (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {NLINK_PRODUCT_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                selectedCategory === cat.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Product Catalog Grid (Mobile) / Table (Desktop) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* MOBILE PRODUCT CARDS */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">
              No products found matching your search.
            </div>
          ) : (
            filteredProducts.map((sku) => (
              <div key={sku.id} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {sku.skuCode}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {sku.wattage}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-1">{sku.name}</h4>
                    <p className="text-[10px] text-slate-400">{sku.categoryLabel} &bull; {sku.voltageRange}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> {sku.warrantyMonths} Mo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Trade Price (TP)</span>
                    <span className="font-mono font-extrabold text-slate-900 text-sm block">
                      Rs. {sku.tradePrice.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      RP: Rs. {sku.retailPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Stock In Hand</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm block">
                      {sku.stockInHand.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">units</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {sku.cartonQuantity} pcs / ctn
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP PRODUCT TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">SKU Code</th>
                <th className="py-3.5 px-4">Product Name &amp; Category</th>
                <th className="py-3.5 px-3">Wattage</th>
                <th className="py-3.5 px-3 text-right">Trade Price (TP)</th>
                <th className="py-3.5 px-3 text-right">Retail Price (RP)</th>
                <th className="py-3.5 px-3 text-right">Min Price</th>
                <th className="py-3.5 px-3 text-center">Carton Pack</th>
                <th className="py-3.5 px-3 text-right">Stock In Hand</th>
                <th className="py-3.5 px-4 text-center">Warranty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((sku) => (
                <tr key={sku.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {sku.skuCode}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{sku.name}</p>
                    <p className="text-[10px] text-slate-400">{sku.categoryLabel} • {sku.voltageRange}</p>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {sku.wattage}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-right font-extrabold text-slate-900">
                    Rs. {sku.tradePrice.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-3 text-right font-medium text-slate-500">
                    Rs. {sku.retailPrice.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-3 text-right text-slate-400 font-mono">
                    Rs. {sku.minimumPrice.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                    {sku.cartonQuantity} pcs / ctn
                  </td>

                  <td className="py-3.5 px-3 text-right">
                    <span className="font-bold text-emerald-700">
                      {sku.stockInHand.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">units</span>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> {sku.warrantyMonths} Mo
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
