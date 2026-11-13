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
