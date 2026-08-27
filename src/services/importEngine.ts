/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - SalesPulse-Inspired Controlled Import Engine
 * Handles CSV parsing, schema validation, reference integrity, duplicate detection, and import execution.
 */

import { sanitizeForSpreadsheet, formatCsvCell } from './security';
import { Customer, SKU, User } from '../types';

export type ImportEntityType =
  | 'CUSTOMERS'
  | 'PRODUCTS_SKUS'
  | 'EMPLOYEES'
  | 'USERS'
  | 'HIERARCHY'
  | 'PRICE_LISTS'
  | 'ASSIGNMENTS';

export interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'email' | 'phone' | 'enum' | 'boolean';
  enumValues?: string[];
  description?: string;
  aliases?: string[];
}

export interface EntitySchema {
  type: ImportEntityType;
  title: string;
  description: string;
  fields: FieldDefinition[];
  sampleData: Record<string, string | number>[];
}

// ==============================================================================
// 1. ENTITY SCHEMAS & DEFINITIONS
// ==============================================================================
export const IMPORT_SCHEMAS: Record<ImportEntityType, EntitySchema> = {
  CUSTOMERS: {
    type: 'CUSTOMERS',
    title: 'Customer Directory & Accounts',
    description: 'Bulk import dealers, distributors, and retail partners with credit limits and territory assignments.',
    fields: [
      { key: 'customerCode', label: 'Customer Code', required: true, type: 'string', aliases: ['code', 'cust_code', 'id', 'account_no'] },
      { key: 'companyName', label: 'Company / Business Name', required: true, type: 'string', aliases: ['name', 'business_name', 'shop_name', 'company'] },
      { key: 'contactPerson', label: 'Contact Person', required: true, type: 'string', aliases: ['contact', 'owner', 'proprietor'] },
      { key: 'phone', label: 'Phone / Mobile', required: true, type: 'phone', aliases: ['mobile', 'cell', 'telephone', 'contact_no'] },
      { key: 'email', label: 'Email Address', required: false, type: 'email', aliases: ['e-mail', 'mail'] },
      { key: 'type', label: 'Customer Type', required: true, type: 'enum', enumValues: ['DISTRIBUTOR', 'DEALER', 'CUSTOMER', 'SHOP'], aliases: ['category', 'party_type'] },
      { key: 'address', label: 'Business Address', required: true, type: 'string', aliases: ['location', 'street', 'shop_address'] },
      { key: 'city', label: 'City', required: true, type: 'string', aliases: ['town', 'district'] },
      { key: 'region', label: 'Region / Zone', required: false, type: 'string', aliases: ['province', 'sales_region', 'zone'] },
      { key: 'creditLimit', label: 'Credit Limit (PKR)', required: false, type: 'number', aliases: ['limit', 'max_credit', 'credit_limit_pkr'] },
      { key: 'creditDays', label: 'Credit Days Term', required: false, type: 'number', aliases: ['days', 'terms', 'payment_days'] },
      { key: 'openingBalance', label: 'Opening Balance (PKR)', required: false, type: 'number', aliases: ['opening', 'balance', 'starting_balance'] },
      { key: 'taxNumber', label: 'Tax NTN / STRN', required: false, type: 'string', aliases: ['ntn', 'strn', 'tax_id'] },
      { key: 'cnic', label: 'CNIC / National ID', required: false, type: 'string', aliases: ['id_card', 'national_id'] },
    ],
    sampleData: [
      {
        customerCode: 'CUST-LHR-101',
        companyName: 'Bismillah Electric Store',
        contactPerson: 'Mian Tariq Javed',
        phone: '0300-4567890',
        email: 'bismillah@electrics.pk',
        type: 'DEALER',
        address: 'Main Bazar, Ravi Road',
        city: 'Lahore',
        region: 'Punjab North',
        creditLimit: 500000,
        creditDays: 30,
        openingBalance: 0,
        taxNumber: 'NTN-334455',
        cnic: '35201-9988776-1',
      },
      {
        customerCode: 'CUST-MUL-102',
        companyName: 'Chenab Traders & Cables',
        contactPerson: 'Sheikh Farooq',
        phone: '0301-7788990',
        email: 'farooq@chenabtraders.pk',
        type: 'DISTRIBUTOR',
        address: 'Hussain Agahi Market',
        city: 'Multan',
        region: 'Punjab South',
        creditLimit: 1200000,
        creditDays: 45,
        openingBalance: 150000,
        taxNumber: 'NTN-778899',
        cnic: '36302-1122334-5',
      },
    ],
  },
  PRODUCTS_SKUS: {
    type: 'PRODUCTS_SKUS',
    title: 'Product Master & SKU Catalog',
    description: 'Bulk import lighting SKUs, pack sizes, wattage, voltages, trade and retail pricing.',
    fields: [
      { key: 'skuCode', label: 'SKU Code', required: true, type: 'string', aliases: ['code', 'item_code', 'part_number'] },
      { key: 'name', label: 'SKU / Product Description', required: true, type: 'string', aliases: ['item_name', 'description', 'title'] },
      { key: 'brandName', label: 'Brand', required: false, type: 'string', aliases: ['brand', 'manufacturer'] },
      { key: 'categoryName', label: 'Category', required: false, type: 'string', aliases: ['category', 'product_type', 'group'] },
      { key: 'wattage', label: 'Wattage (W)', required: false, type: 'string', aliases: ['watts', 'power'] },
      { key: 'colorTemperature', label: 'Color Temperature', required: false, type: 'string', aliases: ['cct', 'kelvin', 'color'] },
      { key: 'cartonQuantity', label: 'Units Per Carton (Pcs)', required: true, type: 'number', aliases: ['carton_size', 'pack_qty', 'units_per_box'] },
      { key: 'tradePrice', label: 'Trade Price (PKR)', required: true, type: 'number', aliases: ['tp', 'dealer_price', 'wholesale_price'] },
      { key: 'retailPrice', label: 'Retail Price (PKR)', required: true, type: 'number', aliases: ['mrp', 'retail', 'list_price'] },
      { key: 'minimumPrice', label: 'Floor / Minimum Price (PKR)', required: false, type: 'number', aliases: ['min_price', 'floor_price'] },
      { key: 'reorderLevel', label: 'Reorder Safety Level', required: false, type: 'number', aliases: ['min_stock', 'safety_stock', 'reorder_qty'] },
      { key: 'barcode', label: 'EAN/UPC Barcode', required: false, type: 'string', aliases: ['ean', 'upc', 'barcode_no'] },
    ],
    sampleData: [
      {
        skuCode: 'SKU-NL-BLB09-CW',
        name: '9W LED Eco Bulb (Cool Daylight 6500K)',
        brandName: 'National Lights',
        categoryName: 'Bulbs & Lamps',
        wattage: '9W',
        colorTemperature: '6500K',
        cartonQuantity: 50,
        tradePrice: 240,
        retailPrice: 300,
        minimumPrice: 225,
        reorderLevel: 250,
        barcode: '896400010901',
      },
      {
        skuCode: 'SKU-NL-PNL12-WW',
        name: '12W SMD Slim Panel (Warm White 3000K)',
        brandName: 'National Lights',
        categoryName: 'Panels & Downlights',
        wattage: '12W',
        colorTemperature: '3000K',
        cartonQuantity: 30,
        tradePrice: 520,
        retailPrice: 650,
        minimumPrice: 490,
        reorderLevel: 100,
        barcode: '896400021202',
      },
    ],
  },
  EMPLOYEES: {
    type: 'EMPLOYEES',
    title: 'Sales & Field Force Hierarchy',
    description: 'Bulk register RSMs, ASMs, TSMs, Sales Supervisors, and Order Bookers/Recovery Officers.',
    fields: [
      { key: 'employeeCode', label: 'Employee ID / Code', required: true, type: 'string', aliases: ['emp_id', 'code', 'badge_no'] },
      { key: 'fullName', label: 'Full Name', required: true, type: 'string', aliases: ['name', 'employee_name'] },
      { key: 'role', label: 'Sales Role', required: true, type: 'enum', enumValues: ['RSM', 'ASM', 'TSM', 'SS', 'OB', 'SALES_RECOVERY'], aliases: ['designation', 'position'] },
      { key: 'email', label: 'Corporate Email', required: true, type: 'email', aliases: ['e-mail', 'mail'] },
      { key: 'phone', label: 'Contact Phone', required: true, type: 'phone', aliases: ['mobile', 'cell'] },
      { key: 'region', label: 'Assigned Region', required: false, type: 'string', aliases: ['zone', 'territory'] },
      { key: 'branchName', label: 'Branch Name', required: false, type: 'string', aliases: ['branch', 'depot'] },
      { key: 'monthlyTarget', label: 'Monthly Sales Target (PKR)', required: false, type: 'number', aliases: ['target', 'sales_quota'] },
    ],
    sampleData: [
      {
        employeeCode: 'EMP-PK-088',
        fullName: 'Kamran Aslam',
        role: 'TSM',
        email: 'kamran.tsm@nationallights.com',
        phone: '0321-4433221',
        region: 'Punjab North',
        branchName: 'Lahore Central Branch',
        monthlyTarget: 3500000,
      },
      {
        employeeCode: 'EMP-PK-092',
        fullName: 'Zubair Shah',
        role: 'OB',
        email: 'zubair.ob@nationallights.com',
        phone: '0333-8877665',
        region: 'Punjab North',
        branchName: 'Lahore Central Branch',
        monthlyTarget: 1800000,
      },
    ],
  },
  USERS: {
    type: 'USERS',
    title: 'ERP User Accounts & Role Permissions',
    description: 'Bulk provision system accounts, permissions, and department access levels.',
    fields: [
      { key: 'email', label: 'Login Email', required: true, type: 'email', aliases: ['user_email', 'username'] },
      { key: 'fullName', label: 'Full Name', required: true, type: 'string', aliases: ['name'] },
      { key: 'role', label: 'System Access Role', required: true, type: 'enum', enumValues: ['SUPER_ADMIN', 'MANAGEMENT', 'FACTORY_MANAGER', 'WAREHOUSE_MANAGER', 'ACCOUNTS', 'SALES_MANAGER', 'SALES_RECOVERY', 'DISPATCH_OFFICER'], aliases: ['permission_role', 'access_level'] },
      { key: 'phone', label: 'Phone Number', required: false, type: 'phone', aliases: ['mobile', 'contact'] },
      { key: 'branchName', label: 'Branch / Plant Name', required: false, type: 'string', aliases: ['branch', 'plant', 'location'] },
    ],
    sampleData: [
      {
        email: 'dispatch.incharge@nationallights.com',
        fullName: 'Mohsin Rafiq',
        role: 'DISPATCH_OFFICER',
        phone: '0302-5544332',
        branchName: 'Lahore Central Warehouse',
      },
    ],
  },
  HIERARCHY: {
    type: 'HIERARCHY',
    title: 'Geographic & Territory Hierarchy',
    description: 'Import master territory structures from Region down to Town and Route names.',
    fields: [
      { key: 'region', label: 'Region', required: true, type: 'string', aliases: ['region_name'] },
      { key: 'zone', label: 'Zone', required: true, type: 'string', aliases: ['zone_name'] },
      { key: 'area', label: 'Area', required: true, type: 'string', aliases: ['area_name'] },
      { key: 'territory', label: 'Territory', required: true, type: 'string', aliases: ['territory_name'] },
      { key: 'town', label: 'Town', required: true, type: 'string', aliases: ['town_name', 'city'] },
      { key: 'route', label: 'Route Name / Beat', required: true, type: 'string', aliases: ['beat_name', 'route_name'] },
      { key: 'assignedSupervisor', label: 'Assigned Supervisor', required: false, type: 'string', aliases: ['supervisor', 'ss'] },
    ],
    sampleData: [
      {
        region: 'Punjab North',
        zone: 'Lahore Metro',
        area: 'Lahore Urban',
        territory: 'Brandreth / Railway',
        town: 'Lahore',
        route: 'Brandreth Road Commercial Beat #1',
        assignedSupervisor: 'Farooq Ahmad',
      },
    ],
  },
  PRICE_LISTS: {
    type: 'PRICE_LISTS',
    title: 'Custom Price Lists & Contract Rates',
    description: 'Bulk assign special negotiated price rules and discount ceilings by customer tier or account code.',
    fields: [
      { key: 'customerCodeOrTier', label: 'Customer Code or Tier', required: true, type: 'string', aliases: ['party', 'tier', 'customer_code'] },
      { key: 'skuCode', label: 'SKU Code', required: true, type: 'string', aliases: ['item_code', 'sku'] },
      { key: 'specialTradePrice', label: 'Special Trade Price (PKR)', required: true, type: 'number', aliases: ['custom_price', 'rate', 'price'] },
      { key: 'maxDiscountPercent', label: 'Max Allowed Discount %', required: false, type: 'number', aliases: ['max_discount', 'discount_cap'] },
      { key: 'validUntil', label: 'Valid Until (YYYY-MM-DD)', required: false, type: 'string', aliases: ['expiry_date', 'valid_to'] },
    ],
    sampleData: [
      {
        customerCodeOrTier: 'CUST-DST-001',
        skuCode: 'SKU-NL-BLB12-CW',
        specialTradePrice: 295,
        maxDiscountPercent: 5,
        validUntil: '2026-12-31',
      },
    ],
  },
  ASSIGNMENTS: {
    type: 'ASSIGNMENTS',
    title: 'Field Officer Route & Beat Assignments',
    description: 'Link Order Bookers and Recovery Officers to dedicated Routes, Towns, and Customer Beats.',
    fields: [
      { key: 'employeeCode', label: 'Employee ID', required: true, type: 'string', aliases: ['emp_id', 'officer_code'] },
      { key: 'route', label: 'Assigned Route / Beat', required: true, type: 'string', aliases: ['route_name', 'beat'] },
      { key: 'town', label: 'Town / City', required: true, type: 'string', aliases: ['city'] },
      { key: 'visitDay', label: 'Scheduled Visit Day', required: false, type: 'enum', enumValues: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'DAILY'], aliases: ['day', 'schedule_day'] },
      { key: 'monthlyRecoveryTarget', label: 'Recovery Quota (PKR)', required: false, type: 'number', aliases: ['recovery_target'] },
    ],
    sampleData: [
      {
        employeeCode: 'EMP-PK-092',
        route: 'Brandreth Road Commercial Beat #1',
        town: 'Lahore',
        visitDay: 'MONDAY',
        monthlyRecoveryTarget: 1500000,
      },
    ],
  },
};

