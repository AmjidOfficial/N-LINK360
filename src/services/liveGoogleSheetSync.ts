/**
 * N-LINK 360 — Live Google Sheets GViz Direct Synchronizer
 * 
 * Fetches real-time Customers, Invoices/Sales Orders, and Recoveries directly from
 * Google Spreadsheet ID: 1NUW0aUOE3sJVvNCJOvHI1ia4-CGDIByJZoyzKZUSwoo
 * using Google's public GViz API without requiring OAuth popups.
 */

<<<<<<< HEAD
import { Customer, SalesOrder, Recovery, UserRole } from '../types';
import { NLinkUser, NLINK_TEAM_ROSTER, getStoredUsers, saveStoredUsers } from '../data/nlink-users-team';
=======
import { Customer, SalesOrder, Recovery } from '../types';
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

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
<<<<<<< HEAD
      const town = String(r['Town / City'] || r['Town'] || 'Mingora').trim();
      const rawLimit = r['Credit Limit (PKR)'] || r['Credit Limit'];
      const creditLimit = typeof rawLimit === 'number' ? rawLimit : Number(String(rawLimit || '500000').replace(/[^0-9.-]/g, '')) || 500000;
      const rawBal = r['Current Balance (PKR)'] || r['Current Balance'] || r['Balance'];
      const currentBalance = typeof rawBal === 'number' ? rawBal : Number(String(rawBal || '0').replace(/[^0-9.-]/g, '')) || 0;
      const channelType = String(r['Type'] || r['Channel Type'] || 'DEALER').toUpperCase().includes('DISTRIBUTOR') ? 'DISTRIBUTOR' : 'DEALER';
      const phone = r['Phone'] ? String(r['Phone']) : (r['Phone / WhatsApp'] ? String(r['Phone / WhatsApp']) : '0300-0000000');
      const contactPerson = r['Contact Person'] ? String(r['Contact Person']) : name;
      const route = r['Route'] ? String(r['Route']) : (r['Route / Market'] ? String(r['Route / Market']) : `${town} Commercial Market`);

      // Check for opening balance or default
      const rawOpen = r['Opening Balance (PKR)'] || r['Opening Balance'];
      let openingBalance = typeof rawOpen === 'number' ? rawOpen : Number(String(rawOpen || '').replace(/[^0-9.-]/g, ''));
      if (isNaN(openingBalance) || openingBalance === 0) {
        if (code === 'DL-MINGORA-EST') {
          openingBalance = 309393;
        } else {
          openingBalance = currentBalance;
        }
      }
=======
      const town = String(r['Town / City'] || 'Mingora').trim();
      const rawLimit = r['Credit Limit (PKR)'];
      const creditLimit = typeof rawLimit === 'number' ? rawLimit : Number(String(rawLimit || '500000').replace(/[^0-9.-]/g, '')) || 500000;
      const rawBal = r['Current Balance (PKR)'];
      const currentBalance = typeof rawBal === 'number' ? rawBal : Number(String(rawBal || '0').replace(/[^0-9.-]/g, '')) || 0;
      const channelType = String(r['Channel Type'] || 'DEALER').toUpperCase().includes('DISTRIBUTOR') ? 'DISTRIBUTOR' : 'DEALER';
      const phone = r['Phone / WhatsApp'] ? String(r['Phone / WhatsApp']) : '0300-0000000';
      const contactPerson = r['Contact Person'] ? String(r['Contact Person']) : name;
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

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
<<<<<<< HEAD
        address: route,
        creditLimit,
        creditDays: Number(r['Credit Days']) || 30,
        currentBalance,
        openingBalance,
=======
        address: r['Route / Market'] ? String(r['Route / Market']) : `${town} Commercial Market`,
        creditLimit,
        creditDays: Number(r['Credit Days']) || 30,
        currentBalance,
        openingBalance: currentBalance,
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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

