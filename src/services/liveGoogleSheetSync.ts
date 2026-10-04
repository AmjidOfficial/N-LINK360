/**
 * N-LINK 360 — Live Google Sheets GViz Direct Synchronizer
 * 
 * Fetches real-time Customers, Invoices/Sales Orders, and Recoveries directly from
 * Google Spreadsheet ID: 1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo
 * using Google's public GViz API without requiring OAuth popups.
 */

import { Customer, SalesOrder, Recovery } from '../types';

export const TARGET_SPREADSHEET_ID = '1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo';

export interface LiveSheetSyncResult {
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  ledgerEntries?: any[];
  timestamp: string;
  customersCount: number;
  ordersCount: number;
  recoveriesCount: number;
}

/**
 * Parses Google Visualization Query API response string into an array of objects
 */
function parseGVizResponse(text: string): Record<string, any>[] {
  const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/s);
  if (!jsonMatch || !jsonMatch[1]) return [];
  try {
    const data = JSON.parse(jsonMatch[1]);
    if (!data.table || !data.table.rows) return [];
    const cols = (data.table.cols || []).map((c: any) => (c?.label || '').trim());
    
    return data.table.rows.map((r: any) => {
      const rowObj: Record<string, any> = {};
      (r.c || []).forEach((cell: any, idx: number) => {
        const key = cols[idx] || `col_${idx}`;
        if (cell) {
          rowObj[key] = cell.v !== undefined ? cell.v : cell.f;
          if (cell.f && !rowObj[`${key}_formatted`]) {
            rowObj[`${key}_formatted`] = cell.f;
          }
        } else {
          rowObj[key] = null;
        }
      });
      return rowObj;
    });
  } catch (err) {
    console.warn('Failed to parse GViz JSON:', err);
    return [];
  }
}

/**
 * Parses GViz date format: Date(yyyy,m,d) or standard date string
 */
