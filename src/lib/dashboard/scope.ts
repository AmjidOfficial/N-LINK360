/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK-360 - Organizational Hierarchy & Data Scope Enforcement Engine
 * Hierarchy: National -> Region -> Zone -> Territory -> Town -> Team -> Distributor -> Dealer
 */

import { getCanonicalDashboardRole, getEffectivePermissionGroup } from '../permissions';
import type { Customer, SalesOrder, Recovery, Invoice, Dispatch, EmployeeAttendance, LeaveRequest } from '../../types';
import type {
  DashboardDataset,
  DashboardHierarchyFilter,
  DashboardRoleKey,
  DataScopeLevel,
  ScopeValidationResult,
  UserDataScope,
} from './types';

function norm(v?: string | null): string {
  return String(v || '').trim().toLowerCase();
}

function isWildcardLocation(v?: string | null): boolean {
  const n = norm(v);
  return !n || n === 'all' || n === 'national' || n === 'all pakistan' || n === 'head office';
}

export interface ScopedUserInput {
  id?: string;
  email?: string;
  role?: string;
  region?: string;
  zone?: string;
  area?: string;
  territory?: string;
  assignedTowns?: string[];
  team?: string;
  distributorId?: string;
  dealerId?: string;
}

export function resolveUserDataScope(user: ScopedUserInput): UserDataScope {
  const permissionGroup = getEffectivePermissionGroup(user.role || '');
  const dashboardRoleKey = getCanonicalDashboardRole(user.role || '') as DashboardRoleKey;

  let scopeLevel: DataScopeLevel = 'TERRITORY';
  let isCompanyWide = false;

  switch (dashboardRoleKey) {
    case 'MD_EXECUTIVE':
      scopeLevel = 'COMPANY';
      isCompanyWide = true;
      break;
    case 'NATIONAL_MANAGER':
      scopeLevel = 'NATIONAL';
      isCompanyWide = true;
      break;
    case 'ACCOUNTS':
    case 'WAREHOUSE':
    case 'DISPATCH':
    case 'HR_ADMIN':
      scopeLevel = 'DEPARTMENT';
      isCompanyWide = true;
      break;
    case 'RSM':
      scopeLevel = 'REGION';
      break;
    case 'ZSM':
      scopeLevel = 'ZONE';
      break;
    case 'FIELD_SALES_USER':
      scopeLevel = 'TERRITORY';
      break;
    case 'DISTRIBUTOR':
      scopeLevel = 'DISTRIBUTOR';
      break;
    case 'DEALER':
      scopeLevel = 'DEALER';
      break;
  }

  return {
    userId: String(user.id || ''),
    email: String(user.email || '').trim().toLowerCase(),
    rawRole: String(user.role || ''),
    permissionGroup,
    dashboardRoleKey,
    scopeLevel,
    region: !isWildcardLocation(user.region) ? String(user.region).trim() : undefined,
    zone: !isWildcardLocation(user.zone || user.area) ? String(user.zone || user.area).trim() : undefined,
    territory: !isWildcardLocation(user.territory) ? String(user.territory).trim() : undefined,
    assignedTowns: Array.isArray(user.assignedTowns)
      ? user.assignedTowns.map((t) => String(t).trim()).filter((t) => !isWildcardLocation(t))
      : [],
    team: !isWildcardLocation(user.team) ? String(user.team).trim() : undefined,
    distributorId: user.distributorId ? String(user.distributorId).trim() : undefined,
    dealerId: user.dealerId ? String(user.dealerId).trim() : undefined,
    isCompanyWide,
  };
}

/**
 * Validates requested UI/API filters against the user's immutable organizational scope.
 * Rejects horizontal/upward privilege escalation probes with authorized=false.
 */
