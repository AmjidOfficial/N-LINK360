/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Production Enterprise Report Exporter
 * Generates and downloads real CSV reports for Sales, Recoveries, and Dealer Aging.
 */

import { Customer, SalesOrder, Recovery } from '../types';

function triggerCsvDownload(csvContent: string, fileName: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports verified Sales Orders to CSV
 */
export function exportSalesSummaryCsv(orders: SalesOrder[] = []): void {
  const headers = [
    'Order #',
    'Order Date',
    'Customer Code',
    'Customer / Shop Name',
    'Town / Route',
    'Booked By',
    'SKU Count',
    'Gross Total (PKR)',
    'Status',
    'Approval Authority',
  ];

  const rows = orders.map((o) => [
    `"${o.orderNumber || o.id}"`,
    `"${(o.orderDate || o.createdAt || '').slice(0, 10)}"`,
    `"${o.customerCode || 'N/A'}"`,
    `"${(o.customerName || '').replace(/"/g, '""')}"`,
    `"${o.town || 'National'}"`,
    `"${(o.salesUserName || 'Sales Officer').replace(/"/g, '""')}"`,
    o.items?.length || 1,
    o.totalAmount || 0,
    `"${o.status || 'SUBMITTED'}"`,
    `"${o.shahzadApproval === 'APPROVED' ? 'Shahzad Ullah (Approved)' : o.shahzadApproval || 'Pending'}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(csv, `National_Lights_Sales_Summary_${dateStr}.csv`);
}

/**
 * Exports Recovery / Payment Audit records to CSV
 */
export function exportRecoveryAuditCsv(recoveries: Recovery[] = []): void {
  const headers = [
    'Recovery Ref',
    'Collection Date',
    'Customer Code',
    'Customer / Shop Name',
    'Collector Name',
    'Amount (PKR)',
    'Payment Mode',
    'Instrument / Cheque #',
    'Bank Name',
    'Status',
    'Executive Approval',
  ];

  const rows = recoveries.map((r) => [
    `"${r.id || r.recoveryNumber || 'REC'}"`,
    `"${(r.collectionDate || r.createdAt || '').slice(0, 10)}"`,
    `"${r.customerCode || 'N/A'}"`,
    `"${(r.customerName || '').replace(/"/g, '""')}"`,
    `"${(r.salesUserName || 'Field Officer').replace(/"/g, '""')}"`,
    r.amount || 0,
    `"${r.paymentMode || 'CASH'}"`,
    `"${r.instrumentNumber || 'N/A'}"`,
    `"${r.bankName || 'N/A'}"`,
    `"${r.status || 'PENDING'}"`,
    `"${r.shahzadApproval === 'APPROVED' ? 'Shahzad Ullah (Verified)' : r.shahzadApproval || 'Pending'}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(csv, `National_Lights_Recovery_Audit_${dateStr}.csv`);
}

/**
 * Exports Dealer Accounts & Outstanding Aging to CSV
 */
export function exportAgingReportCsv(customers: Customer[] = []): void {
  const headers = [
    'Account Code',
    'Dealer / Shop Name',
    'Proprietor',
    'Town / City',
    'Contact Phone',
    'Sanctioned Credit Limit (PKR)',
    'Current Outstanding Balance (PKR)',
    'Credit Utilization %',
    'Credit Alert Status',
    'Account Status',
  ];

  const rows = customers.map((c) => {
    const limit = c.creditLimit || 0;
    const balance = c.currentBalance ?? c.openingBalance ?? 0;
    const util = limit > 0 ? Math.round((balance / limit) * 100) : 0;
    const isOver = limit > 0 && balance > limit;

    return [
      `"${c.customerCode || c.id}"`,
      `"${(c.companyName || '').replace(/"/g, '""')}"`,
      `"${(c.contactPerson || 'Proprietor').replace(/"/g, '""')}"`,
      `"${c.town || c.city || 'Commercial Market'}"`,
      `"${c.phone || ''}"`,
      limit,
      balance,
      `"${util}%"`,
      `"${isOver ? 'OVER-LIMIT (ALERT)' : util > 80 ? 'HIGH EXPOSURE' : 'NORMAL'}"`,
      `"${c.approvalStatus || 'APPROVED'}"`,
    ];
  });

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(csv, `National_Lights_Dealer_Aging_${dateStr}.csv`);
}
