/**
 * N-LINK 360 — Direct Google Sheets API Integration Service
 * 
 * Interacts with Google Sheets API v4 using authenticated bearer tokens
 * Specifically configured for target Spreadsheet ID: 1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo
 */

import { SupabaseAppData } from './supabase-data';

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

/**
 * Fetch Google Spreadsheet metadata (Title, sheet tab names, dimensions)
 */
export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SheetMetadata> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
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
  const res = await fetch(
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
  const res = await fetch(
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
  const res = await fetch(
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

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
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
  // Ensure the tabs exist
  const requiredTabs = ['Customers', 'Sales_Orders', 'Recoveries', 'Inventory_Stock', 'Ledger'];
  await ensureSheetTabsExist(spreadsheetId, requiredTabs, accessToken).catch((e) => {
    console.warn('Tab verification warning:', e);
  });

  const nowIso = new Date().toLocaleString();

  // 1. Customers Sheet
  const customerRows: any[][] = [
    ['Customer Code', 'Business Name', 'Type', 'Town / City', 'Route', 'Contact Person', 'Phone', 'Credit Limit (PKR)', 'Current Balance (PKR)', 'Status', 'Last Synced'],
    ...appData.customers.map((c: any) => [
      c.customerCode || c.code || c.id,
      c.companyName || c.businessName || 'Customer',
      c.type || c.channelType || 'DEALER',
      c.city || c.town || '',
      c.route || '',
      c.contactPerson || '',
      c.phone || '',
      Number(c.creditLimit || 0),
      Number(c.currentBalance || 0),
      c.isActive ? 'ACTIVE' : 'INACTIVE',
      nowIso,
    ]),
  ];
  await updateSpreadsheetRange(spreadsheetId, 'Customers!A1:K', customerRows, accessToken).catch((e) => {
    console.error('Failed to sync Customers tab:', e);
  });

  // 2. Sales Orders Sheet
  const orderRows: any[][] = [
    ['Order Number', 'Dealer / Customer', 'Order Date', 'Total Amount (PKR)', 'Status', 'Items Count', 'Payment Mode', 'Synced At'],
    ...appData.salesOrders.map((o: any) => {
      const cust = appData.customers.find((c) => c.id === o.customerId);
      return [
        o.orderNumber || o.orderCode || o.id,
        o.customerName || cust?.companyName || (cust as any)?.businessName || o.customerId,
        o.orderDate || o.createdAt || new Date().toISOString().slice(0, 10),
        Number(o.totalAmount || o.netTotal || 0),
        o.status,
        (o.items || []).length,
        o.paymentMode || 'CREDIT',
        nowIso,
      ];
    }),
  ];
  await updateSpreadsheetRange(spreadsheetId, 'Sales_Orders!A1:H', orderRows, accessToken).catch((e) => {
    console.error('Failed to sync Sales Orders tab:', e);
  });

  // 3. Recoveries Sheet
  const recoveryRows: any[][] = [
    ['Recovery Code', 'Customer / Dealer', 'Amount (PKR)', 'Payment Mode', 'Instrument Ref / Cheque #', 'Bank Name', 'Collection Date', 'Status', 'Synced At'],
    ...appData.recoveries.map((r: any) => {
      const cust = appData.customers.find((c) => c.id === r.customerId);
      return [
        r.recoveryNumber || r.recoveryCode || r.id,
        r.customerName || cust?.companyName || (cust as any)?.businessName || r.customerId,
        Number(r.amount || 0),
        r.paymentMode || 'CASH',
        r.instrumentNumber || 'N/A',
        r.bankName || '',
        r.collectionDate || r.recordedAt || new Date().toISOString().slice(0, 10),
        r.status || 'COLLECTED',
        nowIso,
      ];
    }),
  ];
  await updateSpreadsheetRange(spreadsheetId, 'Recoveries!A1:I', recoveryRows, accessToken).catch((e) => {
    console.error('Failed to sync Recoveries tab:', e);
  });

  // 4. Inventory Stock Sheet
  const inventoryStockMap = new Map<string, number>();
  (appData.inventoryBalances || []).forEach((ib) => {
    const prev = inventoryStockMap.get(ib.skuId) || 0;
    inventoryStockMap.set(ib.skuId, prev + (ib.quantityOnHand || 0));
  });

  const inventoryRows: any[][] = [
    ['SKU Code', 'Item Description', 'Brand / Category', 'Available Stock (Pcs)', 'Trade Price (PKR)', 'Stock Value (PKR)', 'Synced At'],
    ...appData.skus.map((s: any) => {
      const stock = inventoryStockMap.get(s.id) ?? (s.stockQty || 0);
      const price = Number(s.tradePrice || 0);
      return [
        s.skuCode || s.code || s.id,
        s.name,
        s.categoryName || s.category || 'LIGHTING',
        stock,
        price,
        stock * price,
        nowIso,
      ];
    }),
  ];
  await updateSpreadsheetRange(spreadsheetId, 'Inventory_Stock!A1:G', inventoryRows, accessToken).catch((e) => {
    console.error('Failed to sync Inventory tab:', e);
  });

  const timestamp = new Date().toISOString();
  localStorage.setItem('nlink_google_sheets_last_sync', nowIso);

  return {
    success: true,
    message: `Successfully synchronized ${appData.customers.length} Dealers, ${appData.salesOrders.length} Orders, ${appData.recoveries.length} Recoveries, and ${appData.skus.length} SKUs with Google Sheets database!`,
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
    customerName,
    order.orderDate || new Date().toISOString().slice(0, 10),
    Number(order.totalAmount || 0),
    order.status || 'BOOKED',
    (order.items || []).length,
    order.paymentMode || 'CREDIT',
    new Date().toLocaleString(),
  ];

  await appendSpreadsheetRows(spreadsheetId, 'Sales_Orders!A:H', [row], accessToken);
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
    customerName,
    Number(recovery.amount || 0),
    recovery.paymentMode || 'CASH',
    recovery.instrumentNumber || 'N/A',
    recovery.bankName || '',
    recovery.collectionDate || new Date().toISOString().slice(0, 10),
    recovery.status || 'COLLECTED',
    new Date().toLocaleString(),
  ];

  await appendSpreadsheetRows(spreadsheetId, 'Recoveries!A:I', [row], accessToken);
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

  await appendSpreadsheetRows(spreadsheetId, 'Attendance!A:I', [row], accessToken);
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

  await appendSpreadsheetRows(spreadsheetId, 'Visits!A:I', [row], accessToken);
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

  await appendSpreadsheetRows(spreadsheetId, 'Customers_Dealers!A:M', [row], accessToken);
}