// ==============================================================================
// 2. PARSING & TOKENIZING ENGINE (ZERO-DEPENDENCY ROBUST CSV PARSER)
// ==============================================================================
export function parseCsvText(csvText: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].map((h) => h.replace(/^["']|["']$/g, '').trim());
  const rows = lines.slice(1);

  return { headers, rows };
}

// ==============================================================================
// 3. FUZZY COLUMN MAPPING ENGINE
// ==============================================================================
export function autoMapColumns(
  uploadedHeaders: string[],
  schema: EntitySchema
): Record<string, string> {
  const mapping: Record<string, string> = {};

  schema.fields.forEach((field) => {
    const fieldKeyNorm = field.key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fieldLabelNorm = field.label.toLowerCase().replace(/[^a-z0-9]/g, '');
    const aliases = (field.aliases || []).map((a) => a.toLowerCase().replace(/[^a-z0-9]/g, ''));

    let matchedHeader = '';

    for (const h of uploadedHeaders) {
      const hNorm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (hNorm === fieldKeyNorm || hNorm === fieldLabelNorm || aliases.includes(hNorm)) {
        matchedHeader = h;
        break;
      }
    }

    if (!matchedHeader) {
      // Partial containment search
      for (const h of uploadedHeaders) {
        const hNorm = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (hNorm.includes(fieldKeyNorm) || fieldKeyNorm.includes(hNorm) || aliases.some((a) => hNorm.includes(a))) {
          matchedHeader = h;
          break;
        }
      }
    }

    if (matchedHeader) {
      mapping[field.key] = matchedHeader;
    }
  });

  return mapping;
}

// ==============================================================================
// 4. VALIDATION, DUPLICATE DETECTION & REFERENCE ENGINE
// ==============================================================================
export interface ProcessedRow {
  rowNumber: number;
  raw: Record<string, string>;
  parsed: Record<string, unknown>;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  processedRows: ProcessedRow[];
}

export function validateAndProcessRows(
  rows: string[][],
  headers: string[],
  mapping: Record<string, string>,
  schema: EntitySchema,
  existingRecords: {
    customers: Customer[];
    skus: SKU[];
    users: User[];
  }
): ValidationSummary {
  const processedRows: ProcessedRow[] = [];
  const seenPrimaryKeys = new Set<string>();

  // Map header name to column index
  const headerIndexMap = new Map<string, number>();
  headers.forEach((h, idx) => headerIndexMap.set(h, idx));

  // Build existing lookup sets for duplicate & reference checks
  const existingCustCodes = new Set(existingRecords.customers.map((c) => c.customerCode.toLowerCase().trim()));
  const existingSkuCodes = new Set(existingRecords.skus.map((s) => s.skuCode.toLowerCase().trim()));
  const existingUserEmails = new Set(existingRecords.users.map((u) => u.email.toLowerCase().trim()));

  rows.forEach((rowValues, rIdx) => {
    const rowNumber = rIdx + 2; // Row 1 is header
    const raw: Record<string, string> = {};
    const parsed: Record<string, unknown> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract raw mapped values
    schema.fields.forEach((f) => {
      const colHeader = mapping[f.key];
      let val = '';
      if (colHeader && headerIndexMap.has(colHeader)) {
        const colIdx = headerIndexMap.get(colHeader)!;
        val = (rowValues[colIdx] || '').trim();
      }
      raw[f.key] = val;
    });

    // Validate each field
    schema.fields.forEach((f) => {
      let val = raw[f.key] || '';

      // Check required
      if (f.required && (!val || val.length === 0)) {
        errors.push(`Missing required field: '${f.label}'`);
        return;
      }

      if (!val) {
        parsed[f.key] = f.type === 'number' ? 0 : f.type === 'boolean' ? false : '';
        return;
      }

      // Type validations & coercions
      switch (f.type) {
        case 'number': {
          const cleanNumStr = val.replace(/,/g, '').replace(/[^\d.-]/g, '');
          const num = Number(cleanNumStr);
          if (isNaN(num)) {
            errors.push(`Field '${f.label}' must be a valid number (got '${val}')`);
          } else {
            parsed[f.key] = num;
          }
          break;
        }
        case 'email': {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(val)) {
            errors.push(`Invalid email format in '${f.label}': '${val}'`);
          } else {
            parsed[f.key] = val.toLowerCase();
          }
          break;
        }
        case 'phone': {
          const digits = val.replace(/\D/g, '');
          if (digits.length < 10) {
            warnings.push(`Phone number in '${f.label}' may be too short: '${val}'`);
          }
          parsed[f.key] = val;
          break;
        }
        case 'enum': {
          const upper = val.toUpperCase().trim();
          if (f.enumValues && !f.enumValues.includes(upper)) {
            errors.push(`Invalid value '${val}' for '${f.label}'. Allowed: [${f.enumValues.join(', ')}]`);
          } else {
            parsed[f.key] = upper;
          }
          break;
        }
        case 'boolean': {
          const lower = val.toLowerCase().trim();
          parsed[f.key] = lower === 'true' || lower === '1' || lower === 'yes';
          break;
        }
        default:
          parsed[f.key] = sanitizeForSpreadsheet(val);
          break;
      }
    });

    // Entity-Specific Duplicate & Reference Integrity Checks
    let isDuplicate = false;

    if (schema.type === 'CUSTOMERS') {
      const code = String(parsed.customerCode || '').toLowerCase().trim();
      if (code) {
        if (existingCustCodes.has(code)) {
          isDuplicate = true;
          warnings.push(`Customer code '${parsed.customerCode}' already exists in database (will update if selected).`);
        }
        if (seenPrimaryKeys.has(code)) {
          isDuplicate = true;
          errors.push(`Duplicate customer code '${parsed.customerCode}' found in this upload file.`);
        } else {
          seenPrimaryKeys.add(code);
        }
      }
    } else if (schema.type === 'PRODUCTS_SKUS') {
      const skuCode = String(parsed.skuCode || '').toLowerCase().trim();
      if (skuCode) {
        if (existingSkuCodes.has(skuCode)) {
          isDuplicate = true;
          warnings.push(`SKU code '${parsed.skuCode}' already exists in catalog.`);
        }
        if (seenPrimaryKeys.has(skuCode)) {
          isDuplicate = true;
          errors.push(`Duplicate SKU code '${parsed.skuCode}' found in upload file.`);
        } else {
          seenPrimaryKeys.add(skuCode);
        }
      }
    } else if (schema.type === 'USERS' || schema.type === 'EMPLOYEES') {
      const email = String(parsed.email || '').toLowerCase().trim();
      if (email) {
        if (existingUserEmails.has(email)) {
          isDuplicate = true;
          warnings.push(`User email '${parsed.email}' already exists.`);
        }
        if (seenPrimaryKeys.has(email)) {
          isDuplicate = true;
          errors.push(`Duplicate email '${parsed.email}' in upload file.`);
        } else {
          seenPrimaryKeys.add(email);
        }
      }
    } else if (schema.type === 'PRICE_LISTS') {
      const sku = String(parsed.skuCode || '').toLowerCase().trim();
      if (sku && !existingSkuCodes.has(sku)) {
        errors.push(`Referenced SKU code '${parsed.skuCode}' does not exist in master catalog.`);
      }
    }

    const isValid = errors.length === 0;

    processedRows.push({
      rowNumber,
      raw,
      parsed,
      isValid,
      isDuplicate,
      errors,
      warnings,
    });
  });

  const validRows = processedRows.filter((r) => r.isValid && !r.isDuplicate).length;
  const invalidRows = processedRows.filter((r) => !r.isValid).length;
  const duplicateRows = processedRows.filter((r) => r.isValid && r.isDuplicate).length;

  return {
    totalRows: processedRows.length,
    validRows,
    invalidRows,
    duplicateRows,
    processedRows,
  };
}

// ==============================================================================
// 5. TEMPLATE & ERROR EXPORT GENERATORS
// ==============================================================================
export function generateSampleCsvTemplate(schema: EntitySchema): string {
  const headers = schema.fields.map((f) => f.label);
  const rows: string[][] = [headers];

  schema.sampleData.forEach((sample) => {
    const row = schema.fields.map((f) => {
      const val = sample[f.key];
      return val !== undefined ? String(val) : '';
    });
    rows.push(row);
  });

  return rows.map((r) => r.map(formatCsvCell).join(',')).join('\r\n');
}

export function generateErrorResultCsv(
  schema: EntitySchema,
  processedRows: ProcessedRow[]
): string {
  const failedRows = processedRows.filter((r) => !r.isValid || r.errors.length > 0);
  const headers = ['Row #', 'Error Reason', ...schema.fields.map((f) => f.label)];

  const rows: string[][] = [headers];

  failedRows.forEach((r) => {
    const rowData = [
      r.rowNumber.toString(),
      r.errors.join(' | '),
      ...schema.fields.map((f) => String(r.raw[f.key] || '')),
    ];
    rows.push(rowData);
  });

  return rows.map((r) => r.map(formatCsvCell).join(',')).join('\r\n');
}
