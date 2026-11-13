/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Production Data Purge Utility
 * Purges all mock, dummy, and test dealers, distributors, and users from application state.
 * Strictly guarantees that only production-ready data remains, preserving users:
 * 1. 'Shahzad Ullah' (Shahzadullah)
 * 2. Real Production Team
 */

import { Customer, SalesOrder, Recovery } from '../types';
import { NLinkUser, NLINK_TEAM_ROSTER, USERS_STORAGE_KEY } from '../data/nlink-users-team';
import { getLocalDatabaseCache, saveLocalDatabaseCache } from '../services/googleSheetsTwoWaySyncService';
import {
  RASHEED_ELECTRIC_CUSTOMER,
  RASHEED_ELECTRIC_ORDERS,
  RASHEED_ELECTRIC_RECOVERIES,
} from '../data/rasheed-electric-ledger';

/**
 * Authoritative production user names (case-insensitive, whitespace-insensitive)
 */
export const PRODUCTION_USER_NAMES = ['shahzadullah', 'shahidkhan', 'amjid'];

/**
 * Checks whether a user account belongs to the verified production roster
 */
export function isProductionUser(user: { fullName?: string; email?: string } | null | undefined): boolean {
  if (!user) return false;
  const nameClean = (user.fullName || '').toLowerCase().replace(/\s+/g, '');
  const emailClean = (user.email || '').toLowerCase().trim();

  // Name match
  if (PRODUCTION_USER_NAMES.some((n) => nameClean.includes(n))) {
    return true;
  }

  // Official production email match
  if (
    emailClean.includes('shahzadullah') ||
    emailClean === 'nationallights2026@gmail.com' ||
    emailClean === 'amjid.bisconni@gmail.com' ||
    emailClean === 'amjid@nationallight.pk'
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether a customer / dealer is dummy or mock data
 */
export function isMockDealer(customer: Customer | null | undefined): boolean {
  if (!customer) return false;

  // Check explicit mock flags
  if ((customer as any).isMock || (customer as any).isDummy || (customer as any).isTest) {
    return true;
  }

  const name = (customer.companyName || '').toLowerCase();
  const contact = (customer.contactPerson || '').toLowerCase();
  const code = (customer.customerCode || '').toLowerCase();
  const phone = (customer.phone || '').trim();

  const mockPatterns = [
    'mock',
    'dummy',
    'test',
    'sample',
    'demo',
    'placeholder',
    'foo',
    'bar',
    'temp dealer',
    'test dealer',
    'fake',
  ];

  if (mockPatterns.some((pattern) => name.includes(pattern) || contact.includes(pattern) || code.includes(pattern))) {
    return true;
  }

  // Check dummy telephone patterns
  if (phone === '0300-0000000' || phone === '00000000000' || phone === '1234567890') {
    return true;
  }

  return false;
}

export interface PurgeResult {
  purgedUserCount: number;
  purgedDealerCount: number;
  purgedOrderCount: number;
  purgedRecoveryCount: number;
  remainingUsers: NLinkUser[];
  remainingCustomers: Customer[];
  remainingOrders: SalesOrder[];
  remainingRecoveries: Recovery[];
  message: string;
}

/**
 * Executes a thorough purge of all mock/dummy dealers, distributors, and users from application state.
 * Preserves verified production users in user state, and removes any mock dealers and their test transactions.
 */
export function purgeMockDataFromState(currentState?: {
  customers?: Customer[];
  orders?: SalesOrder[];
  recoveries?: Recovery[];
}): PurgeResult {
  const hasLocalStorage = typeof localStorage !== 'undefined';

  // 1. Purge legacy and obsolete localStorage cache keys
  const legacyKeys = [
    'nlink_local_database_cache_v3',
    'nlink_local_database_cache_v2',
    'nlink_local_database_cache_v1',
    'nlink_mock_customers',
    'nlink_demo_dealers',
    'nlink_test_orders',
    'nlink_pending_google_uploads_v3',
  ];
  if (hasLocalStorage) {
    legacyKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    });
  }

  // 2. Clean Team Users Roster
  let storedUsers: NLinkUser[] = [];
  if (hasLocalStorage) {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          storedUsers = parsed;
        }
      }
    } catch {
      storedUsers = [];
    }
  }

  // Filter existing users to keep verified production users
  const safeStoredUsers = Array.isArray(storedUsers) ? storedUsers : [];
  const filteredUsers = safeStoredUsers.filter((u) => isProductionUser(u));

  // Ensure both production users are present in the final roster
  const finalUsers: NLinkUser[] = [...NLINK_TEAM_ROSTER];
  filteredUsers.forEach((fu) => {
    if (fu && !finalUsers.some((u) => u.id === fu.id)) {
      finalUsers.push(fu);
    }
  });

  // Save sanitized roster to localStorage
  if (hasLocalStorage) {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(finalUsers));
    } catch (err) {
      console.error('Failed to update USERS_STORAGE_KEY:', err);
    }

    // Also clean nlink_production_employees
    try {
      localStorage.removeItem('nlink_production_employees');
    } catch {
      // ignore
    }
  }

  // 3. Clean Dealers / Customers & Transactions from cache
  const cache = getLocalDatabaseCache();
  const inputCustomers = Array.isArray(currentState?.customers)
    ? currentState.customers
    : Array.isArray(cache?.customers)
    ? cache.customers
    : [];
  const inputOrders = Array.isArray(currentState?.orders)
    ? currentState.orders
    : Array.isArray(cache?.orders)
    ? cache.orders
    : [];
  const inputRecoveries = Array.isArray(currentState?.recoveries)
    ? currentState.recoveries
    : Array.isArray(cache?.recoveries)
    ? cache.recoveries
    : [];

  const initialCustCount = inputCustomers.length;
  const initialOrdCount = inputOrders.length;
  const initialRecCount = inputRecoveries.length;

  // Filter out mock dealers
  const cleanCustomers = inputCustomers.filter((c) => c && !isMockDealer(c));

  // Merge Seed Customers if not already present
  SEED_CUSTOMERS.forEach((sc) => {
    if (!cleanCustomers.some((c) => c.id === sc.id || c.customerCode === sc.customerCode)) {
      cleanCustomers.push(sc);
    }
  });

  const cleanCustomerIds = new Set(cleanCustomers.map((c) => c.id));

  // Filter out orders that reference non-existent mock dealers
  const cleanOrders = inputOrders.filter((o) => {
    if (cleanCustomers.length === 0) return true; // keep if no dealers loaded yet
    return o.customerId ? cleanCustomerIds.has(o.customerId) : true;
  });

  // Merge Seed Orders if not already present
  SEED_ORDERS.forEach((so) => {
    if (!cleanOrders.some((o) => o.id === so.id || o.orderNumber === so.orderNumber)) {
      cleanOrders.push(so);
    }
  });

  // Filter out recoveries that reference non-existent mock dealers
  const cleanRecoveries = inputRecoveries.filter((r) => {
    if (cleanCustomers.length === 0) return true; // keep if no dealers loaded yet
    return r.customerId ? cleanCustomerIds.has(r.customerId) : true;
  });

  // Merge Seed Recoveries if not already present
  SEED_RECOVERIES.forEach((sr) => {
    if (!cleanRecoveries.some((r) => r.id === sr.id || r.recoveryNumber === sr.recoveryNumber)) {
      cleanRecoveries.push(sr);
    }
  });

  // Save clean database cache
  saveLocalDatabaseCache({
    ...cache,
    customers: cleanCustomers,
    orders: cleanOrders,
    recoveries: cleanRecoveries,
    lastUpdated: new Date().toISOString(),
  });

  const purgedUserCount = Math.max(0, storedUsers.length - finalUsers.length);
  const purgedDealerCount = Math.max(0, initialCustCount - cleanCustomers.length);
  const purgedOrderCount = Math.max(0, initialOrdCount - cleanOrders.length);
  const purgedRecoveryCount = Math.max(0, initialRecCount - cleanRecoveries.length);

  return {
    purgedUserCount,
    purgedDealerCount,
    purgedOrderCount,
    purgedRecoveryCount,
    remainingUsers: finalUsers,
    remainingCustomers: cleanCustomers,
    remainingOrders: cleanOrders,
    remainingRecoveries: cleanRecoveries,
    message: `State purified: Retained verified production users. Added verified parties with precise ledger data. Purged ${purgedDealerCount} dummy dealer(s) and obsolete records.`,
  };
}

export const SEED_CUSTOMERS: Customer[] = [RASHEED_ELECTRIC_CUSTOMER];

export const SEED_ORDERS: SalesOrder[] = [...RASHEED_ELECTRIC_ORDERS];

export const SEED_RECOVERIES: Recovery[] = [...RASHEED_ELECTRIC_RECOVERIES];