export function validateRequestedFilter(
  scope: UserDataScope,
  requested: DashboardHierarchyFilter = {}
): ScopeValidationResult {
  const cleanReq: DashboardHierarchyFilter = {
    region: requested.region && requested.region !== 'ALL' ? requested.region.trim() : undefined,
    zone: requested.zone && requested.zone !== 'ALL' ? requested.zone.trim() : undefined,
    territory: requested.territory && requested.territory !== 'ALL' ? requested.territory.trim() : undefined,
    town: requested.town && requested.town !== 'ALL' ? requested.town.trim() : undefined,
    team: requested.team && requested.team !== 'ALL' ? requested.team.trim() : undefined,
    distributorId: requested.distributorId && requested.distributorId !== 'ALL' ? requested.distributorId.trim() : undefined,
    dealerId: requested.dealerId && requested.dealerId !== 'ALL' ? requested.dealerId.trim() : undefined,
    warehouseId: requested.warehouseId && requested.warehouseId !== 'ALL' ? requested.warehouseId.trim() : undefined,
  };

  if (scope.isCompanyWide) {
    return { authorized: true, effectiveFilter: cleanReq };
  }

  // Regional Manager locked to own Region
  if (scope.scopeLevel === 'REGION') {
    if (cleanReq.region && scope.region && norm(cleanReq.region) !== norm(scope.region)) {
      return {
        authorized: false,
        reason: `Region access denied: authorized scope is ${scope.region}, requested ${cleanReq.region}.`,
        effectiveFilter: { ...cleanReq, region: scope.region },
      };
    }
    return {
      authorized: true,
      effectiveFilter: { ...cleanReq, region: scope.region || cleanReq.region },
    };
  }

  // Zonal Manager locked to own Zone (and Region if assigned)
  if (scope.scopeLevel === 'ZONE') {
    if (cleanReq.region && scope.region && norm(cleanReq.region) !== norm(scope.region)) {
      return {
        authorized: false,
        reason: `Region access denied: authorized region is ${scope.region}.`,
        effectiveFilter: { ...cleanReq, region: scope.region, zone: scope.zone },
      };
    }
    if (cleanReq.zone && scope.zone && norm(cleanReq.zone) !== norm(scope.zone)) {
      return {
        authorized: false,
        reason: `Zone access denied: authorized zone is ${scope.zone}, requested ${cleanReq.zone}.`,
        effectiveFilter: { ...cleanReq, region: scope.region, zone: scope.zone },
      };
    }
    return {
      authorized: true,
      effectiveFilter: {
        ...cleanReq,
        region: scope.region || cleanReq.region,
        zone: scope.zone || cleanReq.zone,
      },
    };
  }

  // Field Sales User locked to own Territory / Assigned Towns / Self
  if (scope.scopeLevel === 'TERRITORY') {
    if (cleanReq.region && scope.region && norm(cleanReq.region) !== norm(scope.region)) {
      return {
        authorized: false,
        reason: `Territory role cannot filter outside assigned region ${scope.region}.`,
        effectiveFilter: { region: scope.region, zone: scope.zone, territory: scope.territory },
      };
    }
    if (cleanReq.zone && scope.zone && norm(cleanReq.zone) !== norm(scope.zone)) {
      return {
        authorized: false,
        reason: `Territory role cannot filter outside assigned zone ${scope.zone}.`,
        effectiveFilter: { region: scope.region, zone: scope.zone, territory: scope.territory },
      };
    }
    if (cleanReq.territory && scope.territory && norm(cleanReq.territory) !== norm(scope.territory)) {
      return {
        authorized: false,
        reason: `Territory access denied: assigned territory is ${scope.territory}.`,
        effectiveFilter: { region: scope.region, zone: scope.zone, territory: scope.territory },
      };
    }
    if (cleanReq.town && scope.assignedTowns.length > 0 && !scope.assignedTowns.some((t) => norm(t) === norm(cleanReq.town))) {
      return {
        authorized: false,
        reason: `Town access denied: ${cleanReq.town} is outside your assigned towns.`,
        effectiveFilter: { region: scope.region, zone: scope.zone, territory: scope.territory },
      };
    }
    return {
      authorized: true,
      effectiveFilter: {
        ...cleanReq,
        region: scope.region || cleanReq.region,
        zone: scope.zone || cleanReq.zone,
        territory: scope.territory || cleanReq.territory,
      },
    };
  }

  // Distributor locked to own Distributor entity
  if (scope.scopeLevel === 'DISTRIBUTOR') {
    if (cleanReq.distributorId && scope.distributorId && cleanReq.distributorId !== scope.distributorId) {
      return {
        authorized: false,
        reason: 'Access denied: Distributors can only view their own account and authorized dealer network.',
        effectiveFilter: { distributorId: scope.distributorId },
      };
    }
    return {
      authorized: true,
      effectiveFilter: { ...cleanReq, distributorId: scope.distributorId },
    };
  }

  // Dealer strictly locked to own Dealer entity
  if (scope.scopeLevel === 'DEALER') {
    if (cleanReq.dealerId && scope.dealerId && cleanReq.dealerId !== scope.dealerId) {
      return {
        authorized: false,
        reason: 'Access denied: Dealers can strictly access their own business records.',
        effectiveFilter: { dealerId: scope.dealerId },
      };
    }
    if (cleanReq.region || cleanReq.zone || cleanReq.territory || cleanReq.distributorId) {
      return {
        authorized: false,
        reason: 'Access denied: Dealers cannot query regional or distributor scopes.',
        effectiveFilter: { dealerId: scope.dealerId },
      };
    }
    return {
      authorized: true,
      effectiveFilter: { dealerId: scope.dealerId },
    };
  }

  return { authorized: true, effectiveFilter: cleanReq };
}

