/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Official Sku Invoice Pricing & Rate Card Auto-Sync Hook
 * 
 * Automatically matches order items against the official National Lights rate card,
 * computes the mandatory 15% commercial invoice discount for SKU-itemized orders,
 * and preserves lump-sum total orders without modification.
 */

import { useMemo } from 'react';
import { SalesOrder, SKU } from '../types';
import { NLinkSKU } from '../data/nlink-products';
import { getCentralPriceList } from '../services/priceListService';

export interface ProcessedInvoiceLineItem {
  id: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  quantity: number;
  officialTradePrice: number;
  unitPrice: number;
  discountPercent: number;
  lineGross: number;
  lineDiscount: number;
  lineNet: number;
  isPriceLocked?: boolean;
}

export interface InvoicePricingMetrics {
  isItemized: boolean;
  isHistoricalPriceLocked: boolean;
  items: ProcessedInvoiceLineItem[];
  grossSubtotal: number;
  discount15: number;
  netInvoiceTotal: number;
}

const LOCKED_PRICING_STATUSES = new Set([
  'APPROVED',
  'PACKED',
  'INVOICED',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
  'PARTIALLY_DELIVERED',
]);

/**
 * Pure calculation helper to evaluate order pricing against central price list.
 * CRITICAL: Historical invoiced / approved orders preserve their frozen snapshot rates
 * and never mutate when future catalog prices change.
 */
export function calculateInvoiceMetrics(
  order: Partial<SalesOrder> | null | undefined,
  catalog?: (SKU | NLinkSKU)[]
): InvoicePricingMetrics {
  if (!order) {
    return {
      isItemized: false,
      isHistoricalPriceLocked: false,
      items: [],
      grossSubtotal: 0,
      discount15: 0,
      netInvoiceTotal: 0,
    };
  }

  const resolvedCatalog = catalog && catalog.length > 0 ? catalog : getCentralPriceList();
  const isOrderLocked =
    LOCKED_PRICING_STATUSES.has(String(order.status || '').toUpperCase()) ||
    order.shahzadApproval === 'APPROVED' ||
    Boolean(order.invoiceNumber || order.postedAt || order.invoicedAt);

  const rawItems = order.items || [];
  const isItemized = Array.isArray(rawItems) && rawItems.length > 0;

  if (!isItemized) {
    const total = Number(order.totalAmount || order.subtotal || 0);
    const disc = Number(order.discountAmount || 0);
    return {
      isItemized: false,
      isHistoricalPriceLocked: isOrderLocked,
      items: [],
      grossSubtotal: total,
      discount15: disc,
      netInvoiceTotal: total,
    };
  }

  // Lookup official trade price OR preserve historical snapshot if order is locked/snapshotted
  const processedItems: ProcessedInvoiceLineItem[] = rawItems.map((item: any, idx: number) => {
    const qty = Number(item.approvedQuantity || item.orderedQuantity || item.quantity || 0);
    const itemSkuCode = String(item.skuCode || item.skuId || '').trim().toLowerCase();
    const itemSkuId = String(item.skuId || '').trim().toLowerCase();

    const hasSnapshot =
      isOrderLocked ||
      Boolean(item.priceLockedAt) ||
      typeof item.unitTradePriceSnapshot === 'number';

    let officialPrice = 0;
    let discountPct = typeof item.discountPercentSnapshot === 'number'
      ? item.discountPercentSnapshot
      : typeof item.discountPercent === 'number'
      ? item.discountPercent
      : 15;

    if (hasSnapshot) {
      if (typeof item.unitTradePriceSnapshot === 'number' && item.unitTradePriceSnapshot > 0) {
        officialPrice = item.unitTradePriceSnapshot;
      } else if (Number(item.unitPrice || 0) > 0) {
        // If unitPrice was saved at net rate (with lineTotal = qty * unitPrice), recover gross TP cleanly
        const rawUnit = Number(item.unitPrice || 0);
        const rawLine = Number(item.lineTotal || item.totalAmount || 0);
        if (rawLine > 0 && qty > 0 && Math.abs(rawLine - qty * rawUnit) < Math.max(5, rawLine * 0.02)) {
          officialPrice = discountPct > 0 && discountPct < 100
            ? Math.round((rawUnit / (1 - discountPct / 100)) * 100) / 100
            : rawUnit;
        } else {
          officialPrice = rawUnit;
        }
      }
    }

    const matchedSku = resolvedCatalog.find((c: any) => {
      const cId = String(c.id || '').trim().toLowerCase();
      const cCode = String(c.skuCode || c.code || '').trim().toLowerCase();
      return (itemSkuId && cId === itemSkuId) || (itemSkuCode && (cCode === itemSkuCode || cId === itemSkuCode));
    });

    if (officialPrice <= 0) {
      officialPrice = matchedSku
        ? Number((matchedSku as any).tradePrice || (matchedSku as any).unitPrice || item.unitPrice || 0)
        : Number(item.unitPrice || 0);
    }

    const lineGross = Math.round(qty * officialPrice);
    const lineDiscount = Math.round(lineGross * (discountPct / 100));
    const lineNet = hasSnapshot && Number(item.lineTotal || 0) > 0 && isOrderLocked
      ? Math.round(Number(item.lineTotal))
      : lineGross - lineDiscount;

    return {
      id: item.id || `item-${idx}`,
      skuId: item.skuId || matchedSku?.id || `sku-${idx}`,
      skuCode: item.skuCode || (matchedSku as any)?.skuCode || 'NL-SKU',
      skuName: item.skuDescriptionSnapshot || item.skuName || matchedSku?.name || 'National Light Product',
      quantity: qty,
      officialTradePrice: officialPrice,
      unitPrice: officialPrice,
      discountPercent: discountPct,
      lineGross,
      lineDiscount,
      lineNet,
      isPriceLocked: hasSnapshot,
    };
  });

  const grossSubtotal = processedItems.reduce((sum, i) => sum + i.lineGross, 0);
  const netFromLines = processedItems.reduce((sum, i) => sum + i.lineNet, 0);
  const discount15 = isOrderLocked && Number(order.discountAmount || 0) > 0
    ? Number(order.discountAmount)
    : Math.max(0, grossSubtotal - netFromLines);
  const netInvoiceTotal = isOrderLocked && Number(order.totalAmount || 0) > 0
    ? Number(order.totalAmount)
    : grossSubtotal - discount15;

  return {
    isItemized: true,
    isHistoricalPriceLocked: isOrderLocked,
    items: processedItems,
    grossSubtotal,
    discount15,
    netInvoiceTotal,
  };
}

/**
 * Custom React Hook: Automatically evaluates & syncs SKU invoice pricing against central price list
 * while freezing historical posted invoice rates.
 */
export function useSkuInvoicePricing(
  order: Partial<SalesOrder> | null | undefined,
  catalog?: (SKU | NLinkSKU)[]
): InvoicePricingMetrics {
  return useMemo(() => {
    return calculateInvoiceMetrics(order, catalog);
  }, [order, catalog]);
}
