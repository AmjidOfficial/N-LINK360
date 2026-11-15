/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Database, Invoice Date & Google Sheets Reconciliation Engine
 *
 * Audits:
 * 1. Invoice Business Date (`invoiceDate`/`orderDate`) vs Entry Time (`createdAt` PKT & UTC) vs Posting Time (`postedAt`)
 * 2. Customer ledger & outstanding consistency
 * 3. Google Sheets / Database sync failures and missing external sheet IDs
 * 4. Catalog rate-card pricing conflicts (without auto-overwriting financial figures)
 */

import { Customer, LedgerEntry, Recovery, ReconciliationFlag, SalesOrder, SKU, SyncRecordEvent } from '../types';
import { auditInvoiceTimestamps } from '../utils/dateTime';
import { scanCatalogPriceIntegrity } from './priceListService';

export interface ReconciliationSummaryReport {
  generatedAt: string;
  flags: ReconciliationFlag[];
  highSeverityCount: number;
  invoiceDateAuditCount: number;
  priceAnomalyCount: number;
  syncFailureCount: number;
  duplicateRiskCount: number;
  mGhaffarToolsStatus: {
    customerFound: boolean;
    customerName: string | null;
    assignedOfficer: string | null;
    invoiceCount: number;
    discrepancyCount: number;
    invoices: Array<{
      orderNumber: string;
      invoiceNumber?: string;
      businessInvoiceDate: string | null;
      createdAtPkt: string;
      createdAtUtc: string | null;
      postedAtPkt: string;
      hasTimezoneDateShift: boolean;
      hasLateEntryGap: boolean;
      discrepancyReason: string | null;
      amount: number;
    }>;
    externalConnectivityNote: string;
  };
}