function parseGVizDate(val: any): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (typeof val === 'string' && val.startsWith('Date(')) {
    const parts = val.replace(/Date\(|\)/g, '').split(',').map(Number);
    if (parts.length >= 3) {
      const year = parts[0];
      const month = String(parts[1] + 1).padStart(2, '0');
      const day = String(parts[2]).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return String(val);
}

/**
 * Fetches sheet data via GViz JSON endpoint
 */
async function fetchSheetData(spreadsheetId: string, sheetName: string): Promise<Record<string, any>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet "${sheetName}": ${res.statusText}`);
  }
  const text = await res.text();
  return parseGVizResponse(text);
}

/**
 * Fetches all Customers, Orders/Invoices, and Recoveries from the live Google Sheet
 */
export async function fetchLiveGoogleSheetData(
  spreadsheetId = TARGET_SPREADSHEET_ID
): Promise<LiveSheetSyncResult> {
  // 1. Fetch Customers: Prioritize Customers_Dealers which has accurate balances
  let custRows: Record<string, any>[] = [];
  try {
    custRows = await fetchSheetData(spreadsheetId, 'Customers_Dealers');
  } catch (e) {
    try {
      custRows = await fetchSheetData(spreadsheetId, 'Customers');
    } catch {}
  }
  if (!custRows.length) {
    try {
      custRows = await fetchSheetData(spreadsheetId, 'Customers');
    } catch {}
  }

  // 2. Fetch Recoveries: Prioritize Recoveries_Collections which contains authentic amounts & bank details
  let recRows: Record<string, any>[] = [];
  try {
    recRows = await fetchSheetData(spreadsheetId, 'Recoveries_Collections');
  } catch (e) {
    try {
      recRows = await fetchSheetData(spreadsheetId, 'Recoveries');
    } catch {}
  }
  if (!recRows.length) {
    try {
      recRows = await fetchSheetData(spreadsheetId, 'Recoveries');
    } catch {}
  }

  // 3. Fetch Ledger tab to extract exact invoice debit amounts and running balances
  let ledgerRows: Record<string, any>[] = [];
  try {
    ledgerRows = await fetchSheetData(spreadsheetId, 'Ledger');
  } catch {}

  // 4. Fetch Sales Orders / Invoices
  let ordRows: Record<string, any>[] = [];
  try {
    ordRows = await fetchSheetData(spreadsheetId, 'Sales_Orders');
  } catch (e) {
    try {
      ordRows = await fetchSheetData(spreadsheetId, 'Sales_Data');
    } catch {}
  }

  // Map to Customer types
  const parsedCustomers: Customer[] = custRows
    .filter((r) => r['Customer Code'] || r['Business Name'])
    .map((r, idx) => {
      const code = String(r['Customer Code'] || `CUST-${idx + 1}`).trim();
      const name = String(r['Business Name'] || 'Commercial Partner').trim();
      const town = String(r['Town / City'] || 'Mingora').trim();
      const rawLimit = r['Credit Limit (PKR)'];
      const creditLimit = typeof rawLimit === 'number' ? rawLimit : Number(String(rawLimit || '500000').replace(/[^0-9.-]/g, '')) || 500000;
      const rawBal = r['Current Balance (PKR)'];
      const currentBalance = typeof rawBal === 'number' ? rawBal : Number(String(rawBal || '0').replace(/[^0-9.-]/g, '')) || 0;
      const channelType = String(r['Channel Type'] || 'DEALER').toUpperCase().includes('DISTRIBUTOR') ? 'DISTRIBUTOR' : 'DEALER';
      const phone = r['Phone / WhatsApp'] ? String(r['Phone / WhatsApp']) : '0300-0000000';
      const contactPerson = r['Contact Person'] ? String(r['Contact Person']) : name;

      // Match internal ID if known
      const internalIdMap: Record<string, string> = {
        'DL-IQBAL': 'cust-iqbal',
        'DL-SHARAFAT': 'cust-sharafat',
        'DL-MINGORA-EST': 'cust-mingora-elec',
        'DL-ZIYAD': 'cust-ziyad',
        'DL-RASHEED': 'cust-rasheed',
      };
      const resolvedId = internalIdMap[code] || code;

      return {
        id: resolvedId,
        customerCode: code,
        companyName: name,
        contactPerson: contactPerson || name,
        phone: phone || '0300-0000000',
        type: channelType as any,
        town,
        city: town,
        region: 'KPK',
        address: r['Route / Market'] ? String(r['Route / Market']) : `${town} Commercial Market`,
        creditLimit,
        creditDays: Number(r['Credit Days']) || 30,
        currentBalance,
        openingBalance: currentBalance,
        isCreditLocked: false,
        isActive: true,
        approvalStatus: 'APPROVED',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Shahid Khan',
        salesUserId: 'USR-002',
        salesUserName: 'Shahid Khan',
      } as Customer;
    });

  // Map to SalesOrder types, reconciling amounts from Ledger
  const parsedOrders: SalesOrder[] = ordRows
    .filter((r) => r['Order Number'] || r['Customer Code'])
    .map((r, idx) => {
      const orderNum = String(r['Order Number'] || `SO-${idx + 4001}`).trim();
      const custCode = String(r['Customer Code'] || '').trim();
      const custName = String(r['Dealer / Business Name'] || 'Commercial Partner').trim();
      const town = String(r['Town / Beat'] || 'Mingora').trim();
      const dateStr = parseGVizDate(r['Order Date']);
      
      // Look up invoice amount from Ledger tab if total in Sales_Orders is missing or 0
      let totalAmount = Number(r['Total Amount (PKR)']) || 0;
      if (totalAmount === 0 && ledgerRows.length > 0) {
        const matchingLedger = ledgerRows.find((l) => l['Reference #'] === orderNum);
        if (matchingLedger && matchingLedger['Debit / Invoice (PKR)']) {
          totalAmount = Number(matchingLedger['Debit / Invoice (PKR)']) || 0;
        }
      }

      const bookedBy = String(r['Booked By (Sales Officer)'] || 'Shahid Khan');
      const isApproved = String(r['Approval Status'] || 'APPROVED').toUpperCase() === 'APPROVED';

      const internalIdMap: Record<string, string> = {
        'DL-IQBAL': 'cust-iqbal',
        'DL-SHARAFAT': 'cust-sharafat',
        'DL-MINGORA-EST': 'cust-mingora-elec',
        'DL-ZIYAD': 'cust-ziyad',
        'DL-RASHEED': 'cust-rasheed',
      };
      const customerId = internalIdMap[custCode] || custCode;

      return {
        id: `ord-${orderNum.toLowerCase()}`,
        orderNumber: orderNum,
        customerId,
        customerCode: custCode,
        customerName: custName,
        salesUserId: 'USR-002',
        salesUserName: bookedBy,
        town,
        items: [],
        subtotal: totalAmount,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount,
        creditCheckStatus: 'GREEN' as const,
        status: isApproved ? 'APPROVED' : 'PENDING_APPROVAL',
        dualApprovalStatus: isApproved ? 'APPROVED' : 'PENDING_APPROVAL',
        shahzadApproval: isApproved ? 'APPROVED' : 'PENDING',
        shahzadApprovedAt: isApproved ? dateStr : undefined,
        approvedBy: isApproved ? 'Shahzad Ullah' : undefined,
        createdAt: `${dateStr}T10:00:00.000Z`,
        orderDate: dateStr,
        notes: r['Remarks'] ? String(r['Remarks']) : 'Google Sheet Synced Order',
      } as unknown as SalesOrder;
    });

  // Map to Recovery types with 100% full financial details
  const parsedRecoveries: Recovery[] = recRows
    .filter((r) => r['Recovery Receipt #'] || r['Customer Code'])
    .map((r, idx) => {
      const id = String(r['Recovery Receipt #'] || `RC-${idx + 1001}`).trim();
      const custCode = String(r['Customer Code'] || '').trim();
      const custName = String(r['Dealer / Customer Name'] || 'Commercial Partner').trim();
      const town = String(r['Town / City'] || 'Mingora').trim();
      const amount = Number(r['Amount Received (PKR)']) || 0;
      const rawChannel = String(r['Collection Channel (Cash / Bank Deposit)'] || 'CASH').toUpperCase();
      const paymentMode = rawChannel.includes('BANK') || rawChannel.includes('ONLINE') || rawChannel.includes('TRANSFER')
        ? 'ONLINE_TRANSFER'
        : 'CASH';
      const instrumentRef = r['Instrument Ref / Cheque # / Deposit Slip'] ? String(r['Instrument Ref / Cheque # / Deposit Slip']) : '';
      const bankName = r['Bank Name'] ? String(r['Bank Name']) : (paymentMode === 'CASH' ? 'Direct Cash Collection' : 'Online Bank Transfer');
      const dateStr = parseGVizDate(r['Collection Date']);
      const isConfirmed = String(r['Confirmation Status'] || 'CONFIRMED').toUpperCase() === 'CONFIRMED' || String(r['Executive Confirmer (Shahzad Ullah)'] || '').toUpperCase() === 'APPROVED';

      const internalIdMap: Record<string, string> = {
        'DL-IQBAL': 'cust-iqbal',
        'DL-SHARAFAT': 'cust-sharafat',
        'DL-MINGORA-EST': 'cust-mingora-elec',
        'DL-ZIYAD': 'cust-ziyad',
        'DL-RASHEED': 'cust-rasheed',
      };
      const customerId = internalIdMap[custCode] || custCode;

      return {
        id: `rec-${id.toLowerCase()}`,
        recoveryNumber: id,
        customerId,
        customerCode: custCode,
        customerName: custName,
        salesUserId: 'USR-002',
        salesUserName: String(r['Collector / Officer'] || 'Shahid Khan'),
        collectionDate: dateStr,
        paymentDate: dateStr,
        amount,
        paymentMode: paymentMode as any,
        instrumentNumber: instrumentRef !== 'N/A' ? instrumentRef : undefined,
        bankName,
        status: isConfirmed ? 'VERIFIED' : 'PENDING_VERIFICATION',
        createdAt: `${dateStr}T14:30:00.000Z`,
        recordedAt: `${dateStr}T14:30:00.000Z`,
        verifiedBy: isConfirmed ? 'Shahzad Ullah' : undefined,
        verifiedAt: isConfirmed ? `${dateStr}T14:30:00.000Z` : undefined,
        shahzadApproval: isConfirmed ? 'APPROVED' : 'PENDING',
        remarks: instrumentRef ? `${paymentMode} Ref: ${instrumentRef}` : 'Google Sheet Synced Recovery',
      } as unknown as Recovery;
    });

  return {
    customers: parsedCustomers,
    orders: parsedOrders,
    recoveries: parsedRecoveries,
    ledgerEntries: ledgerRows,
    timestamp: new Date().toISOString(),
    customersCount: parsedCustomers.length,
    ordersCount: parsedOrders.length,
    recoveriesCount: parsedRecoveries.length,
  };
}
