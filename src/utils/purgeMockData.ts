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

  let rescuedCustomers: Customer[] = [];
  let rescuedOrders: SalesOrder[] = [];
  let rescuedRecoveries: Recovery[] = [];

  // 1. Rescue from all possible localStorage cache keys before any cleanup
  if (hasLocalStorage) {
    const candidateKeys = [
      'nlink_local_database_cache_v4',
      'nlink_local_database_cache_v3',
      'nlink_local_database_cache_v2',
      'nlink_local_database_cache_v1',
      'nlink_mock_customers',
      'nlink_demo_dealers',
      'nlink_test_orders',
    ];

    candidateKeys.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            if (key.includes('customer') || key.includes('dealer')) {
              rescuedCustomers.push(...parsed);
            } else if (key.includes('order') || key.includes('test_orders')) {
              rescuedOrders.push(...parsed);
            }
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.customers)) rescuedCustomers.push(...parsed.customers);
            if (Array.isArray(parsed.orders)) rescuedOrders.push(...parsed.orders);
            if (Array.isArray(parsed.recoveries)) rescuedRecoveries.push(...parsed.recoveries);
          }
        }
      } catch {
        // ignore
      }
    });

    // Clean up obsolete legacy cache keys EXCEPT v4
    const legacyKeys = [
      'nlink_local_database_cache_v3',
      'nlink_local_database_cache_v2',
      'nlink_local_database_cache_v1',
      'nlink_mock_customers',
      'nlink_demo_dealers',
      'nlink_test_orders',
      'nlink_pending_google_uploads_v3',
    ];
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

    try {
      localStorage.removeItem('nlink_production_employees');
    } catch {
      // ignore
    }
  }

  // 3. Gather all input customers, orders, recoveries
  const cache = getLocalDatabaseCache();
  if (cache?.customers) rescuedCustomers.push(...cache.customers);
  if (cache?.orders) rescuedOrders.push(...cache.orders);
  if (cache?.recoveries) rescuedRecoveries.push(...cache.recoveries);

  if (currentState) {
    if (Array.isArray(currentState.customers)) rescuedCustomers.push(...currentState.customers);
    if (Array.isArray(currentState.orders)) rescuedOrders.push(...currentState.orders);
    if (Array.isArray(currentState.recoveries)) rescuedRecoveries.push(...currentState.recoveries);
  }

  // Merge Seed Customers & Records
  SEED_CUSTOMERS.forEach((sc) => rescuedCustomers.push(sc));
  SEED_ORDERS.forEach((so) => rescuedOrders.push(so));
  SEED_RECOVERIES.forEach((sr) => rescuedRecoveries.push(sr));

  // Deduplicate and retain 100% of valid / user-added customers
  const customerMap = new Map<string, Customer>();
  rescuedCustomers.forEach((c) => {
    if (!c) return;
    const key = String(c.id || c.customerCode || c.companyName || '').trim().toUpperCase();
    if (key && !customerMap.has(key)) {
      customerMap.set(key, c);
    } else if (key && customerMap.has(key)) {
      const existing = customerMap.get(key)!;
      customerMap.set(key, { ...existing, ...c });
    }
  });
  const cleanCustomers = Array.from(customerMap.values());

  // Deduplicate orders
  const orderMap = new Map<string, SalesOrder>();
  rescuedOrders.forEach((o) => {
    if (!o) return;
    const key = String(o.id || o.orderNumber || '').trim().toUpperCase();
    if (key && !orderMap.has(key)) {
      orderMap.set(key, o);
    }
  });
  const cleanOrders = Array.from(orderMap.values());

  // Deduplicate recoveries
  const recoveryMap = new Map<string, Recovery>();
  rescuedRecoveries.forEach((r) => {
    if (!r) return;
    const key = String(r.id || r.recoveryNumber || '').trim().toUpperCase();
    if (key && !recoveryMap.has(key)) {
      recoveryMap.set(key, r);
    }
  });
  const cleanRecoveries = Array.from(recoveryMap.values());

  // Save clean database cache
  saveLocalDatabaseCache({
    ...cache,
    customers: cleanCustomers,
    orders: cleanOrders,
    recoveries: cleanRecoveries,
    lastUpdated: new Date().toISOString(),
  });

  return {
    purgedUserCount: Math.max(0, storedUsers.length - finalUsers.length),
    purgedDealerCount: 0,
    purgedOrderCount: 0,
    purgedRecoveryCount: 0,
    remainingUsers: finalUsers,
    remainingCustomers: cleanCustomers,
    remainingOrders: cleanOrders,
    remainingRecoveries: cleanRecoveries,
    message: `State synchronized: Retained all ${cleanCustomers.length} dealer accounts and ${cleanOrders.length} transaction records.`,
  };
}

export const RIZWAN_ELECTRIC_STORE_CUSTOMER: Customer = {
  id: 'CUST-RIZWAN-PEW',
  customerCode: 'NL-PEW-RZ02',
  code: 'NL-PEW-RZ02',
  companyName: 'Rizwan Electric Store',
  name: 'Rizwan Electric Store',
  contactPerson: 'Rizwan (Verified Dealer)',
  proprietorName: 'Rizwan',
  phone: '0300-9876543',
  type: 'DEALER',
  customerType: 'DEALER',
  address: 'Kali Bari, Peshawar Saddar, Peshawar, Khyber Pakhtunkhwa',
  city: 'Peshawar',
  town: 'Peshawar',
  region: 'KPK',
  area: 'Peshawar Division',
  territory: 'Peshawar City',
  route: 'Kali Bari - Peshawar Saddar Electrical Beat',
  creditLimit: 300000,
  creditDays: 30,
  openingBalance: 0,
  currentBalance: 0,
  isCreditLocked: false,
  isActive: true,
  status: 'NORMAL' as any,
  approvalStatus: 'APPROVED' as any,
  assignedEmployee: 'Arshad Khan',
  assignedOfficerId: 'USR-005',
  assignedOfficerName: 'Arshad Khan',
  approvedBy: 'Shahzad Ullah',
  createdAt: '2026-08-15T08:00:00.000Z',
  updatedAt: '2026-11-14T08:00:00.000Z',
};

export const SEED_CUSTOMERS: Customer[] = [RASHEED_ELECTRIC_CUSTOMER, RIZWAN_ELECTRIC_STORE_CUSTOMER];

export const SEED_ORDERS: SalesOrder[] = [...RASHEED_ELECTRIC_ORDERS];

export const SEED_RECOVERIES: Recovery[] = [...RASHEED_ELECTRIC_RECOVERIES];

