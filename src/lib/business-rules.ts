/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Lights Business Management Platform
 * Authoritative Business Rules & Calculation Engine
 */

import {
  CreditCheckStatus,
  Customer,
  InventoryTransactionType,
  PaymentMode,
  SalesOrderItem,
} from '../types';

// ==============================================================================
// 1. Fixed-Precision Decimal Rounding Utility
// ==============================================================================
export function roundTo2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// ==============================================================================
// 2. INVENTORY ENGINE
// Core Equation: Opening Stock + Stock In - Stock Out = Current Stock
// ==============================================================================
export function isStockInflow(type: InventoryTransactionType): boolean {
  switch (type) {
    case 'PRODUCTION_IN':
    case 'TRANSFER_IN':
    case 'RETURN_IN':
    case 'DAMAGE_RECOVERY':
    case 'ADJUSTMENT_IN':
      return true;
    case 'SALES_OUT':
    case 'TRANSFER_OUT':
    case 'DAMAGE_OUT':
    case 'ADJUSTMENT_OUT':
      return false;
  }
}

export function calculateStockDelta(
  type: InventoryTransactionType,
  quantity: number
): number {
  const absQty = Math.abs(quantity);
  return isStockInflow(type) ? absQty : -absQty;
}

export function calculateNewInventoryBalance(
  currentBalance: number,
  type: InventoryTransactionType,
  quantity: number
): number {
  const delta = calculateStockDelta(type, quantity);
  const result = currentBalance + delta;
  if (result < 0 && !isStockInflow(type)) {
    throw new Error(
      `Insufficient stock: current stock (${currentBalance}) is less than requested outflow (${quantity})`
    );
  }
  return roundTo2(result);
}

// ==============================================================================
// 3. CUSTOMER LEDGER ENGINE
// Formula: Opening Balance + Debits - Credits = Closing Balance
// ==============================================================================
export function calculateLedgerRunningBalance(
  previousBalance: number,
  debitAmount: number = 0,
  creditAmount: number = 0
): number {
  return roundTo2(previousBalance + debitAmount - creditAmount);
}

// ==============================================================================
// 4. CREDIT CHECK ENGINE
// Before invoice posting: Current Outstanding + Pending Orders + New Invoice <= Credit Limit
// ==============================================================================
export interface CreditCheckResult {
  status: CreditCheckStatus;
  canProceedAutomatically: boolean;
  requiresManagerApproval: boolean;
  isBlocked: boolean;
  creditLimit: number;
  currentOutstanding: number;
  pendingOrdersTotal: number;
  newOrderTotal: number;
  projectedOutstanding: number;
  overLimitAmount: number;
  message: string;
}

export function evaluateCreditPolicy(
  customer?: Partial<Customer> | null,
  newOrderTotal: number = 0,
  pendingOrdersTotal: number = 0
): CreditCheckResult {
  if (!customer) {
    return {
      status: 'GREEN',
      canProceedAutomatically: true,
      requiresManagerApproval: false,
      isBlocked: false,
      creditLimit: 0,
      currentOutstanding: 0,
      pendingOrdersTotal: 0,
      newOrderTotal,
      projectedOutstanding: newOrderTotal,
      overLimitAmount: 0,
      message: 'No customer selected.',
    };
  }

  const creditLimit = customer.creditLimit || 0;
  const currentOutstanding = customer.currentBalance || 0;
  const projectedOutstanding = roundTo2(currentOutstanding + pendingOrdersTotal + newOrderTotal);
  const overLimitAmount = roundTo2(Math.max(0, projectedOutstanding - creditLimit));

  // Case 1: Account manually credit-locked by management
  if (customer.isCreditLocked) {
    return {
      status: 'RED',
      canProceedAutomatically: false,
      requiresManagerApproval: false,
      isBlocked: true,
      creditLimit,
      currentOutstanding,
      pendingOrdersTotal,
      newOrderTotal,
      projectedOutstanding,
      overLimitAmount,
      message: 'Account is credit-locked by Management due to default or policy breach.',
    };
  }

  // Case 2: Fully within approved credit limit
  if (projectedOutstanding <= creditLimit) {
    return {
      status: 'GREEN',
      canProceedAutomatically: true,
      requiresManagerApproval: false,
      isBlocked: false,
      creditLimit,
      currentOutstanding,
      pendingOrdersTotal,
      newOrderTotal,
      projectedOutstanding,
      overLimitAmount: 0,
      message: 'Order within credit limit. Approved for automatic processing.',
    };
  }

  // Case 3: Exceeds limit by less than 15% (Grace buffer - Amber tier)
  const graceLimit = creditLimit * 1.15;
  if (projectedOutstanding <= graceLimit) {
    return {
      status: 'AMBER',
      canProceedAutomatically: false,
      requiresManagerApproval: true,
      isBlocked: false,
      creditLimit,
      currentOutstanding,
      pendingOrdersTotal,
      newOrderTotal,
      projectedOutstanding,
      overLimitAmount,
      message: `Projected balance exceeds credit limit by PKR ${overLimitAmount.toLocaleString()} (within 15% grace). Sales Manager approval required.`,
    };
  }

  // Case 4: Severe credit limit breach (> 15% over limit)
  return {
    status: 'RED',
    canProceedAutomatically: false,
    requiresManagerApproval: false,
    isBlocked: true,
    creditLimit,
    currentOutstanding,
    pendingOrdersTotal,
    newOrderTotal,
    projectedOutstanding,
    overLimitAmount,
    message: `Order blocked: Exceeds credit limit by PKR ${overLimitAmount.toLocaleString()} (>15% over limit). Immediate recovery required.`,
  };
}

