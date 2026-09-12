import type { Customer, Invoice, LedgerEntry, Recovery, SalesOrder, SKU } from '../types';

/**
 * SalesPulse-derived interaction helpers for the N-LINK Dealer/Distributor app.
 *
 * These helpers deliberately contain no hard-coded SalesPulse data. They operate
 * only on the server-backed N-LINK entities supplied by the caller.
 */

export interface SalesPulseBrandGroup {
  key: string;
  label: string;
  skus: SKU[];
}

export interface DealerLedgerSummary {
  openingBalance: number;
  approvedInvoices: number;
  approvedRecoveries: number;
  approvedAdjustments: number;
  currentBalance: number;
}

export function groupSkusByBrand(skus: SKU[]): SalesPulseBrandGroup[] {
  const groups = new Map<string, SKU[]>();

  for (const sku of skus) {
    const key = String((sku as any).brand || (sku as any).brandName || sku.category || 'Other').trim() || 'Other';
    const current = groups.get(key) || [];
    current.push(sku);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      label: key,
      skus: items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    }));
}

export function clampOrderQuantity(quantity: number, availableQuantity: number, allowBackorder = false): number {
  const safeQuantity = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
  const safeAvailable = Number.isFinite(availableQuantity) ? Math.max(0, Math.floor(availableQuantity)) : 0;
  return allowBackorder ? safeQuantity : Math.min(safeQuantity, safeAvailable);
}

export function calculateOrderSummary(
  quantities: Record<string, number>,
  skus: SKU[],
): { totalSkus: number; totalQuantity: number; orderValue: number } {
  const skuMap = new Map(skus.map((sku) => [sku.id, sku]));
  let totalSkus = 0;
  let totalQuantity = 0;
  let orderValue = 0;

  for (const [skuId, rawQuantity] of Object.entries(quantities)) {
    const quantity = Math.max(0, Number(rawQuantity || 0));
    if (!quantity) continue;

    const sku = skuMap.get(skuId);
    if (!sku) continue;

    totalSkus += 1;
    totalQuantity += quantity;
    const price = Number((sku as any).tradePrice ?? (sku as any).retailPrice ?? (sku as any).pricePerCarton ?? 0);
    orderValue += quantity * (Number.isFinite(price) ? price : 0);
  }

  return { totalSkus, totalQuantity, orderValue };
}

/**
 * Calculates a customer balance from real transaction collections.
 * Opening balance may be supplied from the authoritative opening-balance transaction.
 */
export function calculateDealerLedgerSummary(
  customer: Customer,
  invoices: Invoice[],
  recoveries: Recovery[],
  ledgerEntries: LedgerEntry[] = [],
): DealerLedgerSummary {
  const customerId = customer.id;
  const openingBalance = Number((customer as any).openingBalance || 0);

  const approvedInvoices = invoices
    .filter((invoice: any) => invoice.customerId === customerId && String(invoice.status || '').toUpperCase() !== 'CANCELLED')
    .reduce((sum, invoice: any) => sum + Number(invoice.netAmount ?? invoice.totalAmount ?? invoice.amount ?? 0), 0);

  const approvedRecoveries = recoveries
    .filter((recovery: any) => recovery.customerId === customerId && String(recovery.status || '').toUpperCase() !== 'REJECTED')
    .reduce((sum, recovery: any) => sum + Number(recovery.amount || 0), 0);

  const approvedAdjustments = ledgerEntries
    .filter((entry: any) => entry.customerId === customerId && String(entry.transactionType || entry.type || '').toUpperCase().includes('ADJUST'))
    .reduce((sum, entry: any) => {
      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);
      return sum + debit - credit;
    }, 0);

  return {
    openingBalance,
    approvedInvoices,
    approvedRecoveries,
    approvedAdjustments,
    currentBalance: openingBalance + approvedInvoices - approvedRecoveries + approvedAdjustments,
  };
}

export function getCustomerOrderHistory(customerId: string, orders: SalesOrder[], limit = 5): SalesOrder[] {
  return orders
    .filter((order: any) => order.customerId === customerId)
    .sort((a: any, b: any) => String(b.createdAt || b.orderDate || '').localeCompare(String(a.createdAt || a.orderDate || '')))
    .slice(0, Math.max(0, limit));
}
