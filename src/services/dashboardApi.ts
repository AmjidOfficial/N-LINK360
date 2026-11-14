/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK-360 - Dashboard API Gateway Client
 * Calls authenticated /api/dashboard/config and /api/dashboard/summary endpoints
 * while preserving deterministic offline capability via the shared Phase 1 KPI engine.
 */

import {
  computeDashboardMetrics,
  filterDashboardDatasetByScope,
  getKarachiDateRange,
  loadLocalRoleConfigOverrides,
  resolveRoleDashboardConfig,
  resolveUserDataScope,
  saveLocalRoleConfigOverride,
  validateRequestedFilter,
} from '../lib/dashboard';
import type {
  AdminRoleConfigOverride,
  DashboardComputationResult,
  DashboardDataset,
  DashboardDatePreset,
  DashboardHierarchyFilter,
  DashboardRoleKey,
  RoleDashboardConfig,
} from '../lib/dashboard';
import type { NLinkUser } from '../data/nlink-users-team';
import { safeApiFetch } from '../lib/safeFetch';

function getAuthHeaders(): HeadersInit {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('nlink_sec_token') || '' : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchRoleDashboardConfig(
  role: string
): Promise<{ config: RoleDashboardConfig; override?: AdminRoleConfigOverride | null }> {
  const localOverrides = loadLocalRoleConfigOverrides();
  const baseConfig = resolveRoleDashboardConfig(role);
  const localOverride = localOverrides[baseConfig.roleKey] || null;

  const res = await safeApiFetch<any>(
    `/api/dashboard/config?roleKey=${encodeURIComponent(baseConfig.roleKey)}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  if (!res.isStaticFallback && res.ok && res.data?.success && res.data?.config) {
    return { config: res.data.config, override: res.data.override || localOverride };
  }

  return {
    config: resolveRoleDashboardConfig(role, localOverride),
    override: localOverride,
  };
}

export async function saveRoleDashboardConfigOverride(
  override: AdminRoleConfigOverride
): Promise<{ success: boolean; config: RoleDashboardConfig }> {
  saveLocalRoleConfigOverride(override);

  const res = await safeApiFetch<any>('/api/dashboard/config', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(override),
  });
  if (!res.isStaticFallback) {
    if (res.ok && res.data?.success && res.data?.config) {
      return { success: true, config: res.data.config };
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(res.data?.error || 'Unauthorized to modify dashboard configuration.');
    }
  }

  return {
    success: true,
    config: resolveRoleDashboardConfig(override.roleKey, override),
  };
}

export async function fetchScopedDashboardSummary(params: {
  user: Partial<NLinkUser> & { role: string };
  dataset: DashboardDataset;
  preset: DashboardDatePreset;
  customStart?: string;
  customEnd?: string;
  filter?: DashboardHierarchyFilter;
  configOverride?: AdminRoleConfigOverride | null;
}): Promise<DashboardComputationResult> {
  const { user, dataset, preset, customStart, customEnd, filter = {}, configOverride } = params;

  const userScope = resolveUserDataScope({
    id: user.id,
    email: user.email,
    role: user.role,
    region: user.region,
    zone: user.zone || user.area,
    territory: user.territory,
    assignedTowns: user.assignedTowns,
    distributorId: (user as any).distributorId,
    dealerId: (user as any).dealerId,
  });

  const validation = validateRequestedFilter(userScope, filter);
  if (!validation.authorized) {
    throw new Error(validation.reason || 'Access denied: Requested scope is outside your authorization.');
  }

  // Attempt server-authoritative computation when session token is active
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nlink_sec_token') : null;
  if (token) {
    const res = await safeApiFetch<any>('/api/dashboard/summary', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        preset,
        customStart,
        customEnd,
        filter,
        dataset,
      }),
    });
    if (!res.isStaticFallback) {
      if (res.status === 403) {
        throw new Error(res.data?.error || 'Access denied for requested hierarchy scope.');
      }
      if (res.ok && res.data?.success && res.data?.summary) {
        return res.data.summary as DashboardComputationResult;
      }
    }
  }

  // Deterministic client fallback using exact same Section 17 engine + scope boundary
  const localOverrides = loadLocalRoleConfigOverrides();
  const effectiveOverride = configOverride ?? localOverrides[userScope.dashboardRoleKey] ?? null;
  const config = resolveRoleDashboardConfig(user.role, effectiveOverride);
  const dateRange = getKarachiDateRange(preset, customStart, customEnd);
  const scopedDataset = filterDashboardDatasetByScope(userScope, dataset, validation.effectiveFilter);

  return computeDashboardMetrics({
    dataset: scopedDataset,
    dateRange,
    scope: userScope,
    config,
  });
}

export type { DashboardRoleKey };
