/**
 * N-LINK 360 — Authenticated Google Apps Script Two-Way Engine
 * Target Spreadsheet ID: 1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo
 *
 * Script Properties Required:
 *   - NLINK_SHEET_TOKEN (shared secret verified on both inbound & outbound calls)
 *   - NLINK_EDGE_INBOUND_URL (optional override for sync-master-data-from-sheets URL)
 */

const NLINK_ENDPOINT = 'https://nigvxsjrvkmynwduvemy.supabase.co/functions/v1/sync-master-data-from-sheets';

function getToken_() {
  const token = PropertiesService.getScriptProperties().getProperty('NLINK_SHEET_TOKEN');
  if (!token) throw new Error('Missing Script Property: NLINK_SHEET_TOKEN');
  return token;
}

function getEndpoint_() {
  return PropertiesService.getScriptProperties().getProperty('NLINK_EDGE_INBOUND_URL') || NLINK_ENDPOINT;
}

function verifyInboundToken_(e, payload) {
  const expected = PropertiesService.getScriptProperties().getProperty('NLINK_SHEET_TOKEN');
  if (!expected) return true; // Allows initial staging until Script Property is set
  const headerToken = (e && e.parameter && e.parameter.token) || '';
  const bodyToken = (payload && (payload.sheetToken || payload.token)) || '';
  return headerToken === expected || bodyToken === expected;
}

function getOrCreateTab_(ss, tabName, headers) {
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }
  if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

/**
 * Keyed non-destructive UPSERT: matches keyColIndex (1-based) in target tab,
 * updates row in-place if found, or appends cleanly if new. Never wipes history.
 */
function upsertRowsByKey_(sheet, headers, rows, keyColIndex) {
  if (!rows || rows.length === 0) return { inserted: 0, updated: 0 };
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  const lastRow = sheet.getLastRow();
  const keyToRowMap = {};
  if (lastRow > 1) {
    const existingKeys = sheet.getRange(2, keyColIndex, lastRow - 1, 1).getValues();
    for (let i = 0; i < existingKeys.length; i++) {
      const k = String(existingKeys[i][0] || '').trim();
      if (k) keyToRowMap[k] = i + 2;
    }
  }

  let inserted = 0;
  let updated = 0;
  const rowsToAppend = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const key = String(row[keyColIndex - 1] || '').trim();
    if (!key) continue;
    const existingRowNum = keyToRowMap[key];
    if (existingRowNum) {
      sheet.getRange(existingRowNum, 1, 1, headers.length).setValues([row]);
      updated++;
    } else {
      rowsToAppend.push(row);
      keyToRowMap[key] = lastRow + rowsToAppend.length;
      inserted++;
    }
  }

  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }

  return { inserted: inserted, updated: updated };
}

function appendSyncLog_(ss, direction, tab, status, summary) {
  const logSheet = getOrCreateTab_(ss, 'Sync_Log', ['Timestamp', 'Direction', 'Tab', 'Status', 'Summary']);
  logSheet.appendRow([new Date().toISOString(), direction, tab, status, summary]);
}

/**
 * Handles Outbound UPSERT requests pushed from Supabase Edge Function / N-LINK API Gateway
 */