function customerMatchesFilter(c: Customer, filter: DashboardHierarchyFilter): boolean {
  if (filter.region && norm(c.region) !== norm(filter.region)) return false;
  if (filter.zone && norm(c.zone || c.area) !== norm(filter.zone)) return false;
  if (filter.territory && norm(c.territory || c.city || c.town) !== norm(filter.territory)) return false;
  if (filter.town && norm(c.town || c.city) !== norm(filter.town)) return false;
  if (filter.dealerId && c.id !== filter.dealerId && c.customerCode !== filter.dealerId) return false;
  return true;
}

function customerMatchesScope(c: Customer, scope: UserDataScope): boolean {
  if (scope.isCompanyWide) return true;

  if (scope.scopeLevel === 'DEALER') {
    if (scope.dealerId && (c.id === scope.dealerId || c.customerCode === scope.dealerId)) return true;
    if (scope.email && c.email && norm(c.email) === norm(scope.email)) return true;
    return false;
  }

  if (scope.scopeLevel === 'DISTRIBUTOR') {
    if (scope.distributorId) {
      if (c.id === scope.distributorId || c.customerCode === scope.distributorId) return true;
      if ((c as any).distributorId === scope.distributorId || (c as any).parentDistributorId === scope.distributorId) return true;
    }
    if (scope.email && c.email && norm(c.email) === norm(scope.email)) return true;
    // Also permit dealers inside the distributor's explicit assigned towns if mapped
    const custTown = norm(c.town || c.city);
    if (scope.assignedTowns.length > 0 && custTown && scope.assignedTowns.some((t) => norm(t) === custTown)) {
      return c.type === 'DEALER' || c.type === 'SHOP' || c.type === 'CUSTOMER';
    }
    return false;
  }

  if (scope.scopeLevel === 'REGION') {
    return Boolean(scope.region && norm(c.region) === norm(scope.region));
  }

  if (scope.scopeLevel === 'ZONE') {
    const custZone = norm(c.zone || c.area);
    const custTown = norm(c.town || c.city);
    if (scope.zone && custZone === norm(scope.zone)) return true;
    if (scope.assignedTowns.length > 0 && custTown && scope.assignedTowns.some((t) => norm(t) === custTown)) return true;
    if (scope.region && !custZone && norm(c.region) === norm(scope.region)) return true;
    return false;
  }

  // FIELD_SALES_USER / TERRITORY scope
  if (
    scope.userId &&
    (c.assignedEmployee === scope.userId ||
      c.assignedOfficerId === scope.userId ||
      c.salesUserId === scope.userId)
  ) {
    return true;
  }
  const custTown = norm(c.town || c.city);
  if (scope.assignedTowns.length > 0 && custTown && scope.assignedTowns.some((t) => norm(t) === custTown)) {
    return true;
  }
  const custTerritory = norm(c.territory || c.town || c.city);
  if (scope.territory && custTerritory === norm(scope.territory)) {
    return true;
  }
  return false;
}