// ==============================================================================
// 5. SALES ORDER & INVOICE PRICING ENGINE
// ==============================================================================
export function calculateOrderItemLineTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number = 0
): number {
  if (quantity < 0 || unitPrice < 0) {
    throw new Error('Quantity and unit price must be positive numbers');
  }
  const gross = quantity * unitPrice;
  const discount = gross * (Math.max(0, Math.min(100, discountPercent)) / 100);
  return roundTo2(gross - discount);
}

export function calculateOrderTotals(
  items: Array<Pick<SalesOrderItem, 'orderedQuantity' | 'unitPrice' | 'discountPercent'>>,
  taxRatePercent: number = 0
): { subtotal: number; discountAmount: number; taxAmount: number; totalAmount: number } {
  let grossTotal = 0;
  let netSubtotal = 0;

  for (const item of items) {
    const gross = item.orderedQuantity * item.unitPrice;
    const lineTotal = calculateOrderItemLineTotal(
      item.orderedQuantity,
      item.unitPrice,
      item.discountPercent || 0
    );
    grossTotal += gross;
    netSubtotal += lineTotal;
  }

  const discountAmount = roundTo2(grossTotal - netSubtotal);
  const subtotal = roundTo2(netSubtotal);
  const taxAmount = roundTo2(subtotal * (Math.max(0, taxRatePercent) / 100));
  const totalAmount = roundTo2(subtotal + taxAmount);

  return { subtotal, discountAmount, taxAmount, totalAmount };
}

// ==============================================================================
// 6. GOODS RECEIPT NOTE (GRN) DISCREPANCY CALCULATION
// ==============================================================================
export function calculateGRNDiscrepancy(
  invoicedQty: number,
  receivedQty: number
): { shortQuantity: number; excessQuantity: number } {
  const diff = receivedQty - invoicedQty;
  if (diff < 0) {
    return { shortQuantity: Math.abs(diff), excessQuantity: 0 };
  } else if (diff > 0) {
    return { shortQuantity: 0, excessQuantity: diff };
  }
  return { shortQuantity: 0, excessQuantity: 0 };
}

// ==============================================================================
// 7. RECOVERY POSTING VALIDATION
// ==============================================================================
export function validateRecoverySubmission(
  amount: number,
  paymentMode: PaymentMode,
  instrumentNumber?: string,
  bankName?: string
): { isValid: boolean; error?: string } {
  if (amount <= 0) {
    return { isValid: false, error: 'Recovery amount must be greater than zero.' };
  }

  if (paymentMode === 'CHEQUE' || paymentMode === 'PAY_ORDER') {
    if (!instrumentNumber || instrumentNumber.trim().length === 0) {
      return { isValid: false, error: `Instrument/Cheque number is mandatory for ${paymentMode}.` };
    }
    if (!bankName || bankName.trim().length === 0) {
      return { isValid: false, error: `Bank name is mandatory for ${paymentMode}.` };
    }
  }

  return { isValid: true };
}

// ==============================================================================
// 8. TARGET ACHIEVEMENT & VARIANCE CALCULATION ENGINE
// Formula: Achievement % = (Actual / Target) * 100 (Safe Zero Check: 'N/A')
// ==============================================================================
export interface TargetAchievementResult {
  actual: number;
  target: number;
  variance: number; // Actual - Target (Positive = Overachieved, Negative = Deficit)
  achievementPercentage: number | 'N/A';
  isOverAchieved: boolean;
  statusLabel: string;
}

