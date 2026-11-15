import assert from 'node:assert/strict';
import {
  canPreviewDashboard,
  getDefaultScopeForRole,
  getDepartmentForRole,
  normalizeRole,
  normalizeTradePartnerType,
} from '../src/lib/dashboard/unified-role-model';

assert.equal(normalizeRole('TSM'), 'SALES_OFFICER');
assert.equal(normalizeRole('FIELD_SALES_USER'), 'SALES_OFFICER');
assert.equal(normalizeRole('DEALER'), 'TRADE_PARTNER');
assert.equal(normalizeRole('DISTRIBUTOR'), 'TRADE_PARTNER');
assert.equal(normalizeRole('WAREHOUSE_MANAGER'), 'WAREHOUSE');
assert.equal(normalizeRole('FACTORY_MANAGER'), 'FACTORY');
assert.equal(normalizeRole('UNKNOWN_ROLE'), null);

assert.equal(getDepartmentForRole('TSM'), 'SALES');
assert.equal(getDepartmentForRole('DEALER'), 'TRADE');
assert.equal(getDepartmentForRole('ACCOUNTS'), 'FINANCE');
assert.equal(getDepartmentForRole('FACTORY'), 'MANUFACTURING');
assert.equal(getDefaultScopeForRole('RSM'), 'REGION');
assert.equal(getDefaultScopeForRole('ZSM'), 'ZONE');
assert.equal(getDefaultScopeForRole('TSM'), 'TERRITORY');

assert.equal(normalizeTradePartnerType('dealer'), 'DEALER');
assert.equal(normalizeTradePartnerType('Distributor'), 'DISTRIBUTOR');
assert.equal(normalizeTradePartnerType('OTHER'), null);

assert.equal(
  canPreviewDashboard({
    actorRole: 'SUPER_ADMIN',
    actorScope: 'COMPANY',
    requestedRole: 'SALES_OFFICER',
    requestedScope: 'TERRITORY',
  }),
  true,
);
assert.equal(
  canPreviewDashboard({
    actorRole: 'RSM',
    actorScope: 'REGION',
    requestedRole: 'NSM',
    requestedScope: 'NATIONAL',
  }),
  false,
);
assert.equal(
  canPreviewDashboard({
    actorRole: 'SALES_OFFICER',
    actorScope: 'TERRITORY',
    requestedRole: 'TRADE_PARTNER',
    requestedScope: 'ASSIGNED_CUSTOMERS',
  }),
  false,
);

assert.equal(
  canPreviewDashboard({
    actorRole: 'NSM',
    actorScope: 'NATIONAL',
    requestedRole: 'ACCOUNTS',
    requestedScope: 'DEPARTMENT',
  }),
  false,
);
assert.equal(
  canPreviewDashboard({
    actorRole: 'NSM',
    actorScope: 'NATIONAL',
    requestedRole: 'RSM',
    requestedScope: 'REGION',
  }),
  true,
);

console.log('Unified dashboard model tests passed.');
