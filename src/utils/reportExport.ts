/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
<<<<<<< HEAD
 * N-LINK 360 - Production Enterprise Report Exporter (Formula-Injection Safe)
 */

import { AuditLog, Customer, EmployeeAttendance, InventoryBalance, Recovery, SalesOrder } from '../types';
import { formatCsvCell } from '../services/security';
=======
 * N-LINK 360 - Production Enterprise Report Exporter
 * Generates and downloads real CSV reports for Sales, Recoveries, and Dealer Aging.
 */

import { Customer, SalesOrder, Recovery } from '../types';
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

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

<<<<<<< HEAD
function buildCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map((h) => formatCsvCell(h)).join(',');
  const rowLines = rows.map((row) => row.map((cell) => formatCsvCell(cell)).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

export function exportSalesSummaryCsv(orders: SalesOrder[] = []): void {
  const headers = [
    'Order #',
    'Invoice #',
=======
/**
 * Exports verified Sales Orders to CSV
 */
export function exportSalesSummaryCsv(orders: SalesOrder[] = []): void {
  const headers = [
    'Order #',
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
    'Order Date',
    'Customer Code',
    'Customer / Shop Name',
    'Town / Route',
    'Booked By',
    'SKU Count',
<<<<<<< HEAD
    'Subtotal (PKR)',
    'Discount 15% (PKR)',
    'Net Total (PKR)',
=======
    'Gross Total (PKR)',
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
    'Status',
    'Approval Authority',
  ];

  const rows = orders.map((o) => [
<<<<<<< HEAD
    o.orderNumber || o.id,
    o.invoiceNumber || '-',
    (o.orderDate || o.createdAt || '').slice(0, 10),
    o.customerCode || 'N/A',
    o.customerName || '',
    o.town || o.customerTown || 'National',
    o.salesUserName || 'Sales Officer',
    o.items?.length || 1,
    o.subtotal || o.totalAmount || 0,
    o.discountAmount || 0,
    o.netAmount ?? o.totalAmount ?? 0,
    o.status || 'SUBMITTED',
    o.shahzadApproval === 'APPROVED' ? 'Shahzad Ullah (Approved)' : o.shahzadApproval || 'Pending',
  ]);

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(buildCsv(headers, rows), `National_Lights_Sales_Summary_${dateStr}.csv`);
}

=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
    r.recoveryNumber || r.id || 'REC',
    (r.collectionDate || r.recordedAt || r.createdAt || '').slice(0, 10),
    r.customerCode || 'N/A',
    r.customerName || '',
    r.salesUserName || 'Field Officer',
    r.amount || 0,
    r.paymentMode || 'CASH',
    r.instrumentNumber || 'N/A',
    r.bankName || 'N/A',
    r.status || 'PENDING',
    r.shahzadApproval === 'APPROVED' ? 'Shahzad Ullah (Verified)' : r.shahzadApproval || 'Pending',
  ]);

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(buildCsv(headers, rows), `National_Lights_Recovery_Audit_${dateStr}.csv`);
}

=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
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
<<<<<<< HEAD
      c.customerCode || c.id,
      c.companyName || '',
      c.contactPerson || 'Proprietor',
      c.town || c.city || 'Commercial Market',
      c.phone || '',
      limit,
      balance,
      `${util}%`,
      isOver ? 'OVER-LIMIT (ALERT)' : util > 80 ? 'HIGH EXPOSURE' : 'NORMAL',
      c.approvalStatus || 'APPROVED',
    ];
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(buildCsv(headers, rows), `National_Lights_Dealer_Aging_${dateStr}.csv`);
}

export function exportStockReportCsv(inventory: InventoryBalance[] = []): void {
  const headers = ['SKU Code', 'SKU Name', 'Warehouse', 'Available Qty', 'Reserved Qty', 'Damaged Qty', 'Total On Hand', 'Last Updated'];
  const rows = inventory.map((b) => [
    b.skuCode || b.skuId,
    b.skuName || '',
    b.warehouseName || 'Central Peshawar Warehouse',
    b.availableQuantity ?? 0,
    b.quantityReserved ?? 0,
    b.quantityDamaged ?? 0,
    b.quantityOnHand ?? 0,
    (b.lastUpdatedAt || b.updatedAt || '').slice(0, 10),
  ]);
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(buildCsv(headers, rows), `National_Lights_Stock_Balance_${dateStr}.csv`);
}

export function exportDispatchDeliveryCsv(orders: SalesOrder[] = []): void {
  const headers = [
    'Order #',
    'Invoice #',
    'Dispatch Note #',
    'Bilty #',
    'Dealer',
    'Town',
    'Warehouse',
    'Transporter',
    'Vehicle #',
    'Status',
    'Receiver',
    'Delivered At',
  ];
  const rows = orders.map((o) => [
    o.orderNumber || o.id,
    o.invoiceNumber || '-',
    o.dispatchNoteNumber || '-',
    o.bilityNumber || '-',
    o.customerName,
    o.customerTown || o.town || '-',
    o.warehouseName || '-',
    o.transporterName || '-',
    o.vehicleNumber || '-',
    o.status,
    o.deliveryReceiverName || '-',
    (o.deliveredAt || '').slice(0, 10) || '-',
  ]);
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(buildCsv(headers, rows), `National_Lights_Dispatch_Logistics_${dateStr}.csv`);
}

export function exportAttendanceCsv(records: EmployeeAttendance[] = []): void {
  const headers = ['Employee Code', 'Employee Name', 'Designation', 'Department', 'Date', 'Check-In', 'Check-Out', 'Location', 'Status'];
  const rows = records.map((r) => [
    r.employeeCode || r.employeeId,
    r.employeeName,
    r.designation || '-',
    r.department || '-',
    r.date,
    r.checkInTime || '-',
    r.checkOutTime || '-',
    r.checkInLocation || r.location || '-',
    r.status,
  ]);
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(buildCsv(headers, rows), `National_Lights_HR_Attendance_${dateStr}.csv`);
}

export function exportAuditLogCsv(logs: AuditLog[] = []): void {
  const headers = ['Audit ID', 'Timestamp', 'Module', 'Action', 'Actor', 'Actor Email', 'Record ID', 'Details'];
  const rows = logs.map((l) => [
    l.id,
    (l.timestamp || l.createdAt || '').slice(0, 19).replace('T', ' '),
    l.module,
    l.action,
    l.userName || 'System',
    l.userEmail || '-',
    l.recordId,
    l.details || '-',
  ]);
  const dateStr = new Date().toISOString().slice(0, 10);
  triggerCsvDownload(buildCsv(headers, rows), `National_Lights_Audit_Trail_${dateStr}.csv`);
=======
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
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
}
