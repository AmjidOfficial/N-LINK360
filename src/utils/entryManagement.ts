/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Daily Entry Management & Accounting Reversal Engine
 * 
 * Rules:
 * 1. Business Timezone: Asia/Karachi (PKT, UTC+5).
 * 2. Unapproved today's entries: Field officers can edit & delete/cancel their own entries.
 * 3. Approved / posted entries: Permanent deletion prohibited; requires formal accounting reversal entry
 *    preserving audit trail, reversing customer balance, and authorized by Shahzad Ullah / Executive.
 * 4. Audit history: Immutable record of who, when, why, and before/after values.
 */

import { Customer, SalesOrder, Recovery, EmployeeAttendance, LedgerEntry } from '../types';
import { NLinkUser } from '../data/nlink-users-team';
import { isAuthorizedApproverEmail } from '../services/production-users';

/**
 * Returns the current date in Pakistan Standard Time (Asia/Karachi, UTC+5) formatted as YYYY-MM-DD
 */
export function getBusinessTodayDate(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Checks if a given timestamp or date string belongs to today in the business timezone
 */
export function isTodayEntry(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const today = getBusinessTodayDate();
  const cleanDate = dateStr.slice(0, 10);
  return cleanDate === today;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  isToday: boolean;
  isExecutive: boolean;
  isCreator: boolean;
  requiresReversal: boolean;
}

/**
 * Returns true if an Order or Recovery has been confirmed by Accounts, NSM, or Executive Approval
 */
export function isEntryConfirmedByAccountsOrNsm(entry: any): boolean {
  if (!entry) return false;
  const status = String(entry.status || '').toUpperCase();
  const shahzadApproval = String(entry.shahzadApproval || '').toUpperCase();
  const accountsApproval = String(entry.accountsApproval || '').toUpperCase();
  const nsmApproval = String(entry.nsmApproval || '').toUpperCase();
  const dualApprovalStatus = String(entry.dualApprovalStatus || '').toUpperCase();

  return (
    status === 'APPROVED' ||
    status === 'VERIFIED' ||
    status === 'POSTED' ||
    status === 'CONFIRMED' ||
    shahzadApproval === 'APPROVED' ||
    accountsApproval === 'APPROVED' ||
    nsmApproval === 'APPROVED' ||
    dualApprovalStatus === 'DUAL_APPROVED' ||
    dualApprovalStatus === 'ACCOUNTS_APPROVED' ||
    dualApprovalStatus === 'NSM_APPROVED' ||
    Boolean(entry.accountsApprovedBy || entry.nsmApprovedBy)
  );
}

/**
 * Evaluates whether the current user is permitted to edit an entry
 */
export function canUserEditEntry(
  entry: any,
  currentUser: NLinkUser
): PermissionCheckResult {
  if (!entry || !currentUser) {
    return { allowed: false, isToday: false, isExecutive: false, isCreator: false, requiresReversal: false };
  }

  const isExecutive =
    isAuthorizedApproverEmail(currentUser?.email, currentUser) ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MANAGEMENT';

  const entryDate =
    entry.orderDate ||
    entry.collectionDate ||
    entry.recordedAt ||
    entry.date ||
    entry.createdAt ||
    '';
  const isToday = isTodayEntry(entryDate);

  const isCreator =
    Boolean(entry.salesUserId && entry.salesUserId === currentUser.id) ||
    Boolean(entry.collectorId && entry.collectorId === currentUser.id) ||
    Boolean(entry.employeeId && entry.employeeId === currentUser.id) ||
    Boolean(entry.salesUserName && entry.salesUserName.toLowerCase() === currentUser.fullName?.toLowerCase()) ||
    Boolean(entry.employeeName && entry.employeeName.toLowerCase() === currentUser.fullName?.toLowerCase());

  const isConfirmed = isEntryConfirmedByAccountsOrNsm(entry);

  // IMMUTABLE LOCK: Orders and recoveries confirmed by Accounts or NSM cannot be edited in-place
  if (isConfirmed) {
    return {
      allowed: false,
      reason: 'Confirmed by Accounts / NSM — orders and recoveries cannot be changed after confirmation.',
      isToday,
      isExecutive,
      isCreator,
      requiresReversal: true,
    };
  }

  // EXECUTIVE AUTHORITY: Shahzad Ullah can edit unconfirmed entries across any date
  if (isExecutive) {
    return {
      allowed: true,
      isToday,
      isExecutive: true,
      isCreator,
      requiresReversal: false,
    };
  }

  // FIELD USER AUTHORITY: Can only edit own entries created TODAY that are not yet confirmed
  if (isCreator) {
    if (!isToday) {
      return {
        allowed: false,
        reason: 'Past-date entries cannot be edited directly. Contact Executive Director Shahzad Ullah.',
        isToday,
        isExecutive,
        isCreator,
        requiresReversal: false,
      };
    }

    return {
      allowed: true,
      isToday,
      isExecutive,
      isCreator,
      requiresReversal: false,
    };
  }

  return {
    allowed: false,
    reason: 'You do not have permission to modify entries created by other officers.',
    isToday,
    isExecutive,
    isCreator,
    requiresReversal: false,
  };
}

/**
 * Evaluates whether the current user is permitted to delete / cancel / reverse an entry
 */
export function canUserDeleteEntry(
  entry: any,
  currentUser: NLinkUser
): PermissionCheckResult {
  if (!entry || !currentUser) {
    return { allowed: false, isToday: false, isExecutive: false, isCreator: false, requiresReversal: false };
  }

  const isConfirmed = isEntryConfirmedByAccountsOrNsm(entry);
  const isExecutive =
    isAuthorizedApproverEmail(currentUser?.email, currentUser) ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MANAGEMENT';

  if (isConfirmed) {
    if (isExecutive) {
      return {
        allowed: true,
        isToday: isTodayEntry(entry.orderDate || entry.collectionDate || entry.createdAt || ''),
        isExecutive: true,
        isCreator: false,
        requiresReversal: true,
      };
    }
    return {
      allowed: false,
      reason: 'Confirmed by Accounts / NSM — orders and recoveries cannot be deleted after confirmation.',
      isToday: isTodayEntry(entry.orderDate || entry.collectionDate || entry.createdAt || ''),
      isExecutive: false,
      isCreator: false,
      requiresReversal: true,
    };
  }

  return canUserEditEntry(entry, currentUser);
}

/**
 * Accounting Reversal Entry Result
 */
export interface OrderReversalResult {
  updatedOrders: SalesOrder[];
  updatedCustomers: Customer[];
  reversalOrder?: SalesOrder;
  reversalLedgerEntry?: LedgerEntry;
  message: string;
  isFormalReversal: boolean;
}

/**
 * Reverses or cancels an order safely preserving financial audit trails
 */
export function executeOrderCancellationOrReversal(
  orders: SalesOrder[],
  orderId: string,
  customers: Customer[],
  reason: string,
  author: NLinkUser
): OrderReversalResult {
  const order = orders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (!order) {
    throw new Error(`Order #${orderId} not found.`);
  }

  const isPosted =
    order.status === 'APPROVED' ||
    (order.status as string) === 'POSTED' ||
    order.shahzadApproval === 'APPROVED';

  const orderAmount = order.totalAmount || order.netAmount || 0;
  const nowIso = new Date().toISOString();
  const todayStr = getBusinessTodayDate();

  if (!isPosted) {
    // Unposted draft or pending order: simply cancel
    const updatedOrders = orders.map(o => {
      if (o.id === orderId || o.orderNumber === orderId) {
        return {
          ...o,
          status: 'CANCELLED' as any,
          shahzadApproval: 'REJECTED' as any,
          rejectionReason: `Cancelled by ${author.fullName}: ${reason}`,
          notes: `${o.notes ? o.notes + ' | ' : ''}[CANCELLED on ${todayStr} by ${author.fullName}: ${reason}]`,
        };
      }
      return o;
    });

    return {
      updatedOrders,
      updatedCustomers: customers,
      isFormalReversal: false,
      message: `Order #${order.orderNumber || order.id} cancelled successfully before approval.`,
    };
  }

  // Posted order: create formal accounting reversal credit note
  const reversalEntryNumber = `CN-REV-${Date.now().toString().slice(-6)}`;
  const reversalOrder: SalesOrder = {
    ...order,
    id: `rev-${Date.now()}`,
    orderNumber: reversalEntryNumber,
    totalAmount: -orderAmount,
    netAmount: -orderAmount,
    status: 'APPROVED',
    shahzadApproval: 'APPROVED',
    notes: `REVERSAL of Order #${order.orderNumber || order.id}. Reason: ${reason}`,
    createdAt: nowIso,
  };

  const updatedOrders = orders.map(o => {
    if (o.id === orderId || o.orderNumber === orderId) {
      return {
        ...o,
        status: 'CANCELLED' as any,
        shahzadApproval: 'REJECTED' as any,
        rejectionReason: `Reversed by ${author.fullName}: ${reason}`,
        notes: `${o.notes ? o.notes + ' | ' : ''}[REVERSED via Credit Note #${reversalEntryNumber} on ${todayStr} by ${author.fullName}: ${reason}]`,
      };
    }
    return o;
  }).concat(reversalOrder);

  const updatedCustomers = customers.map(c => {
    if (c.id === order.customerId || c.customerCode === order.customerCode) {
      const cur = c.currentBalance ?? c.openingBalance ?? 0;
      return {
        ...c,
        currentBalance: cur - orderAmount,
      };
    }
    return c;
  });

  return {
    updatedOrders,
    updatedCustomers,
    reversalOrder,
    isFormalReversal: true,
    message: `Order #${order.orderNumber || order.id} reversed. Formal Credit Note #${reversalEntryNumber} generated for Rs. ${orderAmount.toLocaleString()}.`,
  };
}

export interface RecoveryReversalResult {
  updatedRecoveries: Recovery[];
  updatedCustomers: Customer[];
  reversalRecovery?: Recovery;
  reversalLedgerEntry?: LedgerEntry;
  message: string;
  isFormalReversal: boolean;
}

/**
 * Reverses or cancels a payment recovery safely preserving financial audit trails
 */
export function executeRecoveryCancellationOrReversal(
  recoveries: Recovery[],
  recoveryId: string,
  customers: Customer[],
  reason: string,
  author: NLinkUser
): RecoveryReversalResult {
  const recovery = recoveries.find(r => r.id === recoveryId || (r as any).recoveryNumber === recoveryId);
  if (!recovery) {
    throw new Error(`Recovery record #${recoveryId} not found.`);
  }

  const isVerified =
    recovery.status === 'VERIFIED' ||
    recovery.status === 'APPROVED' ||
    (recovery.status as string) === 'POSTED' ||
    recovery.shahzadApproval === 'APPROVED';

  const recoveryAmount = recovery.amount || 0;
  const nowIso = new Date().toISOString();
  const todayStr = getBusinessTodayDate();

  if (!isVerified) {
    // Unverified payment: mark rejected / cancelled
    const updatedRecoveries = recoveries.map(r => {
      if (r.id === recoveryId || (r as any).recoveryNumber === recoveryId) {
        return {
          ...r,
          status: 'REJECTED' as any,
          shahzadApproval: 'REJECTED' as any,
          rejectionReason: `Cancelled by ${author.fullName}: ${reason}`,
          remarks: `${r.remarks ? r.remarks + ' | ' : ''}[CANCELLED on ${todayStr} by ${author.fullName}: ${reason}]`,
        };
      }
      return r;
    });

    return {
      updatedRecoveries,
      updatedCustomers: customers,
      isFormalReversal: false,
      message: `Recovery #${recovery.recoveryNumber || recovery.id} cancelled before verification.`,
    };
  }

  // Verified payment: create formal accounting debit note to reverse credit
  const reversalEntryNumber = `DN-REV-${Date.now().toString().slice(-6)}`;
  const reversalRecovery: Recovery = {
    ...recovery,
    id: `rev-rec-${Date.now()}`,
    amount: -recoveryAmount,
    status: 'VERIFIED',
    shahzadApproval: 'APPROVED',
    remarks: `REVERSAL of Recovery #${recovery.recoveryNumber || recovery.id}. Reason: ${reason}`,
    createdAt: nowIso,
  };

  const updatedRecoveries = recoveries.map(r => {
    if (r.id === recoveryId || (r as any).recoveryNumber === recoveryId) {
      return {
        ...r,
        status: 'REJECTED' as any,
        shahzadApproval: 'REJECTED' as any,
        rejectionReason: `Reversed by ${author.fullName}: ${reason}`,
        remarks: `${r.remarks ? r.remarks + ' | ' : ''}[REVERSED via Debit Note #${reversalEntryNumber} on ${todayStr} by ${author.fullName}: ${reason}]`,
      };
    }
    return r;
  }).concat(reversalRecovery);

  const updatedCustomers = customers.map(c => {
    if (c.id === recovery.customerId || c.customerCode === recovery.customerCode) {
      const cur = c.currentBalance ?? c.openingBalance ?? 0;
      return {
        ...c,
        currentBalance: cur + recoveryAmount,
      };
    }
    return c;
  });

  return {
    updatedRecoveries,
    updatedCustomers,
    reversalRecovery,
    isFormalReversal: true,
    message: `Recovery #${recovery.recoveryNumber || recovery.id} reversed. Formal Debit Note generated for Rs. ${recoveryAmount.toLocaleString()}.`,
  };
}
