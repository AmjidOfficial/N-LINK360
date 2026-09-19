/**
 * N-LINK 360 — Direct Google Sheets API Integration Service
 * 
 * Interacts with Google Sheets API v4 using authenticated bearer tokens
 * Specifically configured for target Spreadsheet ID: 1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo
 */

import { SupabaseAppData } from './supabase-data';
import { getStoredUsers, NLinkUser } from '../data/nlink-users-team';
import { NLINK_OFFICIAL_PRODUCTS } from '../data/nlink-products';

export const TARGET_SPREADSHEET_ID = '1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo';
const SPREADSHEET_ID_STORAGE_KEY = 'nlink_active_google_sheet_id';

export function getActiveSpreadsheetId(): string {
  return localStorage.getItem(SPREADSHEET_ID_STORAGE_KEY) || TARGET_SPREADSHEET_ID;
}

export function setActiveSpreadsheetId(id: string): void {
  const cleanId = id.trim().replace(/^.*\/d\//, '').replace(/\/.*$/, '');
  localStorage.setItem(SPREADSHEET_ID_STORAGE_KEY, cleanId || TARGET_SPREADSHEET_ID);
}

export interface SheetMetadata {
  id: string;
  title: string;
  sheets: Array<{
    sheetId: number;
    title: string;
    rowCount: number;
    columnCount: number;
  }>;
}

export interface RateLimitStatus {
  isRateLimited: boolean;
  retryAfterSeconds: number;
  lastLimitedTime: number | null;
}

let rateLimitStatus: RateLimitStatus = {
  isRateLimited: false,
  retryAfterSeconds: 0,
  lastLimitedTime: null,
};

const subscribers = new Set<(status: RateLimitStatus) => void>();

export function getRateLimitStatus(): RateLimitStatus {
  if (rateLimitStatus.isRateLimited && rateLimitStatus.lastLimitedTime) {
    const elapsed = Math.floor((Date.now() - rateLimitStatus.lastLimitedTime) / 1000);
    const remaining = Math.max(0, rateLimitStatus.retryAfterSeconds - elapsed);
    if (remaining === 0) {
      rateLimitStatus.isRateLimited = false;
      rateLimitStatus.retryAfterSeconds = 0;
      rateLimitStatus.lastLimitedTime = null;
    } else {
      return {
        ...rateLimitStatus,
        retryAfterSeconds: remaining,
      };
    }
  }
  return rateLimitStatus;
}

export function subscribeToRateLimit(callback: (status: RateLimitStatus) => void) {
  subscribers.add(callback);
  callback(getRateLimitStatus());
  return () => {
    subscribers.delete(callback);
  };
}

export function notifyRateLimit(retryAfterSecs: number) {
  rateLimitStatus = {
    isRateLimited: true,
    retryAfterSeconds: retryAfterSecs,
    lastLimitedTime: Date.now(),
  };
  subscribers.forEach((cb) => cb(getRateLimitStatus()));
}

/**
 * Exponential Backoff Fetch wrapper to mitigate API Rate limits and intermittent 429/403 errors
 */
export async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 4,
  baseDelayMs = 1000
): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      
      // Handle rate limits (429) or potential quota errors (403)
      if (response.status === 429 || response.status === 403) {
        attempt++;
        if (response.status === 403) {
          // Trigger rate limit state (60 seconds countdown block)
          notifyRateLimit(60);
        }
        if (attempt >= maxRetries) {
          return response;
        }
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
        console.warn(`[Google API Rate Limit] Status ${response.status} detected on attempt ${attempt}/${maxRetries}. Retrying in ${Math.round(delay)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      console.warn(`[Google API Network Error] Error on attempt ${attempt}/${maxRetries}. Retrying in ${Math.round(delay)}ms...`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Google Sheets API call failed after ${maxRetries} backoff attempts.`);
}

/**
 * Fetch Google Spreadsheet metadata (Title, sheet tab names, dimensions)
 */
export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SheetMetadata> {
  const res = await fetchWithBackoff(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(
      errJson.error?.message || `Failed to fetch Google Spreadsheet (${res.status} ${res.statusText})`
    );
  }

  const data = await res.json();
  return {
    id: data.spreadsheetId,
    title: data.properties?.title || 'National Lights Database',
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title,
      rowCount: s.properties?.gridProperties?.rowCount || 0,
      columnCount: s.properties?.gridProperties?.columnCount || 0,
    })),
  };
}

