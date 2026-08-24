/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Automated Business Rules Test Suite
 * Tests critical transaction equations, credit check tiers, and inventory balance math.
 */

import {
  calculateGRNDiscrepancy,
  calculateLedgerRunningBalance,
  calculateNewInventoryBalance,
  calculateOrderItemLineTotal,
  calculateOrderTotals,
  evaluateCreditPolicy,
  roundTo2,
  validateRecoverySubmission,
} from '../src/lib/business-rules';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (failureDetails) console.error(`     Details: ${failureDetails}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('🧪 N-LINK 360: Business Rules & Calculation Verification');
console.log('======================================================\n');

// 1. Inventory Engine Tests
console.log('📦 Testing Inventory Engine Math (Opening + In - Out = Current)...');
{
  const opening = 1000;
  const afterProduction = calculateNewInventoryBalance(opening, 'PRODUCTION_IN', 500);
  assert(afterProduction === 1500, 'Production In increases stock (1000 + 500 = 1500)');

  const afterSales = calculateNewInventoryBalance(afterProduction, 'SALES_OUT', 350);
  assert(afterSales === 1150, 'Sales Out decrements stock (1500 - 350 = 1150)');

  const afterReturn = calculateNewInventoryBalance(afterSales, 'RETURN_IN', 50);
  assert(afterReturn === 1200, 'Return In increases stock (1150 + 50 = 1200)');

  const afterDamage = calculateNewInventoryBalance(afterReturn, 'DAMAGE_OUT', 20);
  assert(afterDamage === 1180, 'Damage Out decrements stock (1200 - 20 = 1180)');

  let threw = false;
  try {
    calculateNewInventoryBalance(50, 'SALES_OUT', 100);
  } catch {
    threw = true;
  }
  assert(threw, 'Inventory engine prevents negative stock dispatch');
}

// 2. Customer Ledger Engine Tests
console.log('\n💰 Testing Customer Ledger Balance (Opening + Debits - Credits = Closing)...');
{
  const opening = 500000.00; // Customer owes 500,000
  const invoice1 = 250000.00; // Invoice issued
  const balanceAfterInvoice = calculateLedgerRunningBalance(opening, invoice1, 0);
  assert(balanceAfterInvoice === 750000.00, 'Invoice debits customer ledger (500k + 250k = 750k)');

  const recovery1 = 300000.00; // Cash collected
  const balanceAfterRecovery = calculateLedgerRunningBalance(balanceAfterInvoice, 0, recovery1);
  assert(balanceAfterRecovery === 450000.00, 'Recovery credits customer ledger (750k - 300k = 450k)');

  const creditNote = 15000.00; // Return credit note
  const balanceAfterCreditNote = calculateLedgerRunningBalance(balanceAfterRecovery, 0, creditNote);
  assert(balanceAfterCreditNote === 435000.00, 'Credit note reduces customer balance (450k - 15k = 435k)');
}

// 3. Credit Check Policy Tests
console.log('\n🛡️ Testing Credit Policy Evaluation (Green / Amber / Red tiers)...');
{
  const customer = {
    creditLimit: 1000000, // 1,000,000 limit
    currentBalance: 600000,
    isCreditLocked: false,
    creditDays: 30,
  };

  // Case A: Within limit
  const resGreen = evaluateCreditPolicy(customer, 200000, 0);
  assert(
    resGreen.status === 'GREEN' && resGreen.canProceedAutomatically,
    'Order within credit limit gets GREEN status (600k + 200k = 800k <= 1M)'
  );

  // Case B: Grace buffer (<= 15% over limit)
  const resAmber = evaluateCreditPolicy(customer, 500000, 0);
  assert(
    resAmber.status === 'AMBER' && resAmber.requiresManagerApproval,
    'Order slightly exceeding limit within 15% gets AMBER (600k + 500k = 1.1M <= 1.15M)'
  );

  // Case C: Major limit breach (> 15% over limit)
  const resRed = evaluateCreditPolicy(customer, 700000, 0);
  assert(
    resRed.status === 'RED' && resRed.isBlocked,
    'Order exceeding 15% grace threshold gets RED blocked (600k + 700k = 1.3M > 1.15M)'
  );

  // Case D: Credit locked account
  const lockedCustomer = { ...customer, isCreditLocked: true };
  const resLocked = evaluateCreditPolicy(lockedCustomer, 50000, 0);
  assert(
    resLocked.status === 'RED' && resLocked.isBlocked,
    'Credit locked account is unconditionally blocked regardless of amount'
  );
}

// 4. Order & Pricing Calculations Tests
console.log('\n🏷️ Testing Order & Pricing Engine (Line total, discounts, tax)...');
{
  const lineTotal = calculateOrderItemLineTotal(100, 310, 5); // 100 pcs * 310 - 5%
  assert(lineTotal === 29450, 'Line total calculated correctly with 5% discount (31,000 - 1,550 = 29,450)');

  const orderTotals = calculateOrderTotals(
    [
      { orderedQuantity: 50, unitPrice: 310, discountPercent: 0 },   // 15,500
      { orderedQuantity: 20, unitPrice: 2150, discountPercent: 10 }, // 43,000 - 4,300 = 38,700
    ],
    0 // 0% tax
  );
  assert(orderTotals.subtotal === 54200, 'Order subtotal matches (15,500 + 38,700 = 54,200)');
  assert(orderTotals.discountAmount === 4300, 'Discount amount matches (4,300)');
}

// 5. Logistics GRN Discrepancy Tests
console.log('\n🚚 Testing GRN Discrepancy Calculation...');
{
  const grnShort = calculateGRNDiscrepancy(100, 95);
  assert(grnShort.shortQuantity === 5 && grnShort.excessQuantity === 0, 'Shortage calculated correctly');

  const grnExcess = calculateGRNDiscrepancy(100, 102);
  assert(grnExcess.excessQuantity === 2 && grnExcess.shortQuantity === 0, 'Excess calculated correctly');
}

// 6. Recovery Validation Tests
console.log('\n💳 Testing Recovery Collection Submission Rules...');
{
  const cashValid = validateRecoverySubmission(50000, 'CASH');
  assert(cashValid.isValid, 'Valid cash recovery passes');

  const chequeInvalid = validateRecoverySubmission(50000, 'CHEQUE', '', '');
  assert(!chequeInvalid.isValid, 'Cheque recovery without cheque number or bank name is rejected');

  const chequeValid = validateRecoverySubmission(50000, 'CHEQUE', 'CHQ-99120', 'Habib Bank Ltd');
  assert(chequeValid.isValid, 'Cheque recovery with instrument details passes');
}

console.log('\n------------------------------------------------------');
console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
console.log('------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
