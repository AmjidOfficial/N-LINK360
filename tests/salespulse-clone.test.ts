import assert from 'node:assert/strict';
import {
  calculateOrderSummary,
  clampOrderQuantity,
  groupSkusByBrand,
} from '../src/services/salesPulseCloneAdapter';

const skus: any[] = [
  { id: 'a', name: 'Alpha', category: 'Brand A', tradePrice: 100 },
  { id: 'b', name: 'Beta', category: 'Brand A', tradePrice: 200 },
  { id: 'c', name: 'Gamma', category: 'Brand B', tradePrice: 50 },
];

const groups = groupSkusByBrand(skus as any);
assert.equal(groups.length, 2);
assert.equal(groups[0].label, 'Brand A');
assert.equal(groups[0].skus.length, 2);

assert.equal(clampOrderQuantity(12, 10), 10);
assert.equal(clampOrderQuantity(12, 10, true), 12);
assert.equal(clampOrderQuantity(-5, 10), 0);

const summary = calculateOrderSummary({ a: 2, b: 3, c: 4 }, skus as any);
assert.equal(summary.totalSkus, 3);
assert.equal(summary.totalQuantity, 9);
assert.equal(summary.orderValue, 1000);

console.log('SalesPulse clone adapter tests passed.');
