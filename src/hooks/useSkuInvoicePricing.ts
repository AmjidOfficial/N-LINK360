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
import { NLINK_OFFICIAL_PRODUCTS, NLinkSKU } from '../data/nlink-products';

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
}

export interface InvoicePricingMetrics {
  isItemized: boolean;
  items: ProcessedInvoiceLineItem[];
  grossSubtotal: number;
  discount15: number;
  netInvoiceTotal: number;
}

/**
 * Pure calculation helper to evaluate order pricing against official catalog
 */
export function calculateInvoiceMetrics(
  order: Partial<SalesOrder> | null | undefined,
  catalog: (SKU | NLinkSKU)[] = NLINK_OFFICIAL_PRODUCTS
): InvoicePricingMetrics {
  if (!order) {
    return {
      isItemized: false,
      items: [],
      grossSubtotal: 0,
      discount15: 0,
      netInvoiceTotal: 0,
    };
  }

  const rawItems = order.items || [];
  const isItemized = Array.isArray(rawItems) && rawItems.length > 0;

  if (!isItemized) {
    const total = Number(order.totalAmount || order.subtotal || 0);
    const disc = Number(order.discountAmount || 0);
    return {
      isItemized: false,
      items: [],
      grossSubtotal: total,
      discount15: disc,
      netInvoiceTotal: total,
    };
  }

  // Lookup official trade price from catalog for each SKU item
  const processedItems: ProcessedInvoiceLineItem[] = rawItems.map((item: any, idx: number) => {
    const qty = Number(item.approvedQuantity || item.orderedQuantity || item.quantity || 0);
    const itemSkuCode = String(item.skuCode || item.skuId || '').trim().toLowerCase();
    const itemSkuId = String(item.skuId || '').trim().toLowerCase();

    // Match against official catalog
    const matchedSku = catalog.find((c: any) => {
      const cId = String(c.id || '').trim().toLowerCase();
      const cCode = String(c.skuCode || c.code || '').trim().toLowerCase();
      return (itemSkuId && cId === itemSkuId) || (itemSkuCode && (cCode === itemSkuCode || cId === itemSkuCode));
    });

    const officialPrice = matchedSku ? Number((matchedSku as any).tradePrice || (matchedSku as any).unitPrice || item.unitPrice || 0) : Number(item.unitPrice || 0);
    const lineGross = Math.round(qty * officialPrice);
    const lineDiscount = Math.round(lineGross * 0.15);
    const lineNet = lineGross - lineDiscount;

    return {
      id: item.id || `item-${idx}`,
      skuId: item.skuId || matchedSku?.id || `sku-${idx}`,
      skuCode: item.skuCode || (matchedSku as any)?.skuCode || 'NL-SKU',
      skuName: item.skuName || matchedSku?.name || 'National Light Product',
      quantity: qty,
      officialTradePrice: officialPrice,
      unitPrice: officialPrice,
      discountPercent: 15,
      lineGross,
      lineDiscount,
      lineNet,
    };
  });

  const grossSubtotal = processedItems.reduce((sum, i) => sum + i.lineGross, 0);
  const discount15 = Math.round(grossSubtotal * 0.15);
  const netInvoiceTotal = grossSubtotal - discount15;

  return {
    isItemized: true,
    items: processedItems,
    grossSubtotal,
    discount15,
    netInvoiceTotal,
  };
}

/**
 * Custom React Hook: Automatically evaluates & syncs SKU invoice pricing against rate card
 */
export function useSkuInvoicePricing(
  order: Partial<SalesOrder> | null | undefined,
  catalog: (SKU | NLinkSKU)[] = NLINK_OFFICIAL_PRODUCTS
): InvoicePricingMetrics {
  return useMemo(() => {
    return calculateInvoiceMetrics(order, catalog);
  }, [order, catalog]);
}
