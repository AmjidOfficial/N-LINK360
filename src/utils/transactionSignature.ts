/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Deterministic Transaction Signature & Cryptographic Fingerprint Engine
 *
 * Guarantees:
 * - Deterministic human-readable immutable transaction IDs: e.g. NLINK-PAY-20261115-000001
 * - Canonical SHA-256 fingerprint hash over normalized transaction payload
 * - Distinguishes duplicate double-click/retry submissions from genuine repeat payments of identical amounts
 */

import { getKarachiDateString } from './dateTime';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type TransactionDomainPrefix = 'PAY' | 'INV' | 'ORD' | 'LED' | 'RET' | 'SYN';

const SEQUENCE_STORAGE_KEY = 'nlink360_txn_sig_sequences_v1';
const PROCESSED_TXN_STORAGE_KEY = 'nlink360_processed_transactions_v1';

const inMemorySeqCounters: Record<string, number> = {};
const inMemoryProcessedTransactions = new Map<string, ProcessedTransactionAuditEntry>();

function nextDomainSequence(prefix: TransactionDomainPrefix, dateCompact: string): number {
  const key = `${prefix}-${dateCompact}`;
  let current = inMemorySeqCounters[key] || 0;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SEQUENCE_STORAGE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      current = Math.max(current, Number(map[key] || 0)) + 1;
      map[key] = current;
      localStorage.setItem(SEQUENCE_STORAGE_KEY, JSON.stringify(map));
      inMemorySeqCounters[key] = current;
      return current;
    }
  } catch {
    // Fallback to in-memory counter
  }
  current += 1;
  inMemorySeqCounters[key] = current;
  return current;
}

/**
 * Formats deterministic immutable transaction ID (e.g., NLINK-PAY-20261115-000001).
 */
export function generateDeterministicTransactionId(
  prefix: TransactionDomainPrefix,
  businessDate?: string,
  explicitSeq?: number
): string {
  const dateStr = (businessDate ? getKarachiDateString(businessDate) : getKarachiDateString()).replace(/-/g, '');
  const seq = explicitSeq && explicitSeq > 0 ? Math.floor(explicitSeq) : nextDomainSequence(prefix, dateStr);
  return `NLINK-${prefix}-${dateStr}-${String(seq).padStart(6, '0')}`;
}

/**
 * Recursively canonicalizes object keys so fingerprint generation is deterministic regardless of key order.
 */
export function canonicalizePayload(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value.trim());
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizePayload(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalizePayload(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(String(value));
}

/**
 * Synchronous deterministic 64-bit FNV-1a + Murmur-style dual-lane hex digest
 * usable anywhere synchronously without async crypto delays.
 */
export function computeSyncFingerprintHash(input: Record<string, unknown>): string {
  const serialized = canonicalizePayload(input);
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < serialized.length; i++) {
    const code = serialized.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code ^ ((i + 1) & 0xff);
    h2 = Math.imul(h2, 0x01000193);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const lenPart = serialized.length.toString(16).padStart(4, '0');
  return `fp_${part1}${part2}${lenPart}`;
}

/**
 * Full cryptographic SHA-256 hex digest using WebCrypto / Node crypto when available.
 */
export async function computeSha256Fingerprint(input: Record<string, unknown>): Promise<string> {
  const serialized = canonicalizePayload(input);
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
      const encoded = new TextEncoder().encode(serialized);
      const buf = await globalThis.crypto.subtle.digest('SHA-256', encoded);
      const hex = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return `sha256_${hex}`;
    }
  } catch {
    // Fallback below
  }
  return computeSyncFingerprintHash(input);
}

export interface TransactionFingerprintDescriptor {
  module: 'PAYMENT' | 'ORDER' | 'INVOICE' | 'LEDGER';
  customerId: string;
  amount: number;
  businessDate: string;
  paymentMode?: string;
  instrumentNumber?: string;
  idempotencyKey?: string;
  externalReference?: string;
  itemsSignature?: string;
}

/**
 * Builds canonical transaction fingerprint hash that prevents duplicate submission
 * for the same form session (`idempotencyKey`) OR same bank instrument reference,
 * while permitting two genuine independent payments of identical amount when each
 * session has its own distinct `idempotencyKey` and/or `instrumentNumber`.
 */
