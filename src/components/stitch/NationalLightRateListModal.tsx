/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * National Light Official Rate Card & Price List Modal
 * Exact mapping of National Light Pakistan Rate List
 */

import React, { useState } from 'react';
import {
  NATIONAL_LIGHT_OFFICIAL_CATALOG,
  NATIONAL_LIGHT_OFFICE_INFO,
} from '../../data/national-light-rate-card';

export interface NationalLightRateListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NationalLightRateListModal: React.FC<NationalLightRateListModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');

  if (!isOpen) return null;

  const filteredItems = NATIONAL_LIGHT_OFFICIAL_CATALOG.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.specification.toLowerCase().includes(search.toLowerCase());

    const matchesGroup = selectedGroup === 'ALL' || item.categoryGroup === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-[#001428] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#76f4e0]/20 flex items-center justify-center text-[#76f4e0]">
              <span className="material-symbols-outlined text-[24px]">price_change</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  NATIONAL LIGHT PAKISTAN
                </h2>
                <span className="bg-[#006b5f] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  Official Rate List
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {NATIONAL_LIGHT_OFFICE_INFO.headOffice} • Ph: {NATIONAL_LIGHT_OFFICE_INFO.phone}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-[#f8f9fb] border-b border-slate-200 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, item name, wattage (e.g. 12W, COB, Flood)..."
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#006b5f]"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'ALL', label: 'All Items' },
              { id: 'LED_BULB', label: 'LED Bulbs' },
              { id: 'HIGH_WATTAGE', label: 'High Wattage' },
              { id: 'PANEL_LIGHT', label: 'Panel Lights' },
              { id: 'COB', label: 'COB' },
              { id: 'TUBE_LIGHT', label: 'Tube Lights' },
              { id: 'FLOOD_LIGHT', label: 'Flood Lights' },
              { id: 'ADJ_ICE_PANEL', label: 'Adj. Ice' },
              { id: 'ROOP_LIGHT', label: 'Roop Light' },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedGroup === g.id
                    ? 'bg-[#001428] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rate Card Table */}
        <div className="overflow-y-auto flex-1 p-4">
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#001428] text-white text-[11px] uppercase tracking-wider font-bold">
                  <th className="p-3">Item Description</th>
                  <th className="p-3">Item</th>
                  <th className="p-3 text-center">Quantity Box</th>
                  <th className="p-3 text-right">Trade Price (TP)</th>
                  <th className="p-3 text-center">Discount %</th>
                  <th className="p-3 text-right">List Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-800 text-xs">{item.category}</div>
                      <div className="text-[10px] text-slate-500">{item.specification}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-extrabold text-[#001428]">{item.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">
                      <span className="bg-slate-100 font-mono px-2.5 py-0.5 rounded text-xs">
                        {item.quantityBox}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-700">
                      Rs. {item.tradePrice.toLocaleString()}
                    </td>
                    <td className="p-3 text-center font-bold text-[#006b5f] font-mono">
                      <span className="bg-emerald-50 text-[#006b5f] px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        {item.discountPercentage}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-black text-[#001428] text-sm">
                      Rs. {item.listPrice.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Official Address & Footer */}
        <div className="p-4 bg-[#001428] text-white border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-center sm:text-left">
            <p className="font-bold text-slate-200">
              {NATIONAL_LIGHT_OFFICE_INFO.headOffice}
            </p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Ph: {NATIONAL_LIGHT_OFFICE_INFO.phone} • Cell: {NATIONAL_LIGHT_OFFICE_INFO.cells.join(' - ')}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print Rates</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#006b5f] hover:bg-[#005047] text-white font-bold rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