function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!verifyInboundToken_(e, payload)) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unauthorized NLINK_SHEET_TOKEN' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const nowIso = payload.timestamp || new Date().toISOString();
    const summary = {};

    const TAB_SCHEMAS = {
      Customers: {
        headers: ['Customer Code', 'Business Name', 'Type', 'Town / City', 'Route', 'Contact Person', 'Phone', 'Credit Limit (PKR)', 'Current Balance (PKR)', 'Status', 'Last Synced'],
        mapRow: function (c) {
          return [c.code || c.customerCode || c.id, c.name || c.companyName || '', c.type || 'DEALER', c.town || c.city || '', c.route || c.region || '', c.contactPerson || '', c.phone || '', Number(c.creditLimit || 0), Number(c.currentBalance || 0), c.status || 'ACTIVE', nowIso];
        },
      },
      Sales_Orders: {
        headers: ['Order ID', 'Customer Name', 'Sales Officer', 'Order Date', 'Total Amount (PKR)', 'Status', 'Approval Status', 'Shahzad Ullah', 'Items Count', 'Last Synced'],
        mapRow: function (o) {
          return [o.orderId || o.orderNumber || o.id, o.customerName || '', o.salesUserName || '', o.orderDate || nowIso.slice(0, 10), Number(o.totalAmount || 0), o.status || 'SUBMITTED', o.dualApprovalStatus || 'PENDING', o.shahzadApproval || 'PENDING', Number(o.itemsCount || 0), nowIso];
        },
      },
      Recoveries: {
        headers: ['Recovery Code', 'Customer Name', 'Sales Officer', 'Amount (PKR)', 'Mode', 'Instrument Ref', 'Bank', 'Confirmation Status', 'Shahzad Ullah', 'Date Recorded', 'Last Synced'],
        mapRow: function (r) {
          return [r.id || r.recoveryNumber || '', r.customerName || '', r.salesUserName || '', Number(r.amount || 0), r.paymentMode || 'CASH', r.instrumentNumber || 'N/A', r.bankName || '', r.dualApprovalStatus || 'PENDING', r.shahzadApproval || 'PENDING', r.recordedAt || r.collectionDate || nowIso.slice(0, 10), nowIso];
        },
      },
      Inventory_Stock: {
        headers: ['SKU Code', 'SKU Name', 'Category', 'Available Stock (Pcs)', 'Trade Price (PKR)', 'Valuation (PKR)', 'Last Synced'],
        mapRow: function (i) {
          return [i.skuCode || i.code || i.id, i.skuName || i.name || '', i.category || 'LIGHTING', Number(i.stockPieces || i.quantityOnHand || 0), Number(i.tradePrice || 0), Number(i.stockValuation || 0), nowIso];
        },
      },
      Invoices: {
        headers: ['Invoice #', 'Customer Name', 'Invoice Date', 'Subtotal (PKR)', 'Tax (PKR)', 'Total Amount (PKR)', 'Status', 'Last Synced'],
        mapRow: function (inv) {
          return [inv.invoiceCode || inv.invoiceNumber || inv.id, inv.customerName || '', inv.invoiceDate || nowIso.slice(0, 10), Number(inv.subtotal || 0), Number(inv.taxAmount || 0), Number(inv.totalAmount || 0), inv.status || 'POSTED', nowIso];
        },
      },
      Visits: {
        headers: ['Visit Ref', 'Date', 'Time', 'Customer Name', 'Field Officer', 'Town', 'Purpose', 'Last Synced'],
        mapRow: function (v) {
          return [v.id || (v.date + '_' + v.customerName + '_' + v.userName), v.date || nowIso.slice(0, 10), v.time || '', v.customerName || '', v.userName || '', v.town || '', v.purpose || 'Routine Visit', nowIso];
        },
      },
      Attendance: {
        headers: ['Attendance Ref', 'Employee', 'Date', 'Check In', 'Check Out', 'Status', 'Location', 'Last Synced'],
        mapRow: function (a) {
          return [a.id || (a.date + '_' + (a.userId || a.employeeName || '')), a.employeeName || a.userName || '', a.date || nowIso.slice(0, 10), a.checkInTime || a.checkin_time || '', a.checkOutTime || '', a.status || 'PRESENT', a.location || '', nowIso];
        },
      },
      Ledger: {
        headers: ['Reference #', 'Customer Code', 'Customer Name', 'Date', 'Type', 'Debit (PKR)', 'Credit (PKR)', 'Running Balance (PKR)', 'Approval', 'Last Synced'],
        mapRow: function (l) {
          return [l.referenceNumber || l.entryNumber || l.id, l.customerCode || '', l.customerName || '', l.date || l.entryDate || nowIso.slice(0, 10), l.type || l.transactionType || '', Number(l.debit || l.debitAmount || 0), Number(l.credit || l.creditAmount || 0), Number(l.runningBalance || 0), l.dualApprovalStatus || 'DUAL_APPROVED', nowIso];
        },
      },
      Dispatch: {
        headers: ['Dispatch #', 'Invoice #', 'Transporter', 'Bility #', 'Vehicle #', 'Dispatch Date', 'Status', 'Last Synced'],
        mapRow: function (d) {
          return [d.dispatchNumber || d.id, d.invoiceNumber || d.invoiceId || '', d.transporterName || '', d.bilityNumber || '', d.vehicleNumber || '', d.dispatchDate || nowIso.slice(0, 10), d.status || 'IN_TRANSIT', nowIso];
        },
      },
      Returns: {
        headers: ['Return #', 'Customer Name', 'Request Date', 'Claimed (PKR)', 'Approved (PKR)', 'Status', 'Inspection', 'Last Synced'],
        mapRow: function (ret) {
          return [ret.returnNumber || ret.id, ret.customerName || '', ret.requestDate || nowIso.slice(0, 10), Number(ret.totalClaimedAmount || 0), Number(ret.totalApprovedAmount || 0), ret.status || 'REPORTED', ret.inspectionResult || '', nowIso];
        },
      },
    };

    // Single-record UPSERT mode (used by outbox / universal submission)
    if (payload.sheetTab && payload.record && TAB_SCHEMAS[payload.sheetTab]) {
      const schema = TAB_SCHEMAS[payload.sheetTab];
      const sheet = getOrCreateTab_(ss, payload.sheetTab, schema.headers);
      summary[payload.sheetTab] = upsertRowsByKey_(sheet, schema.headers, [schema.mapRow(payload.record)], 1);
      appendSyncLog_(ss, 'OUTBOUND_UPSERT', payload.sheetTab, 'SUCCESS', JSON.stringify(summary[payload.sheetTab]));
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', mode: 'UPSERT', summary: summary }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Batch UPSERT mode across multi-tab payloads
    const batchMapping = [
      { key: 'customers', tab: 'Customers' },
      { key: 'salesOrders', tab: 'Sales_Orders' },
      { key: 'recoveries', tab: 'Recoveries' },
      { key: 'inventory', tab: 'Inventory_Stock' },
      { key: 'invoices', tab: 'Invoices' },
      { key: 'visits', tab: 'Visits' },
      { key: 'attendance', tab: 'Attendance' },
      { key: 'ledgers', tab: 'Ledger' },
      { key: 'dispatches', tab: 'Dispatch' },
      { key: 'returns', tab: 'Returns' },
    ];

    for (let b = 0; b < batchMapping.length; b++) {
      const entry = batchMapping[b];
      const list = payload[entry.key];
      if (Array.isArray(list) && list.length > 0 && TAB_SCHEMAS[entry.tab]) {
        const schema = TAB_SCHEMAS[entry.tab];
        const sheet = getOrCreateTab_(ss, entry.tab, schema.headers);
        const mapped = list.map(schema.mapRow);
        summary[entry.tab] = upsertRowsByKey_(sheet, schema.headers, mapped, 1);
      }
    }

    appendSyncLog_(ss, 'OUTBOUND_BATCH_UPSERT', 'MULTI_TAB', 'SUCCESS', JSON.stringify(summary));
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', mode: 'BATCH_UPSERT', summary: summary }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sheetRows_(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(function (h) { return String(h).trim(); });
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row.some(function (v) { return String(v).trim() !== ''; })) continue;
    const item = { _rowNumber: i + 1 };
    headers.forEach(function (header, idx) { item[header] = row[idx]; });
    rows.push(item);
  }
  return rows;
}