/**
 * Read cell values from a specific sheet range
 */
export async function readSpreadsheetRange(
  spreadsheetId: string,
  range: string,
  accessToken: string
): Promise<any[][]> {
  const encodedRange = encodeURIComponent(range);
  const res = await fetchWithBackoff(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error reading range ${range}`);
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Append rows to a specific sheet
 */
export async function appendSpreadsheetRows(
  spreadsheetId: string,
  range: string,
  values: any[][],
  accessToken: string
): Promise<{ updatedRows: number }> {
  const encodedRange = encodeURIComponent(range);
  const res = await fetchWithBackoff(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error appending rows to Google Sheet`);
  }

  const data = await res.json();
  return {
    updatedRows: data.updates?.updatedRows || values.length,
  };
}

/**
 * Update (overwrite) a specific sheet range with values
 */
export async function updateSpreadsheetRange(
  spreadsheetId: string,
  range: string,
  values: any[][],
  accessToken: string
): Promise<void> {
  const encodedRange = encodeURIComponent(range);
  const res = await fetchWithBackoff(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error updating Google Sheet range ${range}`);
  }
}

/**
 * Update (overwrite) multiple ranges simultaneously using a single batchUpdate API request to avoid rate limits
 */
export async function batchUpdateSpreadsheetRanges(
  spreadsheetId: string,
  data: { range: string; values: any[][] }[],
  accessToken: string
): Promise<void> {
  const res = await fetchWithBackoff(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error batch updating Google Sheet ranges`);
  }
}

/**
 * Ensure required sheets exist in the spreadsheet (adds them if missing)
 */
export async function ensureSheetTabsExist(
  spreadsheetId: string,
  requiredTabTitles: string[],
  accessToken: string
): Promise<string[]> {
  const meta = await fetchSpreadsheetMetadata(spreadsheetId, accessToken);
  const existingTitles = new Set(meta.sheets.map((s) => s.title));

  const missingTabs = requiredTabTitles.filter((title) => !existingTitles.has(title));
  if (missingTabs.length === 0) {
    return meta.sheets.map((s) => s.title);
  }

  // Create missing sheets via batchUpdate
  const requests = missingTabs.map((title) => ({
    addSheet: {
      properties: {
        title,
      },
    },
  }));

  const res = await fetchWithBackoff(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    console.warn('Could not auto-create missing sheet tabs, will fallback to available tabs');
  }

  return [...existingTitles, ...missingTabs];
}

/**
 * Sync entire N-LINK 360 database into structured tabs in Google Sheets
 */