<<<<<<< HEAD
  // Map to SalesOrder types, reconciling amounts from Ledger & Webhook headers
  const parsedOrders: SalesOrder[] = ordRows
    .filter((r) => r['Order ID'] || r['Order Number'] || r['Order #'] || r['Customer Code'] || r['Customer Name'] || r['Dealer / Business Name'])
    .map((r, idx) => {
      const orderNum = String(r['Order ID'] || r['Order Number'] || r['Order #'] || `SO-${idx + 4001}`).trim();
      const custCode = String(r['Customer Code'] || '').trim();
      const custName = String(r['Customer Name'] || r['Dealer / Business Name'] || 'Commercial Partner').trim();
      const town = String(r['Town / Beat'] || r['Town'] || 'Mingora').trim();
      const dateStr = parseGVizDate(r['Order Date']);
      
      // Look up invoice amount from Ledger tab if total in Sales_Orders is missing or 0
      let totalAmount = Number(r['Total Amount (PKR)']) || Number(r['Total Amount']) || 0;
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
      if (totalAmount === 0 && ledgerRows.length > 0) {
        const matchingLedger = ledgerRows.find((l) => l['Reference #'] === orderNum);
        if (matchingLedger && matchingLedger['Debit / Invoice (PKR)']) {
          totalAmount = Number(matchingLedger['Debit / Invoice (PKR)']) || 0;
        }
      }

<<<<<<< HEAD
      const bookedBy = String(r['Sales Officer'] || r['Booked By (Sales Officer)'] || 'Shahid Khan');
      const rawStatus = String(r['Status'] || '').trim().toUpperCase();
      const rawApproval = String(r['Approval Status'] || '').trim().toUpperCase();
      const rawShahzad = String(r['Shahzad Ullah'] || r['Executive Confirmer (Shahzad Ullah)'] || '').trim().toUpperCase();

      const isApproved =
        rawStatus === 'APPROVED' ||
        rawApproval === 'APPROVED' ||
        rawApproval === 'DUAL_APPROVED' ||
        rawShahzad === 'APPROVED' ||
        rawShahzad === 'YES';
=======
      const bookedBy = String(r['Booked By (Sales Officer)'] || 'Shahid Khan');
      const isApproved = String(r['Approval Status'] || 'APPROVED').toUpperCase() === 'APPROVED';
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

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
<<<<<<< HEAD
        dualApprovalStatus: isApproved ? 'DUAL_APPROVED' : 'PENDING_APPROVAL',
=======
        dualApprovalStatus: isApproved ? 'APPROVED' : 'PENDING_APPROVAL',
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
        shahzadApproval: isApproved ? 'APPROVED' : 'PENDING',
        shahzadApprovedAt: isApproved ? dateStr : undefined,
        approvedBy: isApproved ? 'Shahzad Ullah' : undefined,
        createdAt: `${dateStr}T10:00:00.000Z`,
        orderDate: dateStr,
        notes: r['Remarks'] ? String(r['Remarks']) : 'Google Sheet Synced Order',
      } as unknown as SalesOrder;
    });

