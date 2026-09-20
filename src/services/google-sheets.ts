/**
 * N-LINK 360 — Google Sheets Storage & Synchronization Service
 *
 * Allows seamless live synchronization of all enterprise business data
 * (Customers, Orders, Recoveries, Visits, Inventory, Invoices) into Google Sheets.
 */

import { SupabaseAppData } from './supabase-data';

const GOOGLE_SHEETS_WEBHOOK_KEY = 'nlink_google_sheets_webhook_url';
const LAST_SYNC_KEY = 'nlink_google_sheets_last_sync';

export function getGoogleSheetsWebhookUrl(): string {
  return localStorage.getItem(GOOGLE_SHEETS_WEBHOOK_KEY) || '';
}

export function setGoogleSheetsWebhookUrl(url: string): void {
  localStorage.setItem(GOOGLE_SHEETS_WEBHOOK_KEY, url.trim());
}

export function getGoogleSheetsLastSync(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

export interface GoogleSheetsSyncPayload {
  timestamp: string;
  source: string;
  summary: {
    customersCount: number;
    ordersCount: number;
    recoveriesCount: number;
    visitsCount: number;
    inventoryCount: number;
    invoicesCount: number;
  };
  customers: Array<{
    code: string;
    name: string;
    type: string;
    town: string;
    route?: string;
    region?: string;
    contactPerson?: string;
    phone: string;
    creditLimit: number;
    currentBalance: number;
    status: string;
  }>;
  salesOrders: Array<{
    orderId: string;
    customerName: string;
    salesUserName: string;
    orderDate: string;
    totalAmount: number;
    status: string;
    dualApprovalStatus: string;
    shahzadApproval: string;
    itemsCount: number;
  }>;
  recoveries: Array<{
    id: string;
    customerName: string;
    salesUserName: string;
    amount: number;
    paymentMode: string;
    instrumentNumber: string;
    bankName: string;
    dualApprovalStatus: string;
    shahzadApproval: string;
    recordedAt: string;
  }>;
  ledgers: Array<{
    customerCode: string;
    customerName: string;
    date: string;
    type: string;
    referenceNumber: string;
    debit: number;
    credit: number;
    runningBalance: number;
    dualApprovalStatus: string;
  }>;
  visits: Array<{
    date: string;
    time: string;
    customerName: string;
    userName: string;
    town: string;
    purpose: string;
  }>;
  inventory: Array<{
    skuCode: string;
    skuName: string;
    category: string;
    stockPieces: number;
    tradePrice: number;
    stockValuation: number;
  }>;
  invoices: Array<{
    invoiceCode: string;
    customerName: string;
    invoiceDate: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    status: string;
  }>;
}

export function formatAppDataForGoogleSheets(appData: SupabaseAppData): GoogleSheetsSyncPayload {
  const inventoryStockMap = new Map<string, number>();
  (appData.inventoryBalances || []).forEach((ib) => {
    const prev = inventoryStockMap.get(ib.skuId) || 0;
    inventoryStockMap.set(ib.skuId, prev + (ib.quantityOnHand || 0));
  });

  return {
    timestamp: new Date().toISOString(),
    source: 'N-LINK 360 National Lights Operating System',
    summary: {
      customersCount: appData.customers.length,
      ordersCount: appData.salesOrders.length,
      recoveriesCount: appData.recoveries.length,
      visitsCount: appData.visits.length,
      inventoryCount: appData.skus.length,
      invoicesCount: appData.invoices.length,
    },
    customers: appData.customers.map((c: any) => ({
      code: c.customerCode || c.code || c.id,
      name: c.companyName || c.businessName || 'Customer',
      type: c.type || c.channelType || 'DEALER',
      town: c.city || c.town || '',
      route: c.route || c.territory || '',
      contactPerson: c.contactPerson || c.ownerName || '',
      phone: c.phone || c.contactNumber || c.mobile || '',
      creditLimit: Number(c.creditLimit || 0),
      currentBalance: Number(c.currentBalance || 0),
      status: c.isActive ? 'ACTIVE' : 'INACTIVE',
    })),
    salesOrders: appData.salesOrders.map((o: any) => {
      const cust = appData.customers.find((c) => c.id === o.customerId);
      const isApproved = o.status === 'APPROVED' || o.dualApprovalStatus === 'DUAL_APPROVED';
      return {
        orderId: o.orderNumber || o.orderCode || o.id,
        customerName: o.customerName || cust?.companyName || (cust as any)?.businessName || o.customerId,
        salesUserName: o.salesUserName || 'Sales Officer',
        orderDate: o.orderDate || o.createdAt || new Date().toISOString().slice(0, 10),
        totalAmount: o.totalAmount || o.netTotal || 0,
        status: o.status,
        dualApprovalStatus: o.dualApprovalStatus || (isApproved ? 'APPROVED' : 'PENDING_APPROVAL'),
        shahzadApproval: o.shahzadApproval || (isApproved ? 'APPROVED' : 'PENDING'),
        itemsCount: (o.items || []).length,
      };
    }),
    recoveries: appData.recoveries.map((r: any) => {
      const cust = appData.customers.find((c) => c.id === r.customerId);
      const isApproved = r.status === 'VERIFIED' || r.dualApprovalStatus === 'DUAL_APPROVED';
      return {
        id: r.recoveryNumber || r.recoveryCode || r.id,
        customerName: r.customerName || cust?.companyName || (cust as any)?.businessName || r.customerId,
        salesUserName: r.salesUserName || 'Sales Officer',
        amount: r.amount || 0,
        paymentMode: r.paymentMode || 'CASH',
        instrumentNumber: r.instrumentNumber || 'N/A',
        bankName: r.bankName || 'Direct Deposit',
        dualApprovalStatus: r.dualApprovalStatus || (isApproved ? 'CONFIRMED' : 'PENDING_CONFIRMATION'),
        shahzadApproval: r.shahzadApproval || (isApproved ? 'APPROVED' : 'PENDING'),
        recordedAt: r.collectionDate || r.recordedAt || r.createdAt || new Date().toISOString(),
      };
    }),
    ledgers: (() => {
      const entries: Array<{
        customerCode: string;
        customerName: string;
        date: string;
        type: string;
        referenceNumber: string;
        debit: number;
        credit: number;
        runningBalance: number;
        dualApprovalStatus: string;
      }> = [];

      (appData.customers || []).forEach((c: any) => {
        let runningBal = Number(c.openingBalance || 0);
        const cCode = c.customerCode || c.code || c.id;
        const cName = c.companyName || c.businessName || 'Customer';

        // Opening Balance Row
        if (runningBal > 0) {
          entries.push({
            customerCode: cCode,
            customerName: cName,
            date: (c.createdAt || '2026-01-01').slice(0, 10),
            type: 'OPENING_BALANCE',
            referenceNumber: `OP-${cCode}`,
            debit: runningBal,
            credit: 0,
            runningBalance: runningBal,
            dualApprovalStatus: 'DUAL_APPROVED',
          });
        }

        // Transactions: Invoices & Recoveries
        const custInvoices = (appData.invoices || []).filter((inv: any) => inv.customerId === c.id);
        const custRecoveries = (appData.recoveries || []).filter((rec: any) => rec.customerId === c.id);

        const txs: Array<{
          date: string;
          type: 'INVOICE' | 'RECOVERY';
          ref: string;
          amount: number;
          dualApproved: boolean;
        }> = [];

        custInvoices.forEach((inv: any) => {
          const isDual = inv.status === 'POSTED' || inv.status === 'PAID';
          txs.push({
            date: inv.invoiceDate || inv.createdAt || '2026-01-01',
            type: 'INVOICE',
            ref: inv.invoiceNumber || inv.invoiceCode || inv.id,
            amount: Number(inv.totalAmount || 0),
            dualApproved: isDual,
          });
        });

        custRecoveries.forEach((rec: any) => {
          const isDual = rec.dualApprovalStatus === 'DUAL_APPROVED' || rec.status === 'VERIFIED';
          txs.push({
            date: rec.collectionDate || rec.recordedAt || rec.createdAt || '2026-01-01',
            type: 'RECOVERY',
            ref: rec.recoveryNumber || rec.recoveryCode || rec.id,
            amount: Number(rec.amount || 0),
            dualApproved: isDual,
          });
        });

        // Sort chronologically
        txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        txs.forEach((tx) => {
          if (tx.dualApproved) {
            if (tx.type === 'INVOICE') runningBal += tx.amount;
            if (tx.type === 'RECOVERY') runningBal -= tx.amount;
          }

          entries.push({
            customerCode: cCode,
            customerName: cName,
            date: tx.date.slice(0, 10),
            type: tx.type,
            referenceNumber: tx.ref,
            debit: tx.type === 'INVOICE' ? tx.amount : 0,
            credit: tx.type === 'RECOVERY' ? tx.amount : 0,
            runningBalance: runningBal,
            dualApprovalStatus: tx.dualApproved ? 'DUAL_APPROVED' : 'PENDING_DUAL_APPROVAL',
          });
        });
      });

      return entries;
    })(),
    visits: appData.visits.map((v: any) => {
      const cust = appData.customers.find((c) => c.id === v.customerId);
      return {
        date: v.checkinTime ? v.checkinTime.slice(0, 10) : (v.visitDate || new Date().toISOString().slice(0, 10)),
        time: v.checkinTime ? v.checkinTime.slice(11, 16) : (v.checkInTime || '09:00'),
        customerName: v.customerName || cust?.companyName || (cust as any)?.businessName || v.customerId,
        userName: v.salesUserName || v.salesUserId || v.assignedEmployeeId || 'Field Officer',
        town: cust?.city || (cust as any)?.town || '',
        purpose: v.purpose || 'Field Sales Routine',
      };
    }),
    inventory: appData.skus.map((s: any) => {
      const stock = inventoryStockMap.get(s.id) ?? (s.stockQty || 0);
      const price = s.tradePrice || 0;
      return {
        skuCode: s.skuCode || s.code || s.id,
        skuName: s.name,
        category: s.categoryName || s.category || 'LIGHTING',
        stockPieces: stock,
        tradePrice: price,
        stockValuation: stock * price,
      };
    }),
    invoices: appData.invoices.map((inv: any) => {
      const cust = appData.customers.find((c) => c.id === inv.customerId);
      return {
        invoiceCode: inv.invoiceNumber || inv.invoiceCode || inv.id,
        customerName: inv.customerName || cust?.companyName || (cust as any)?.businessName || inv.customerId,
        invoiceDate: inv.invoiceDate || inv.createdAt || new Date().toISOString().slice(0, 10),
        subtotal: inv.subtotal || 0,
        taxAmount: inv.taxAmount || 0,
        totalAmount: inv.totalAmount || 0,
        status: inv.status || inv.paymentStatus || 'POSTED',
      };
    }),
  };
}

/**
 * Send live data payload to Google Apps Script Webhook
 */
export async function syncToGoogleSheetsWebhook(
  webhookUrl: string,
  appData: SupabaseAppData
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com')) {
    throw new Error(
      'Invalid Google Apps Script Webhook URL. It must start with https://script.google.com/macros/s/.../exec'
    );
  }

  const payload = formatAppDataForGoogleSheets(appData);

  // In browsers, Google Apps Script webhooks require mode: 'no-cors' for simple redirects,
  // or a standard POST with text/plain body to avoid CORS preflight rejection.
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  const nowIso = new Date().toLocaleString();
  localStorage.setItem(LAST_SYNC_KEY, nowIso);

  return {
    success: true,
    message: `Successfully synchronized ${payload.summary.customersCount} Customers, ${payload.summary.ordersCount} Orders, ${payload.summary.recoveriesCount} Recoveries, and ${payload.summary.inventoryCount} SKUs to Google Sheet at ${nowIso}!`,
  };
}

