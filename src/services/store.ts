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
import { SEED_CUSTOMERS, SEED_ORDERS, SEED_RECOVERIES } from '../utils/purgeMockData';
import { SEED_LEDGER_ENTRIES } from '../data/seed-ledger-data';
import { NLINK_OFFICIAL_PRODUCTS } from '../data/nlink-products';

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
export const initialCustomers: Customer[] = [...SEED_CUSTOMERS];
export const initialCustomerRequests: CustomerRegistrationRequest[] = [];
export const initialSKUs: SKU[] = (NLINK_OFFICIAL_PRODUCTS as any[]).map((p) => ({
  id: p.id,
  productId: p.productId || p.id,
  skuCode: p.skuCode,
  skuName: p.name,
  name: p.name,
  category: p.categoryLabel || p.category,
  cartonSize: p.cartonQuantity,
  cartonQuantity: p.cartonQuantity,
  piecesPerCarton: p.cartonQuantity,
  packagingUnit: 'CARTON',
  minOrderQty: 1,
  tradePrice: p.tradePrice,
  retailPrice: p.retailPrice,
  minimumPrice: p.tradePrice || 100,
  reorderLevel: 50,
  stockQty: p.stockInHand || 500,
  stockInHand: p.stockInHand || 500,
  wattage: p.wattage,
  status: 'ACTIVE',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

export const initialSKUVersions: SKUVersion[] = [];
export const initialInventoryBalances: InventoryBalance[] = initialSKUs.map((sku) => ({
  id: `bal-${sku.id}`,
  skuId: sku.id,
  skuCode: sku.skuCode,
  skuName: (sku as any).skuName || (sku as any).name || 'National Light Product',
  warehouseId: 'WH-CENTRAL-01',
  warehouseName: 'Central Peshawar Warehouse',
  quantity: (sku as any).stockInHand || (sku as any).stockQty || 500,
  availableQuantity: (sku as any).stockInHand || (sku as any).stockQty || 500,
  quantityOnHand: (sku as any).stockInHand || (sku as any).stockQty || 500,
  quantityReserved: 0,
  quantityDamaged: 0,
  allocatedQuantity: 0,
  updatedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
}));

export const initialInventoryTransactions: InventoryTransaction[] = [];
export const initialLedgerEntries: LedgerEntry[] = [...SEED_LEDGER_ENTRIES];
export const initialSalesOrders: SalesOrder[] = [...SEED_ORDERS];
export const initialInvoices: Invoice[] = [];
export const initialRecoveries: Recovery[] = [...SEED_RECOVERIES];
export const initialDispatches: Dispatch[] = [];
export const initialStockReturns: StockReturn[] = [];
export const initialVisits: CustomerVisit[] = [];
export const initialMasterAudits: MasterDataChangeAudit[] = [];

// Audit logs
export const initialAuditLogs: AuditLog[] = [];