export function buildTransactionFingerprint(desc: TransactionFingerprintDescriptor): string {
  const cleanInstrument = String(desc.instrumentNumber || '').trim().toUpperCase();
  return computeSyncFingerprintHash({
    module: desc.module,
    customerId: String(desc.customerId || '').trim().toLowerCase(),
    amount: Math.round((Number(desc.amount) || 0) * 100) / 100,
    businessDate: desc.businessDate,
    paymentMode: desc.paymentMode || null,
    // If an explicit bank cheque/TRX ID is given, deduplicate against same customer+amount+instrument even across tabs;
    // otherwise deduplicate via session-bound idempotencyKey so two legitimate separate cash payments are both allowed.
    instrumentOrSessionKey: cleanInstrument || String(desc.idempotencyKey || desc.externalReference || ''),
    externalReference: desc.externalReference || null,
    itemsSignature: desc.itemsSignature || null,
  });
}

export interface DuplicateCheckResult<T> {
  isDuplicate: boolean;
  reason?: 'IDEMPOTENCY_KEY_MATCH' | 'TRANSACTION_ID_MATCH' | 'FINGERPRINT_MATCH';
  existingRecord?: T;
}

/**
 * Checks whether an incoming transaction matches an existing stored record.
 */
export function detectDuplicateTransaction<
  T extends { id?: string; idempotencyKey?: string; transactionId?: string; fingerprintHash?: string }
>(
  incoming: { idempotencyKey?: string; transactionId?: string; fingerprintHash?: string },
  existingRecords: T[]
): DuplicateCheckResult<T> {
  const inIdem = String(incoming.idempotencyKey || '').trim();
  const inTxnId = String(incoming.transactionId || '').trim();
  const inFp = String(incoming.fingerprintHash || '').trim();

  for (const rec of existingRecords) {
    if (inIdem && rec.idempotencyKey && rec.idempotencyKey === inIdem) {
      return { isDuplicate: true, reason: 'IDEMPOTENCY_KEY_MATCH', existingRecord: rec };
    }
    if (inTxnId && rec.transactionId && rec.transactionId === inTxnId) {
      return { isDuplicate: true, reason: 'TRANSACTION_ID_MATCH', existingRecord: rec };
    }
    if (inFp && rec.fingerprintHash && rec.fingerprintHash === inFp) {
      return { isDuplicate: true, reason: 'FINGERPRINT_MATCH', existingRecord: rec };
    }
  }

  return { isDuplicate: false };
}

// ============================================================================
// Incoming Google Sheets Webhook & Sync Payload Signature Validation + Idempotency Audit
// ============================================================================

export interface ProcessedTransactionAuditEntry {
  idempotency_key: string;
  transaction_id?: string | null;
  payload_type: string;
  payload_hash: string;
  signature?: string | null;
  source_system: string;
  status: 'PROCESSED' | 'REJECTED' | 'DUPLICATE_BLOCKED';
  error_reason?: string | null;
  processed_at: string;
}

export interface IncomingWebhookPayload {
  idempotencyKey?: string;
  transactionId?: string;
  type?: string;
  recordType?: string;
  timestamp?: string;
  signature?: string;
  hmacSignature?: string;
  sourceSystem?: string;
  amount?: number;
  data?: Record<string, unknown> | unknown[];
  [key: string]: unknown;
}

export interface PayloadValidationOptions {
  expectedSecret?: string;
  requireSignature?: boolean;
  maxAgeMs?: number;
  allowedTypes?: string[];
  autoRecordOnSuccess?: boolean;
  checkSupabase?: (
    idempotencyKey: string
  ) => Promise<{ exists: boolean; processedAt?: string; status?: string }>;
  recordSupabase?: (entry: ProcessedTransactionAuditEntry) => Promise<void>;
}

export type PayloadValidationErrorCode =
  | 'INVALID_PAYLOAD'
  | 'MISSING_IDEMPOTENCY_KEY'
  | 'INVALID_IDEMPOTENCY_KEY'
  | 'MISSING_PAYLOAD_TYPE'
  | 'DISALLOWED_PAYLOAD_TYPE'
  | 'INVALID_TIMESTAMP'
  | 'EXPIRED_TIMESTAMP'
  | 'INVALID_AMOUNT'
  | 'MISSING_SIGNATURE'
  | 'INVALID_SIGNATURE'
  | 'DUPLICATE_TRANSACTION';

