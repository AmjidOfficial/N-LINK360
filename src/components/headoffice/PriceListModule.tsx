/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Central Complete SKU & Price List Manager
 *
 * Features:
 * - Full catalog display with category/search filters & missing-cost safe display ("Not Set")
 * - Catalog Integrity & Rate-Card Math Anomaly diagnostics banner
 * - RBAC-gated price editing (preserves historical posted invoices untouched!)
 * - Immutable Price History audit trail
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  History,
  Lock,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { SKU, SKUPriceHistoryEntry } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import {
  canEditCentralPriceList,
  getCentralPriceList,
  getPriceHistory,
  scanCatalogPriceIntegrity,
  subscribePriceList,
  updateSkuPriceAuthorized,
} from '../../services/priceListService';
import { recordSyncLifecycleEvent } from '../../services/autoSaveSyncService';
import { formatKarachiDateTime, getKarachiDateString } from '../../utils/dateTime';
import { generateDeterministicTransactionId, computeSyncFingerprintHash } from '../../utils/transactionSignature';
import { generateIdempotencyUuid } from '../../utils/idGenerator';
import { safeApiFetch } from '../../lib/safeFetch';

export interface PriceListModuleProps {
  currentUser: NLinkUser;
}

export const PriceListModule: React.FC<PriceListModuleProps> = ({ currentUser }) => {
  const [skus, setSkus] = useState<SKU[]>(() => getCentralPriceList());
  const [history, setHistory] = useState<SKUPriceHistoryEntry[]>(() => getPriceHistory());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'HISTORY'>('CATALOG');
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [editTradePrice, setEditTradePrice] = useState('');
  const [editListPrice, setEditListPrice] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [editEffectiveDate, setEditEffectiveDate] = useState(() => getKarachiDateString());
  const [editReason, setEditReason] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribePriceList(() => {
      setSkus(getCentralPriceList());
      setHistory(getPriceHistory());
    });
    return unsub;
  }, []);

  const canEdit = canEditCentralPriceList(currentUser.role);
  const anomalies = useMemo(() => scanCatalogPriceIntegrity(skus), [skus]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    skus.forEach((s) => {
      if (s.category) map.set(s.category, s.categoryName || s.category);
    });
    return Array.from(map.entries());
  }, [skus]);

  const filteredSkus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return skus.filter((sku) => {
      if (selectedCategory !== 'ALL' && sku.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        sku.name.toLowerCase().includes(q) ||
        sku.skuCode.toLowerCase().includes(q) ||
        (sku.categoryName || sku.category || '').toLowerCase().includes(q) ||
        (sku.subcategory || '').toLowerCase().includes(q)
      );
    });
  }, [skus, searchQuery, selectedCategory]);

  const openEditModal = (sku: SKU) => {
    setEditingSku(sku);
    setEditTradePrice(String(sku.tradePrice));
    setEditListPrice(String(sku.retailPrice));
    setEditPurchasePrice(sku.purchasePrice !== null && sku.purchasePrice !== undefined ? String(sku.purchasePrice) : '');
    setEditDiscount(sku.discountPercentage || '15%');
    setEditEffectiveDate(getKarachiDateString());
    setEditReason('');
    setEditError(null);
  };

  const handleSavePriceEdit = async () => {
    if (!editingSku) return;
    setEditError(null);

    const tp = Number(editTradePrice);
    const lp = Number(editListPrice);
    const pp = editPurchasePrice.trim() === '' ? null : Number(editPurchasePrice);
    if (!Number.isFinite(tp) || tp <= 0) {
      setEditError('Please enter a valid positive Trade Price.');
      return;
    }
    if (!Number.isFinite(lp) || lp <= 0) {
      setEditError('Please enter a valid positive Dealer / List Net Price.');
      return;
    }
    if (pp !== null && (!Number.isFinite(pp) || pp < 0)) {
      setEditError('Purchase Cost must be blank (Not Set) or non-negative.');
      return;
    }
    if (!editReason.trim()) {
      setEditError('Audit reason is mandatory before committing price updates.');
      return;
    }

    try {
      const result = updateSkuPriceAuthorized({
        skuId: editingSku.id,
        newTradePrice: tp,
        newListPrice: lp,
        newPurchasePrice: pp,
        newDiscountPercent: editDiscount || '15%',
        effectiveDate: editEffectiveDate,
        reason: editReason.trim(),
        actor: {
          id: currentUser.id,
          fullName: currentUser.fullName,
          email: currentUser.email,
          role: currentUser.role,
        },
      });

      const txnId = generateDeterministicTransactionId('SYN', editEffectiveDate);
      const idemKey = generateIdempotencyUuid();
      const fpHash = computeSyncFingerprintHash({
        module: 'PRICE_LIST',
        skuId: editingSku.id,
        tp,
        lp,
        effectiveDate: editEffectiveDate,
        idemKey,
      });

      recordSyncLifecycleEvent({
        module: 'PRICE_LIST',
        recordType: 'SKUPriceUpdate',
        databaseId: editingSku.id,
        transactionId: txnId,
        idempotencyKey: idemKey,
        fingerprintHash: fpHash,
        syncStatus: 'SAVED_IN_DB',
        summary: `${editingSku.skuCode} rate updated: TP Rs. ${tp} / Net Rs. ${lp} (historical invoices preserved)`,
      });

      let token = '';
      try {
        token = localStorage.getItem('nlink_sec_token') || localStorage.getItem('nlink_auth_token') || '';
      } catch {}
      if (token) {
        void safeApiFetch(`/api/price-list/${encodeURIComponent(editingSku.id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tradePrice: tp,
            listPrice: lp,
            purchasePrice: pp,
            discountPercentage: editDiscount || '15%',
            effectiveDate: editEffectiveDate,
            reason: editReason.trim(),
          }),
        }).catch(() => {});
      }

      setEditingSku(null);
      setStatusToast(
        `Updated ${result.updatedSku.skuCode} (${result.updatedSku.name}) effective ${editEffectiveDate}. Historical posted invoices remain locked.`
      );
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update SKU price.');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-xs">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            National Lights Master Product Catalog &amp; Central Price Governance
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Complete SKU &amp; Price List ({skus.length} Official Products)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Single source of truth for new orders &amp; quotes. Posted historical invoices preserve their locked line-item rate snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('CATALOG')}
            className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${
              activeTab === 'CATALOG'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            SKU Price List ({skus.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Price Change History ({history.length})</span>
          </button>
        </div>
      </div>

      {statusToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {statusToast}
          </span>
          <button type="button" onClick={() => setStatusToast(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Catalog Price Integrity Diagnostics Banner */}
      {anomalies.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Catalog Rate-Card Integrity Diagnostics: {anomalies.length} Price Discrepanc{anomalies.length === 1 ? 'y' : 'ies'} Detected (Preserved Untouched)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {anomalies.map((anom) => (
              <div
                key={anom.id}
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/80 dark:border-amber-800/50 text-[11px]"
              >
                <div className="font-mono font-bold text-slate-900 dark:text-white">
                  {anom.skuCode} · {anom.skuName}
                </div>
                <div className="text-amber-800 dark:text-amber-300 mt-0.5">{anom.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'CATALOG' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU code, product name, wattage, or specification..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 font-semibold outline-none"
            >
              <option value="ALL">All Categories ({skus.length})</option>
              {categories.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* SKU Price Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-3 px-4">SKU Code &amp; Product</th>
                    <th className="py-3 px-3">Category / Brand</th>
                    <th className="py-3 px-3 text-center">UOM / Pack</th>
                    <th className="py-3 px-3 text-right">Purchase Cost</th>
                    <th className="py-3 px-3 text-right">Trade Price (TP)</th>
                    <th className="py-3 px-3 text-center">Discount</th>
                    <th className="py-3 px-3 text-right">Dealer Net Price</th>
                    <th className="py-3 px-3 text-center">Effective Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSkus.map((sku) => {
                    const hasAnomaly = anomalies.some((a) => a.skuId === sku.id);
                    return (
                      <tr
                        key={sku.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                          hasAnomaly ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{sku.skuCode}</span>
                            {hasAnomaly && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{sku.name}</div>
                          <div className="text-[10px] text-slate-400">{sku.subcategory}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {sku.categoryName || sku.category}
                          </div>
                          <div className="text-[10px] text-slate-400">{sku.brandName || 'National Light'}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          {sku.uom || 'PCS'} / {sku.packSize || sku.cartonQuantity}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {sku.purchasePrice !== null && sku.purchasePrice !== undefined
                            ? `Rs. ${sku.purchasePrice.toLocaleString()}`
                            : 'Not Set'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          Rs. {sku.tradePrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                          {sku.discountPercentage || '15%'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 dark:text-emerald-300">
                          Rs. {sku.retailPrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                          {sku.effectivePriceDate || '2026-01-01'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(sku)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Rate</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                              <Lock className="w-3 h-3" /> Read-Only
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Price History Log */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
            Immutable Central Price Revision History
          </div>
          {history.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No post-launch price revisions recorded yet. Authorized edits appear here with effective date &amp; actor.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((entry) => (
                <div key={entry.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      {entry.skuCode} · {entry.skuName}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      Trade: Rs. {entry.oldTradePrice} → <strong>Rs. {entry.newTradePrice}</strong> · Net List: Rs.{' '}
                      {entry.oldListPrice} → <strong>Rs. {entry.newListPrice}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Reason: {entry.reason} · Changed by <strong>{entry.changedBy}</strong>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-500 shrink-0">
                    <div>Effective: {entry.effectiveDate}</div>
                    <div>Logged: {formatKarachiDateTime(entry.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Rate Modal */}
      {editingSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Edit Official SKU Price — {editingSku.skuCode}
                </h3>
                <p className="text-[11px] text-slate-500">{editingSku.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSku(null)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200 font-semibold">
              Safeguard Active: Updating catalog prices applies ONLY to new orders &amp; quotes. Historical posted invoices preserve their locked snapshot prices.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Trade Price (PKR)</label>
                <input
                  type="number"
                  value={editTradePrice}
                  onChange={(e) => setEditTradePrice(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Dealer Net Price (PKR)</label>
                <input
                  type="number"
                  value={editListPrice}
                  onChange={(e) => setEditListPrice(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Discount Rule</label>
                <input
                  type="text"
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Purchase Cost (Optional)</label>
                <input
                  type="number"
                  placeholder="Not Set"
                  value={editPurchasePrice}
                  onChange={(e) => setEditPurchasePrice(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Effective Date</label>
              <input
                type="date"
                value={editEffectiveDate}
                onChange={(e) => setEditEffectiveDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Revision Reason (Required)</label>
              <input
                type="text"
                placeholder="e.g. Official Nov 2026 Revised Rate Card"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
              />
            </div>

            {editError && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                {editError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSku(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSavePriceEdit()}
                className="btn-primary px-4 py-2 rounded-xl font-bold cursor-pointer"
              >
                Save Authorized Price
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
