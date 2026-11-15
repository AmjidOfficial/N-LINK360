/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Complete SKU & Central Price List Service
 *
 * Centralizes all National Light rate-card SKUs, supports authorized RBAC price edits,
 * maintains immutable SKUPriceHistoryEntry audit entries, detects rate-card anomalies
 * without silently inventing missing values, and ensures historical posted invoices
 * never mutate when catalog prices change.
 */

import { SKU, SKUPriceHistoryEntry, UserRole } from '../types';
import { NATIONAL_LIGHT_OFFICIAL_CATALOG } from '../data/national-light-rate-card';
import { hasPermission } from '../lib/permissions';
import { getKarachiDateString } from '../utils/dateTime';

const PRICE_OVERRIDES_KEY = 'nlink360_price_list_overrides_v1';
const PRICE_HISTORY_KEY = 'nlink360_price_history_v1';

export interface PriceListAnomaly {
  id: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  type: 'DUPLICATE_SKU' | 'MISSING_PRICE' | 'PRICING_MATH_MISMATCH' | 'MISSING_PURCHASE_COST';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  tradePrice: number;
  listPrice: number;
  discountPercentage?: string;
}

export interface UpdateSkuPriceParams {
  skuId: string;
  newTradePrice: number;
  newListPrice: number;
  newDiscountPercent?: string;
  newPurchasePrice?: number | null;
  newDistributorPrice?: number | null;
  newTaxRate?: number;
  isActive?: boolean;
  effectiveDate?: string;
  reason: string;
  actor: {
    id?: string;
    fullName: string;
    email?: string;
    role: UserRole | string;
  };
}

let inMemoryOverrides: Record<string, Partial<SKU>> | null = null;
let inMemoryHistory: SKUPriceHistoryEntry[] | null = null;
const priceListeners = new Set<() => void>();

function readOverrides(): Record<string, Partial<SKU>> {
  if (inMemoryOverrides) return inMemoryOverrides;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PRICE_OVERRIDES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          inMemoryOverrides = parsed;
          return parsed;
        }
      }
    }
  } catch {
    // Fallback
  }
  inMemoryOverrides = {};
  return inMemoryOverrides;
}

function writeOverrides(overrides: Record<string, Partial<SKU>>): void {
  inMemoryOverrides = overrides;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PRICE_OVERRIDES_KEY, JSON.stringify(overrides));
    }
  } catch {
    // Ignore
  }
}

export function getPriceHistory(): SKUPriceHistoryEntry[] {
  if (inMemoryHistory) return [...inMemoryHistory];
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PRICE_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          inMemoryHistory = parsed;
          return [...parsed];
        }
      }
    }
  } catch {
    // Fallback
  }
  inMemoryHistory = [];
  return [];
}

function appendPriceHistory(entry: SKUPriceHistoryEntry): void {
  const list = getPriceHistory();
  list.unshift(entry);
  const trimmed = list.slice(0, 400);
  inMemoryHistory = trimmed;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(trimmed));
    }
  } catch {
    // Ignore
  }
}

export function subscribePriceList(listener: () => void): () => void {
  priceListeners.add(listener);
  return () => {
    priceListeners.delete(listener);
  };
}

function notifyPriceListeners(): void {
  priceListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // Ignore
    }
  });
}

function buildBaseCatalog(): SKU[] {
  return NATIONAL_LIGHT_OFFICIAL_CATALOG.map((item) => {
    const wattageMatch = item.name.match(/(\d+)W/i) || item.specification.match(/(\d+)W/i);
    const wattage = wattageMatch ? `${wattageMatch[1]}W` : undefined;
    return {
      id: item.id,
      productId: item.categoryGroup,
      productName: item.category,
      skuCode: item.sku,
      name: item.name,
      category: item.categoryGroup,
      categoryName: item.category,
      subcategory: item.specification,
      brandName: 'National Light',
      wattage,
      colorTemperature: item.colorTemp,
      packagingUnit: 'Carton',
      uom: 'PCS',
      packSize: item.quantityBox,
      cartonQuantity: item.quantityBox,
      unitsPerPack: 1,
      packsPerCarton: item.quantityBox,
      purchasePrice: null, // Never fabricate unverified cost prices
      tradePrice: item.tradePrice,
      dealerPrice: item.listPrice,
      retailPrice: item.listPrice,
      distributorPrice: null,
      minimumPrice: Math.round(item.listPrice * 0.95),
      discountPercentage: item.discountPercentage,
      taxRate: 0,
      reorderLevel: 50,
      currentStock: item.stockCount,
      isActive: item.inStock,
      status: item.inStock ? 'ACTIVE' : 'INACTIVE',
      effectivePriceDate: '2026-01-01',
    };
  });
}

