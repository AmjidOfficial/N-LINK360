/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Clean Transactional Store & Baseline Initial State
 * Empty / Clean initialized datasets ready for live production and manual imports.
 */

import {
  AuditLog,
  Customer,
  CustomerRegistrationRequest,
  CustomerVisit,
  Dispatch,
  InventoryBalance,
  InventoryTransaction,
  Invoice,
  LedgerEntry,
  Recovery,
  SalesOrder,
  SKU,
  StockReturn,
  User,
} from '../types';

export interface AppState {
  currentUser: User;
  activeApp: 'PORTAL' | 'MOBILE_APP';
  users: User[];
  customers: Customer[];
  skus: SKU[];
  inventoryBalances: InventoryBalance[];
  inventoryTransactions: InventoryTransaction[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  recoveries: Recovery[];
  ledgerEntries: LedgerEntry[];
  dispatches: Dispatch[];
  stockReturns: StockReturn[];
  customerVisits: CustomerVisit[];
  auditLogs: AuditLog[];
}

export const initialUsers: User[] = [];

export const initialCustomers: Customer[] = [];

export const initialSKUs: SKU[] = [];

export const initialInventoryBalances: InventoryBalance[] = [];

export const initialInventoryTransactions: InventoryTransaction[] = [];

export const initialLedgerEntries: LedgerEntry[] = [];

export const initialSalesOrders: SalesOrder[] = [];

export const initialInvoices: Invoice[] = [];

export const initialRecoveries: Recovery[] = [];

export const initialDispatches: Dispatch[] = [];

export const initialStockReturns: StockReturn[] = [];

export const initialVisits: CustomerVisit[] = [];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'audit-init-01',
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    userId: 'SYS-01',
    userEmail: 'admin@nationallights.com',
    action: 'CREATE',
    module: 'MASTER_DATA',
    recordId: 'SYS-BOOT',
    details: 'N-LINK 360 clean production workspace initialized.',
  },
];
