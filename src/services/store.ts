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
  Designation,
  Dispatch,
  Employee,
  EmployeeSalary,
  EmployeeTownAssignment,
  InventoryBalance,
  InventoryTransaction,
  Invoice,
  LedgerEntry,
  MasterDataChangeAudit,
  Recovery,
  SalesOrder,
  SKU,
  SKUVersion,
  StockReturn,
  Target,
  User,
} from '../types';

export interface AppState {
  currentUser: User;
  activeApp: 'PORTAL' | 'MOBILE_APP';
  users: User[];
  employees: Employee[];
  designations: Designation[];
  employeeSalaries: EmployeeSalary[];
  employeeTownAssignments: EmployeeTownAssignment[];
  targets: Target[];
  customers: Customer[];
  customerRequests: CustomerRegistrationRequest[];
  skus: SKU[];
  skuVersions: SKUVersion[];
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
  masterAudits: MasterDataChangeAudit[];
}

export const initialUsers: User[] = [];

export const initialEmployees: Employee[] = [];

export const initialDesignations: Designation[] = [];

export const initialEmployeeSalaries: EmployeeSalary[] = [];

export const initialEmployeeTownAssignments: EmployeeTownAssignment[] = [];

export const initialTargets: Target[] = [];

export const initialCustomers: Customer[] = [];

export const initialCustomerRequests: CustomerRegistrationRequest[] = [];

export const initialSKUs: SKU[] = [];

export const initialSKUVersions: SKUVersion[] = [];

export const initialInventoryBalances: InventoryBalance[] = [];

export const initialInventoryTransactions: InventoryTransaction[] = [];

export const initialLedgerEntries: LedgerEntry[] = [];

export const initialSalesOrders: SalesOrder[] = [];

export const initialInvoices: Invoice[] = [];

export const initialRecoveries: Recovery[] = [];

export const initialDispatches: Dispatch[] = [];

export const initialStockReturns: StockReturn[] = [];

export const initialVisits: CustomerVisit[] = [];

export const initialMasterAudits: MasterDataChangeAudit[] = [];

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