export function calculateTargetAchievement(
  actual: number = 0,
  target: number = 0
): TargetAchievementResult {
  const actualNum = roundTo2(Number(actual) || 0);
  const targetNum = roundTo2(Number(target) || 0);
  const variance = roundTo2(actualNum - targetNum);

  if (targetNum <= 0) {
    return {
      actual: actualNum,
      target: targetNum,
      variance,
      achievementPercentage: 'N/A',
      isOverAchieved: actualNum > 0,
      statusLabel: targetNum === 0 && actualNum === 0 ? 'No Target Set' : 'Target N/A',
    };
  }

  const pct = roundTo2((actualNum / targetNum) * 100);
  return {
    actual: actualNum,
    target: targetNum,
    variance,
    achievementPercentage: pct,
    isOverAchieved: actualNum >= targetNum,
    statusLabel: `${pct.toFixed(1)}% achieved (${variance >= 0 ? '+' : ''}${variance.toLocaleString()})`,
  };
}

// ==============================================================================
// 9. DYNAMIC TOWN-BASED CUSTOMER ACCESS ENGINE
// Rules: When an employee is assigned to a Town, system automatically resolves
// all active Distributors/Dealers in that Town dynamically.
// ==============================================================================
export function getEmployeeScopedCustomers(
  employeeId?: string,
  assignedTowns: string[] = [],
  assignedTerritories: string[] = [],
  allCustomers: Customer[] = [],
  userRole?: string
): Customer[] {
  if (!allCustomers || allCustomers.length === 0) return [];
  
  // Super Admin, Management, Accounts, and Head Office have global access
  const isGlobalRole = ['SUPER_ADMIN', 'MANAGEMENT', 'ACCOUNTS', 'FACTORY_MANAGER', 'WAREHOUSE_MANAGER', 'DISPATCH_OFFICER', 'HO'].includes(
    userRole || ''
  );
  if (isGlobalRole) {
    return allCustomers;
  }

  const normalizedTowns = assignedTowns.map((t) => t.trim().toLowerCase()).filter(Boolean);
  const normalizedTerritories = assignedTerritories.map((t) => t.trim().toLowerCase()).filter(Boolean);

  return allCustomers.filter((customer) => {
    if (!customer.isActive) return false;

    // Direct assignment
    if (employeeId && customer.assignedEmployee === employeeId) {
      return true;
    }

    // Dynamic Town assignment
    const custTown = (customer.town || customer.city || '').trim().toLowerCase();
    if (custTown && normalizedTowns.includes(custTown)) {
      return true;
    }

    // Dynamic Territory assignment
    const custTerritory = (customer.territory || customer.region || '').trim().toLowerCase();
    if (custTerritory && normalizedTerritories.includes(custTerritory)) {
      return true;
    }

    return false;
  });
}

// ==============================================================================
// 10. CREDIT UTILIZATION & REAL-TIME BALANCES
// Credit Limit, Current Outstanding, Available Credit, Credit Utilization %
// ==============================================================================
export interface CreditUtilizationInfo {
  creditLimit: number;
  currentOutstanding: number;
  availableCredit: number;
  creditUtilizationPercentage: number;
  isOverLimit: boolean;
}

export function calculateCustomerCreditUtilization(
  creditLimit: number = 0,
  currentOutstanding: number = 0
): CreditUtilizationInfo {
  const limit = Math.max(0, roundTo2(creditLimit));
  const outstanding = roundTo2(currentOutstanding);
  const availableCredit = roundTo2(Math.max(0, limit - Math.max(0, outstanding)));
  const utilization = limit > 0 ? roundTo2((Math.max(0, outstanding) / limit) * 100) : 0;

  return {
    creditLimit: limit,
    currentOutstanding: outstanding,
    availableCredit,
    creditUtilizationPercentage: Math.min(999, utilization),
    isOverLimit: outstanding > limit && limit > 0,
  };
}

// ==============================================================================
// 11. UNIQUE CUSTOMER CODE GENERATOR (CUST-DLR-XXXX / CUST-DST-XXXX)
// ==============================================================================
export function generateUniqueCustomerCode(
  type: 'DISTRIBUTOR' | 'DEALER' | 'CUSTOMER' | 'SHOP',
  existingCodes: string[] = []
): string {
  const prefix = type === 'DISTRIBUTOR' ? 'CUST-DST' : 'CUST-DLR';
  const codeSet = new Set(existingCodes.map((c) => c.toUpperCase().trim()));

  let sequence = existingCodes.length + 1;
  let candidate = `${prefix}-${String(sequence).padStart(4, '0')}`;

  while (codeSet.has(candidate)) {
    sequence += 1;
    candidate = `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  return candidate;
}

