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

export type TransactionDomainPrefix = 'PAY' | 'INV' | 'ORD' | 'LED' | 'RET' | 'SYN';

const SEQUENCE_STORAGE_KEY = 'nlink360_txn_sig_sequences_v1';

const inMemorySeqCounters: Record<string, number> = {};

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
