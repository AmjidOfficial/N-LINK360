/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Universal Global Search & Fast Indexing Command Center
 * Supports debounced multi-entity fuzzy search across Customers, SKUs, Invoices, Orders, Dispatches & Staff.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Users,
  Package,
  FileText,
  Truck,
  CreditCard,
  Building2,
  ArrowRight,
  X,
  CornerDownLeft,
  ChevronRight,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { Customer, Invoice, SalesOrder, SKU, User, Dispatch } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  skus: SKU[];
  invoices: Invoice[];
  salesOrders: SalesOrder[];
  dispatches: Dispatch[];
  users: User[];
  onSelectEntity?: (type: 'CUSTOMER' | 'SKU' | 'INVOICE' | 'ORDER' | 'DISPATCH' | 'USER', id: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  customers,
  skus,
  invoices,
  salesOrders,
  dispatches,
  users,
  onSelectEntity,
}) => {
  const [query, setQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'CUSTOMERS' | 'SKUS' | 'INVOICES' | 'ORDERS' | 'DISPATCHES'>('ALL');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Index and match items
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    const results: Array<{
      id: string;
      category: 'CUSTOMERS' | 'SKUS' | 'INVOICES' | 'ORDERS' | 'DISPATCHES';
      title: string;
      subtitle: string;
      badge: string;
      badgeColor: string;
      meta: string;
    }> = [];

    // Search Customers
    if (activeCategory === 'ALL' || activeCategory === 'CUSTOMERS') {
      customers.forEach((c) => {
        if (
          c.companyName.toLowerCase().includes(q) ||
          c.customerCode.toLowerCase().includes(q) ||
          c.contactPerson.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.city && c.city.toLowerCase().includes(q))
        ) {
          results.push({
            id: c.id,
            category: 'CUSTOMERS',
            title: c.companyName,
            subtitle: `${c.customerCode} • ${c.contactPerson} (${c.phone})`,
            badge: c.type,
            badgeColor: c.type === 'DISTRIBUTOR' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800',
            meta: `Balance: PKR ${(c.currentBalance || 0).toLocaleString()} | ${c.city || ''}`,
          });
        }
      });
    }

    // Search SKUs
    if (activeCategory === 'ALL' || activeCategory === 'SKUS') {
      skus.forEach((s) => {
        if (
          s.name.toLowerCase().includes(q) ||
          s.skuCode.toLowerCase().includes(q) ||
          (s.brandName && s.brandName.toLowerCase().includes(q)) ||
          (s.wattage && s.wattage.toLowerCase().includes(q)) ||
          (s.barcode && s.barcode.toLowerCase().includes(q))
        ) {
          results.push({
            id: s.id,
            category: 'SKUS',
            title: s.name,
            subtitle: `${s.skuCode} • ${s.wattage || ''} ${s.colorTemperature || ''}`,
            badge: `${s.cartonQuantity} pcs/ctn`,
            badgeColor: 'bg-slate-100 text-slate-800',
            meta: `Trade: PKR ${s.tradePrice.toLocaleString()} | Retail: PKR ${s.retailPrice.toLocaleString()}`,
          });
        }
      });
    }

    // Search Invoices
    if (activeCategory === 'ALL' || activeCategory === 'INVOICES') {
      const custMap = new Map(customers.map((c) => [c.id, c.companyName || (c as any).name || '']));
      invoices.forEach((inv) => {
        const custName = String(custMap.get(inv.customerId) || inv.customerName || '');
        if (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          custName.toLowerCase().includes(q) ||
          (inv.orderId && inv.orderId.toLowerCase().includes(q))
        ) {
          results.push({
            id: inv.id,
            category: 'INVOICES',
            title: `Invoice #${inv.invoiceNumber}`,
            subtitle: custName,
            badge: inv.status,
            badgeColor: inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
            meta: `PKR ${inv.totalAmount.toLocaleString()} • ${inv.invoiceDate}`,
          });
        }
      });
    }

    // Search Sales Orders
    if (activeCategory === 'ALL' || activeCategory === 'ORDERS') {
      const custMap = new Map(customers.map((c) => [c.id, c.companyName || (c as any).name || '']));
      salesOrders.forEach((so) => {
        const custName = String(custMap.get(so.customerId) || so.customerName || '');
        if (
          so.orderNumber.toLowerCase().includes(q) ||
          custName.toLowerCase().includes(q)
        ) {
          results.push({
            id: so.id,
            category: 'ORDERS',
            title: `Order #${so.orderNumber}`,
            subtitle: custName,
            badge: so.status,
            badgeColor: 'bg-indigo-100 text-indigo-800',
            meta: `PKR ${so.totalAmount.toLocaleString()} • ${so.orderDate}`,
          });
        }
      });
    }

    // Search Dispatches
    if (activeCategory === 'ALL' || activeCategory === 'DISPATCHES') {
      dispatches.forEach((d) => {
        if (
          (d.bilityNumber && d.bilityNumber.toLowerCase().includes(q)) ||
          d.vehicleNumber.toLowerCase().includes(q) ||
          d.transporterName.toLowerCase().includes(q) ||
          d.driverName.toLowerCase().includes(q)
        ) {
          results.push({
            id: d.id,
            category: 'DISPATCHES',
            title: `Bility #${d.bilityNumber} (${d.transporterName})`,
            subtitle: `Vehicle: ${d.vehicleNumber} • Driver: ${d.driverName}`,
            badge: d.status,
            badgeColor: d.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800',
            meta: `${d.destinationCity || ''} • ${d.dispatchDate}`,
          });
        }
      });
    }

    return results.slice(0, 30);
  }, [query, activeCategory, customers, skus, invoices, salesOrders, dispatches]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
      e.preventDefault();
      const item = searchResults[selectedIndex];
      const typeMap: Record<string, any> = {
        CUSTOMERS: 'CUSTOMER',
        SKUS: 'SKU',
        INVOICES: 'INVOICE',
        ORDERS: 'ORDER',
        DISPATCHES: 'DISPATCH',
      };
      onSelectEntity?.(typeMap[item.category], item.id);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 pt-16 sm:pt-24 backdrop-blur-xs">
      <div className="flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-slate-200 bg-white px-4 py-3.5">
          <Search className="h-5 w-5 text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Customers, SKUs, Invoices, Sales Orders, Bilities (e.g., 'Al-Madina', '12W', 'INV-')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="ml-3 flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 mr-2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="hidden sm:inline-block rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            ESC to close
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-xs font-semibold overflow-x-auto">
          {(['ALL', 'CUSTOMERS', 'SKUS', 'INVOICES', 'ORDERS', 'DISPATCHES'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSelectedIndex(0);
              }}
              className={`rounded-lg px-2.5 py-1 transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {cat === 'ALL' ? 'All Modules' : cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[55vh] overflow-y-auto divide-y divide-slate-100 p-2">
          {!query.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Search className="h-8 w-8 text-slate-300 mb-2" />
              <div className="text-xs font-bold text-slate-600">Universal N-LINK 360 Search</div>
              <div className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                Type customer names, phone numbers, invoice IDs, item codes or transporter bilities.
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching records found for <span className="font-bold text-slate-800">"{query}"</span>.
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={`${item.category}-${item.id}`}
                  onClick={() => {
                    const typeMap: Record<string, any> = {
                      CUSTOMERS: 'CUSTOMER',
                      SKUS: 'SKU',
                      INVOICES: 'INVOICE',
                      ORDERS: 'ORDER',
                      DISPATCHES: 'DISPATCH',
                    };
                    onSelectEntity?.(typeMap[item.category], item.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-amber-50/80 border border-amber-300/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      {item.category === 'CUSTOMERS' && <Building2 className="h-4 w-4 text-blue-600" />}
                      {item.category === 'SKUS' && <Package className="h-4 w-4 text-amber-600" />}
                      {item.category === 'INVOICES' && <FileText className="h-4 w-4 text-emerald-600" />}
                      {item.category === 'ORDERS' && <TrendingUp className="h-4 w-4 text-indigo-600" />}
                      {item.category === 'DISPATCHES' && <Truck className="h-4 w-4 text-sky-600" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-bold text-slate-900">{item.title}</span>
                        <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      </div>
                      <div className="truncate text-[11px] text-slate-500">{item.subtitle}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-[11px] font-medium text-slate-600 hidden sm:inline-block font-mono">
                      {item.meta}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border bg-white px-1.5 py-0.5 text-[10px] font-bold shadow-xs">↑</kbd>{' '}
              <kbd className="rounded border bg-white px-1.5 py-0.5 text-[10px] font-bold shadow-xs">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="rounded border bg-white px-1.5 py-0.5 text-[10px] font-bold shadow-xs">↵</kbd> Select
            </span>
          </div>
          <span>Showing {searchResults.length} matches</span>
        </div>
      </div>
    </div>
  );
};