/**
 * Download complete multi-table CSV file for direct Google Sheet import
 */
export function exportGoogleSheetsCsv(appData: SupabaseAppData): void {
  const payload = formatAppDataForGoogleSheets(appData);

  let csvContent = 'data:text/csv;charset=utf-8,';

  // Section 1: Customers
  csvContent += '=== CUSTOMERS & DEALERS ===\n';
  csvContent += 'Customer Code,Business Name,Type,Town / City,Route,Contact Person,Phone,Credit Limit (PKR),Current Balance (PKR),Status,Last Synced\n';
  payload.customers.forEach((c) => {
    csvContent += `"${c.code}","${c.name}","${c.type}","${c.town}","${c.route}","${c.contactPerson}","${c.phone}",${c.creditLimit},${c.currentBalance},"${c.status}","${payload.timestamp}"\n`;
  });

  csvContent += '\n=== SALES ORDERS (EXECUTIVE APPROVAL) ===\n';
  csvContent += 'Order ID,Customer Name,Sales Officer,Order Date,Total Amount (PKR),Status,Approval Status,Shahzad Ullah Approval,Items Count\n';
  payload.salesOrders.forEach((o) => {
    csvContent += `"${o.orderId}","${o.customerName}","${o.salesUserName}","${o.orderDate}",${o.totalAmount},"${o.status}","${o.dualApprovalStatus}","${o.shahzadApproval}",${o.itemsCount}\n`;
  });

  csvContent += '\n=== PAYMENT RECOVERIES (EXECUTIVE CONFIRMATION) ===\n';
  csvContent += 'Recovery Code,Customer Name,Sales Officer,Amount (PKR),Payment Mode,Instrument Ref,Bank,Confirmation Status,Shahzad Ullah Confirmation,Date\n';
  payload.recoveries.forEach((r) => {
    csvContent += `"${r.id}","${r.customerName}","${r.salesUserName}",${r.amount},"${r.paymentMode}","${r.instrumentNumber}","${r.bankName}","${r.dualApprovalStatus}","${r.shahzadApproval}","${r.recordedAt}"\n`;
  });

  csvContent += '\n=== RUNNING LEDGER TRANSACTIONS (DUAL-APPROVED ARCHITECTURE) ===\n';
  csvContent += 'Customer Code,Customer Name,Date,Type,Reference #,Debit (PKR),Credit (PKR),Running Balance (PKR),Approval Status\n';
  payload.ledgers.forEach((l) => {
    csvContent += `"${l.customerCode}","${l.customerName}","${l.date}","${l.type}","${l.referenceNumber}",${l.debit},${l.credit},${l.runningBalance},"${l.dualApprovalStatus}"\n`;
  });

  csvContent += '\n=== INVENTORY & FINISHED GOODS ===\n';
  csvContent += 'SKU Code,SKU Name,Category,Stock (Pieces),Trade Price (PKR),Valuation (PKR)\n';
  payload.inventory.forEach((i) => {
    csvContent += `"${i.skuCode}","${i.skuName}","${i.category}",${i.stockPieces},${i.tradePrice},${i.stockValuation}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `NLINK360_GoogleSheets_Data_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * The Google Apps Script template code that powers the Google Sheet Web App
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * N-LINK 360 — Google Sheet Webhook Sync Engine
 * Paste this into Google Sheets > Extensions > Apps Script
 * Click Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone)
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    
    // 1. Sync Customers Sheet
    var custSheet = sheet.getSheetByName("Customers") || sheet.insertSheet("Customers");
    if (custSheet.getLastRow() === 0) {
      custSheet.appendRow(["Customer Code", "Business Name", "Type", "Town / City", "Route", "Contact Person", "Phone", "Credit Limit (PKR)", "Current Balance (PKR)", "Status", "Last Synced"]);
    }
    if (payload.customers && payload.customers.length > 0) {
      if (custSheet.getLastRow() > 1) {
        custSheet.getRange(2, 1, custSheet.getLastRow() - 1, 11).clearContent();
      }
      var custRows = payload.customers.map(function(c) {
        return [c.code, c.name, c.type, c.town, c.route || c.region || '', c.contactPerson || '', c.phone || '', c.creditLimit, c.currentBalance, c.status, payload.timestamp];
      });
      custSheet.getRange(2, 1, custRows.length, 11).setValues(custRows);
    }

    // 2. Sync Sales Orders Sheet (With Shahzad Ullah Executive Approval Columns)
    var orderSheet = sheet.getSheetByName("Sales_Orders") || sheet.insertSheet("Sales_Orders");
    if (orderSheet.getLastRow() === 0) {
      orderSheet.appendRow(["Order ID", "Customer Name", "Sales Officer", "Order Date", "Total Amount (PKR)", "Status", "Approval Status", "Shahzad Ullah", "Items Count", "Last Synced"]);
    }
    if (payload.salesOrders && payload.salesOrders.length > 0) {
      if (orderSheet.getLastRow() > 1) {
        orderSheet.getRange(2, 1, orderSheet.getLastRow() - 1, 10).clearContent();
      }
      var orderRows = payload.salesOrders.map(function(o) {
        return [o.orderId, o.customerName, o.salesUserName, o.orderDate, o.totalAmount, o.status, o.dualApprovalStatus, o.shahzadApproval, o.itemsCount, payload.timestamp];
      });
      orderSheet.getRange(2, 1, orderRows.length, 10).setValues(orderRows);
    }

    // 3. Sync Recoveries Sheet (With Shahzad Ullah Executive Confirmation Columns)
    var recSheet = sheet.getSheetByName("Recoveries") || sheet.insertSheet("Recoveries");
    if (recSheet.getLastRow() === 0) {
      recSheet.appendRow(["Recovery Code", "Customer Name", "Sales Officer", "Amount (PKR)", "Mode", "Instrument Ref", "Bank", "Confirmation Status", "Shahzad Ullah", "Date Recorded", "Last Synced"]);
    }
    if (payload.recoveries && payload.recoveries.length > 0) {
      if (recSheet.getLastRow() > 1) {
        recSheet.getRange(2, 1, recSheet.getLastRow() - 1, 11).clearContent();
      }
      var recRows = payload.recoveries.map(function(r) {
        return [r.id, r.customerName, r.salesUserName, r.amount, r.paymentMode, r.instrumentNumber, r.bankName, r.dualApprovalStatus, r.shahzadApproval, r.recordedAt, payload.timestamp];
      });
      recSheet.getRange(2, 1, recRows.length, 11).setValues(recRows);
    }

    // 4. Sync Ledgers Sheet (Permanent Running Balance from Transaction History)
    var ledgerSheet = sheet.getSheetByName("Ledgers") || sheet.insertSheet("Ledgers");
    if (ledgerSheet.getLastRow() === 0) {
      ledgerSheet.appendRow(["Customer Code", "Customer Name", "Date", "Transaction Type", "Reference #", "Debit / Invoice (PKR)", "Credit / Recovery (PKR)", "Running Balance (PKR)", "Dual Approval Status", "Last Synced"]);
    }
    if (payload.ledgers && payload.ledgers.length > 0) {
      if (ledgerSheet.getLastRow() > 1) {
        ledgerSheet.getRange(2, 1, ledgerSheet.getLastRow() - 1, 10).clearContent();
      }
      var ledgerRows = payload.ledgers.map(function(l) {
        return [l.customerCode, l.customerName, l.date, l.type, l.referenceNumber, l.debit, l.credit, l.runningBalance, l.dualApprovalStatus, payload.timestamp];
      });
      ledgerSheet.getRange(2, 1, ledgerRows.length, 10).setValues(ledgerRows);
    }

    // 5. Sync Inventory Sheet
    var invSheet = sheet.getSheetByName("Inventory_Stock") || sheet.insertSheet("Inventory_Stock");
    if (invSheet.getLastRow() === 0) {
      invSheet.appendRow(["SKU Code", "SKU Name", "Category", "Available Stock (Pcs)", "Trade Price (PKR)", "Valuation (PKR)", "Last Synced"]);
    }
    if (payload.inventory && payload.inventory.length > 0) {
      if (invSheet.getLastRow() > 1) {
        invSheet.getRange(2, 1, invSheet.getLastRow() - 1, 7).clearContent();
      }
      var invRows = payload.inventory.map(function(i) {
        return [i.skuCode, i.skuName, i.category, i.stockPieces, i.tradePrice, i.stockValuation, payload.timestamp];
      });
      invSheet.getRange(2, 1, invRows.length, 7).setValues(invRows);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", received: payload.summary }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;