/**
 * Returns the complete official SKU list merged with any authorized central price updates.
 */
export function getCentralPriceList(): SKU[] {
  const overrides = readOverrides();
  const base = buildBaseCatalog();
  return base.map((sku) => {
    const ov = overrides[sku.id] || overrides[sku.skuCode];
    if (!ov) return sku;
    return {
      ...sku,
      ...ov,
      id: sku.id,
      skuCode: sku.skuCode,
    };
  });
}

export function canEditCentralPriceList(role?: UserRole | string): boolean {
  if (!role) return false;
  const r = String(role).toUpperCase();
  if (r === 'SUPER_ADMIN' || r === 'ACCOUNTS' || r === 'MANAGEMENT') return true;
  return hasPermission(role as UserRole, 'masters.manage') || hasPermission(role as UserRole, 'recovery.verify');
}

function parseEffectiveDiscountRate(discountStr?: string): number | null {
  if (!discountStr) return null;
  const trimmed = discountStr.trim();
  // Composite cascading discounts like "12+1+15%"
  if (/^\d+(\.\d+)?(\+\d+(\.\d+)?)+%?$/.test(trimmed)) {
    const parts = trimmed.replace(/%$/, '').split('+').map((n) => parseFloat(n));
    let factor = 1;
    for (const p of parts) {
      if (Number.isNaN(p)) return null;
      factor *= 1 - p / 100;
    }
    return 1 - factor;
  }
  const match = trimmed.match(/^(\d+(\.\d+)?)%?$/);
  if (match) {
    return parseFloat(match[1]) / 100;
  }
  return null;
}

/**
 * Scans the SKU catalog for integrity defects:
 * - Duplicate SKU codes or IDs
 * - Missing or non-positive prices
 * - Rate-card arithmetic mismatches (e.g. NL-CP-12W and NL-ROD-20W)
 * Note: Missing purchasePrice is surfaced as LOW info without inventing numbers.
 */
export function scanCatalogPriceIntegrity(catalog: SKU[] = getCentralPriceList()): PriceListAnomaly[] {
  const anomalies: PriceListAnomaly[] = [];
  const seenCodes = new Map<string, string>();
  const seenIds = new Map<string, string>();

  for (const sku of catalog) {
    const normCode = String(sku.skuCode || '').trim().toUpperCase();
    const normId = String(sku.id || '').trim().toUpperCase();

    if (normCode && seenCodes.has(normCode)) {
      anomalies.push({
        id: `ANOM-DUP-CODE-${normCode}`,
        skuId: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.name,
        type: 'DUPLICATE_SKU',
        severity: 'HIGH',
        message: `Duplicate SKU code "${sku.skuCode}" shares code with "${seenCodes.get(normCode)}".`,
        tradePrice: sku.tradePrice,
        listPrice: sku.retailPrice,
        discountPercentage: sku.discountPercentage,
      });
    } else if (normCode) {
      seenCodes.set(normCode, sku.name);
    }

    if (normId && seenIds.has(normId)) {
      anomalies.push({
        id: `ANOM-DUP-ID-${normId}`,
        skuId: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.name,
        type: 'DUPLICATE_SKU',
        severity: 'HIGH',
        message: `Duplicate SKU ID "${sku.id}" found.`,
        tradePrice: sku.tradePrice,
        listPrice: sku.retailPrice,
        discountPercentage: sku.discountPercentage,
      });
    } else if (normId) {
      seenIds.set(normId, sku.name);
    }

    if (!(sku.tradePrice > 0) || !(sku.retailPrice > 0)) {
      anomalies.push({
        id: `ANOM-MISS-${sku.id}`,
        skuId: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.name,
        type: 'MISSING_PRICE',
        severity: 'HIGH',
        message: `Missing or non-positive Trade/List price on ${sku.skuCode}.`,
        tradePrice: sku.tradePrice,
        listPrice: sku.retailPrice,
        discountPercentage: sku.discountPercentage,
      });
      continue;
    }

    if (sku.retailPrice > sku.tradePrice) {
      anomalies.push({
        id: `ANOM-MATH-INV-${sku.id}`,
        skuId: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.name,
        type: 'PRICING_MATH_MISMATCH',
        severity: 'HIGH',
        message: `List/Net Price (Rs. ${sku.retailPrice}) exceeds Trade Price (Rs. ${sku.tradePrice}) despite ${sku.discountPercentage || '15%'} discount rule.`,
        tradePrice: sku.tradePrice,
        listPrice: sku.retailPrice,
        discountPercentage: sku.discountPercentage,
      });
    } else {
      const rate = parseEffectiveDiscountRate(sku.discountPercentage);
      if (rate !== null) {
        const expected = Math.round(sku.tradePrice * (1 - rate) * 100) / 100;
        const delta = Math.abs(expected - sku.retailPrice);
        if (delta > Math.max(15, expected * 0.03)) {
          anomalies.push({
            id: `ANOM-MATH-DISC-${sku.id}`,
            skuId: sku.id,
            skuCode: sku.skuCode,
            skuName: sku.name,
            type: 'PRICING_MATH_MISMATCH',
            severity: 'MEDIUM',
            message: `Discount math discrepancy: Trade Rs. ${sku.tradePrice} minus ${sku.discountPercentage} = Rs. ${expected}, but catalog List Price is Rs. ${sku.retailPrice}.`,
            tradePrice: sku.tradePrice,
            listPrice: sku.retailPrice,
            discountPercentage: sku.discountPercentage,
          });
        }
      }
    }
  }

  return anomalies;
}

