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

/**
 * Authoritative production user names (case-insensitive, whitespace-insensitive)
 */
export const PRODUCTION_USER_NAMES = ['shahzadullah', 'shahidkhan'];

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
    
    emailClean === 'nationallights2026@gmail.com'
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
        storedUsers = JSON.parse(raw);
      }
    } catch {
      storedUsers = [];
    }
  }

  // Filter existing users to keep verified production users
  const filteredUsers = storedUsers.filter((u) => isProductionUser(u));

  // Ensure both production users are present in the final roster
  const finalUsers: NLinkUser[] = [...NLINK_TEAM_ROSTER];
  filteredUsers.forEach((fu) => {
    if (!finalUsers.some((u) => u.id === fu.id)) {
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
  const inputCustomers = currentState?.customers || cache.customers || [];
  const inputOrders = currentState?.orders || cache.orders || [];
  const inputRecoveries = currentState?.recoveries || cache.recoveries || [];

  const initialCustCount = inputCustomers.length;
  const initialOrdCount = inputOrders.length;
  const initialRecCount = inputRecoveries.length;

  // Filter out mock dealers
  const cleanCustomers = inputCustomers.filter((c) => !isMockDealer(c));

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

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-iqbal',
    customerCode: 'DL-IQBAL',
    companyName: 'Iqbal Electric',
    contactPerson: 'Iqbal Ahmad',
    phone: '',
    type: 'DEALER',
    address: 'Main Bazaar, Mingora, Swat',
    city: 'Mingora',
    region: 'KPK',
    creditLimit: 500000,
    creditDays: 30,
    openingBalance: 86641,
    currentBalance: 81641,
    isCreditLocked: false,
    isActive: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
    town: 'Mingora',
    assignedOfficerId: 'USR-002',
    assignedOfficerName: 'Shahid Khan',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan'
  },
  {
    id: 'cust-sharafat',
    customerCode: 'DL-SHARAFAT',
    companyName: 'Sharafat Traders',
    contactPerson: 'Sharafat Khan',
    phone: '',
    type: 'DEALER',
    address: 'General Bus Stand Road, Mingora, Swat',
    city: 'Mingora',
    region: 'KPK',
    creditLimit: 1000000,
    creditDays: 30,
    openingBalance: 0,
    currentBalance: 454171,
    isCreditLocked: false,
    isActive: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
    town: 'Mingora',
    assignedOfficerId: 'USR-002',
    assignedOfficerName: 'Shahid Khan',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan'
  },
  {
    id: 'cust-mingora-elec',
    customerCode: 'DL-MINGORA-EST',
    companyName: 'Mingora Electric Store',
    contactPerson: 'Sajid Ali',
    phone: '',
    type: 'DEALER',
    address: 'Main GT Road, Mingora, Swat',
    city: 'Mingora',
    region: 'KPK',
    creditLimit: 800000,
    creditDays: 30,
    openingBalance: 342833,
    currentBalance: 309393,
    isCreditLocked: false,
    isActive: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
    town: 'Mingora',
    assignedOfficerId: 'USR-002',
    assignedOfficerName: 'Shahid Khan',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan'
  },
  {
    id: 'cust-ziyad',
    customerCode: 'DL-ZIYAD',
    companyName: 'Ziyad Electric',
    contactPerson: 'Ziyad Khan',
    phone: '03499255567',
    type: 'DEALER',
    address: 'Main Bazar, Mingora, Swat',
    city: 'Mingora',
    region: 'KPK',
    creditLimit: 600000,
    creditDays: 30,
    openingBalance: 0,
    currentBalance: 247456,
    isCreditLocked: false,
    isActive: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
    town: 'Mingora',
    assignedOfficerId: 'USR-002',
    assignedOfficerName: 'Shahid Khan',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan'
  },
  {
    id: 'cust-rasheed',
    customerCode: 'DL-RASHEED',
    companyName: 'Rasheed Electric',
    contactPerson: 'Rasheed Ahmad',
    phone: '03008543210',
    type: 'DEALER',
    address: 'Main Bazaar, Duran Pur, Peshawar, KPK',
    city: 'Peshawar',
    region: 'KPK',
    creditLimit: 600000,
    creditDays: 30,
    openingBalance: 0,
    currentBalance: 212704,
    isCreditLocked: false,
    isActive: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
    town: 'Duran Pur',
    assignedOfficerId: 'USR-002',
    assignedOfficerName: 'Shahid Khan',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan'
  }
];

export const SEED_ORDERS: SalesOrder[] = [
  {
    id: 'ord-sharafat-01',
    orderNumber: 'SO-4001',
    customerId: 'cust-sharafat',
    customerName: 'Sharafat Traders',
    customerCode: 'DL-SHARAFAT',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    orderDate: '2026-08-25',
    status: 'APPROVED',
    items: [],
    subtotal: 462267,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 462267,
    creditCheckStatus: 'GREEN',
    approvedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-08-25T10:00:00.000Z'
  },
  {
    id: 'ord-sharafat-02',
    orderNumber: 'SO-4033',
    customerId: 'cust-sharafat',
    customerName: 'Sharafat Traders',
    customerCode: 'DL-SHARAFAT',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    orderDate: '2026-09-15',
    status: 'APPROVED',
    items: [],
    subtotal: 41904,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 41904,
    creditCheckStatus: 'GREEN',
    approvedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-09-15T11:00:00.000Z'
  },
  {
    id: 'ord-mingora-01',
    orderNumber: 'SO-4032',
    customerId: 'cust-mingora-elec',
    customerName: 'Mingora Electric Store',
    customerCode: 'DL-MINGORA-EST',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    orderDate: '2026-09-15',
    status: 'APPROVED',
    items: [],
    subtotal: 46560,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 46560,
    creditCheckStatus: 'GREEN',
    approvedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-09-15T10:30:00.000Z'
  },
  {
    id: 'ord-ziyad-01',
    orderNumber: 'SO-2001',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    orderDate: '2026-07-03',
    status: 'APPROVED',
    items: [],
    subtotal: 128056,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 128056,
    creditCheckStatus: 'GREEN',
    approvedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-07-03T09:00:00.000Z'
  },
  {
    id: 'ord-ziyad-02',
    orderNumber: 'SO-2114',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    orderDate: '2026-08-05',
    status: 'APPROVED',
    items: [],
    subtotal: 99570,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 99570,
    creditCheckStatus: 'GREEN',
    approvedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-08-05T10:00:00.000Z'
  },
  {
    id: 'ord-ziyad-03',
    orderNumber: 'SO-2116',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    orderDate: '2026-08-05',
    status: 'APPROVED',
    items: [],
    subtotal: 25390,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 25390,
    creditCheckStatus: 'GREEN',
    approvedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-08-05T14:00:00.000Z'
  },
  {
    id: 'ord-ziyad-04',
    orderNumber: 'SO-4651',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    orderDate: '2026-09-14',
    status: 'APPROVED',
    items: [],
    subtotal: 122440,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 122440,
    creditCheckStatus: 'GREEN',
    approvedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-09-14T11:00:00.000Z'
  },
  {
    id: 'ord-rasheed-01',
    orderNumber: 'INV-2116',
    customerId: 'cust-rasheed',
    customerName: 'Rasheed Electric',
    customerCode: 'DL-RASHEED',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    orderDate: '2026-08-06',
    status: 'APPROVED',
    items: [],
    subtotal: 322204,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 322204,
    creditCheckStatus: 'GREEN',
    approvedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-08-06T09:00:00.000Z'
  }
];

export const SEED_RECOVERIES: Recovery[] = [
  {
    id: 'rec-iqbal-01',
    recoveryNumber: 'RC-1001',
    customerId: 'cust-iqbal',
    customerName: 'Iqbal Electric',
    customerCode: 'DL-IQBAL',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-09-15',
    amount: 5000,
    paymentMode: 'CASH',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-09-15T15:00:00.000Z'
  },
  {
    id: 'rec-sharafat-01',
    recoveryNumber: 'RC-1002',
    customerId: 'cust-sharafat',
    customerName: 'Sharafat Traders',
    customerCode: 'DL-SHARAFAT',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-09-14',
    amount: 50000,
    paymentMode: 'ONLINE_TRANSFER',
    instrumentNumber: 'Bank Online',
    bankName: 'Meezan Bank Ltd',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-09-14T16:00:00.000Z'
  },
  {
    id: 'rec-mingora-01',
    recoveryNumber: 'RC-1003',
    customerId: 'cust-mingora-elec',
    customerName: 'Mingora Electric Store',
    customerCode: 'DL-MINGORA-EST',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-09-07',
    amount: 40000,
    paymentMode: 'CASH',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-09-07T12:00:00.000Z'
  },
  {
    id: 'rec-mingora-02',
    recoveryNumber: 'RC-1004',
    customerId: 'cust-mingora-elec',
    customerName: 'Mingora Electric Store',
    customerCode: 'DL-MINGORA-EST',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-09-15',
    amount: 40000,
    paymentMode: 'CASH',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-09-15T14:30:00.000Z'
  },
  {
    id: 'rec-ziyad-01',
    recoveryNumber: 'RC-2001',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-07-03',
    amount: 15000,
    paymentMode: 'CASH',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-07-03T10:00:00.000Z'
  },
  {
    id: 'rec-ziyad-02',
    recoveryNumber: 'RC-2002',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-07-09',
    amount: 8000,
    paymentMode: 'CASH',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-07-09T10:00:00.000Z'
  },
  {
    id: 'rec-ziyad-03',
    recoveryNumber: 'RC-2003',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-07-17',
    amount: 8000,
    paymentMode: 'CASH',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-07-17T11:00:00.000Z'
  },
  {
    id: 'rec-ziyad-04',
    recoveryNumber: 'RC-2004',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-07-24',
    amount: 8000,
    paymentMode: 'CASH',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-07-24T11:00:00.000Z'
  },
  {
    id: 'rec-ziyad-05',
    recoveryNumber: 'RC-2005',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-07-30',
    amount: 8000,
    paymentMode: 'CASH',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-07-30T12:00:00.000Z'
  },
  {
    id: 'rec-ziyad-06',
    recoveryNumber: 'RC-2006',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-08-05',
    amount: 20000,
    paymentMode: 'CASH',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-08-05T11:00:00.000Z'
  },
  {
    id: 'rec-ziyad-07',
    recoveryNumber: 'RC-2007',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-08-15',
    amount: 11000,
    paymentMode: 'CASH',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-08-15T10:00:00.000Z'
  },
  {
    id: 'rec-ziyad-08',
    recoveryNumber: 'RC-2008',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-08-29',
    amount: 15000,
    paymentMode: 'ONLINE_TRANSFER',
    instrumentNumber: 'Bank Online',
    bankName: 'Meezan Bank Ltd',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-08-29T10:00:00.000Z'
  },
  {
    id: 'rec-ziyad-09',
    recoveryNumber: 'RC-2009',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-09-02',
    amount: 15000,
    paymentMode: 'CASH',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-09-02T10:00:00.000Z'
  },
  {
    id: 'rec-ziyad-10',
    recoveryNumber: 'RC-2010',
    customerId: 'cust-ziyad',
    customerName: 'Ziyad Electric',
    customerCode: 'DL-ZIYAD',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-09-15',
    amount: 20000,
    paymentMode: 'CASH',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-09-15T15:30:00.000Z'
  },
  {
    id: 'rec-rasheed-01',
    recoveryNumber: 'RC-8001',
    customerId: 'cust-rasheed',
    customerName: 'Rasheed Electric',
    customerCode: 'DL-RASHEED',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-08-06',
    amount: 30000,
    paymentMode: 'ONLINE_TRANSFER',
    instrumentNumber: 'EasyPaisa Mobile',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-08-06T12:00:00.000Z'
  },
  {
    id: 'rec-rasheed-02',
    recoveryNumber: 'RC-8002',
    customerId: 'cust-rasheed',
    customerName: 'Rasheed Electric',
    customerCode: 'DL-RASHEED',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-08-13',
    amount: 30000,
    paymentMode: 'ONLINE_TRANSFER',
    instrumentNumber: 'HBL Bank - Shahzad Account',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-08-13T12:00:00.000Z'
  },
  {
    id: 'rec-rasheed-03',
    recoveryNumber: 'RC-8003',
    customerId: 'cust-rasheed',
    customerName: 'Rasheed Electric',
    customerCode: 'DL-RASHEED',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-08-20',
    amount: 30000,
    paymentMode: 'CASH',
    instrumentNumber: 'Online Cash - Shahzad',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-08-20T12:00:00.000Z'
  },
  {
    id: 'rec-rasheed-04',
    recoveryNumber: 'RC-8004',
    customerId: 'cust-rasheed',
    customerName: 'Rasheed Electric',
    customerCode: 'DL-RASHEED',
    salesUserId: 'USR-002',
    salesUserName: 'Shahid Khan',
    collectionDate: '2026-08-30',
    amount: 19500,
    paymentMode: 'ONLINE_TRANSFER',
    instrumentNumber: 'Meezan Bank - Online to Shahzad',
    status: 'VERIFIED',
    verifiedBy: 'Shahzad Ullah',
    shahzadApproval: 'APPROVED',
    createdAt: '2026-08-30T12:00:00.000Z'
  }
];
