/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Sync Conflict & Authoritative Boundary Manager
 *
 * Enforces:
 * - Authorized Master Data (Users, Team, Dealers, Products) may sync two-way after validation.
 * - Financial entities (Invoices, Recoveries, Ledger Entries, Inventory Balances, Approved Totals)
 *   treat Supabase PostgreSQL as authoritative. Any external Sheet edit is quarantined into
 *   sync_conflicts with full snapshots, audit log, and admin notification.
 */

import {
  InboundRejectedRow,
  InboundSheetValidationReport,
  SyncConflictRecord,
  SyncConflictStatus,
  SyncConflictType,
} from '../types';
import { getSyncFallbackSnapshot, idbGetAll, idbPut, idbReplaceAll } from '../lib/offlineIndexedDb';
import { safeApiFetch } from '../lib/safeFetch';
import { supabase, isSupabaseConfigured } from './supabase';
import { publishUserNotification } from './syncNotificationService';
import { recordSyncLifecycleEvent } from './autoSaveSyncService';
import { recordAuditLog } from './supabase-transactions';

const FINANCIAL_ENTITY_REGEX =
  /^(INVOICE|INVOICES|RECOVERY|RECOVERIES|LEDGER|LEDGER_ENTRY|LEDGER_ENTRIES|INVENTORY|INVENTORY_BALANCE|INVENTORY_BALANCES|CUSTOMER_BALANCE|FINANCIAL_TOTAL|POSTED_ORDER)$/i;

const AUTHORIZED_MASTER_TABS = new Set(['USERS', 'TEAM', 'EMPLOYEES', 'DEALERS', 'CUSTOMERS', 'PRODUCTS', 'SKUS']);

type ConflictListener = (conflicts: SyncConflictRecord[]) => void;
const listeners = new Set<ConflictListener>();
let conflictCache: SyncConflictRecord[] = [];

function notifyConflicts(): void {
  const list = getConflictsSnapshot();
  listeners.forEach((cb) => {
    try {
      cb(list);
    } catch {
      // Isolate subscriber errors
    }
  });
}

export function isFinancialAuthorityEntity(entityType: string): boolean {
  return FINANCIAL_ENTITY_REGEX.test(String(entityType || '').trim());
}

export function isMasterDataTab(sheetTab: string): boolean {
  return AUTHORIZED_MASTER_TABS.has(String(sheetTab || '').trim().toUpperCase());
}

export function getConflictsSnapshot(): SyncConflictRecord[] {
  const source = conflictCache.length > 0 ? conflictCache : getSyncFallbackSnapshot<SyncConflictRecord>('sync_conflicts');
  return [...source].sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
}