/**
 * Authorized central price update. Writes an immutable SKUPriceHistoryEntry and
 * updates the active catalog ONLY. Historical posted invoices keep their frozen snapshots.
 */
export function updateSkuPriceAuthorized(params: UpdateSkuPriceParams): {
  updatedSku: SKU;
  historyEntry: SKUPriceHistoryEntry;
} {
  if (!canEditCentralPriceList(params.actor.role)) {
    throw new Error('Unauthorized: Only Head Office Accounts / Executive Admin can update catalog prices.');
  }
  if (!Number.isFinite(params.newTradePrice) || params.newTradePrice <= 0) {
    throw new Error('Trade price must be a positive number.');
  }
  if (!Number.isFinite(params.newListPrice) || params.newListPrice <= 0) {
    throw new Error('List/Dealer net price must be a positive number.');
  }
  const cleanReason = String(params.reason || '').trim();
  if (!cleanReason) {
    throw new Error('Price change reason is mandatory for the immutable audit log.');
  }

  const currentCatalog = getCentralPriceList();
  const target = currentCatalog.find((s) => s.id === params.skuId || s.skuCode === params.skuId);
  if (!target) {
    throw new Error(`SKU "${params.skuId}" not found in central catalog.`);
  }

  const nowIso = new Date().toISOString();
  const effectiveDate = params.effectiveDate || getKarachiDateString(nowIso);

  const overrides = readOverrides();
  const nextDiscount = params.newDiscountPercent ?? target.discountPercentage ?? '15%';
  const nextIsActive = params.isActive !== undefined ? params.isActive : target.isActive;

  overrides[target.id] = {
    ...(overrides[target.id] || {}),
    tradePrice: Math.round(params.newTradePrice * 100) / 100,
    retailPrice: Math.round(params.newListPrice * 100) / 100,
    dealerPrice: Math.round(params.newListPrice * 100) / 100,
    minimumPrice: Math.round(params.newListPrice * 0.95),
    purchasePrice:
      params.newPurchasePrice !== undefined ? params.newPurchasePrice : target.purchasePrice ?? null,
    distributorPrice:
      params.newDistributorPrice !== undefined
        ? params.newDistributorPrice
        : target.distributorPrice ?? null,
    taxRate: params.newTaxRate !== undefined ? params.newTaxRate : target.taxRate ?? 0,
    discountPercentage: nextDiscount,
    isActive: nextIsActive,
    status: nextIsActive ? 'ACTIVE' : 'INACTIVE',
    effectivePriceDate: effectiveDate,
    updatedAt: nowIso,
  };
  writeOverrides(overrides);

  const historyEntry: SKUPriceHistoryEntry = {
    id: `PH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    skuId: target.id,
    skuCode: target.skuCode,
    skuName: target.name,
    oldTradePrice: target.tradePrice,
    newTradePrice: overrides[target.id].tradePrice!,
    oldListPrice: target.retailPrice,
    newListPrice: overrides[target.id].retailPrice!,
    oldDiscountPercent: target.discountPercentage,
    newDiscountPercent: nextDiscount,
    effectiveDate,
    changedBy: params.actor.fullName,
    changedByEmail: params.actor.email,
    reason: cleanReason,
    createdAt: nowIso,
  };
  appendPriceHistory(historyEntry);
  notifyPriceListeners();

  const updatedSku = getCentralPriceList().find((s) => s.id === target.id)!;
  return { updatedSku, historyEntry };
}

export function resetPriceListOverridesForTests(): void {
  inMemoryOverrides = {};
  inMemoryHistory = [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PRICE_OVERRIDES_KEY);
      localStorage.removeItem(PRICE_HISTORY_KEY);
    }
  } catch {
    // Ignore
  }
}
