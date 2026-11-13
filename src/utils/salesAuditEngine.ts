/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Today's Sales Audit & Net TP (15% Less) Revision Engine
 * 
 * Rules:
 * 1. Checks all sales entries logged today (or across active customer accounts).
 * 2. If a sales order was logged at full Trade Price (Gross TP without 15% discount),
 *    it auto-recalculates unit net price (Gross * 0.85), order net total, and ledger debits.
 * 3. Updates customer outstanding balance and recomputes running ledger balances atomically.
 * 4. Preserves full audit trail and flags revision status.
 */

import { Customer, LedgerEntry, SalesOrder, SalesOrderItem } from '../types';
import { getBusinessTodayDate } from './entryManagement';

export interface SalesAuditLogEntry {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  originalGrossAmount: number;
  revisedNetAmount: number;
  discountAmount: number;
  itemsCount: number;
  status: 'REVISED_TO_NET_TP' | 'ALREADY_NET_TP';
  revisedAt: string;
}

export interface SalesAuditSummary {
  totalAudited: number;
  totalRevised: number;
  totalDiscountApplied: number;
  updatedOrders: SalesOrder[];
  updatedLedgerEntries: LedgerEntry[];
  updatedCustomers: Customer[];
  auditLogs: SalesAuditLogEntry[];
  auditTimestamp: string;
}

/**
 * Checks if a given sales order item or order is billed at full TP (without 15% discount)
 */
export function isOrderOnFullTp(order: SalesOrder): boolean {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return false;
  }

  // If discountAmount is 0 or items have discountPercent === 0 while subtotal === totalAmount
  const discountZero = (order.discountAmount || 0) === 0;
  const noItemDiscount = order.items.every((i) => (i.discountPercent || 0) === 0);
  const subtotalMatchesTotal = (order.subtotal || 0) > 0 && Math.abs((order.subtotal || 0) - (order.totalAmount || 0)) < 1;

  return discountZero && noItemDiscount && subtotalMatchesTotal;
}

/**
 * Recalculates a single sales order item to Net TP (15% Trade Discount)
 */
export function recalculateItemToNetTp(item: SalesOrderItem): SalesOrderItem {
  const qty = item.orderedQuantity || item.quantity || 0;
  const rawUnitPrice = item.unitPrice || 0;
  
  // If unit price is gross TP, apply 15% discount to arrive at Net TP
  const netUnitPrice = Math.round(rawUnitPrice * 0.85 * 100) / 100;
  const lineTotal = Math.round(qty * netUnitPrice * 100) / 100;

  return {
    ...item,
    unitPrice: netUnitPrice,
    discountPercent: 15,
    lineTotal,
    totalAmount: lineTotal,
  };
}

/**
 * Audits all sales entries across customer accounts and auto-recalculates full TP entries to Net TP (@15% less)
 */