export function filterDashboardDatasetByScope(
  scope: UserDataScope,
  dataset: DashboardDataset,
  effectiveFilter: DashboardHierarchyFilter = {}
): DashboardDataset {
  const allCustomers = dataset.customers || [];
  const scopedCustomers = allCustomers.filter(
    (c) => customerMatchesScope(c, scope) && customerMatchesFilter(c, effectiveFilter)
  );
  const allowedCustomerIds = new Set<string>();
  const allowedCustomerCodes = new Set<string>();
  scopedCustomers.forEach((c) => {
    if (c.id) allowedCustomerIds.add(c.id);
    if (c.customerCode) allowedCustomerCodes.add(c.customerCode);
  });

  const hasCustomerFilterApplied = Boolean(
    !scope.isCompanyWide ||
      effectiveFilter.region ||
      effectiveFilter.zone ||
      effectiveFilter.territory ||
      effectiveFilter.town ||
      effectiveFilter.distributorId ||
      effectiveFilter.dealerId
  );

  const belongsToAllowedCustomer = (
    customerId?: string,
    customerCode?: string,
    salesUserId?: string,
    townName?: string
  ): boolean => {
    if (!hasCustomerFilterApplied) return true;
    if (customerId && allowedCustomerIds.has(customerId)) return true;
    if (customerCode && allowedCustomerCodes.has(customerCode)) return true;
    if (
      scope.scopeLevel === 'TERRITORY' &&
      !effectiveFilter.dealerId &&
      !effectiveFilter.town &&
      salesUserId &&
      scope.userId &&
      salesUserId === scope.userId
    ) {
      return true;
    }
    if (
      effectiveFilter.town &&
      townName &&
      norm(townName) === norm(effectiveFilter.town) &&
      scope.isCompanyWide
    ) {
      return true;
    }
    return false;
  };

  const orders: SalesOrder[] | undefined = dataset.orders?.filter((o) =>
    belongsToAllowedCustomer(o.customerId, o.customerCode, o.salesUserId, o.customerTown || o.town)
  );

  const invoices: Invoice[] | undefined = dataset.invoices?.filter((inv) =>
    belongsToAllowedCustomer(inv.customerId, inv.customerCode)
  );
  const allowedInvoiceIds = new Set((invoices || []).map((i) => i.id));
  const allowedInvoiceNumbers = new Set((invoices || []).map((i) => i.invoiceNumber));

  const recoveries: Recovery[] | undefined = dataset.recoveries?.filter((r) =>
    belongsToAllowedCustomer(r.customerId, r.customerCode, r.salesUserId)
  );

  const ledgerEntries = dataset.ledgerEntries?.filter((le) =>
    belongsToAllowedCustomer(le.customerId)
  );

  const dispatches: Dispatch[] | undefined = dataset.dispatches?.filter((d) => {
    if (!hasCustomerFilterApplied) return true;
    if (d.invoiceId && allowedInvoiceIds.has(d.invoiceId)) return true;
    if (d.invoiceNumber && allowedInvoiceNumbers.has(d.invoiceNumber)) return true;
    return false;
  });

  const inventoryBalances = effectiveFilter.warehouseId
    ? dataset.inventoryBalances?.filter((b) => b.warehouseId === effectiveFilter.warehouseId)
    : dataset.inventoryBalances;

  const attendanceRecords: EmployeeAttendance[] | undefined = dataset.attendanceRecords?.filter((a) => {
    if (scope.isCompanyWide) return true;
    return a.employeeId === scope.userId || a.userId === scope.userId;
  });

  const leaveRequests: LeaveRequest[] | undefined = dataset.leaveRequests?.filter((lr) => {
    if (scope.isCompanyWide) return true;
    return lr.employeeId === scope.userId;
  });

  const creditNotes = dataset.creditNotes?.filter((cn) =>
    belongsToAllowedCustomer(cn.customerId)
  );

  const stockReturns = dataset.stockReturns?.filter((sr) =>
    belongsToAllowedCustomer(sr.customerId, undefined, sr.salesUserId)
  );

  const visits = dataset.visits?.filter((v) =>
    belongsToAllowedCustomer(v.customerId, undefined, v.salesUserId, v.townName)
  );

  const targets = dataset.targets?.filter((t) => {
    if (effectiveFilter.region && t.regionName && norm(t.regionName) !== norm(effectiveFilter.region)) return false;
    if (effectiveFilter.zone && t.areaName && norm(t.areaName) !== norm(effectiveFilter.zone)) return false;
    if (effectiveFilter.territory && t.territoryName && norm(t.territoryName) !== norm(effectiveFilter.territory)) return false;
    if (effectiveFilter.town && t.townName && norm(t.townName) !== norm(effectiveFilter.town)) return false;

    if (scope.isCompanyWide) return true;
    if (scope.scopeLevel === 'DEALER' || scope.scopeLevel === 'DISTRIBUTOR') {
      return Boolean(t.customerId && allowedCustomerIds.has(t.customerId));
    }
    if (t.employeeId && t.employeeId === scope.userId) return true;
    if (scope.scopeLevel === 'TERRITORY' && t.employeeId && t.employeeId !== scope.userId) return false;
    if (scope.scopeLevel === 'REGION') {
      return Boolean(scope.region && t.regionName && norm(t.regionName) === norm(scope.region));
    }
    if (scope.scopeLevel === 'ZONE') {
      if (scope.zone && t.areaName && norm(t.areaName) === norm(scope.zone)) return true;
      if (scope.territory && t.territoryName && norm(t.territoryName) === norm(scope.territory)) return true;
      return false;
    }
    if (scope.territory && t.territoryName && norm(t.territoryName) === norm(scope.territory)) return true;
    if (
      scope.scopeLevel === 'TERRITORY' &&
      !t.employeeId &&
      t.townName &&
      scope.assignedTowns.some((at) => norm(at) === norm(t.townName))
    ) {
      return true;
    }
    return false;
  });

  const employees = dataset.employees?.filter((e) => {
    if (scope.isCompanyWide) {
      if (effectiveFilter.region && e.salesDetails?.region && norm(e.salesDetails.region) !== norm(effectiveFilter.region)) return false;
      if (effectiveFilter.zone && e.salesDetails?.area && norm(e.salesDetails.area) !== norm(effectiveFilter.zone)) return false;
      if (effectiveFilter.territory && e.salesDetails?.territory && norm(e.salesDetails.territory) !== norm(effectiveFilter.territory)) return false;
      return true;
    }
    if (e.id === scope.userId) return true;
    if (scope.scopeLevel === 'REGION') {
      return Boolean(scope.region && norm(e.salesDetails?.region) === norm(scope.region));
    }
    if (scope.scopeLevel === 'ZONE') {
      return Boolean(scope.zone && norm(e.salesDetails?.area) === norm(scope.zone));
    }
    if (scope.scopeLevel === 'TERRITORY') {
      return Boolean(scope.territory && norm(e.salesDetails?.territory) === norm(scope.territory));
    }
    return false;
  });

  return {
    ...dataset,
    customers: scopedCustomers,
    orders,
    invoices,
    recoveries,
    ledgerEntries,
    inventoryBalances,
    dispatches,
    attendanceRecords,
    leaveRequests,
    creditNotes,
    stockReturns,
    visits,
    targets,
    employees,
  };
}
