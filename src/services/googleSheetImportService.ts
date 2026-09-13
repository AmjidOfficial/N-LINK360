import { readSpreadsheetRange, fetchSpreadsheetMetadata } from './googleSheetsLiveService';
import { supabase, isSupabaseConfigured } from './supabase';
import { toUUID } from './dbSync';

export interface ImportSummary {
  timestamp: string;
  target: 'USERS' | 'CUSTOMERS' | 'ALL';
  totalRows: number;
  usersCount: number;
  distributorsCount: number;
  dealersCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ row: number; identifier: string; reason: string }>;
}

const AUDIT_LOG_STORAGE_KEY = 'nlink_google_sheets_import_audit';

export function getSavedImportAuditLogs(): ImportSummary[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveImportAuditLog(summary: ImportSummary) {
  try {
    const existing = getSavedImportAuditLogs();
    const updated = [summary, ...existing].slice(0, 20);
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save import audit log:', err);
  }
}

/**
 * Normalizes header string to clean alphanumeric key
 */
function normalizeHeader(h: string): string {
  return String(h || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Import and synchronize Users from Google Sheet 'Users' tab
 */
export async function syncUsersFromGoogleSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<{ created: number; updated: number; skipped: number; failed: number; errors: Array<{ row: number; identifier: string; reason: string }> }> {
  const result = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] as Array<{ row: number; identifier: string; reason: string }> };

  // 1. Fetch metadata to check if Users / Employees tab exists
  const meta = await fetchSpreadsheetMetadata(spreadsheetId, accessToken);
  const sheetNames = meta.sheets.map((s) => s.title);
  const targetSheet = sheetNames.find((name) => /users|employees|staff/i.test(name));

  if (!targetSheet) {
    throw new Error(`The spreadsheet does not contain a 'Users' or 'Employees' sheet tab.`);
  }

  // 2. Read rows from the tab
  const rows = await readSpreadsheetRange(spreadsheetId, `'${targetSheet}'!A1:Z500`, accessToken);
  if (!rows || rows.length < 2) {
    return result; // Empty or header only
  }

  const headerRow = rows[0].map(normalizeHeader);
  const colIndex = {
    code: headerRow.findIndex((h) => h.includes('code') || h.includes('emp') || h.includes('id')),
    name: headerRow.findIndex((h) => h.includes('name') || h.includes('fullname')),
    email: headerRow.findIndex((h) => h.includes('email')),
    mobile: headerRow.findIndex((h) => h.includes('mobile') || h.includes('phone') || h.includes('contact')),
    designation: headerRow.findIndex((h) => h.includes('designation') || h.includes('title')),
    role: headerRow.findIndex((h) => h.includes('role')),
    region: headerRow.findIndex((h) => h.includes('region') || h.includes('zone')),
    area: headerRow.findIndex((h) => h.includes('area')),
    territory: headerRow.findIndex((h) => h.includes('territory')),
    town: headerRow.findIndex((h) => h.includes('town') || h.includes('city')),
    status: headerRow.findIndex((h) => h.includes('status') || h.includes('active')),
    salesTarget: headerRow.findIndex((h) => h.includes('salestarget') || h.includes('target')),
    recoveryTarget: headerRow.findIndex((h) => h.includes('recoverytarget')),
  };

  if (colIndex.email === -1 && colIndex.name === -1) {
    throw new Error(`The '${targetSheet}' sheet is missing required columns (Name or Email).`);
  }

  // Load existing employees to match by code or email
  let existingEmployees: any[] = [];
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('employees').select('id, employee_code, email');
    existingEmployees = data || [];
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    if (!row || row.every((c) => !c || String(c).trim() === '')) continue;

    const email = colIndex.email !== -1 ? String(row[colIndex.email] || '').trim().toLowerCase() : '';
    const name = colIndex.name !== -1 ? String(row[colIndex.name] || '').trim() : '';
    const code = colIndex.code !== -1 ? String(row[colIndex.code] || '').trim() : '';
    const mobile = colIndex.mobile !== -1 ? String(row[colIndex.mobile] || '').trim() : '';

    const identifier = email || code || name || `Row #${rowNum}`;

    if (!name && !email) {
      result.skipped++;
      result.errors.push({ row: rowNum, identifier, reason: 'Row has neither Name nor Email.' });
      continue;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        // Match existing employee
        const existing = existingEmployees.find(
          (e) => (email && e.email?.toLowerCase() === email) || (code && e.employee_code?.toLowerCase() === code.toLowerCase())
        );

        const payload: Record<string, any> = {
          employee_code: code || existing?.employee_code || `EMP-${Date.now()}-${i}`,
          full_name: name || existing?.full_name || 'Corporate Employee',
          email: email || existing?.email || null,
          mobile: mobile || existing?.mobile || null,
          head: 'SALES_RECOVERY',
          status: true,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          const { error: updErr } = await supabase.from('employees').update(payload).eq('id', existing.id);
          if (updErr) throw updErr;
          result.updated++;
        } else {
          const { error: insErr } = await supabase.from('employees').insert(payload);
          if (insErr) throw insErr;
          result.created++;
        }
      } else {
        result.updated++;
      }
    } catch (err: any) {
      result.failed++;
      result.errors.push({ row: rowNum, identifier, reason: err?.message || 'Database synchronization failure.' });
    }
  }

  return result;
}