<<<<<<< HEAD
  // Map to Recovery types with 100% full financial details & Webhook headers
  const parsedRecoveries: Recovery[] = recRows
    .filter((r) => r['Recovery Code'] || r['Recovery Receipt #'] || r['Recovery ID'] || r['Customer Code'] || r['Customer Name'])
    .map((r, idx) => {
      const id = String(r['Recovery Code'] || r['Recovery Receipt #'] || r['Recovery ID'] || r['id'] || `RC-${idx + 1001}`).trim();
      const custCode = String(r['Customer Code'] || '').trim();
      const custName = String(r['Customer Name'] || r['Dealer / Customer Name'] || 'Commercial Partner').trim();
      const town = String(r['Town / City'] || r['Town'] || 'Mingora').trim();
      const amount = Number(r['Amount (PKR)']) || Number(r['Amount Received (PKR)']) || 0;
      const rawChannel = String(r['Mode'] || r['Collection Channel (Cash / Bank Deposit)'] || 'CASH').toUpperCase();
      const paymentMode = rawChannel.includes('BANK') || rawChannel.includes('ONLINE') || rawChannel.includes('TRANSFER')
        ? 'ONLINE_TRANSFER'
        : 'CASH';
      const instrumentRef = r['Instrument Ref'] ? String(r['Instrument Ref']) : (r['Instrument Ref / Cheque # / Deposit Slip'] ? String(r['Instrument Ref / Cheque # / Deposit Slip']) : '');
      const bankName = r['Bank'] ? String(r['Bank']) : (r['Bank Name'] ? String(r['Bank Name']) : (paymentMode === 'CASH' ? 'Direct Cash Collection' : 'Online Bank Transfer'));
      const dateStr = parseGVizDate(r['Date Recorded'] || r['Collection Date']);
      
      const rawConfirm = String(r['Confirmation Status'] || '').trim().toUpperCase();
      const rawShahzad = String(r['Shahzad Ullah'] || r['Executive Confirmer (Shahzad Ullah)'] || '').trim().toUpperCase();
      const rawStatus = String(r['Status'] || '').trim().toUpperCase();

      const isConfirmed =
        rawConfirm === 'CONFIRMED' ||
        rawConfirm === 'DUAL_APPROVED' ||
        rawConfirm === 'APPROVED' ||
        rawShahzad === 'APPROVED' ||
        rawShahzad === 'YES' ||
        rawStatus === 'VERIFIED';
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

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
<<<<<<< HEAD
        salesUserName: String(r['Sales Officer'] || r['Collector / Officer'] || 'Shahid Khan'),
=======
        salesUserName: String(r['Collector / Officer'] || 'Shahid Khan'),
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
        dualApprovalStatus: isConfirmed ? 'DUAL_APPROVED' : 'PENDING_APPROVAL',
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
        remarks: instrumentRef ? `${paymentMode} Ref: ${instrumentRef}` : 'Google Sheet Synced Recovery',
      } as unknown as Recovery;
    });

<<<<<<< HEAD
  // Reconcile customer balances using the standard financial ledger rule:
  // Current Balance = Opening Balance + Total Approved Invoices - Total Confirmed Recoveries
  parsedCustomers.forEach((cust) => {
    const custOrders = parsedOrders.filter((o) => {
      const matchId = cust.id && (o.customerId === cust.id || o.customerId === cust.customerCode);
      const matchCode = cust.customerCode && (o.customerCode === cust.customerCode || o.customerId === cust.customerCode);
      const matchName = cust.companyName && o.customerName && cust.companyName.toLowerCase().trim() === o.customerName.toLowerCase().trim();
      const isPosted = o.status === 'APPROVED' || o.shahzadApproval === 'APPROVED' || o.dualApprovalStatus === 'DUAL_APPROVED';
      return (matchId || matchCode || matchName) && isPosted;
    });
    const custRecs = parsedRecoveries.filter((r) => {
      const matchId = cust.id && (r.customerId === cust.id || r.customerId === cust.customerCode);
      const matchCode = cust.customerCode && (r.customerCode === cust.customerCode || r.customerId === cust.customerCode);
      const matchName = cust.companyName && r.customerName && cust.companyName.toLowerCase().trim() === r.customerName.toLowerCase().trim();
      const isConfirmed = r.status === 'VERIFIED' || r.status === 'APPROVED' || r.shahzadApproval === 'APPROVED' || r.dualApprovalStatus === 'DUAL_APPROVED';
      return (matchId || matchCode || matchName) && isConfirmed;
    });

    const debits = custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const credits = custRecs.reduce((sum, r) => sum + (r.amount || 0), 0);
    cust.currentBalance = Math.max(0, (cust.openingBalance ?? 0) + debits - credits);
  });

=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD

/**
 * Fetches User Management Roster from Google Sheet tabs: Users, Team, Users_Roster, or User_Management
 */
