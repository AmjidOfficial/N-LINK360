/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Security, Sanitization & Defense Engine
 * Protects against CSV/Excel Formula Injection, XSS, and Client-side Data Tampering.
 */

// ==============================================================================
// 1. CSV / EXCEL FORMULA INJECTION DEFENSE
// ==============================================================================
/**
 * Leading characters that can trigger formula execution in spreadsheet software:
 * '=', '+', '-', '@', '\t', '\r', '\n'
 * Prefix with a single quote to force plain-text interpretation.
 */
export function sanitizeForSpreadsheet(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  
  if (/^[=+\-@\t\r]/.test(str)) {
    // Escape formula trigger characters by prepending a single quote
    return `'${str}`;
  }
  return str;
}

/**
 * Escapes values for safe CSV inclusion (handles commas, quotes, newlines, formulas).
 */
export function formatCsvCell(val: unknown): string {
  const sanitized = sanitizeForSpreadsheet(val);
  // If the cell contains quotes, commas, or newlines, wrap in quotes and escape quotes
  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

// ==============================================================================
// 2. XSS & HTML SANITIZATION
// ==============================================================================
export function sanitizeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==============================================================================
// 3. AUTHORITATIVE VALUE VALIDATION (ANTI-TAMPERING)
// ==============================================================================
export interface ValidationIssue {
  field: string;
  expected: unknown;
  received: unknown;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  message: string;
}

/**
 * Validates that calculated line item gross amounts and invoice totals match exact mathematical formulas.
 */
export function verifyInvoiceCalculations(invoice: {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  items: Array<{
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    netAmount?: number;
  }>;
}): { isValid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  let calculatedSubtotal = 0;
  for (let i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i];
    const rawTotal = item.quantity * item.unitPrice;
    const discount = (rawTotal * (item.discountPercent || 0)) / 100;
    const expectedLineNet = Math.round((rawTotal - discount + Number.EPSILON) * 100) / 100;

    if (item.netAmount !== undefined && Math.abs(item.netAmount - expectedLineNet) > 0.05) {
      issues.push({
        field: `items[${i}].netAmount`,
        expected: expectedLineNet,
        received: item.netAmount,
        severity: 'CRITICAL',
        message: `Line item ${i + 1} net amount mismatch: expected ${expectedLineNet}, received ${item.netAmount}`,
      });
    }
    calculatedSubtotal += expectedLineNet;
  }

  calculatedSubtotal = Math.round((calculatedSubtotal + Number.EPSILON) * 100) / 100;
  if (Math.abs(invoice.subtotal - calculatedSubtotal) > 0.05) {
    issues.push({
      field: 'subtotal',
      expected: calculatedSubtotal,
      received: invoice.subtotal,
      severity: 'CRITICAL',
      message: `Invoice subtotal mismatch: expected ${calculatedSubtotal}, received ${invoice.subtotal}`,
    });
  }

  const expectedTotal = Math.round((invoice.subtotal + invoice.taxAmount + Number.EPSILON) * 100) / 100;
  if (Math.abs(invoice.totalAmount - expectedTotal) > 0.05) {
    issues.push({
      field: 'totalAmount',
      expected: expectedTotal,
      received: invoice.totalAmount,
      severity: 'CRITICAL',
      message: `Invoice total amount mismatch: expected ${expectedTotal}, received ${invoice.totalAmount}`,
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

// ==============================================================================
// 4. NUMBER TO WORDS CONVERTER (FOR OFFICIAL PAKISTANI RUPEES INVOICING)
// ==============================================================================
export function numberToPakistaniRupeesWords(amount: number): string {
  if (amount === 0) return 'Rupees Zero Only';
  if (isNaN(amount) || amount < 0) return 'Invalid Amount';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const wholeNumber = Math.floor(amount);
  const paisas = Math.round((amount - wholeNumber) * 100);

  function convertHundreds(n: number): string {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  }

  let words = '';
  let rem = wholeNumber;

  // Crore (10,000,000)
  if (rem >= 10000000) {
    const crore = Math.floor(rem / 10000000);
    words += convertHundreds(crore) + ' Crore ';
    rem %= 10000000;
  }
  // Lakh (100,000)
  if (rem >= 100000) {
    const lakh = Math.floor(rem / 100000);
    words += convertHundreds(lakh) + ' Lakh ';
    rem %= 100000;
  }
  // Thousand (1,000)
  if (rem >= 1000) {
    const thousand = Math.floor(rem / 1000);
    words += convertHundreds(thousand) + ' Thousand ';
    rem %= 1000;
  }
  // Remaining hundreds
  if (rem > 0) {
    words += convertHundreds(rem);
  }

  words = words.trim();
  let result = `Rupees ${words}`;
  if (paisas > 0) {
    result += ` and ${paisas}/100 Paisa`;
  }
  result += ' Only';

  return result;
}