/**
 * Import and synchronize Customers (Distributors and/or Dealers) from Google Sheet
 */
export async function syncCustomersFromGoogleSheet(
  spreadsheetId: string,
  accessToken: string,
  targetType: 'ALL' | 'DISTRIBUTOR' | 'DEALER' = 'ALL'
): Promise<{
  distributors: number;
  dealers: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; identifier: string; reason: string }>;
}> {
  const result = {
    distributors: 0,
    dealers: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [] as Array<{ row: number; identifier: string; reason: string }>,
  };

  const meta = await fetchSpreadsheetMetadata(spreadsheetId, accessToken);
  const sheetNames = meta.sheets.map((s) => s.title);

  // Sheets to inspect
  const candidateSheets: Array<{ title: string; defaultType: 'DISTRIBUTOR' | 'DEALER' | 'AUTO' }> = [];

  if (targetType === 'DISTRIBUTOR' || targetType === 'ALL') {
    const distSheet = sheetNames.find((n) => /distributor/i.test(n));
    if (distSheet) candidateSheets.push({ title: distSheet, defaultType: 'DISTRIBUTOR' });
  }

  if (targetType === 'DEALER' || targetType === 'ALL') {
    const dealerSheet = sheetNames.find((n) => /dealer/i.test(n));
    if (dealerSheet) candidateSheets.push({ title: dealerSheet, defaultType: 'DEALER' });
  }

  // Generic Customers sheet fallback if specific sheets not found
  if (candidateSheets.length === 0) {
    const custSheet = sheetNames.find((n) => /customer/i.test(n));
    if (custSheet) {
      candidateSheets.push({ title: custSheet, defaultType: 'AUTO' });
    }
  }

  if (candidateSheets.length === 0) {
    throw new Error(`The spreadsheet does not contain 'Distributors', 'Dealers', or 'Customers' tabs.`);
  }

  // Load existing customers from Supabase for code matching
  let existingCustomers: any[] = [];
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('customers').select('id, customer_code, company_name, type');
    existingCustomers = data || [];
  }

  for (const sheet of candidateSheets) {
    const rows = await readSpreadsheetRange(spreadsheetId, `'${sheet.title}'!A1:Z1000`, accessToken);
    if (!rows || rows.length < 2) continue;

    const headerRow = rows[0].map(normalizeHeader);
    const colIndex = {
      code: headerRow.findIndex((h) => h.includes('code') || h.includes('custcode') || h.includes('id')),
      name: headerRow.findIndex((h) => h.includes('name') || h.includes('company') || h.includes('firm')),
      address: headerRow.findIndex((h) => h.includes('address')),
      contact: headerRow.findIndex((h) => h.includes('contact') || h.includes('person') || h.includes('owner')),
      phone: headerRow.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('cell')),
      town: headerRow.findIndex((h) => h.includes('town') || h.includes('city')),
      type: headerRow.findIndex((h) => h.includes('type')),
      employee: headerRow.findIndex((h) => h.includes('employee') || h.includes('assigned') || h.includes('officer')),
      openingBalance: headerRow.findIndex((h) => h.includes('openingbalance') || h.includes('openbal') || h.includes('balance')),
      creditLimit: headerRow.findIndex((h) => h.includes('creditlimit') || h.includes('limit')),
      salesTarget: headerRow.findIndex((h) => h.includes('salestarget') || h.includes('target')),
      recoveryTarget: headerRow.findIndex((h) => h.includes('recoverytarget')),
      status: headerRow.findIndex((h) => h.includes('status') || h.includes('active')),
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      if (!row || row.every((c) => !c || String(c).trim() === '')) continue;

      const code = colIndex.code !== -1 ? String(row[colIndex.code] || '').trim() : '';
      const name = colIndex.name !== -1 ? String(row[colIndex.name] || '').trim() : '';
      const address = colIndex.address !== -1 ? String(row[colIndex.address] || '').trim() : '';
      const contact = colIndex.contact !== -1 ? String(row[colIndex.contact] || '').trim() : '';
      const phone = colIndex.phone !== -1 ? String(row[colIndex.phone] || '').trim() : '';
      const town = colIndex.town !== -1 ? String(row[colIndex.town] || '').trim() : '';

      // Type determination: sheet context or explicit column
      let determinedType: 'DISTRIBUTOR' | 'DEALER' = 'DEALER';
      if (sheet.defaultType === 'DISTRIBUTOR') determinedType = 'DISTRIBUTOR';
      else if (sheet.defaultType === 'DEALER') determinedType = 'DEALER';
      else if (colIndex.type !== -1) {
        const typeStr = String(row[colIndex.type] || '').toUpperCase();
        if (typeStr.includes('DISTRIBUTOR')) determinedType = 'DISTRIBUTOR';
        else determinedType = 'DEALER';
      }

      if (targetType !== 'ALL' && determinedType !== targetType) {
        continue;
      }

      const openingBal = colIndex.openingBalance !== -1 ? Number(String(row[colIndex.openingBalance]).replace(/[^0-9.-]/g, '')) || 0 : 0;
      const creditLimit = colIndex.creditLimit !== -1 ? Number(String(row[colIndex.creditLimit]).replace(/[^0-9.-]/g, '')) || 0 : 0;

      const identifier = code || name || `Row #${rowNum}`;

      if (!name && !code) {
        result.skipped++;
        result.errors.push({ row: rowNum, identifier, reason: 'Row has neither Customer Code nor Company Name.' });
        continue;
      }

      try {
        if (isSupabaseConfigured && supabase) {
          // Check if customer exists by code or name
          const existing = existingCustomers.find(
            (c) => (code && c.customer_code?.toLowerCase() === code.toLowerCase()) || (name && c.company_name?.toLowerCase() === name.toLowerCase())
          );

          const customerPayload: Record<string, any> = {
            id: existing?.id || toUUID(`cust-import-${Date.now()}-${i}`, 'c'),
            customer_code: code || existing?.customer_code || `CUST-${Date.now()}-${i}`,
            company_name: name || existing?.company_name || 'Commercial Partner',
            name: name || existing?.company_name || 'Commercial Partner',
            contact_person: contact || null,
            phone: phone || null,
            address: address || null,
            city: town || 'Lahore',
            type: determinedType,
            customer_type: determinedType,
            opening_balance: openingBal,
            credit_limit: creditLimit,
            credit_days: 30,
            is_active: true,
            status: true,
            updated_at: new Date().toISOString(),
          };

          const { error: upsertErr } = await supabase.from('customers').upsert(customerPayload);
          if (upsertErr) throw upsertErr;

          if (existing) result.updated++;
          else result.created++;

          if (determinedType === 'DISTRIBUTOR') result.distributors++;
          else result.dealers++;
        } else {
          result.updated++;
          if (determinedType === 'DISTRIBUTOR') result.distributors++;
          else result.dealers++;
        }
      } catch (err: any) {
        result.failed++;
        result.errors.push({ row: rowNum, identifier, reason: err?.message || 'Database write failure.' });
      }
    }
  }

  return result;
}