export async function fetchLiveGoogleSheetUsers(
  spreadsheetId = TARGET_SPREADSHEET_ID
): Promise<NLinkUser[]> {
  let userRows: Record<string, any>[] = [];
  const possibleTabs = ['Users', 'Team', 'Users_Roster', 'User_Management', 'Employees'];
  for (const tab of possibleTabs) {
    try {
      userRows = await fetchSheetData(spreadsheetId, tab);
      if (userRows && userRows.length > 0) break;
    } catch {}
  }

  if (!userRows || !userRows.length) {
    return getStoredUsers();
  }

  const parsedUsers: NLinkUser[] = userRows
    .filter((r) => r['Email'] || r['User Email'] || r['Phone'] || r['Full Name'] || r['Name'])
    .map((r, idx) => {
      const email = String(r['Email'] || r['User Email'] || r['Corporate Email'] || '').trim().toLowerCase();
      const phone = String(r['Phone'] || r['Phone Number'] || r['Mobile'] || r['WhatsApp'] || '').trim();
      const fullName = String(r['Full Name'] || r['Name'] || r['User Name'] || (email ? email.split('@')[0] : `User ${idx + 1}`)).trim();
      const rawRole = String(r['Role'] || r['System Role'] || r['Designation'] || 'SALES_RECOVERY').toUpperCase();
      let role: UserRole = 'SALES_RECOVERY';
      if (rawRole.includes('SUPER_ADMIN') || rawRole.includes('DIRECTOR') || rawRole.includes('EXECUTIVE')) {
        role = 'SUPER_ADMIN';
      } else if (rawRole.includes('ZSM')) {
        role = 'ZSM';
      } else if (rawRole.includes('RSM')) {
        role = 'RSM';
      } else if (rawRole.includes('TSM')) {
        role = 'TSM';
      } else if (rawRole.includes('ACCOUNT')) {
        role = 'ACCOUNTS';
      } else if (rawRole.includes('MANAGEMENT')) {
        role = 'MANAGEMENT';
      }

      const assignedTownsStr = String(r['Assigned Towns'] || r['Towns'] || r['Town'] || 'Peshawar');
      const assignedTowns = assignedTownsStr.split(/[,;/]+/).map((t) => t.trim()).filter(Boolean);

      return {
        id: `usr-sheet-${idx + 101}`,
        employeeCode: String(r['Employee Code'] || r['User Code'] || `EMP-${idx + 101}`).trim(),
        fullName,
        email,
        phone,
        role,
        roleTitle: String(r['Role Title'] || r['Designation'] || role),
        department: role === 'SUPER_ADMIN' || role === 'MANAGEMENT' ? 'EXECUTIVE' : role === 'ACCOUNTS' ? 'FINANCE_ACCOUNTS' : 'SALES_FIELD',
        region: String(r['Region'] || 'KPK'),
        area: String(r['Area'] || 'Peshawar'),
        territory: String(r['Territory'] || 'Peshawar Urban'),
        assignedTowns: assignedTowns.length > 0 ? assignedTowns : ['Peshawar'],
        assignedBeats: [String(r['Route'] || r['Beat'] || 'Central Market Beat')],
        monthlySalesTarget: Number(r['Sales Target']) || 15000000,
        monthlyRecoveryTarget: Number(r['Recovery Target']) || 12000000,
        mtdSalesAchieved: 0,
        mtdRecoveryAchieved: 0,
        todaySalesAchieved: 0,
        todayRecoveryAchieved: 0,
        status: 'ACTIVE',
        avatarInitials: fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'NL',
      };
    });

  if (parsedUsers.length > 0) {
    const existing = getStoredUsers();
    const merged = [...existing];
    parsedUsers.forEach((pu) => {
      if (pu.email && !merged.some((m) => m.email.toLowerCase() === pu.email.toLowerCase())) {
        merged.push(pu);
      }
    });
    saveStoredUsers(merged);
    return merged;
  }

  return getStoredUsers();
}

=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
