/**
 * N-LINK-360 canonical role, department and dashboard-preview model.
 *
 * Persisted legacy roles are normalized at the application boundary.
 * This module does not rewrite users, customer types or historical records.
 */
export type CanonicalRole =
  | 'SUPER_ADMIN' | 'TOP_MANAGEMENT' | 'NSM' | 'RSM' | 'ZSM'
  | 'SALES_OFFICER' | 'TRADE_PARTNER' | 'ACCOUNTS' | 'WAREHOUSE'
  | 'FACTORY' | 'DISPATCH' | 'HR';

export type Department =
  | 'EXECUTIVE' | 'SALES' | 'TRADE' | 'FINANCE'
  | 'WAREHOUSE' | 'MANUFACTURING' | 'LOGISTICS' | 'HR';

export type OrganisationScope =
  | 'COMPANY' | 'NATIONAL' | 'REGION' | 'ZONE'
  | 'TERRITORY' | 'ASSIGNED_CUSTOMERS' | 'DEPARTMENT';

export type TradePartnerType = 'DEALER' | 'DISTRIBUTOR';

const ROLE_ALIASES: Readonly<Record<string, CanonicalRole>> = {
  SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'SUPER_ADMIN',
  MANAGEMENT: 'TOP_MANAGEMENT', MD: 'TOP_MANAGEMENT',
  MD_EXECUTIVE: 'TOP_MANAGEMENT', TOP_MANAGEMENT: 'TOP_MANAGEMENT',
  NSM: 'NSM', NATIONAL_MANAGER: 'NSM', NATIONAL_SALES_MANAGER: 'NSM',
  RSM: 'RSM', REGIONAL_MANAGER: 'RSM', REGIONAL_SALES_MANAGER: 'RSM',
  ZSM: 'ZSM', ZONAL_MANAGER: 'ZSM', ZONAL_SALES_MANAGER: 'ZSM',
  TSM: 'SALES_OFFICER', SALES_OFFICER: 'SALES_OFFICER',
  ASM: 'SALES_OFFICER', SS: 'SALES_OFFICER', OB: 'SALES_OFFICER',
  ORDER_BOOKER: 'SALES_OFFICER', RECOVERY_OFFICER: 'SALES_OFFICER',
  SALES_RECOVERY: 'SALES_OFFICER', FIELD_SALES_USER: 'SALES_OFFICER',
  DEALER: 'TRADE_PARTNER', DISTRIBUTOR: 'TRADE_PARTNER',
  TRADE_PARTNER: 'TRADE_PARTNER',
  ACCOUNTS: 'ACCOUNTS', FINANCE: 'ACCOUNTS',
  ACCOUNTS_MANAGER: 'ACCOUNTS', FINANCE_MANAGER: 'ACCOUNTS',
  WAREHOUSE: 'WAREHOUSE', WAREHOUSE_MANAGER: 'WAREHOUSE',
  FACTORY: 'FACTORY', FACTORY_MANAGER: 'FACTORY',
  PRODUCTION: 'FACTORY', PRODUCTION_MANAGER: 'FACTORY',
  DISPATCH: 'DISPATCH', DISPATCH_OFFICER: 'DISPATCH',
  LOGISTICS: 'DISPATCH', LOGISTICS_MANAGER: 'DISPATCH',
  HR: 'HR', HR_ADMIN: 'HR', HR_MANAGER: 'HR',
};

const ROLE_DEPARTMENT: Readonly<Record<CanonicalRole, Department>> = {
  SUPER_ADMIN: 'EXECUTIVE', TOP_MANAGEMENT: 'EXECUTIVE',
  NSM: 'SALES', RSM: 'SALES', ZSM: 'SALES', SALES_OFFICER: 'SALES',
  TRADE_PARTNER: 'TRADE', ACCOUNTS: 'FINANCE', WAREHOUSE: 'WAREHOUSE',
  FACTORY: 'MANUFACTURING', DISPATCH: 'LOGISTICS', HR: 'HR',
};

const ROLE_SCOPE: Readonly<Record<CanonicalRole, OrganisationScope>> = {
  SUPER_ADMIN: 'COMPANY', TOP_MANAGEMENT: 'COMPANY', NSM: 'NATIONAL',
  RSM: 'REGION', ZSM: 'ZONE', SALES_OFFICER: 'TERRITORY',
  TRADE_PARTNER: 'ASSIGNED_CUSTOMERS', ACCOUNTS: 'DEPARTMENT',
  WAREHOUSE: 'DEPARTMENT', FACTORY: 'DEPARTMENT',
  DISPATCH: 'DEPARTMENT', HR: 'DEPARTMENT',
};

export function normalizeRole(role: unknown): CanonicalRole | null {
  const key = String(role ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  return ROLE_ALIASES[key] ?? null;
}

export function getDepartmentForRole(role: unknown): Department | null {
  const canonical = normalizeRole(role);
  return canonical ? ROLE_DEPARTMENT[canonical] : null;
}

export function getDefaultScopeForRole(role: unknown): OrganisationScope | null {
  const canonical = normalizeRole(role);
  return canonical ? ROLE_SCOPE[canonical] : null;
}

/** Preserve Dealer/Distributor as customer classification, not login role. */
export function normalizeTradePartnerType(value: unknown): TradePartnerType | null {
  const key = String(value ?? '').trim().toUpperCase();
  return key === 'DEALER' || key === 'DISTRIBUTOR' ? key : null;
}

export interface DashboardPreviewRequest {
  actorRole: unknown;
  actorScope: OrganisationScope;
  requestedRole: unknown;
  requestedScope: OrganisationScope;
}

/**
 * UI preview authorization only. The server must independently enforce
 * permissions and RLS. Preview must never impersonate a user or widen scope.
 */
export function canPreviewDashboard(request: DashboardPreviewRequest): boolean {
  const actor = normalizeRole(request.actorRole);
  const target = normalizeRole(request.requestedRole);
  if (!actor || !target) return false;

  if (actor === 'SUPER_ADMIN' || actor === 'TOP_MANAGEMENT') {
    return request.actorScope === 'COMPANY';
  }

  // NSM may preview only the national sales and trade reporting chain.
  if (actor !== 'NSM') return false;
  const allowedTargets: CanonicalRole[] = [
    'NSM', 'RSM', 'ZSM', 'SALES_OFFICER', 'TRADE_PARTNER',
  ];
  if (!allowedTargets.includes(target)) return false;

  const rank: Partial<Record<OrganisationScope, number>> = {
    COMPANY: 0, NATIONAL: 1, REGION: 2, ZONE: 3,
    TERRITORY: 4, ASSIGNED_CUSTOMERS: 5,
  };
  const actorRank = rank[request.actorScope];
  const targetRank = rank[request.requestedScope];
  if (actorRank === undefined || targetRank === undefined) return false;
  return targetRank >= actorRank;
}

export function isReadOnlyDashboardPreview(previewMode: boolean): boolean {
  return previewMode;
}
