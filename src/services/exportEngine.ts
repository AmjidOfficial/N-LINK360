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
// 1. CUSTOMER LEDGER EXPORT (CSV & EXCEL)
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

export function exportCustomerLedgerToExcel(customer: Customer, entries: LedgerEntry[]): void {
  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Statement</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        body { font-family: Arial, sans-serif; }
        .header-title { font-size: 16pt; font-weight: bold; color: #047857; }
        .sub-header { font-size: 10pt; color: #374151; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #065f46; color: #ffffff; font-weight: bold; border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        td { border: 1px solid #e5e7eb; padding: 6px; font-size: 10pt; }
        .num { text-align: right; }
        .bold { font-weight: bold; }
        .total-row { background-color: #f3f4f6; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header-title">NATIONAL LIGHTS (PVT) LTD - CUSTOMER LEDGER STATEMENT</div>
      <div class="sub-header"><strong>Customer:</strong> ${customer.companyName} (${customer.customerCode}) | <strong>City:</strong> ${customer.city || 'N/A'} | <strong>Credit Limit:</strong> PKR ${(customer.creditLimit || 0).toLocaleString()}</div>
      <div class="sub-header"><strong>Generated On:</strong> ${new Date().toLocaleString()}</div>
      <br/>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Reference No</th>
            <th>Description</th>
            <th class="num">Debit (PKR)</th>
            <th class="num">Credit (PKR)</th>
            <th class="num">Running Balance (PKR)</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(e => `
            <tr>
              <td>${e.entryDate || e.createdAt?.slice(0, 10) || ''}</td>
              <td>${e.transactionType}</td>
              <td>${e.entryNumber || e.referenceId || ''}</td>
              <td>${e.description}</td>
              <td class="num">${e.debitAmount ? e.debitAmount.toFixed(2) : '0.00'}</td>
              <td class="num">${e.creditAmount ? e.creditAmount.toFixed(2) : '0.00'}</td>
              <td class="num bold">${e.runningBalance.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const filename = `NationalLights_Ledger_${customer.customerCode}_${new Date().toISOString().slice(0, 10)}.xls`;
  triggerDownload(tableHtml, filename, 'application/vnd.ms-excel;charset=utf-8;');
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
// 5. ORDERS EXCEL EXPORT
// ==============================================================================
export function exportOrdersToExcel(orders: SalesOrder[]): void {
  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>SalesOrders</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        body { font-family: Arial, sans-serif; }
        .header-title { font-size: 16pt; font-weight: bold; color: #047857; }
        .sub-header { font-size: 10pt; color: #374151; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th { background-color: #065f46; color: #ffffff; font-weight: bold; border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        td { border: 1px solid #e5e7eb; padding: 6px; font-size: 10pt; }
        .num { text-align: right; }
        .bold { font-weight: bold; }
        .total-row { background-color: #d1fae5; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header-title">NATIONAL LIGHTS (PVT) LTD - SALES ORDERS REPORT</div>
      <div class="sub-header"><strong>Generated On:</strong> ${new Date().toLocaleString()} | <strong>Total Orders:</strong> ${orders.length}</div>
      <br/>
      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Order Date</th>
            <th>Customer Code</th>
            <th>Customer Name</th>
            <th>Booked By</th>
            <th class="num">Items Count</th>
            <th class="num">Order Value (PKR)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td>${o.orderNumber}</td>
              <td>${o.orderDate ? o.orderDate.slice(0, 10) : ''}</td>
              <td>${o.customerCode || ''}</td>
              <td>${o.customerName || ''}</td>
              <td>${o.salesUserName || 'Sales Officer'}</td>
              <td class="num">${o.items?.length || 0}</td>
              <td class="num bold">${(o.totalAmount || 0).toLocaleString()}</td>
              <td>${o.status || 'SUBMITTED'}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="6" class="bold">GRAND TOTAL</td>
            <td class="num bold">${orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  triggerDownload(tableHtml, `NationalLights_SalesOrders_${new Date().toISOString().slice(0, 10)}.xls`, 'application/vnd.ms-excel');
}

// ==============================================================================
// 6. RECOVERIES EXCEL EXPORT
// ==============================================================================
export function exportRecoveriesToExcel(recoveries: Recovery[]): void {
  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Recoveries</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        body { font-family: Arial, sans-serif; }
        .header-title { font-size: 16pt; font-weight: bold; color: #1e40af; }
        .sub-header { font-size: 10pt; color: #374151; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        td { border: 1px solid #e5e7eb; padding: 6px; font-size: 10pt; }
        .num { text-align: right; }
        .bold { font-weight: bold; }
        .total-row { background-color: #dbeafe; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header-title">NATIONAL LIGHTS (PVT) LTD - PAYMENT RECOVERY REPORT</div>
      <div class="sub-header"><strong>Generated On:</strong> ${new Date().toLocaleString()} | <strong>Total Collections:</strong> ${recoveries.length}</div>
      <br/>
      <table>
        <thead>
          <tr>
            <th>Receipt #</th>
            <th>Collection Date</th>
            <th>Customer Code</th>
            <th>Customer Name</th>
            <th>Payment Mode</th>
            <th>Collected By</th>
            <th class="num">Amount (PKR)</th>
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${recoveries.map(r => `
            <tr>
              <td>${r.recoveryNumber}</td>
              <td>${r.collectionDate ? r.collectionDate.slice(0, 10) : ''}</td>
              <td>${r.customerCode || ''}</td>
              <td>${r.customerName || ''}</td>
              <td>${r.paymentMode || 'CASH'}</td>
              <td>${r.salesUserName || 'Recovery Officer'}</td>
              <td class="num bold">${(r.amount || 0).toLocaleString()}</td>
              <td>${r.status || 'VERIFIED'}</td>
              <td>${r.remarks || ''}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="6" class="bold">GRAND TOTAL RECOVERED</td>
            <td class="num bold">${recoveries.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString()}</td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  triggerDownload(tableHtml, `NationalLights_Recoveries_${new Date().toISOString().slice(0, 10)}.xls`, 'application/vnd.ms-excel');
}

// ==============================================================================
// 7. AUDIT LOGS EXPORT
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