/**
 * Executes full synchronization from Google Sheet based on requested scope
 */
export async function executeGoogleSheetImport(
  spreadsheetId: string,
  accessToken: string,
  scope: 'USERS' | 'CUSTOMERS' | 'ALL'
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    timestamp: new Date().toISOString(),
    target: scope,
    totalRows: 0,
    usersCount: 0,
    distributorsCount: 0,
    dealersCount: 0,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: [],
  };

  if (scope === 'USERS' || scope === 'ALL') {
    try {
      const uRes = await syncUsersFromGoogleSheet(spreadsheetId, accessToken);
      summary.usersCount = uRes.created + uRes.updated;
      summary.createdCount += uRes.created;
      summary.updatedCount += uRes.updated;
      summary.skippedCount += uRes.skipped;
      summary.failedCount += uRes.failed;
      summary.errors.push(...uRes.errors);
    } catch (uErr: any) {
      summary.errors.push({ row: 0, identifier: 'Users Sheet', reason: uErr?.message || 'Failed to sync users.' });
    }
  }

  if (scope === 'CUSTOMERS' || scope === 'ALL') {
    try {
      const cRes = await syncCustomersFromGoogleSheet(spreadsheetId, accessToken, 'ALL');
      summary.distributorsCount = cRes.distributors;
      summary.dealersCount = cRes.dealers;
      summary.createdCount += cRes.created;
      summary.updatedCount += cRes.updated;
      summary.skippedCount += cRes.skipped;
      summary.failedCount += cRes.failed;
      summary.errors.push(...cRes.errors);
    } catch (cErr: any) {
      summary.errors.push({ row: 0, identifier: 'Customers Sheet', reason: cErr?.message || 'Failed to sync customers.' });
    }
  }

  summary.totalRows = summary.createdCount + summary.updatedCount + summary.skippedCount + summary.failedCount;
  saveImportAuditLog(summary);
  return summary;
}