export function auditAndReviseTodaySalesEntries(
  orders: SalesOrder[] = [],
  ledgerEntries: LedgerEntry[] = [],
  customers: Customer[] = [],
  filterTodayOnly: boolean = false
): SalesAuditSummary {
  const todayStr = getBusinessTodayDate();
  const nowIso = new Date().toISOString();

  let totalAudited = 0;
  let totalRevised = 0;
  let totalDiscountApplied = 0;

  const auditLogs: SalesAuditLogEntry[] = [];
  const modifiedOrderIds = new Set<string>();
  const modifiedCustomerIds = new Set<string>();

  // Map to store updated orders
  const revisedOrdersMap = new Map<string, SalesOrder>();
  orders.forEach((o) => revisedOrdersMap.set(o.id, { ...o }));

  // Filter orders to audit
  const targetOrders = orders.filter((o) => {
    if (filterTodayOnly) {
      const orderDateStr = o.orderDate || o.createdAt?.slice(0, 10) || '';
      return orderDateStr === todayStr;
    }
    return true; // Audit all sales orders across customer accounts
  });

  targetOrders.forEach((order) => {
    totalAudited += 1;
    const isFullTp = isOrderOnFullTp(order);

    if (isFullTp) {
      const originalAmount = order.totalAmount || order.subtotal || 0;
      
      // Recalculate line items
      const revisedItems = order.items.map((item) => recalculateItemToNetTp(item));
      const revisedNetTotal = revisedItems.reduce((acc, i) => acc + (i.lineTotal || 0), 0);
      const discountGiven = originalAmount - revisedNetTotal;

      const updatedOrder: SalesOrder = {
        ...order,
        subtotal: originalAmount,
        discountAmount: discountGiven,
        totalAmount: revisedNetTotal,
        netAmount: revisedNetTotal,
        netTotal: revisedNetTotal,
        items: revisedItems,
        notes: `${order.notes ? order.notes + ' | ' : ''}[AUTO-REVISED to Net TP (15% Less) on ${todayStr}]`,
      };

      revisedOrdersMap.set(order.id, updatedOrder);
      modifiedOrderIds.add(order.id);
      modifiedCustomerIds.add(order.customerId);
      totalRevised += 1;
      totalDiscountApplied += discountGiven;

      auditLogs.push({
        orderId: order.id,
        orderNumber: order.orderNumber || order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        orderDate: order.orderDate || todayStr,
        originalGrossAmount: originalAmount,
        revisedNetAmount: revisedNetTotal,
        discountAmount: discountGiven,
        itemsCount: revisedItems.length,
        status: 'REVISED_TO_NET_TP',
        revisedAt: nowIso,
      });
    } else {
      auditLogs.push({
        orderId: order.id,
        orderNumber: order.orderNumber || order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        orderDate: order.orderDate || todayStr,
        originalGrossAmount: order.totalAmount || 0,
        revisedNetAmount: order.totalAmount || 0,
        discountAmount: order.discountAmount || 0,
        itemsCount: order.items?.length || 0,
        status: 'ALREADY_NET_TP',
        revisedAt: nowIso,
      });
    }
  });

  const updatedOrders = Array.from(revisedOrdersMap.values());

  // Synchronize matching Ledger Debit Entries
  const updatedLedgerEntries = ledgerEntries.map((entry) => {
    // Match ledger debit entry with revised order
    const matchingOrder = updatedOrders.find(
      (o) =>
        modifiedOrderIds.has(o.id) &&
        (entry.referenceId === o.id ||
          entry.referenceNumber === o.orderNumber ||
          entry.entryNumber === o.orderNumber)
    );

    if (matchingOrder && entry.debitAmount > 0) {
      return {
        ...entry,
        debitAmount: matchingOrder.totalAmount,
        description: `${entry.description || ''} (Revised Net TP @ 15% Less)`,
      };
    }
    return entry;
  });

  // Recompute running balances per customer ledger
  const ledgerByCustomer = new Map<string, LedgerEntry[]>();
  updatedLedgerEntries.forEach((entry) => {
    const list = ledgerByCustomer.get(entry.customerId) || [];
    list.push(entry);
    ledgerByCustomer.set(entry.customerId, list);
  });

  // Recalculate customer current balances
  const updatedCustomers = customers.map((customer) => {
    const custLedger = ledgerByCustomer.get(customer.id);
    if (!custLedger || custLedger.length === 0) {
      return customer;
    }

    // Sort customer ledger chronologically (Oldest to Newest)
    const sorted = [...custLedger].sort(
      (a, b) => new Date(a.entryDate || a.createdAt).getTime() - new Date(b.entryDate || b.createdAt).getTime()
    );

    let running = customer.openingBalance || 0;
    sorted.forEach((e) => {
      if (e.transactionType === 'OPENING_BALANCE') {
        running = e.debitAmount || e.runningBalance || running;
      } else {
        running = running + (e.debitAmount || 0) - (e.creditAmount || 0);
      }
      e.runningBalance = running;
    });

    return {
      ...customer,
      currentBalance: running,
    };
  });

  return {
    totalAudited,
    totalRevised,
    totalDiscountApplied,
    updatedOrders,
    updatedLedgerEntries,
    updatedCustomers,
    auditLogs,
    auditTimestamp: nowIso,
  };
}