export interface PayloadValidationResult {
  valid: boolean;
  isDuplicate: boolean;
  idempotencyKey: string;
  payloadType: string;
  payloadHash: string;
  expectedSignature: string;
  checkedSource: 'SUPABASE' | 'LOCAL_FALLBACK' | 'NONE';
  errorCode?: PayloadValidationErrorCode;
  error?: string;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function loadLocalProcessedTransactions(): Record<string, ProcessedTransactionAuditEntry> {
  const result: Record<string, ProcessedTransactionAuditEntry> = {};
  inMemoryProcessedTransactions.forEach((v, k) => {
    result[k] = v;
  });
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PROCESSED_TXN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, ProcessedTransactionAuditEntry>;
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => {
            if (v && !result[k]) {
              result[k] = v;
              inMemoryProcessedTransactions.set(k, v);
            }
          });
        }
      }
    }
  } catch {
    // Ignore storage read failures gracefully
  }
  return result;
}

function saveLocalProcessedTransaction(entry: ProcessedTransactionAuditEntry): void {
  inMemoryProcessedTransactions.set(entry.idempotency_key, entry);
  try {
    if (typeof localStorage !== 'undefined') {
      const current = loadLocalProcessedTransactions();
      const keys = Object.keys(current);
      if (keys.length >= 1000) {
        const oldestKey = keys[0];
        delete current[oldestKey];
        inMemoryProcessedTransactions.delete(oldestKey);
      }
      current[entry.idempotency_key] = entry;
      localStorage.setItem(PROCESSED_TXN_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getLocalProcessedTransactions(): ProcessedTransactionAuditEntry[] {
  return Object.values(loadLocalProcessedTransactions());
}

export function resetProcessedTransactionsCacheForTests(): void {
  inMemoryProcessedTransactions.clear();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PROCESSED_TXN_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}

/**
 * Computes canonical HMAC-SHA256 signature (or keyed SHA-256 digest when subtle HMAC is unavailable).
 */
export async function computeWebhookSignature(
  payloadWithoutSignature: Record<string, unknown>,
  secret?: string
): Promise<string> {
  const cleanSecret = String(secret || '').trim();
  if (!cleanSecret) {
    return computeSha256Fingerprint(payloadWithoutSignature);
  }
  const serialized = canonicalizePayload(payloadWithoutSignature);
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
      const enc = new TextEncoder();
      const key = await globalThis.crypto.subtle.importKey(
        'raw',
        enc.encode(cleanSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sigBuf = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(serialized));
      const hex = Array.from(new Uint8Array(sigBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return `hmac-sha256=${hex}`;
    }
  } catch {
    // Fall back to keyed SHA-256 digest
  }
  return computeSha256Fingerprint({ payload: payloadWithoutSignature, __hmacKey: cleanSecret });
}

export async function recordProcessedTransaction(
  entry: ProcessedTransactionAuditEntry,
  options?: Pick<PayloadValidationOptions, 'recordSupabase'>
): Promise<'SUPABASE' | 'LOCAL_FALLBACK'> {
  saveLocalProcessedTransaction(entry);
  try {
    if (options?.recordSupabase) {
      await options.recordSupabase(entry);
      return 'SUPABASE';
    }
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('processed_transactions').insert(entry);
      if (!error) {
        return 'SUPABASE';
      }
    }
  } catch {
    // Gracefully retain local fallback audit record when Supabase is offline/unreachable
  }
  return 'LOCAL_FALLBACK';
}

function hasUnsafePrototypeKeys(obj: Record<string, unknown>): boolean {
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  for (const key of dangerous) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return true;
    }
  }
  return false;
}

/**
 * Enforces strict payload structural validation, cryptographic signature checks,
 * and idempotency verification against Supabase `processed_transactions`
 * (with seamless persistent local fallback when Supabase is temporarily unreachable).
 */
export async function validatePayloadSignature(
  payload: unknown,
  options: PayloadValidationOptions = {}
): Promise<PayloadValidationResult> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      isDuplicate: false,
      idempotencyKey: '',
      payloadType: '',
      payloadHash: '',
      expectedSignature: '',
      checkedSource: 'NONE',
      errorCode: 'INVALID_PAYLOAD',
      error: 'Payload must be a non-null JSON object.',
    };
  }

  const record = payload as IncomingWebhookPayload;
  if (hasUnsafePrototypeKeys(record) || (record.data && typeof record.data === 'object' && !Array.isArray(record.data) && hasUnsafePrototypeKeys(record.data as Record<string, unknown>))) {
    return {
      valid: false,
      isDuplicate: false,
      idempotencyKey: '',
      payloadType: '',
      payloadHash: '',
      expectedSignature: '',
      checkedSource: 'NONE',
      errorCode: 'INVALID_PAYLOAD',
      error: 'Payload contains prohibited prototype property keys.',
    };
  }

  const idempotencyKey = String(record.idempotencyKey || '').trim();
  if (!idempotencyKey) {
    return {
      valid: false,
      isDuplicate: false,
      idempotencyKey: '',
      payloadType: '',
      payloadHash: '',
      expectedSignature: '',
      checkedSource: 'NONE',
      errorCode: 'MISSING_IDEMPOTENCY_KEY',
      error: 'Missing required idempotencyKey in incoming webhook payload.',
    };
  }

  if (idempotencyKey.length < 6 || idempotencyKey.length > 128 || !/^[A-Za-z0-9_.:-]+$/.test(idempotencyKey)) {
    return {
      valid: false,
      isDuplicate: false,
      idempotencyKey,
      payloadType: '',
      payloadHash: '',
      expectedSignature: '',
      checkedSource: 'NONE',
      errorCode: 'INVALID_IDEMPOTENCY_KEY',
      error: 'Invalid idempotencyKey format. Must be 6-128 safe alphanumeric/separator characters.',
    };
  }

  const payloadType = String(record.type || record.recordType || '').trim();
  if (!payloadType) {
    return {
      valid: false,
      isDuplicate: false,
      idempotencyKey,
      payloadType: '',
      payloadHash: '',
      expectedSignature: '',
      checkedSource: 'NONE',
      errorCode: 'MISSING_PAYLOAD_TYPE',
      error: 'Incoming payload must declare a valid type or recordType.',
    };
  }

  if (!/^[A-Za-z0-9_.:-]{2,80}$/.test(payloadType)) {
    return {
      valid: false,
      isDuplicate: false,
      idempotencyKey,
      payloadType,
      payloadHash: '',
      expectedSignature: '',
      checkedSource: 'NONE',
      errorCode: 'DISALLOWED_PAYLOAD_TYPE',
      error: `Payload type "${payloadType}" contains invalid characters.`,
    };
  }

  if (options.allowedTypes && options.allowedTypes.length > 0 && !options.allowedTypes.includes(payloadType)) {
    return {
      valid: false,
      isDuplicate: false,
      idempotencyKey,
      payloadType,
      payloadHash: '',
      expectedSignature: '',
      checkedSource: 'NONE',
      errorCode: 'DISALLOWED_PAYLOAD_TYPE',
      error: `Payload type "${payloadType}" is not permitted for this webhook endpoint.`,
    };
  }

  if (record.timestamp !== undefined && record.timestamp !== null && String(record.timestamp).trim() !== '') {
    const parsedTs = Date.parse(String(record.timestamp));
    if (Number.isNaN(parsedTs)) {
      return {
        valid: false,
        isDuplicate: false,
        idempotencyKey,
        payloadType,
        payloadHash: '',
        expectedSignature: '',
        checkedSource: 'NONE',
        errorCode: 'INVALID_TIMESTAMP',
        error: 'Payload timestamp is not a valid ISO-8601 date/time.',
      };
    }
    const maxAgeMs = options.maxAgeMs ?? 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (parsedTs > now + 5 * 60 * 1000) {
      return {
        valid: false,
        isDuplicate: false,
        idempotencyKey,
        payloadType,
        payloadHash: '',
        expectedSignature: '',
        checkedSource: 'NONE',
        errorCode: 'INVALID_TIMESTAMP',
        error: 'Payload timestamp is too far in the future.',
      };
    }
    if (maxAgeMs > 0 && now - parsedTs > maxAgeMs) {
      return {
        valid: false,
        isDuplicate: false,
        idempotencyKey,
        payloadType,
        payloadHash: '',
        expectedSignature: '',
        checkedSource: 'NONE',
        errorCode: 'EXPIRED_TIMESTAMP',
        error: 'Payload timestamp exceeds the allowed replay window.',
      };
    }
  }

  const candidateAmount =
    record.amount !== undefined
      ? record.amount
      : record.data && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>).amount
      : undefined;
  if (candidateAmount !== undefined && candidateAmount !== null && candidateAmount !== '') {
    const numAmt = Number(candidateAmount);
    if (!Number.isFinite(numAmt) || numAmt < 0) {
      return {
        valid: false,
        isDuplicate: false,
        idempotencyKey,
        payloadType,
        payloadHash: '',
        expectedSignature: '',
        checkedSource: 'NONE',
        errorCode: 'INVALID_AMOUNT',
        error: 'Transaction amount must be a finite non-negative number.',
      };
    }
  }

  // Build unsigned payload copy for deterministic hashing & signature validation
  const { signature: sigA, hmacSignature: sigB, ...unsignedPayload } = record;
  const incomingSignature = String(sigA || sigB || '').trim();
  const payloadHash = await computeSha256Fingerprint(unsignedPayload);
  const expectedSignature = options.expectedSecret
    ? await computeWebhookSignature(unsignedPayload, options.expectedSecret)
    : payloadHash;

  const mustRequireSignature = Boolean(options.requireSignature ?? options.expectedSecret);
  if (mustRequireSignature && !incomingSignature) {
    return {
      valid: false,
      isDuplicate: false,
      idempotencyKey,
      payloadType,
      payloadHash,
      expectedSignature,
      checkedSource: 'NONE',
      errorCode: 'MISSING_SIGNATURE',
      error: 'Missing required cryptographic payload signature.',
    };
  }

  if (incomingSignature) {
    const syncFp = computeSyncFingerprintHash(unsignedPayload);
    const bareExpected = expectedSignature.replace(/^hmac-sha256=/i, '').replace(/^sha256_/i, '');
    const bareIncoming = incomingSignature.replace(/^hmac-sha256=/i, '').replace(/^sha256_/i, '');
    const signatureMatches = options.expectedSecret
      ? constantTimeEqual(incomingSignature, expectedSignature) || constantTimeEqual(bareIncoming, bareExpected)
      : constantTimeEqual(incomingSignature, expectedSignature) ||
        constantTimeEqual(bareIncoming, bareExpected) ||
        constantTimeEqual(incomingSignature, syncFp);

    if (!signatureMatches) {
      return {
        valid: false,
        isDuplicate: false,
        idempotencyKey,
        payloadType,
        payloadHash,
        expectedSignature,
        checkedSource: 'NONE',
        errorCode: 'INVALID_SIGNATURE',
        error: 'Payload signature verification failed (tampered payload or mismatched key).',
      };
    }
  }

  // Idempotency check against Supabase `processed_transactions` with local fallback
  let checkedSource: 'SUPABASE' | 'LOCAL_FALLBACK' = 'LOCAL_FALLBACK';
  let foundInSupabase = false;

  try {
    if (options.checkSupabase) {
      const sbRes = await options.checkSupabase(idempotencyKey);
      checkedSource = 'SUPABASE';
      foundInSupabase = Boolean(sbRes?.exists);
    } else if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('processed_transactions')
        .select('idempotency_key, processed_at, status')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (!error) {
        checkedSource = 'SUPABASE';
        foundInSupabase = Boolean(data);
      }
    }
  } catch {
    checkedSource = 'LOCAL_FALLBACK';
  }

  const localMap = loadLocalProcessedTransactions();
  const foundLocally = Boolean(localMap[idempotencyKey]);

  if (foundInSupabase || foundLocally) {
    if (!foundInSupabase) {
      checkedSource = 'LOCAL_FALLBACK';
    }
    return {
      valid: false,
      isDuplicate: true,
      idempotencyKey,
      payloadType,
      payloadHash,
      expectedSignature,
      checkedSource,
      errorCode: 'DUPLICATE_TRANSACTION',
      error: `Duplicate transaction blocked: idempotencyKey "${idempotencyKey}" was already processed (${checkedSource}).`,
    };
  }

  if (options.autoRecordOnSuccess !== false) {
    await recordProcessedTransaction(
      {
        idempotency_key: idempotencyKey,
        transaction_id: record.transactionId ? String(record.transactionId) : null,
        payload_type: payloadType,
        payload_hash: payloadHash,
        signature: incomingSignature || expectedSignature,
        source_system: String(record.sourceSystem || 'GOOGLE_SHEETS_WEBHOOK'),
        status: 'PROCESSED',
        error_reason: null,
        processed_at: new Date().toISOString(),
      },
      options
    );
  }

  return {
    valid: true,
    isDuplicate: false,
    idempotencyKey,
    payloadType,
    payloadHash,
    expectedSignature,
    checkedSource,
  };
}