export async function syncDatabaseToGoogleSheet(
  spreadsheetId: string,
  appData: SupabaseAppData,
  accessToken: string
): Promise<{ success: boolean; message: string; timestamp: string }> {
  // Ensure all enterprise tabs exist in the Google Spreadsheet
  const requiredTabs = [
    'User_Management',
    'Product_Management',
    'Ledger',
    'Invoice_Data',
    'Sales_Data',
    'Customers_Dealers',
    'Recoveries_Collections',
    'Attendance_Visits',
    'Customers',
    'Sales_Orders',
    'Recoveries',
    'Inventory_Stock',
  ];
  await ensureSheetTabsExist(spreadsheetId, requiredTabs, accessToken).catch((e) => {
    console.warn('Tab verification warning:', e);
  });

  const nowIso = new Date().toLocaleString();
  const teamUsers = getStoredUsers();

  // 1. User Management Sheet (Every user with official @nationallight.pk registered email)
  const userRows: any[][] = [
    [
      'Employee Code',
      'Full Name',
      'Registered Corporate Email (@nationallight.pk)',
      'Contact Phone',
      'Role Code',
      'Designation / Title',
      'Department',
      'Region',
      'Area',
      'Territory',
      'Assigned Towns / Beats',
      'Monthly Sales Target (PKR)',
      'Monthly Recovery Target (PKR)',
      'Account Status',
      'Last Synced At',
    ],
    ...teamUsers.map((u: NLinkUser) => [
      u.employeeCode || u.id,
      u.fullName,
      u.email,
      u.phone,
      u.role,
      u.roleTitle || u.role,
      u.department || 'EXECUTIVE',
      u.region || 'National',
      u.area || 'National',
      u.territory || 'National',
      (u.assignedTowns || []).join(', ') || 'All Assigned Beats',
      Number(u.monthlySalesTarget || 0),
      Number(u.monthlyRecoveryTarget || 0),
      u.status || 'ACTIVE',
      nowIso,
    ]),
  ];

  // 2. Product Management Sheet (National Light Official Catalog & Stock Valuation)
  const productRows: any[][] = [
    [
      'SKU Code',
      'National Light Product Name',
      'Category Group',
      'Wattage / Specification',
      'Carton Box Qty (Pcs)',
      'Available Stock (Pcs)',
      'Trade Price / TP (PKR)',
      'Retail List Price / MRP (PKR)',
      'Commercial Discount Scheme',
      'Total Stock Value (PKR)',
      'Product Status',
      'Last Synced At',
    ],
    ...NLINK_OFFICIAL_PRODUCTS.map((p) => {
      const stock = p.stockInHand || 100;
      const tp = p.tradePrice || 0;
      return [
        p.skuCode,
        p.name,
        p.categoryLabel || p.category,
        p.specification || p.wattage,
        p.cartonQuantity || 20,
        stock,
        tp,
        p.retailPrice || 0,
        p.discountPercentage || '5% Commercial',
        stock * tp,
        p.isActive ? 'ACTIVE IN MARKET' : 'DISCONTINUED',
        nowIso,
      ];
    }),
  ];

  // 3. Customers / Dealers Sheet
  const customerRows: any[][] = [
    [
      'Customer Code',
      'Business Name',
      'Channel Type',
      'Town / City',
      'Route / Market',
      'Contact Person',
      'Phone / WhatsApp',
      'Credit Limit (PKR)',
      'Credit Days',
      'Current Balance (PKR)',
      'Credit Health Status',
      'Dealer Status',
      'Last Synced At',
    ],
    ...appData.customers.map((c: any) => [
      c.customerCode || c.code || c.id,
      c.companyName || c.businessName || 'Customer',
      c.type || c.channelType || 'DEALER',
      c.city || c.town || '',
      c.route || '',
      c.contactPerson || '',
      c.phone || '',
      Number(c.creditLimit || 0),
      Number(c.creditDays || 30),
      Number(c.currentBalance || 0),
      Number(c.currentBalance || 0) > Number(c.creditLimit || 0) ? 'HIGH RISK' : 'NORMAL',
      c.isActive ? 'ACTIVE' : 'INACTIVE',
      nowIso,
    ]),
  ];

  // 4. Sales Data Sheet (All Sales Orders & Velocity)
  const salesRows: any[][] = [
    [
      'Order Number',
      'Order Date',
      'Customer Code',
      'Dealer / Business Name',
      'Town / Beat',
      'Booked By (Sales Officer)',
      'Items Count',
      'Total Amount (PKR)',
      'Payment Mode',
      'Dual Approval Status',
      'Syed Zain Approval',
      'Shahzad Ullah Approval',
      'Order Status',
      'Remarks',
      'Last Synced At',
    ],
    ...appData.salesOrders.map((o: any) => {
      const cust = appData.customers.find((c) => c.id === o.customerId);
      return [
        o.orderNumber || o.orderCode || o.id,
        o.orderDate || o.createdAt || new Date().toISOString().slice(0, 10),
        cust?.customerCode || o.customerCode || '',
        o.customerName || cust?.companyName || (cust as any)?.businessName || o.customerId,
        cust?.town || cust?.city || 'Assigned Beat',
        o.salesUserName || 'Sales Booker',
        (o.items || []).length,
        Number(o.totalAmount || o.netTotal || 0),
        o.paymentMode || 'CREDIT',
        o.dualApprovalStatus || (o.status === 'APPROVED' ? 'DUAL_APPROVED' : 'PENDING_DUAL_APPROVAL'),
        o.zainApproval || (o.status === 'APPROVED' ? 'APPROVED' : 'PENDING'),
        o.shahzadApproval || (o.status === 'APPROVED' ? 'APPROVED' : 'PENDING'),
        o.status || 'BOOKED',
        o.notes || '',
        nowIso,
      ];
    }),
  ];

  // 5. Invoices Sheet (Detailed Invoice Ledger & Breakdown)
  const invoiceRows: any[][] = [
    [
      'Invoice / Order Ref #',
      'Invoice Date',
      'Customer Code',
      'Dealer Business Name',
      'Town / City',
      'Sales Officer',
      'Items Summary',
      'Total Items / Cartons',
      'Gross Amount (PKR)',
      'Discount (PKR)',
      'Tax / GST (PKR)',
      'Net Invoice Total (PKR)',
      'Payment Terms',
      'Payment Status',
      'Dual Approval Status',
      'Syed Zain Approval',
      'Shahzad Ullah Approval',
      'Last Synced At',
    ],
    ...appData.salesOrders.map((o: any) => {
      const cust = appData.customers.find((c) => c.id === o.customerId);
      const items = o.items || [];
      const gross = items.reduce((s: number, it: any) => s + (Number(it.unitPrice || it.rate || 0) * Number(it.quantity || 0)), 0) || Number(o.totalAmount || 0);
      const discount = Math.round(gross * 0.05);
      const tax = Math.round((gross - discount) * 0.18);
      const net = Number(o.totalAmount || gross - discount + tax);
      const itemSummary = items.map((it: any) => `${it.productName || it.name || 'SKU'} (${it.quantity} pcs)`).join('; ') || 'Standard Order Items';

      return [
        o.orderNumber || o.id,
        o.orderDate || o.createdAt || new Date().toISOString().slice(0, 10),
        cust?.customerCode || o.customerCode || '',
        o.customerName || cust?.companyName || 'Dealer',
        cust?.town || cust?.city || 'Town',
        o.salesUserName || 'Sales Booker',
        itemSummary,
        items.length,
        gross,
        discount,
        tax,
        net,
        o.paymentMode || 'CREDIT 30 DAYS',
        o.status === 'APPROVED' ? 'AUTHORIZED / BILLED' : 'PENDING_APPROVAL',
        o.dualApprovalStatus || (o.status === 'APPROVED' ? 'DUAL_APPROVED' : 'PENDING'),
        o.zainApproval || (o.status === 'APPROVED' ? 'APPROVED' : 'PENDING'),
        o.shahzadApproval || (o.status === 'APPROVED' ? 'APPROVED' : 'PENDING'),
        nowIso,
      ];
    }),
  ];

  // 6. Recoveries Collections Sheet (Cash & Bank Deposit details)
  const recoveryRows: any[][] = [
    [
      'Recovery Receipt #',
      'Customer Code',
      'Dealer / Customer Name',
      'Town / City',
      'Amount Received (PKR)',
      'Collection Channel (Cash / Bank Deposit)',
      'Instrument Ref / Cheque # / Deposit Slip',
      'Bank Name',
      'Collection Date',
      'Collector / Officer',
      'Collection Status',
      'Dual Approval Status',
      'Syed Zain Approval',
      'Shahzad Ullah Approval',
      'Last Synced At',
    ],
    ...appData.recoveries.map((r: any) => {
      const cust = appData.customers.find((c) => c.id === r.customerId);
      return [
        r.recoveryNumber || r.recoveryCode || r.id,
        cust?.customerCode || r.customerCode || '',
        r.customerName || cust?.companyName || (cust as any)?.businessName || r.customerId,
        cust?.town || cust?.city || 'Town',
        Number(r.amount || 0),
        r.paymentMode || 'CASH',
        r.instrumentNumber || 'N/A',
        r.bankName || 'Direct Cash Collection',
        r.collectionDate || r.recordedAt || new Date().toISOString().slice(0, 10),
        r.collectedBy || 'Recovery Officer',
        r.status || 'COLLECTED',
        r.dualApprovalStatus || (r.status === 'VERIFIED' ? 'DUAL_APPROVED' : 'PENDING_DUAL_APPROVAL'),
        r.zainApproval || (r.status === 'VERIFIED' ? 'APPROVED' : 'PENDING'),
        r.shahzadApproval || (r.status === 'VERIFIED' ? 'APPROVED' : 'PENDING'),
        nowIso,
      ];
    }),
  ];

  // 7. Running Double-Entry Ledger Sheet
  const ledgerRows: any[][] = [
    [
      'Entry Date',
      'Customer Code',
      'Customer / Dealer Name',
      'Town / City',
      'Transaction Type',
      'Reference #',
      'Debit / Invoice (PKR)',
      'Credit / Recovery (PKR)',
      'Running Balance (PKR)',
      'Dual Approval Status',
      'Remarks',
      'Last Synced At',
    ],
  ];

  appData.customers.forEach((cust: any) => {
    let runningBal = Number(cust.openingBalance || 0);

    // Initial Opening Balance row
    ledgerRows.push([
      cust.createdAt ? cust.createdAt.slice(0, 10) : '2026-01-01',
      cust.customerCode || cust.id,
      cust.companyName || 'Dealer',
      cust.town || cust.city || 'Town',
      'OPENING_BALANCE',
      'INIT-BALANCE',
      runningBal > 0 ? runningBal : 0,
      0,
      runningBal,
      'PERMANENT',
      'Account Setup Opening Balance',
      nowIso,
    ]);

    // Gather customer transactions
    const custOrders = (appData.salesOrders || []).filter((o: any) => o.customerId === cust.id);
    const custRecoveries = (appData.recoveries || []).filter((r: any) => r.customerId === cust.id);

    type Tx = { date: string; type: 'INVOICE' | 'RECOVERY'; ref: string; debit: number; credit: number; approval: string; remarks: string };
    const txs: Tx[] = [
      ...custOrders.map((o: any) => ({
        date: o.orderDate || o.createdAt || '',
        type: 'INVOICE' as const,
        ref: o.orderNumber || o.id,
        debit: Number(o.totalAmount || 0),
        credit: 0,
        approval: o.dualApprovalStatus || (o.status === 'APPROVED' ? 'DUAL_APPROVED' : 'PENDING'),
        remarks: `Sales Order #${o.orderNumber || o.id} (${(o.items || []).length} items)`,
      })),
      ...custRecoveries.map((r: any) => ({
        date: r.collectionDate || r.createdAt || '',
        type: 'RECOVERY' as const,
        ref: r.recoveryNumber || r.id,
        debit: 0,
        credit: Number(r.amount || 0),
        approval: r.dualApprovalStatus || (r.status === 'VERIFIED' ? 'DUAL_APPROVED' : 'PENDING'),
        remarks: `Payment Recovery via ${r.paymentMode || 'CASH'} - ${r.bankName || ''} Ref: ${r.instrumentNumber || 'Direct'}`,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    txs.forEach((tx) => {
      if (tx.approval === 'DUAL_APPROVED' || tx.approval === 'APPROVED') {
        runningBal = runningBal + tx.debit - tx.credit;
      }
      ledgerRows.push([
        tx.date || nowIso.slice(0, 10),
        cust.customerCode || cust.id,
        cust.companyName || 'Dealer',
        cust.town || cust.city || 'Town',
        tx.type,
        tx.ref,
        tx.debit,
        tx.credit,
        runningBal,
        tx.approval,
        tx.remarks,
        nowIso,
      ]);
    });
  });

  // 8. Attendance & Visits Sheet
  const visitRows: any[][] = [
    [
      'Log ID',
      'Log Type',
      'Date',
      'Time',
      'Officer / Booker',
      'Town / Beat',
      'Dealer / Shop Name',
      'Visit Result',
      'Reason if Non-Productive',
      'GPS Coordinates',
      'Meter Reading (KM)',
      'Daily Expense (PKR)',
      'Remarks',
      'Last Synced At',
    ],
    ...(appData.visits || []).map((v: any) => {
      const cust = appData.customers.find((c) => c.id === v.customerId);
      return [
        v.id,
        'SHOP_VISIT',
        v.visitDate || v.checkinTime?.slice(0, 10) || nowIso.slice(0, 10),
        v.checkinTime?.slice(11, 16) || '',
        v.userName || 'Field Officer',
        v.town || cust?.city || 'Assigned Beat',
        v.customerName || cust?.companyName || 'Shop',
        v.orderPlaced ? 'PRODUCTIVE (ORDER)' : v.recoveryCollected ? 'PRODUCTIVE (RECOVERY)' : 'NON_PRODUCTIVE',
        v.nonProductiveReason || '',
        v.latitude ? `${v.latitude}, ${v.longitude}` : 'Captured',
        v.meterReading || '',
        v.expenseAmount || 0,
        v.notes || '',
        nowIso,
      ];
    }),
  ];

  // Perform Atomic Batch Update to avoid Google Sheets API "Rate exceeded" (429) errors
  const batchData = [
    { range: 'User_Management!A1:O', values: userRows },
    { range: 'Product_Management!A1:L', values: productRows },
    { range: 'Inventory_Stock!A1:L', values: productRows },
    { range: 'Customers_Dealers!A1:M', values: customerRows },
    { range: 'Customers!A1:M', values: customerRows },
    { range: 'Sales_Data!A1:O', values: salesRows },
    { range: 'Sales_Orders!A1:O', values: salesRows },
    { range: 'Invoice_Data!A1:R', values: invoiceRows },
    { range: 'Recoveries_Collections!A1:O', values: recoveryRows },
    { range: 'Recoveries!A1:O', values: recoveryRows },
    { range: 'Ledger!A1:L', values: ledgerRows },
    { range: 'Attendance_Visits!A1:N', values: visitRows },
  ];

  await batchUpdateSpreadsheetRanges(spreadsheetId, batchData, accessToken);

  const timestamp = new Date().toISOString();
  localStorage.setItem('nlink_google_sheets_last_sync', nowIso);

  return {
    success: true,
    message: `Successfully synchronized Google Sheets database with 8 live enterprise tabs: User Management (${teamUsers.length} users), Product Management (${NLINK_OFFICIAL_PRODUCTS.length} SKUs), Ledger, Invoice Data, Sales Data, Customers (${appData.customers.length}), Recoveries (${appData.recoveries.length}), and Attendance Visits!`,
    timestamp,
  };
}

/**
 * Append a newly booked sales order immediately into Google Sheet
 */
export async function pushOrderToGoogleSheet(
  spreadsheetId: string,
  order: any,
  customerName: string,
  accessToken: string
): Promise<void> {
  const row = [
    order.orderNumber || order.id,
    order.orderDate || new Date().toISOString().slice(0, 10),
    order.customerCode || '',
    customerName,
    order.town || order.city || 'Assigned Beat',
    order.salesUserName || 'Sales Booker',
    (order.items || []).length,
    Number(order.totalAmount || 0),
    order.paymentMode || 'CREDIT',
    order.dualApprovalStatus || 'PENDING_DUAL_APPROVAL',
    order.zainApproval || 'PENDING',
    order.shahzadApproval || 'PENDING',
    order.status || 'BOOKED',
    order.notes || '',
    new Date().toLocaleString(),
  ];

  await appendSpreadsheetRows(spreadsheetId, 'Sales_Data!A:O', [row], accessToken).catch(() => {});
  await appendSpreadsheetRows(spreadsheetId, 'Sales_Orders!A:O', [row], accessToken).catch(() => {});
}

/**
 * Append a newly collected payment recovery immediately into Google Sheet
 */
export async function pushRecoveryToGoogleSheet(
  spreadsheetId: string,
  recovery: any,
  customerName: string,
  accessToken: string
): Promise<void> {
  const row = [
    recovery.recoveryNumber || recovery.id,
    recovery.customerCode || '',
    customerName,
    recovery.town || recovery.city || 'Town',
    Number(recovery.amount || 0),
    recovery.paymentMode || 'CASH',
    recovery.instrumentNumber || 'N/A',
    recovery.bankName || 'Direct Cash Collection',
    recovery.collectionDate || new Date().toISOString().slice(0, 10),
    recovery.collectedBy || 'Recovery Officer',
    recovery.status || 'COLLECTED',
    recovery.dualApprovalStatus || 'PENDING_DUAL_APPROVAL',
    recovery.zainApproval || 'PENDING',
    recovery.shahzadApproval || 'PENDING',
    new Date().toLocaleString(),
  ];

  await appendSpreadsheetRows(spreadsheetId, 'Recoveries_Collections!A:O', [row], accessToken).catch(() => {});
  await appendSpreadsheetRows(spreadsheetId, 'Recoveries!A:O', [row], accessToken).catch(() => {});
}

/**
 * Append a newly marked attendance immediately into Google Sheet
 */
export async function pushAttendanceToGoogleSheet(
  spreadsheetId: string,
  attendance: any,
  userName: string,
  accessToken: string
): Promise<void> {
  const row = [
    attendance.id || `ATT-${Date.now()}`,
    userName,
    attendance.date || new Date().toISOString().slice(0, 10),
    attendance.checkInTime || new Date().toLocaleTimeString(),
    attendance.town || attendance.city || 'Assigned Beat',
    attendance.latitude ? `${attendance.latitude}, ${attendance.longitude}` : 'GPS Captured',
    attendance.gpsAccuracy ? `${attendance.gpsAccuracy}m` : 'High',
    attendance.status || 'PRESENT',
    new Date().toLocaleString(),
  ];

  await appendSpreadsheetRows(spreadsheetId, 'Attendance_Visits!A:N', [row], accessToken).catch(() => {});
  await appendSpreadsheetRows(spreadsheetId, 'Attendance!A:I', [row], accessToken).catch(() => {});
}

/**
 * Append a newly recorded field visit immediately into Google Sheet
 */
export async function pushVisitToGoogleSheet(
  spreadsheetId: string,
  visit: any,
  customerName: string,
  userName: string,
  accessToken: string
): Promise<void> {
  const row = [
    visit.id || `VISIT-${Date.now()}`,
    userName,
    customerName,
    visit.checkinTime ? visit.checkinTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
    visit.purpose || 'Routine Dealer Coverage',
    visit.orderPlaced ? 'YES' : 'NO',
    visit.recoveryCollected ? 'YES' : 'NO',
    visit.notes || '',
    new Date().toLocaleString(),
  ];

  await appendSpreadsheetRows(spreadsheetId, 'Attendance_Visits!A:N', [row], accessToken).catch(() => {});
  await appendSpreadsheetRows(spreadsheetId, 'Visits!A:I', [row], accessToken).catch(() => {});
}
export async function pushCustomerToGoogleSheet(
  spreadsheetId: string,
  customer: any,
  accessToken: string
): Promise<void> {
  const row = [
    customer.customerCode || customer.id,
    customer.companyName || customer.name || customer.businessName || 'New Dealer',
    customer.customerType || customer.type || 'DEALER',
    customer.region || 'Punjab Central',
    customer.area || '',
    customer.town || customer.city || '',
    customer.territory || '',
    customer.contactPerson || customer.ownerName || '',
    customer.phone || customer.mobile || customer.contactNumber || '',
    Number(customer.creditLimit || customer.proposedCreditLimit || 0),
    Number(customer.creditDays || customer.proposedCreditDays || 30),
    customer.approvalStatus || (customer.isActive ? 'APPROVED' : 'PENDING_APPROVAL'),
    new Date().toLocaleString(),
  ];

  await appendSpreadsheetRows(spreadsheetId, 'Customers_Dealers!A:M', [row], accessToken).catch(() => {});
  await appendSpreadsheetRows(spreadsheetId, 'Customers!A:M', [row], accessToken).catch(() => {});
}

/**
 * Append a newly provisioned employee with official @nationallight.pk email into Google Sheet
 */
export async function pushEmployeeToGoogleSheet(
  spreadsheetId: string,
  user: any,
  accessToken: string
): Promise<void> {
  const row = [
    user.employeeCode || user.id,
    user.fullName || 'Employee Name',
    user.email || '',
    user.phone || '',
    user.role || 'TSM',
    user.roleTitle || user.role || 'TSM',
    user.department || 'SALES_FIELD',
    user.region || 'National',
    user.area || 'National',
    user.territory || 'National',
    Array.isArray(user.assignedTowns) ? user.assignedTowns.join(', ') : (user.assignedTowns || 'All Assigned Beats'),
    Number(user.monthlySalesTarget || 0),
    Number(user.monthlyRecoveryTarget || 0),
    user.status || 'ACTIVE',
    new Date().toLocaleString(),
  ];

  await appendSpreadsheetRows(spreadsheetId, 'User_Management!A:O', [row], accessToken).catch(() => {});
  await appendSpreadsheetRows(spreadsheetId, 'Users_Team!A:O', [row], accessToken).catch(() => {});
}

/**
 * Append a newly added or updated product into Google Sheet Product_Management
 */
export async function pushProductToGoogleSheet(
  spreadsheetId: string,
  product: any,
  accessToken: string
): Promise<void> {
  const stock = product.stockInHand || product.stockQty || 0;
  const tp = Number(product.tradePrice || 0);
  const row = [
    product.skuCode || product.code || product.id,
    product.name || 'National Light Product',
    product.categoryLabel || product.category || 'LIGHTING',
    product.specification || product.wattage || '20W',
    product.cartonQuantity || 20,
    stock,
    tp,
    Number(product.retailPrice || 0),
    product.discountPercentage || '5% Commercial',
    stock * tp,
    product.isActive !== false ? 'ACTIVE IN MARKET' : 'DISCONTINUED',
    new Date().toLocaleString(),
  ];

  await appendSpreadsheetRows(spreadsheetId, 'Product_Management!A:L', [row], accessToken).catch(() => {});
}