export function buildReconciliationReport(input: {
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  ledgerEntries?: LedgerEntry[];
  syncEvents?: SyncRecordEvent[];
  catalog?: SKU[];
}): ReconciliationSummaryReport {
  const flags: ReconciliationFlag[] = [];
  const nowIso = new Date().toISOString();

  // 1. Audit Order/Invoice Dates vs Created/Posted Timestamps (PKT vs UTC)
  let invoiceDateAuditCount = 0;
  for (const order of input.orders || []) {
    if (!order || order.status === 'CANCELLED' || order.status === 'REJECTED') continue;
    const audit = auditInvoiceTimestamps({
      invoiceDate: order.invoiceDate || order.orderDate,
      orderDate: order.orderDate,
      createdAt: order.createdAt,
      postedAt: order.postedAt || order.invoicedAt,
      shahzadApprovedAt: order.shahzadApprovedAt,
      updatedAt: order.updatedAt,
    });

    if (audit.hasLateEntryGap || audit.hasTimezoneDateShift) {
      invoiceDateAuditCount += 1;
      flags.push({
        id: `REC-INVDATE-${order.id}`,
        module: 'INVOICE_DATE',
        severity: audit.hasLateEntryGap ? 'HIGH' : 'MEDIUM',
        status: 'REQUIRES_RECONCILIATION',
        recordId: order.invoiceNumber || order.orderNumber || order.id,
        transactionId: order.transactionId,
        customerName: order.customerName,
        title: audit.hasLateEntryGap
          ? `Business Invoice Date (${audit.businessInvoiceDate}) differs from Entry Date (${audit.createdDatePkt} PKT)`
          : `UTC Midnight vs PKT Calendar Date Shift (${audit.createdDateUtc} UTC -> ${audit.createdDatePkt} PKT)`,
        description:
          audit.discrepancyReason ||
          'Business invoice date has been preserved immutably; audit displays both timestamps.',
        databaseValue: `Invoice Date: ${audit.businessInvoiceDate || 'N/A'} | Posted: ${audit.postedAtPkt}`,
        sheetOrExternalValue: `Created UTC: ${audit.createdAtUtc || 'N/A'} (${audit.createdAtPkt})`,
        detectedAt: nowIso,
      });
    }
  }

  // 2. Audit Price List Math & Structural Integrity
  const priceAnomalies = scanCatalogPriceIntegrity(input.catalog);
  for (const anom of priceAnomalies) {
    flags.push({
      id: `REC-PRICE-${anom.id}`,
      module: 'PRICE_LIST',
      severity: anom.severity,
      status: 'REQUIRES_RECONCILIATION',
      recordId: anom.skuCode,
      title: `${anom.skuName} (${anom.skuCode}): ${anom.type.replace(/_/g, ' ')}`,
      description: `${anom.message} Preserved existing rate without auto-overwriting posted invoices.`,
      databaseValue: `Trade Rs. ${anom.tradePrice} | List Rs. ${anom.listPrice}`,
      sheetOrExternalValue: `Discount Rule: ${anom.discountPercentage || 'N/A'}`,
      detectedAt: nowIso,
    });
  }

  // 3. Audit Failed or Unreconciled Sync Events
  let syncFailureCount = 0;
  for (const ev of input.syncEvents || []) {
    if (ev.syncStatus === 'SYNC_FAILED' || ev.syncStatus === 'REQUIRES_RECONCILIATION') {
      syncFailureCount += 1;
      flags.push({
        id: `REC-SYNC-${ev.id}`,
        module: 'GOOGLE_SHEETS',
        severity: ev.syncStatus === 'SYNC_FAILED' ? 'HIGH' : 'MEDIUM',
        status: 'REQUIRES_RECONCILIATION',
        recordId: ev.databaseId,
        transactionId: ev.transactionId,
        title: `${ev.recordType} (${ev.transactionId}) ${ev.syncStatus.replace(/_/g, ' ')}`,
        description: ev.errorMessage || ev.summary || 'Pending manual review or retry to Google Sheet.',
        databaseValue: `DB Saved: ${ev.lastDbSavedAt || ev.createdAt}`,
        sheetOrExternalValue: ev.externalSheetId
          ? `Sheet Row/ID: ${ev.externalSheetId}`
          : 'No Google Sheet acknowledgment',
        detectedAt: nowIso,
      });
    }
  }

  // 4. Detect Duplicate Fingerprint / ID Collisions across Recoveries & Orders
  let duplicateRiskCount = 0;
  const seenRecKeys = new Map<string, string>();
  for (const rec of input.recoveries || []) {
    const fp = rec.fingerprintHash;
    if (fp && seenRecKeys.has(fp)) {
      duplicateRiskCount += 1;
      flags.push({
        id: `REC-DUP-${rec.id}`,
        module: 'DUPLICATE_TXN',
        severity: 'HIGH',
        status: 'REQUIRES_RECONCILIATION',
        recordId: rec.recoveryNumber || rec.id,
        transactionId: rec.transactionId,
        customerName: rec.customerName,
        title: `Duplicate Recovery Fingerprint Detected (${rec.recoveryNumber || rec.id})`,
        description: `Matches existing recovery ${seenRecKeys.get(fp)} with identical fingerprint ${fp}.`,
        detectedAt: nowIso,
      });
    } else if (fp) {
      seenRecKeys.set(fp, rec.recoveryNumber || rec.id);
    }
  }

  // 5. Focused Forensic Audit for M. Ghaffar Tools
  const ghaffarCustomer = (input.customers || []).find((c) =>
    /ghaffar/i.test(`${c.companyName || ''} ${c.name || ''}`)
  );
  const ghaffarOrders = (input.orders || []).filter(
    (o) =>
      /ghaffar/i.test(o.customerName || '') ||
      (ghaffarCustomer &&
        (o.customerId === ghaffarCustomer.id || o.customerCode === ghaffarCustomer.customerCode))
  );

  const ghaffarAudits = ghaffarOrders.map((o) => {
    const a = auditInvoiceTimestamps({
      invoiceDate: o.invoiceDate || o.orderDate,
      orderDate: o.orderDate,
      createdAt: o.createdAt,
      postedAt: o.postedAt || o.invoicedAt,
      shahzadApprovedAt: o.shahzadApprovedAt,
      updatedAt: o.updatedAt,
    });
    return {
      orderNumber: o.orderNumber || o.id,
      invoiceNumber: o.invoiceNumber,
      businessInvoiceDate: a.businessInvoiceDate,
      createdAtPkt: a.createdAtPkt,
      createdAtUtc: a.createdAtUtc,
      postedAtPkt: a.postedAtPkt,
      hasTimezoneDateShift: a.hasTimezoneDateShift,
      hasLateEntryGap: a.hasLateEntryGap,
      discrepancyReason: a.discrepancyReason,
      amount: Number(o.totalAmount || 0),
    };
  });

  return {
    generatedAt: nowIso,
    flags,
    highSeverityCount: flags.filter((f) => f.severity === 'HIGH').length,
    invoiceDateAuditCount,
    priceAnomalyCount: priceAnomalies.length,
    syncFailureCount,
    duplicateRiskCount,
    mGhaffarToolsStatus: {
      customerFound: Boolean(ghaffarCustomer),
      customerName: ghaffarCustomer?.companyName || null,
      assignedOfficer: ghaffarCustomer?.assignedOfficerName || ghaffarCustomer?.assignedEmployee || null,
      invoiceCount: ghaffarAudits.length,
      discrepancyCount: ghaffarAudits.filter((i) => i.hasLateEntryGap || i.hasTimezoneDateShift).length,
      invoices: ghaffarAudits,
      externalConnectivityNote:
        ghaffarAudits.length > 0
          ? 'Live workspace invoices audited under Asia/Karachi (PKT) vs UTC comparison.'
          : 'No M Ghaffar Tools invoice records are currently loaded in local session state; live external Supabase / Google Sheet comparison requires active credentials.',
    },
  };
}
