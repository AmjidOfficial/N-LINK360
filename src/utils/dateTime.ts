/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Pakistan Standard Time (Asia/Karachi, UTC+5) & Invoice Timestamp Utilities
 *
 * Ensures consistent separation between:
 *  - Business Invoice Date (`invoiceDate` / `orderDate`) — immutable once issued
 *  - Record Created Timestamp (`createdAt`) — UTC ISO preserved and displayed in PKT
 *  - Record Posted Timestamp (`postedAt` / `invoicedAt`) — UTC ISO preserved and displayed in PKT
 *  - Record Updated Timestamp (`updatedAt`) — last mutation timestamp
 */

export const PAKISTAN_TIMEZONE = 'Asia/Karachi';

function toValidDate(input?: string | Date | null): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  const str = String(input).trim();
  if (!str) return null;
  // Date-only strings (YYYY-MM-DD) should be anchored mid-day PKT to avoid UTC midnight shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const anchored = new Date(`${str}T12:00:00+05:00`);
    return Number.isNaN(anchored.getTime()) ? null : anchored;
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Returns YYYY-MM-DD business date in Pakistan Standard Time (Asia/Karachi).
 */
export function getKarachiDateString(input: string | Date = new Date()): string {
  const date = toValidDate(input) || new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PAKISTAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value || '1970';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date/timestamp cleanly in PKT (DD MMM YYYY).
 */
export function formatKarachiDate(input?: string | Date | null): string {
  const date = toValidDate(input);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: PAKISTAN_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats full date + time in Pakistan Standard Time (Asia/Karachi).
 */
export function formatKarachiDateTime(input?: string | Date | null): string {
  const date = toValidDate(input);
  if (!date) return '—';
  const formatted = new Intl.DateTimeFormat('en-PK', {
    timeZone: PAKISTAN_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
  return `${formatted} PKT`;
}

/**
 * Extracts explicit YYYY-MM-DD in UTC for side-by-side timezone drift comparison.
 */
export function getUtcDateString(input?: string | Date | null): string | null {
  const date = toValidDate(input);
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export interface InvoiceTimestampAudit {
  businessInvoiceDate: string | null;
  createdAtUtc: string | null;
  createdAtPkt: string;
  createdDatePkt: string | null;
  createdDateUtc: string | null;
  postedAtUtc: string | null;
  postedAtPkt: string;
  updatedAtPkt: string;
  hasTimezoneDateShift: boolean;
  hasLateEntryGap: boolean;
  discrepancyReason: string | null;
}

/**
 * Audits whether an order/invoice exhibits:
 * 1. A UTC vs Asia/Karachi calendar boundary shift (e.g., 23:30 UTC on Nov 14 is 04:30 PKT on Nov 15)
 * 2. A genuine business-date vs entry-timestamp gap (e.g., invoice dated Nov 10 entered on Nov 15)
 * Never mutates `invoiceDate` or `orderDate`.
 */
export function auditInvoiceTimestamps(record: {
  invoiceDate?: string | null;
  orderDate?: string | null;
  createdAt?: string | null;
  postedAt?: string | null;
  invoicedAt?: string | null;
  shahzadApprovedAt?: string | null;
  updatedAt?: string | null;
}): InvoiceTimestampAudit {
  const rawBizDate = record.invoiceDate || record.orderDate || null;
  const businessInvoiceDate = rawBizDate ? getKarachiDateString(rawBizDate) : null;
  const createdAtUtc = record.createdAt || null;
  const createdDatePkt = createdAtUtc ? getKarachiDateString(createdAtUtc) : null;
  const createdDateUtc = createdAtUtc ? getUtcDateString(createdAtUtc) : null;
  const postedAtUtc = record.postedAt || record.invoicedAt || record.shahzadApprovedAt || null;

  const hasTimezoneDateShift = Boolean(createdDatePkt && createdDateUtc && createdDatePkt !== createdDateUtc);
  const hasLateEntryGap = Boolean(businessInvoiceDate && createdDatePkt && businessInvoiceDate !== createdDatePkt);

  let discrepancyReason: string | null = null;
  if (hasTimezoneDateShift && hasLateEntryGap) {
    discrepancyReason = `Both UTC/PKT boundary shift (UTC ${createdDateUtc} vs PKT ${createdDatePkt}) and late-entry gap (Invoice Date ${businessInvoiceDate} entered PKT ${createdDatePkt}).`;
  } else if (hasTimezoneDateShift) {
    discrepancyReason = `UTC midnight boundary shift: UTC date ${createdDateUtc} maps to PKT ${createdDatePkt} (Asia/Karachi UTC+5).`;
  } else if (hasLateEntryGap) {
    discrepancyReason = `Late system entry / backdated document: Invoice Date is ${businessInvoiceDate}, entered/created in system on ${createdDatePkt} (PKT). Invoice date preserved untouched.`;
  }

  return {
    businessInvoiceDate,
    createdAtUtc,
    createdAtPkt: formatKarachiDateTime(createdAtUtc),
    createdDatePkt,
    createdDateUtc,
    postedAtUtc,
    postedAtPkt: formatKarachiDateTime(postedAtUtc),
    updatedAtPkt: formatKarachiDateTime(record.updatedAt || postedAtUtc || createdAtUtc),
    hasTimezoneDateShift,
    hasLateEntryGap,
    discrepancyReason,
  };
}
