/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Collision-Free Unique ID Generator for Orders & Recoveries
 */

let monotonicSeq = 0;

function getEntropySegment(): string {
  monotonicSeq = (monotonicSeq + 1) % 10000;
  const seqStr = monotonicSeq.toString(36).toUpperCase().padStart(3, '0');

  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    const uuidPart = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    return `${uuidPart}${seqStr}`;
  }

  const timePart = (Date.now() & 0xffffff).toString(36).toUpperCase().padStart(4, '0');
  const randPart = Math.floor(Math.random() * 1679616)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0');
  return `${timePart}${randPart}${seqStr}`.slice(0, 9);
}

function getCompactDateStamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function generateUniqueTransactionId(
  prefix: 'ORD' | 'SO' | 'REC',
  existingIds?: Iterable<string>
): string {
  const existing = existingIds instanceof Set ? existingIds : new Set(existingIds || []);
  const dateStamp = getCompactDateStamp();

  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = `${prefix}-${dateStamp}-${getEntropySegment()}`;
    if (!existing.has(candidate)) {
      return candidate;
    }
  }

  // Ultimate fallback with high-resolution timestamp + random
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function generateUniqueOrderId(
  existingOrders?: Array<{ id?: string; orderNumber?: string }>
): string {
  const used = new Set<string>();
  if (existingOrders) {
    for (const o of existingOrders) {
      if (o.id) used.add(String(o.id));
      if (o.orderNumber) used.add(String(o.orderNumber));
    }
  }
  return generateUniqueTransactionId('ORD', used);
}

export function generateUniqueRecoveryId(
  existingRecoveries?: Array<{ id?: string; recoveryNumber?: string }>
): string {
  const used = new Set<string>();
  if (existingRecoveries) {
    for (const r of existingRecoveries) {
      if (r.id) used.add(String(r.id));
      if (r.recoveryNumber) used.add(String(r.recoveryNumber));
    }
  }
  return generateUniqueTransactionId('REC', used);
}

export function generateUniqueOrderItemId(orderId: string, index: number): string {
  return `item-${orderId}-${index}-${getEntropySegment()}`;
}

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value?: string | null): boolean {
  return Boolean(value && UUID_V4_PATTERN.test(value.trim()));
}

/**
 * Generates a persistent RFC-4122 UUID v4 idempotency key for financial transactions.
 * Generates once per user draft and MUST remain unchanged across retries and reconnects.
 */
export function generateIdempotencyUuid(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    if (typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    if (typeof globalThis.crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
