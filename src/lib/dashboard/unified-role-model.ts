/**
 * N-LINK-360 unified identity and dashboard model.
 *
 * This module is the migration target for role and dashboard consolidation.
 * It deliberately does not rewrite persisted user roles or customer types.
 * Keep legacy values at the data boundary and normalize them for presentation.
 */

export type CanonicalRole =
  | 'SUPER_ADMIN'
  | 'TOP_MANAGEMENT'
  | 'NSM'
  | 'RSM'
  | 'ZSM'
  | 'SALES_OFFICER'
  | 'TRADE_PARTNER'
  | 'ACCOUNTS'
  | 'WAREHOUSE'
  | 'FACTORY'
  | 'DISPATCH'
  | 'HR';

export type Department =
  | 'EXECUTIVE'
  | 'SALES'
  | 'TRADE'
  | 'FINANCE'
  | 'WAREHOUSE'
  | 'MANUFACTURING'
  | 'LOGISTICS'
  | 'HR';

export type OrganisationScope =
  | 'COMPANY'
  | 'NATIONAL'
  | 'REGION'
  | 'ZONE'
  | 'TERRITORY'
  | 'ASSIGNED_CUSTOMERS'
  | 'DEPARTMENT';

export type TradePartnerType = 'DEALER' | 'DISTRIBUTOR';

const ROLE_ALIASES: Record<string, CanonicalRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'SUPER_ADMIN',
  MANAGEMENT: 'TOP_MANAGEMENT',
  MD: 'TOP_MANAGEMENT',
  MD_EXECUTIVE: 'TOP_MANAGEMENT',
  TOP_MANAGEMENT: 'TOP_MANAGEMENT',
  NSM: 'NSM',
  NATIONAL_MANAGER: 'NSM',
  RSM: 'RSM',
  REGIONAL_MANAGER: 'RSM',
  ZSM: 'ZSM',
  ZONAL_MANAGER: 'ZSM',
  TSM: 'SALES_OFFICER',
  ASM: 'SALES_OFFICER',
  SS: 'SALES_OFFICER',
  OB: 'SALES_OFFICER',
  SALES_RECOVERY: 'SALES_OFFICER',
  FIELD_SALES_USER: 'SALES_OFFICER',
  SALES_OFFICER: 'SALES_OFFICER',
  DEALER: 'TRADE_PARTNER',
  DISTRIBUTOR: 'TRADE_PARTNER',
  TRADE_PARTNER: 'TRADE_PARTNER',
  ACCOUNTS: 'ACCOUNTS',
  FINANCE: 'ACCOUNTS',
  WAREHOUSE: 'WAREHOUSE',
  WAREHOUSE_MANAGER: 'WAREHOUSE',
  FACTORY: 'FACTORY',
  FACTORY_MANAGER: 'FACTORY',
  DISPATCH: 'DISPATCH',
  DISPATCH_OFFICER: 'DISPATCH',
  HR: 'HR',
  HR_ADMIN: 'HR',
};

const ROLE_DEPARTMENT: Record<CanonicalRole, Department> = {
  SUPER_ADMIN: 'EXECUTIVE',
  TOP_MANAGEMENT: 'EXECUTIVE',
  NSM: 'SALES',
  RSM: 'SALES',
  ZSM: 'SALES',
  SALES_OFFICER: 'SALES',
  TRADE_PARTNER: 'TRADE',
  ACCOUNTS: 'FINANCE',
  WAREHOUSE: 'WAREHOUSE',
  FACTORY: 'MANUFACTURING',
  DISPATCH: 'LOGISTICS',
  HR: 'HR',
};

const ROLE_SCOPE: Record<CanonicalRole, OrganisationScope> = {
  SUPER_ADMIN: 'COMPANY',
  TOP_MANAGEMENT: 'COMPANY',
  NSM: 'NATIONAL',
  RSM: 'REGION',
  ZSM: 'ZONE',
  SALES_OFFICER: 'TERRITORY',
  TRADE_PARTNER: 'ASSIGNED_CUSTOMERS',
  ACCOUNTS: 'DEPARTMENT',
  WAREHOUSE: 'DEPARTMENT',
  FACTORY: 'DEPARTMENT',
  DISPATCH: 'DEPARTMENT',
  HR: 'DEPARTMENT',
};

export function normalizeRole(role: unknown): CanonicalRole | null {
  const key = String(role ?? '').trim().toUpperCase();
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

/**
 * Keep the dealer/distributor distinction as a customer attribute.
 * Do not rewrite customer records when normalizing the login role.
 */
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
 * Preview is a read-only presentation mode. It can never widen the actor's
 * data scope. The caller must still apply server-side row-level security.
 */
export function canPreviewDashboard(request: DashboardPreviewRequest): boolean {
  const actor = normalizeRole(request.actorRole);
  const target = normalizeRole(request.requestedRole);
  if (!actor || !target) return false;

  const previewRoles: CanonicalRole[] = [
    'SUPER_ADMIN',
    'TOP_MANAGEMENT',
    'NSM',
  ];
  if (!previewRoles.includes(actor)) return false;

  const scopeRank: Record<OrganisationScope, number> = {
    COMPANY: 0,
    NATIONAL: 1,
    REGION: 2,
    ZONE: 3,
    TERRITORY: 4,
    ASSIGNED_CUSTOMERS: 5,
    DEPARTMENT: 6,
  };

  // A preview can simulate a narrower scope, never a wider one.
  return scopeRank[request.requestedScope] >= scopeRank[request.actorScope];
}

export function isReadOnlyDashboardPreview(isPreview: boolean): boolean {
  return isPreview;
}
