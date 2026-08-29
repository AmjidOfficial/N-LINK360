/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Export & Document Generation Engine
 * Generates sanitized CSV & Excel files with anti-formula injection defenses.
 */

import { formatCsvCell } from './security';
import { Customer, InventoryBalance, Invoice, LedgerEntry, Recovery, SalesOrder, SKU, StockReturn, AuditLog } from '../types';

export function triggerDownload(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==============================================================================
// 1. CUSTOMER LEDGER EXPORT
// ==============================================================================
export function exportCustomerLedgerToCsv(customer: Customer, entries: LedgerEntry[]): void {
  const headers = ['Date', 'Entry Type', 'Reference No', 'Description', 'Debit (PKR)', 'Credit (PKR)', 'Running Balance (PKR)'];
  
  const rows: string[][] = [
    ['NATIONAL LIGHTS - OFFICIAL CUSTOMER STATEMENT'],
    ['Customer Code', customer.customerCode, 'Customer Name', customer.companyName || customer.customerCode],
    ['Contact Person', customer.contactPerson || '-', 'Phone', customer.phone || '-'],
    ['City / Region', `${customer.city || ''} / ${customer.region || ''}`, 'Credit Limit', (customer?.creditLimit || 0).toLocaleString()],
    ['Statement Generated', new Date().toLocaleString()],
    [],
    headers,
  ];

  entries.forEach((e) => {
    rows.push([
      e.entryDate || e.createdAt?.slice(0, 10) || '',
      e.transactionType,
      e.entryNumber || e.referenceId || '',
      e.description,
      e.debitAmount ? e.debitAmount.toFixed(2) : '0.00',
      e.creditAmount ? e.creditAmount.toFixed(2) : '0.00',
      e.runningBalance.toFixed(2),
    ]);
  });

  const csvString = rows.map((row) => row.map(formatCsvCell).join(',')).join('\r\n');
  const filename = `Ledger_${customer.customerCode}_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerDownload(csvString, filename);
}

// ==============================================================================
// 2. SALES & INVOICES EXPORT
// ==============================================================================
export function exportInvoicesToCsv(invoices: Invoice[], customers: Customer[]): void {
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const headers = [
    'Invoice Number',
    'Invoice Date',
    'Customer Code',
    'Customer Name',
    'Order Ref',
    'Status',
    'Payment Status',
    'Subtotal (PKR)',
    'Tax Amount (PKR)',
    'Total Amount (PKR)',
    'Items Count',
  ];

  const rows: string[][] = [
    ['NATIONAL LIGHTS - POSTED INVOICES REGISTER'],
    ['Exported Date', new Date().toLocaleString()],
    ['Total Invoices', invoices.length.toString()],
    [],
    headers,
  ];

  invoices.forEach((inv) => {
    const cust = customerMap.get(inv.customerId);
    rows.push([
      inv.invoiceNumber,
      inv.invoiceDate,
      cust?.customerCode || inv.customerCode || inv.customerId,
      cust?.companyName || inv.customerName || 'Customer',
      inv.orderId || 'Direct Sale',
      inv.status,
      inv.paymentStatus || 'CREDIT',
      inv.subtotal.toFixed(2),
      inv.taxAmount.toFixed(2),
      inv.totalAmount.toFixed(2),
      (inv.items?.length || 0).toString(),
    ]);
  });

  const csvString = rows.map((row) => row.map(formatCsvCell).join(',')).join('\r\n');
  triggerDownload(csvString, `NationalLights_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
}

// ==============================================================================
// 3. INVENTORY STOCK & BALANCES EXPORT
// ==============================================================================
export function exportInventoryToCsv(skus: SKU[], balances: InventoryBalance[]): void {
  const balanceMap = new Map(balances.map((b) => [b.skuId, b.quantityOnHand]));
  const headers = [
    'SKU Code',
    'Product / Description',
    'Brand',
    'Category',
    'Wattage',
    'Color Temp',
    'Carton Size (Pcs)',
    'Trade Price (PKR)',
    'Retail Price (PKR)',
    'Current Stock (Pcs)',
    'Current Stock (Cartons)',
    'Stock Valuation (PKR)',
    'Reorder Level',
    'Status',
  ];

  const rows: string[][] = [
    ['NATIONAL LIGHTS - CENTRAL WAREHOUSE STOCK VALUATION'],
    ['Valuation Date', new Date().toLocaleString()],
    [],
    headers,
  ];

  let totalValuation = 0;
  skus.forEach((s) => {
    const qty = balanceMap.get(s.id) ?? balanceMap.get(s.skuCode) ?? 0;
    const valuation = qty * s.tradePrice;
    totalValuation += valuation;
    const cartons = s.cartonQuantity ? (qty / s.cartonQuantity).toFixed(1) : '-';

    rows.push([
      s.skuCode,
      s.name,
      s.brandName || 'National Lights',
      s.categoryName || 'Lighting',
      s.wattage || '',
      s.colorTemperature || '',
      s.cartonQuantity?.toString() || '1',
      s.tradePrice.toFixed(2),
      s.retailPrice.toFixed(2),
      qty.toString(),
      cartons,
      valuation.toFixed(2),
      (s.reorderLevel || 0).toString(),
      qty <= (s.reorderLevel || 0) ? 'LOW STOCK' : 'OPTIMAL',
    ]);
  });

  rows.push([]);
  rows.push(['TOTAL INVENTORY VALUATION', '', '', '', '', '', '', '', '', '', '', totalValuation.toFixed(2)]);

  const csvString = rows.map((row) => row.map(formatCsvCell).join(',')).join('\r\n');
  triggerDownload(csvString, `NationalLights_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
}

// ==============================================================================
// 4. RECOVERY & CASH COLLECTIONS EXPORT
// ==============================================================================
export function exportRecoveriesToCsv(recoveries: Recovery[], customers: Customer[]): void {
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const headers = [
    'Receipt Voucher #',
    'Collection Date',
    'Customer Code',
    'Customer Name',
    'Payment Method',
    'Instrument Ref #',
    'Collected By',
    'Amount (PKR)',
    'Status',
    'Verified By',
    'Verification Date',
  ];

  const rows: string[][] = [
    ['NATIONAL LIGHTS - RECOVERY & COLLECTION LEDGER'],
    ['Exported Date', new Date().toLocaleString()],
    [],
    headers,
  ];

  recoveries.forEach((r) => {
    const cust = customerMap.get(r.customerId);
    rows.push([
      r.recoveryNumber || r.id,
      r.collectionDate || r.createdAt?.slice(0, 10) || '',
      cust?.customerCode || r.customerCode || r.customerId,
      cust?.companyName || r.customerName || 'Customer',
      r.paymentMode,
      r.instrumentNumber || 'N/A',
      r.salesUserName || 'Sales Officer',
      r.amount.toFixed(2),
      r.status,
      r.verifiedBy || 'Pending',
      r.verifiedAt ? r.verifiedAt.slice(0, 10) : 'Pending',
    ]);
  });

  const csvString = rows.map((row) => row.map(formatCsvCell).join(',')).join('\r\n');
  triggerDownload(csvString, `NationalLights_Recoveries_${new Date().toISOString().slice(0, 10)}.csv`);
}

// ==============================================================================
// 5. AUDIT LOGS EXPORT
// ==============================================================================
export function exportAuditLogsToCsv(logs: AuditLog[]): void {
  const headers = ['Timestamp', 'User Email / ID', 'Module', 'Action', 'Record ID', 'Before Value', 'After Value'];

  const rows: string[][] = [
    ['NATIONAL LIGHTS - COMPLIANCE AUDIT TRAIL'],
    ['Generated Date', new Date().toLocaleString()],
    [],
    headers,
  ];

  logs.forEach((log) => {
    const prev = log.previousState ?? log.beforeValue;
    const next = log.newState ?? log.afterValue;
    rows.push([
      log.createdAt || log.timestamp || '',
      log.userEmail || log.userName || log.userId || 'System',
      log.module,
      log.action,
      log.recordId,
      typeof prev === 'object' && prev !== null ? JSON.stringify(prev) : String(prev || ''),
      typeof next === 'object' && next !== null ? JSON.stringify(next) : String(next || ''),
    ]);
  });

  const csvString = rows.map((row) => row.map(formatCsvCell).join(',')).join('\r\n');
  triggerDownload(csvString, `NationalLights_AuditTrail_${new Date().toISOString().slice(0, 10)}.csv`);
}