function normalize_(rows, aliases) {
  return rows.map(function (row) {
    const out = { _rowNumber: row._rowNumber };
    Object.keys(aliases).forEach(function (key) {
      const candidates = aliases[key];
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        if (row[candidate] !== undefined && String(row[candidate]).trim() !== '') {
          out[key] = row[candidate];
          break;
        }
      }
    });
    return out;
  });
}

/**
 * Inbound Master Data Sync (Users, Team, Dealers, Products ONLY — Financial tabs remain Supabase-authoritative)
 */
function syncMasterDataToNLink() {
  const ss = SpreadsheetApp.getActive();
  const payload = {
    users: normalize_(sheetRows_('Users'), {
      userCode: ['userCode', 'User Code', 'user_code'],
      email: ['email', 'Email', 'Login Email'],
      fullName: ['fullName', 'Full Name', 'name'],
      status: ['status', 'Status'],
      authUserId: ['authUserId', 'Auth User ID', 'auth_user_id'],
    }),
    employees: normalize_(sheetRows_('Team'), {
      employeeCode: ['employeeCode', 'Employee Code', 'employee_code'],
      fullName: ['fullName', 'Full Name', 'name'],
      role: ['role', 'Role', 'designation'],
      email: ['email', 'Email'],
      phone: ['phone', 'Phone', 'mobile'],
      region: ['region', 'Region'],
      territory: ['territory', 'Territory'],
      department: ['department', 'Department'],
      status: ['status', 'Status'],
    }),
    customers: normalize_(sheetRows_('Dealers'), {
      customerCode: ['customerCode', 'Customer Code', 'customer_code'],
      companyName: ['companyName', 'Company Name', 'Business Name', 'name'],
      contactPerson: ['contactPerson', 'Contact Person'],
      phone: ['phone', 'Phone', 'mobile'],
      type: ['type', 'Type', 'Customer Type'],
      address: ['address', 'Address'],
      city: ['city', 'City', 'town', 'Town'],
      area: ['area', 'Area'],
      territory: ['territory', 'Territory', 'route', 'Route'],
      creditLimit: ['creditLimit', 'Credit Limit'],
      creditDays: ['creditDays', 'Credit Days'],
      openingBalance: ['openingBalance', 'Opening Balance'],
      status: ['status', 'Status'],
    }),
    products: normalize_(sheetRows_('Products'), {
      skuCode: ['skuCode', 'SKU Code', 'sku_code'],
      productCode: ['productCode', 'Product Code', 'product_code'],
      name: ['name', 'Name', 'SKU Name', 'Description'],
      brandName: ['brandName', 'Brand Name', 'Brand'],
      model: ['model', 'Model'],
      wattage: ['wattage', 'Wattage'],
      packingUnit: ['packingUnit', 'Packing Unit'],
      cartonQuantity: ['cartonQuantity', 'Carton Quantity', 'Units Per Carton'],
      costPrice: ['costPrice', 'Cost Price'],
      tradePrice: ['tradePrice', 'Trade Price'],
      dealerPrice: ['dealerPrice', 'Dealer Price'],
      retailPrice: ['retailPrice', 'Retail Price'],
      taxRate: ['taxRate', 'Tax Rate'],
      reorderLevel: ['reorderLevel', 'Reorder Level'],
      barcode: ['barcode', 'Barcode'],
      status: ['status', 'Status'],
    }),
  };

  const response = UrlFetchApp.fetch(getEndpoint_(), {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'X-NLINK-SHEET-TOKEN': getToken_() },
    payload: JSON.stringify(payload),
  });

  const body = response.getContentText();
  const code = response.getResponseCode();
  appendSyncLog_(ss, 'INBOUND_MASTER', 'Users/Team/Dealers/Products', 'HTTP_' + code, body.slice(0, 500));
  if (code < 200 || code >= 300) throw new Error('N-LINK master sync failed: ' + body);
  return body;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('N-LINK 360')
    .addItem('Sync Master Data to N-LINK', 'syncMasterDataToNLink')
    .addToUi();
}
