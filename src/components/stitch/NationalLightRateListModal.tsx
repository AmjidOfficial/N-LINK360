/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * National Light Official Rate Card & Price List Modal
 * Exact mapping of National Light Pakistan Rate List
 */

import React, { useState } from 'react';
import { Tag, X, Search, Printer } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-[#1E293B] w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#E2E8F0] dark:border-slate-700/80 text-[#0F172A] dark:text-slate-100">
        {/* Header */}
        <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6] shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                NATIONAL LIGHT PAKISTAN
              </h2>
              <p className="text-xs text-slate-300 truncate">
                Official Rate List · {NATIONAL_LIGHT_OFFICE_INFO.headOffice} · Ph: {NATIONAL_LIGHT_OFFICE_INFO.phone}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] -mr-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 inline-flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label="Close Rate List"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-slate-700/80 flex flex-col gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, item name, wattage (e.g. 12W, COB, Flood)..."
              className="w-full min-h-[44px] pl-9 pr-11 py-2 bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs sm:text-sm text-[#0F172A] dark:text-white outline-none focus:border-[#3B82F6]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-0 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-slate-400 hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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
                type="button"
                onClick={() => setSelectedGroup(g.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedGroup === g.id
                    ? 'bg-[#3B82F6] text-white shadow-xs'
                    : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rate Card Table */}
        <div className="overflow-y-auto flex-1 p-4">
          <div className="responsive-table-container border border-[#E2E8F0] dark:border-slate-700/80 rounded-xl shadow-2xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[680px]">
              <thead>
                <tr className="bg-[#0F172A] text-white text-[11px] uppercase tracking-wider font-bold">
                  <th className="p-3 frozen-first-col bg-[#0F172A] text-white">Item</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-center">Quantity Box</th>
                  <th className="p-3 text-right">Trade Price (TP)</th>
                  <th className="p-3 text-center">Discount %</th>
                  <th className="p-3 text-right">List Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-700/80 bg-white dark:bg-[#1E293B]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No catalog items match your search filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 transition-colors">
                      <td className="p-3 frozen-first-col bg-white dark:bg-[#1E293B]">
                        <div className="font-extrabold text-[#0F172A] dark:text-white">{item.name}</div>
                        <div className="text-[10px] font-mono tabular-nums text-slate-400">{item.sku}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{item.category}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{item.specification}</div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-200">
                        <span className="bg-slate-100 dark:bg-slate-800 font-mono tabular-nums px-2.5 py-0.5 rounded-md text-xs border border-[#E2E8F0] dark:border-slate-700">
                          {item.quantityBox}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-bold text-slate-700 dark:text-slate-200">
                        PKR {item.tradePrice.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-bold font-mono tabular-nums">
                        <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 text-[11px]">
                          {item.discountPercentage}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-black text-[#0F172A] dark:text-white text-sm">
                        PKR {item.listPrice.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Official Address & Footer */}
        <div className="p-4 bg-[#0F172A] text-white border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-center sm:text-left">
            <p className="font-bold text-slate-200">
              {NATIONAL_LIGHT_OFFICE_INFO.headOffice}
            </p>
            <p className="text-slate-400 text-[11px] font-mono tabular-nums mt-0.5">
              Ph: {NATIONAL_LIGHT_OFFICE_INFO.phone} • Cell: {NATIONAL_LIGHT_OFFICE_INFO.cells.join(' - ')}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-outline min-h-[44px] border-slate-600 text-white hover:bg-slate-800 text-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Rates</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary min-h-[44px] text-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
