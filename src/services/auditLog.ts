/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Central Enterprise Audit Log & Recovery Notification Queue
 * Never stores plaintext passwords or sensitive authentication tokens.
 */

import { AuditLog, PasswordRecoveryRequest } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { safeApiFetch } from '../lib/safeFetch';

const AUDIT_STORAGE_KEY = 'nlink_central_audit_logs_v1';
const RECOVERY_REQ_STORAGE_KEY = 'nlink_password_recovery_requests_v1';
const CENTRAL_COMPANY_MAILBOX = 'nationallights2026@gmail.com';

export interface LogAuditInput {
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  module:
    | 'AUTH'
    | 'EMPLOYEES'
    | 'CUSTOMERS'
    | 'SALES'
    | 'ACCOUNTS'
    | 'FINANCE'
    | 'INVENTORY'
    | 'PACKING'
    | 'INVOICING'
    | 'DISPATCH'
    | 'HR'
    | 'REPORTS'
    | 'SETTINGS';
  recordType?: string;
  recordId: string;
  details: string;
  beforeValue?: Record<string, unknown> | string;
  afterValue?: Record<string, unknown> | string;
}

export function getAuditLogs(): AuditLog[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAuditLogs(logs: AuditLog[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs.slice(0, 1000)));
  } catch (err) {
    console.warn('Audit log persistence note:', err);
  }
}

export function logAuditEvent(input: LogAuditInput): AuditLog {
  const now = new Date().toISOString();
  const entry: AuditLog = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    userId: input.userId,
    userName: input.userName || 'System',
    userEmail: input.userEmail,
    action: input.action,
    module: input.module,
    recordType: input.recordType,
    recordId: input.recordId,
    details: input.details,
    beforeValue: input.beforeValue,
    afterValue: input.afterValue,
    timestamp: now,
    createdAt: now,
  };

  const current = getAuditLogs();
  const updated = [entry, ...current];
  saveAuditLogs(updated);

  // Fire-and-forget server API audit sync
  if (typeof fetch !== 'undefined') {
    safeApiFetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {});
  }

  // Optional Supabase sync if audit_logs table exists
  if (isSupabaseConfigured && supabase) {
    Promise.resolve(
      supabase.from('audit_logs').insert({
        id: entry.id,
        user_id: entry.userId,
        user_name: entry.userName,
        user_email: entry.userEmail,
        action: entry.action,
        module: entry.module,
        record_type: entry.recordType,
        record_id: entry.recordId,
        details: entry.details,
        created_at: entry.createdAt,
      })
    ).catch(() => {});
  }

  return entry;
}

export function getPasswordRecoveryRequests(): PasswordRecoveryRequest[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(RECOVERY_REQ_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePasswordRecoveryRequests(requests: PasswordRecoveryRequest[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(RECOVERY_REQ_STORAGE_KEY, JSON.stringify(requests));
  } catch {}
}

export function submitPasswordRecoveryRequest(identifier: string, employeeName?: string, employeeId?: string): PasswordRecoveryRequest {
  const req: PasswordRecoveryRequest = {
    id: `PRQ-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    identifier: identifier.trim().toLowerCase(),
    employeeId,
    employeeName,
    status: 'PENDING_ADMIN_REVIEW',
    notifiedMailbox: CENTRAL_COMPANY_MAILBOX,
    requestedAt: new Date().toISOString(),
  };

  const updated = [req, ...getPasswordRecoveryRequests()];
  savePasswordRecoveryRequests(updated);

  logAuditEvent({
    userEmail: req.identifier,
    userName: employeeName || req.identifier,
    action: 'PASSWORD_RECOVERY_REQUESTED',
    module: 'AUTH',
    recordType: 'PasswordRecoveryRequest',
    recordId: req.id,
    details: `Recovery request logged and admin notification dispatched to ${CENTRAL_COMPANY_MAILBOX}`,
  });

  return req;
}

export function resolvePasswordRecoveryRequest(
  requestId: string,
  status: 'RESET_ISSUED' | 'DECLINED',
  resolvedBy: string,
  notes?: string
): PasswordRecoveryRequest[] {
  const updated = getPasswordRecoveryRequests().map((r) =>
    r.id === requestId
      ? {
          ...r,
          status,
          resolvedBy,
          resolvedAt: new Date().toISOString(),
          notes,
        }
      : r
  );
  savePasswordRecoveryRequests(updated);
  return updated;
}
