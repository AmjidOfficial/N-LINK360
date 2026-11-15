import assert from 'node:assert/strict';
import {
  canPreviewDashboard, getDefaultScopeForRole, getDepartmentForRole,
  normalizeRole, normalizeTradePartnerType,
} from '../src/lib/dashboard/unified-role-model';
import { DEPARTMENT_DASHBOARDS, getDashboardDefinitionForRole } from '../src/lib/dashboard/department-dashboard-blueprints';
import { getCanonicalDashboardRole, getEffectivePermissionGroup } from '../src/lib/permissions';
import { resolveUserDataScope } from '../src/lib/dashboard/scope';

assert.equal(normalizeRole('TSM'), 'SALES_OFFICER');
assert.equal(normalizeRole('Sales Officer'), 'SALES_OFFICER');
assert.equal(normalizeRole('FIELD_SALES_USER'), 'SALES_OFFICER');
assert.equal(normalizeRole('DEALER'), 'TRADE_PARTNER');
assert.equal(normalizeRole('DISTRIBUTOR'), 'TRADE_PARTNER');
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

assert.equal(getDashboardDefinitionForRole('TRADE_PARTNER'), DEPARTMENT_DASHBOARDS.TRADE);
assert.equal(getDashboardDefinitionForRole('SALES_OFFICER'), DEPARTMENT_DASHBOARDS.SALES);
assert.equal(getDashboardDefinitionForRole('FACTORY'), DEPARTMENT_DASHBOARDS.MANUFACTURING);
assert.equal(getEffectivePermissionGroup('TSM'), getEffectivePermissionGroup('SALES_OFFICER'));
assert.equal(getEffectivePermissionGroup('DEALER'), getEffectivePermissionGroup('DISTRIBUTOR'));
assert.equal(getCanonicalDashboardRole('DEALER'), getCanonicalDashboardRole('DISTRIBUTOR'));
assert.equal(getCanonicalDashboardRole('FACTORY'), 'FACTORY');
const dealerScope = resolveUserDataScope({ id: 'dealer-user', role: 'DEALER', dealerId: 'dealer-1' });
const distributorScope = resolveUserDataScope({ id: 'dist-user', role: 'DISTRIBUTOR', distributorId: 'dist-1' });
assert.equal(dealerScope.dashboardRoleKey, distributorScope.dashboardRoleKey);
assert.equal(dealerScope.scopeLevel, 'DEALER');
assert.equal(distributorScope.scopeLevel, 'DISTRIBUTOR');

assert.equal(canPreviewDashboard({ actorRole: 'SUPER_ADMIN', actorScope: 'COMPANY', requestedRole: 'FACTORY', requestedScope: 'DEPARTMENT' }), true);
assert.equal(canPreviewDashboard({ actorRole: 'TOP_MANAGEMENT', actorScope: 'COMPANY', requestedRole: 'TRADE_PARTNER', requestedScope: 'ASSIGNED_CUSTOMERS' }), true);
assert.equal(canPreviewDashboard({ actorRole: 'SUPER_ADMIN', actorScope: 'REGION', requestedRole: 'FACTORY', requestedScope: 'DEPARTMENT' }), false);
assert.equal(canPreviewDashboard({ actorRole: 'RSM', actorScope: 'REGION', requestedRole: 'NSM', requestedScope: 'NATIONAL' }), false);
assert.equal(canPreviewDashboard({ actorRole: 'SALES_OFFICER', actorScope: 'TERRITORY', requestedRole: 'TRADE_PARTNER', requestedScope: 'ASSIGNED_CUSTOMERS' }), false);
assert.equal(canPreviewDashboard({ actorRole: 'NSM', actorScope: 'NATIONAL', requestedRole: 'ACCOUNTS', requestedScope: 'DEPARTMENT' }), false);
assert.equal(canPreviewDashboard({ actorRole: 'NSM', actorScope: 'NATIONAL', requestedRole: 'RSM', requestedScope: 'REGION' }), true);
assert.equal(canPreviewDashboard({ actorRole: 'NSM', actorScope: 'NATIONAL', requestedRole: 'TRADE_PARTNER', requestedScope: 'ASSIGNED_CUSTOMERS' }), true);
console.log('Unified dashboard model and blueprint tests passed.');