export function subscribeSyncConflicts(listener: ConflictListener): () => void {
  listeners.add(listener);
  listener(getConflictsSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

export async function hydrateSyncConflicts(): Promise<SyncConflictRecord[]> {
  const localList = await idbGetAll<SyncConflictRecord>('sync_conflicts');
  const map = new Map<string, SyncConflictRecord>(localList.map((c) => [c.id, c]));

  if (supabase && isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('sync_conflicts')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(200);
      if (Array.isArray(data)) {
        for (const row of data) {
          map.set(row.id, {
            id: row.id,
            entityType: row.entity_type,
            entityId: row.entity_id,
            sheetTab: row.sheet_tab,
            conflictType: row.conflict_type,
            severity: row.severity,
            dbSnapshot: row.db_snapshot,
            sheetSnapshot: row.sheet_snapshot || {},
            status: row.status,
            reason: row.reason,
            detectedBy: row.detected_by,
            detectedAt: row.detected_at,
            resolvedBy: row.resolved_by || undefined,
            resolvedAt: row.resolved_at || undefined,
            resolutionNotes: row.resolution_notes || undefined,
          });
        }
      }
    } catch {
      // Table may not exist yet in offline mode
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const res = await safeApiFetch<{ success?: boolean; conflicts?: SyncConflictRecord[] }>('/api/sync/conflicts');
      if (res.ok && Array.isArray(res.data?.conflicts)) {
        for (const c of res.data.conflicts) {
          map.set(c.id, c);
        }
      }
    } catch {
      // Static fallback
    }
  }

  conflictCache = Array.from(map.values()).sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
  await idbReplaceAll('sync_conflicts', conflictCache);
  notifyConflicts();
  return conflictCache;
}

export async function quarantineConflict(input: {
  entityType: string;
  entityId: string;
  sheetTab: string;
  conflictType: SyncConflictType;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dbSnapshot?: Record<string, unknown> | null;
  sheetSnapshot: Record<string, unknown>;
  reason: string;
  detectedBy?: string;
}): Promise<SyncConflictRecord> {
  const nowIso = new Date().toISOString();
  const conflict: SyncConflictRecord = {
    id: `CONF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entityType: input.entityType.toUpperCase(),
    entityId: input.entityId,
    sheetTab: input.sheetTab,
    conflictType: input.conflictType,
    severity: input.severity || 'HIGH',
    dbSnapshot: input.dbSnapshot ?? null,
    sheetSnapshot: input.sheetSnapshot,
    status: 'OPEN',
    reason: input.reason,
    detectedBy: input.detectedBy || 'SYNC_CONFLICT_GUARD',
    detectedAt: nowIso,
  };

  if (conflictCache.length === 0) {
    conflictCache = await idbGetAll<SyncConflictRecord>('sync_conflicts');
  }
  conflictCache = [conflict, ...conflictCache].slice(0, 300);
  await idbPut('sync_conflicts', conflict);
  notifyConflicts();

  recordSyncLifecycleEvent({
    module: 'GOOGLE_SHEETS',
    recordType: conflict.entityType,
    databaseId: conflict.entityId,
    transactionId: conflict.id,
    idempotencyKey: `conflict:${conflict.entityType}:${conflict.entityId}:${Date.now()}`,
    syncStatus: 'REQUIRES_RECONCILIATION',
    sourceSystem: 'GOOGLE_SHEETS_INBOUND',
    summary: `Quarantined ${conflict.conflictType} on ${conflict.entityType} (${conflict.entityId})`,
    errorMessage: conflict.reason,
  });

  await publishUserNotification({
    userEmail: '*',
    dedupeKey: `conflict:${conflict.entityType}:${conflict.entityId}`,
    category: 'CONFLICT',
    severity: conflict.severity === 'CRITICAL' ? 'ERROR' : 'WARNING',
    title: 'Sync Conflict Quarantined',
    message: conflict.reason,
    entityType: conflict.entityType,
    entityId: conflict.entityId,
    transactionId: conflict.id,
    syncStatus: 'REQUIRES_RECONCILIATION',
  });

  if (typeof window !== 'undefined') {
    void safeApiFetch('/api/sync/conflicts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conflict),
    }).catch(() => {});
  }

  void recordAuditLog({
    action: 'SYNC_CONFLICT_QUARANTINED',
    module: 'GOOGLE_SHEETS_SYNC',
    recordType: conflict.entityType,
    recordId: conflict.entityId,
    details: conflict.reason,
    oldValue: conflict.dbSnapshot || undefined,
    newValue: conflict.sheetSnapshot,
  }).catch(() => {});

  return conflict;
}

export async function evaluateInboundSheetBatch(input: {
  users?: Record<string, unknown>[];
  employees?: Record<string, unknown>[];
  customers?: Record<string, unknown>[];
  products?: Record<string, unknown>[];
  invoices?: Record<string, unknown>[];
  recoveries?: Record<string, unknown>[];
  ledger?: Record<string, unknown>[];
  inventory?: Record<string, unknown>[];
  existingCustomerBalances?: Map<string, number>;
  existingEmployeeEmails?: Set<string>;
  existingCustomerCodes?: Set<string>;
  existingSkuCodes?: Set<string>;
}): Promise<InboundSheetValidationReport> {
  const rejectedRows: InboundRejectedRow[] = [];
  const conflicts: SyncConflictRecord[] = [];
  let createdCount = 0;
  let updatedCount = 0;
  let processedCount = 0;

  // 1. Strictly reject & quarantine any inbound Sheet financial table edits
  const financialGroups: Array<{ tab: string; entityType: string; rows?: Record<string, unknown>[] }> = [
    { tab: 'Invoices', entityType: 'INVOICES', rows: input.invoices },
    { tab: 'Recoveries', entityType: 'RECOVERIES', rows: input.recoveries },
    { tab: 'Ledger', entityType: 'LEDGER_ENTRIES', rows: input.ledger },
    { tab: 'Inventory_Stock', entityType: 'INVENTORY_BALANCES', rows: input.inventory },
  ];

  for (const group of financialGroups) {
    if (!Array.isArray(group.rows) || group.rows.length === 0) continue;
    for (let i = 0; i < group.rows.length; i++) {
      processedCount++;
      const row = group.rows[i] || {};
      const entityId = String(
        row.invoiceCode || row.invoiceNumber || row.recoveryNumber || row.id || row.skuCode || `ROW-${i + 2}`
      ).trim();
      const conflict = await quarantineConflict({
        entityType: group.entityType,
        entityId,
        sheetTab: group.tab,
        conflictType: 'UNAUTHORIZED_FINANCIAL_EDIT',
        severity: 'CRITICAL',
        dbSnapshot: null,
        sheetSnapshot: row,
        reason: `Blocked direct Google Sheet edit on financial entity ${group.tab} (${entityId}). Database remains authoritative.`,
      });
      conflicts.push(conflict);
    }
  }

  // 2. Validate Users / Team
  const seenEmails = new Set<string>();
  const users = Array.isArray(input.users) ? input.users : [];
  for (let i = 0; i < users.length; i++) {
    processedCount++;
    const r = users[i] || {};
    const email = String(r.email || r.Email || '').trim().toLowerCase();
    const fullName = String(r.fullName || r.name || r['Full Name'] || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      rejectedRows.push({ tab: 'Users', rowNumber: i + 2, reason: 'Invalid or missing corporate email', rawRow: r });
      continue;
    }
    if (!fullName) {
      rejectedRows.push({ tab: 'Users', rowNumber: i + 2, code: email, reason: 'Missing fullName', rawRow: r });
      continue;
    }
    if (seenEmails.has(email)) {
      rejectedRows.push({ tab: 'Users', rowNumber: i + 2, code: email, reason: `Duplicate email '${email}'`, rawRow: r });
      continue;
    }
    seenEmails.add(email);
    if (input.existingEmployeeEmails?.has(email)) updatedCount++;
    else createdCount++;
  }

  // 3. Validate Dealers / Customers (preserving DB financial balances)
  const seenDealerCodes = new Set<string>();
  const dealers = Array.isArray(input.customers) ? input.customers : [];
  for (let i = 0; i < dealers.length; i++) {
    processedCount++;
    const r = dealers[i] || {};
    const code = String(r.customerCode || r.code || r['Customer Code'] || '').trim();
    const name = String(r.companyName || r.businessName || r.name || r['Business Name'] || '').trim();
    const type = String(r.type || r.customerType || 'DEALER').trim().toUpperCase();
    const creditLimit = Number(r.creditLimit ?? r['Credit Limit'] ?? 0);

    if (!code) {
      rejectedRows.push({ tab: 'Dealers', rowNumber: i + 2, reason: 'Missing mandatory customerCode', rawRow: r });
      continue;
    }
    if (!name) {
      rejectedRows.push({ tab: 'Dealers', rowNumber: i + 2, code, reason: 'Missing mandatory companyName', rawRow: r });
      continue;
    }
    if (!['DEALER', 'DISTRIBUTOR'].includes(type)) {
      rejectedRows.push({ tab: 'Dealers', rowNumber: i + 2, code, reason: `Invalid dealer type '${type}'`, rawRow: r });
      continue;
    }
    if (!Number.isFinite(creditLimit) || creditLimit < 0) {
      rejectedRows.push({ tab: 'Dealers', rowNumber: i + 2, code, reason: 'Credit limit must be a non-negative number', rawRow: r });
      continue;
    }
    if (seenDealerCodes.has(code.toLowerCase())) {
      rejectedRows.push({ tab: 'Dealers', rowNumber: i + 2, code, reason: `Duplicate customerCode '${code}'`, rawRow: r });
      continue;
    }
    seenDealerCodes.add(code.toLowerCase());

    const existingBalance = input.existingCustomerBalances?.get(code);
    const sheetBalanceRaw = r.currentBalance ?? r['Current Balance'];
    if (existingBalance !== undefined && sheetBalanceRaw !== undefined && String(sheetBalanceRaw).trim() !== '') {
      const sheetBalance = Number(sheetBalanceRaw);
      if (Number.isFinite(sheetBalance) && Math.abs(sheetBalance - existingBalance) > 0.01) {
        const conflict = await quarantineConflict({
          entityType: 'CUSTOMER_BALANCE',
          entityId: code,
          sheetTab: 'Dealers',
          conflictType: 'UNAUTHORIZED_FINANCIAL_EDIT',
          severity: 'HIGH',
          dbSnapshot: { customerCode: code, currentBalance: existingBalance },
          sheetSnapshot: r,
          reason: `Sheet attempted to change balance for ${code} from PKR ${existingBalance} to PKR ${sheetBalance}. Preserved DB balance.`,
        });
        conflicts.push(conflict);
      }
    }

    if (input.existingCustomerCodes?.has(code)) updatedCount++;
    else createdCount++;
  }

  // 4. Validate Products / SKUs
  const seenSkus = new Set<string>();
  const products = Array.isArray(input.products) ? input.products : [];
  for (let i = 0; i < products.length; i++) {
    processedCount++;
    const r = products[i] || {};
    const skuCode = String(r.skuCode || r.code || r['SKU Code'] || '').trim();
    const name = String(r.name || r.skuName || r['SKU Name'] || '').trim();
    const tradePrice = Number(r.tradePrice ?? r['Trade Price'] ?? 0);

    if (!skuCode) {
      rejectedRows.push({ tab: 'Products', rowNumber: i + 2, reason: 'Missing mandatory skuCode', rawRow: r });
      continue;
    }
    if (!name) {
      rejectedRows.push({ tab: 'Products', rowNumber: i + 2, code: skuCode, reason: 'Missing mandatory product name', rawRow: r });
      continue;
    }
    if (!Number.isFinite(tradePrice) || tradePrice < 0) {
      rejectedRows.push({ tab: 'Products', rowNumber: i + 2, code: skuCode, reason: 'Trade price cannot be negative', rawRow: r });
      continue;
    }
    if (seenSkus.has(skuCode.toLowerCase())) {
      rejectedRows.push({ tab: 'Products', rowNumber: i + 2, code: skuCode, reason: `Duplicate skuCode '${skuCode}'`, rawRow: r });
      continue;
    }
    seenSkus.add(skuCode.toLowerCase());

    if (input.existingSkuCodes?.has(skuCode)) updatedCount++;
    else createdCount++;
  }

  return {
    success: true,
    processedCount,
    createdCount,
    updatedCount,
    rejectedCount: rejectedRows.length,
    conflictCount: conflicts.length,
    rejectedRows,
    conflicts,
    timestamp: new Date().toISOString(),
    summary: `Inbound Sheet validation: ${createdCount} created, ${updatedCount} updated, ${rejectedRows.length} rejected, ${conflicts.length} conflict(s) quarantined.`,
  };
}

export async function resolveSyncConflict(
  conflictId: string,
  resolution: Exclude<SyncConflictStatus, 'OPEN'>,
  actorEmail: string,
  actorRole: string,
  notes?: string
): Promise<SyncConflictRecord> {
  if (conflictCache.length === 0) {
    conflictCache = await idbGetAll<SyncConflictRecord>('sync_conflicts');
  }
  const idx = conflictCache.findIndex((c) => c.id === conflictId);
  if (idx === -1) {
    throw new Error('Sync conflict record not found.');
  }
  const conflict = conflictCache[idx];
  if (resolution === 'RESOLVED_ACCEPT_SHEET' && isFinancialAuthorityEntity(conflict.entityType)) {
    if (String(actorRole).toUpperCase() !== 'SUPER_ADMIN') {
      throw new Error('Financial safety lock: Only SUPER_ADMIN can accept external overrides on financial entities.');
    }
  }

  const nowIso = new Date().toISOString();
  const updated: SyncConflictRecord = {
    ...conflict,
    status: resolution,
    resolvedBy: actorEmail,
    resolvedAt: nowIso,
    resolutionNotes: notes,
  };
  conflictCache[idx] = updated;
  await idbPut('sync_conflicts', updated);
  notifyConflicts();

  if (typeof window !== 'undefined') {
    void safeApiFetch(`/api/sync/conflicts/${encodeURIComponent(conflictId)}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, notes }),
    }).catch(() => {});

    if (supabase && isSupabaseConfigured) {
      void Promise.resolve(
        supabase.rpc('nlink_resolve_sync_conflict', {
          p_conflict_id: conflictId,
          p_resolution: resolution,
          p_notes: notes || null,
        })
      ).catch(() => {});
    }
  }

  await recordAuditLog({
    action: 'SYNC_CONFLICT_RESOLVED',
    module: 'GOOGLE_SHEETS_SYNC',
    recordType: conflict.entityType,
    recordId: conflict.entityId,
    details: `${resolution} by ${actorEmail}${notes ? `: ${notes}` : ''}`,
    oldValue: conflict.dbSnapshot || undefined,
    newValue: conflict.sheetSnapshot,
  }).catch(() => {});

  return updated;
}

export function resetSyncConflictsForTests(): void {
  conflictCache = [];
  notifyConflicts();
}
