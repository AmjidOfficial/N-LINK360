/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Lights Business Management Platform
 * TypeScript Domain Model & Business Types
 */

// ==============================================================================
// 1. Roles, Permissions & Controlled Designations
// ==============================================================================
export type UserRole =
  | 'SUPER_ADMIN'
  | 'MANAGEMENT'
  | 'FACTORY_MANAGER'
  | 'WAREHOUSE_MANAGER'
  | 'ACCOUNTS'
  | 'SALES_MANAGER'
  | 'SALES_RECOVERY'
  | 'DISPATCH_OFFICER'
  | 'RSM'
  | 'ASM'
  | 'TSM'
  | 'SS'
  | 'OB'
  | 'FACTORY'
  | 'WAREHOUSE'
  | 'DISPATCH';

export interface Designation {
  id: string;
  code: string;
  name: string;
  description: string;
  department: string;
  gradeLevel?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  branchId: string;
  branchName?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface SalaryAllowance {
  name: string;
  amount: number;
}

export interface EmployeeSalary {
  id: string;
  employeeId: string;
  basicSalary: number;
  allowances: SalaryAllowance[];
  grossSalary: number;
  effectiveFrom: string;
  effectiveTo?: string; // null means currently active
  salaryStatus: 'ACTIVE' | 'ARCHIVED' | 'SUPERSEDED';
  createdBy?: string;
  createdAt: string;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  url: string;
  fileType: string;
  uploadedAt: string;
}

export interface EmployeeWarehouseDetails {
  assignedWarehouseId?: string;
  assignedWarehouseName?: string;
  canApproveDispatches?: boolean;
  canAdjustStock?: boolean;
}

export interface EmployeeFactoryDetails {
  assignedPlantId?: string;
  assignedPlantName?: string;
  productionLine?: string;
  shift?: 'MORNING' | 'EVENING' | 'NIGHT';
}

export interface EmployeeFinanceDetails {
  canPostVouchers?: boolean;
  canApproveCreditLimits?: boolean;
  maxApprovalAmount?: number;
}

export interface EmployeeSalesDetails {
  region?: string;
  area?: string;
  territory?: string;
  monthlySalesTarget?: number;
  monthlyRecoveryTarget?: number;
  assignedBeats?: string[];
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  fatherName?: string;
  cnic?: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  emergencyMobile?: string;
  emergencyPhone?: string;
  address?: string;
  joiningDate: string;
  employmentStatus: 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED';
  department: 'SUPPLY_CHAIN' | 'MANUFACTURING' | 'FINANCE_ACCOUNTS' | 'SALES_FIELD' | 'EXECUTIVE' | string;
  designationId?: string;
  designationCode?: string;
  designationName?: string;
  designation?: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  profilePhotoUrl?: string;
  documents?: EmployeeDocument[];
  
  // Linked System User Authentication & RBAC
  userId?: string; // Linked system login account ID
  systemRole?: UserRole; // Linked system role
  accessScope?: 'GLOBAL_ADMIN' | 'ACCOUNTS_FINANCE' | 'LOGISTICS_WH' | 'MANUFACTURING_PLANT' | 'FIELD_FORCE_SCOPED' | string;
  isLoginEnabled?: boolean;
  baseBranch?: string;
  branchId?: string;
  branchName?: string;
  salaryGrade?: string;

  // Department-Specific Operational Parameters
  warehouseDetails?: EmployeeWarehouseDetails;
  factoryDetails?: EmployeeFactoryDetails;
  financeDetails?: EmployeeFinanceDetails;
  salesDetails?: EmployeeSalesDetails;

  // Organization assignment
  regionId?: string;
  regionName?: string;
  areaId?: string;
  areaName?: string;
  territoryId?: string;
  territoryName?: string;
  townIds?: string[];
  townNames?: string[];
  routeIds?: string[];
  beats?: string[];
  // Current active salary snapshot
  currentSalary?: EmployeeSalary;
  createdAt: string;
  updatedAt?: string;
}

export interface EmployeeTownAssignment {
  id: string;
  employeeId: string;
  regionId?: string;
  areaId?: string;
  territoryId?: string;
  townId?: string;
  townName?: string;
  routeId?: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
}

export type TargetType = 'SALES' | 'RECOVERY';
export type TargetPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface Target {
  id: string;
  targetType: TargetType;
  periodType: TargetPeriod;
  periodKey: string; // e.g. '2026-08', '2026-Q3'
  employeeId?: string;
  employeeName?: string;
  designationCode?: string;
  regionId?: string;
  regionName?: string;
  areaId?: string;
  areaName?: string;
  territoryId?: string;
  territoryName?: string;
  townId?: string;
  townName?: string;
  customerId?: string;
  customerName?: string;
  targetValue: number;
  targetQuantity?: number;
  achievedValue?: number;
  achievedQuantity?: number;
  variance?: number;
  achievementPercentage?: number | 'N/A';
  createdBy?: string;
  createdAt: string;
}

export interface SalesUserProfile {
  id: string;
  userId: string;
  employeeCode: string;
  salesRegion: string;
  salesArea: string;
  targetMonthlySales: number;
  targetMonthlyRecovery: number;
  isActive: boolean;
}

// ==============================================================================
// 2. Organization & Structure
// ==============================================================================
export interface Company {
  id: string;
  code: string;
  name: string;
  taxNumber?: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
}

export interface Branch {
  id: string;
  companyId: string;
  code: string;
  name: string;
  city: string;
  region: string;
  address: string;
  phone: string;
  isActive: boolean;
}

export interface Factory {
  id: string;
  companyId: string;
  branchId: string;
  code: string;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  isActive: boolean;
}

export type WarehouseType = 'CENTRAL' | 'REGIONAL' | 'TRANSIT' | 'DAMAGE';

export interface Warehouse {
  id: string;
  companyId: string;
  branchId: string;
  code: string;
  name: string;
  type: WarehouseType;
  address: string;
  isActive: boolean;
}

// ==============================================================================
// 3. Products & SKUs
// ==============================================================================
export interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Brand {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  brandId: string;
  code: string;
  name: string;
  description?: string;
  unitOfMeasure: string;
  isActive: boolean;
}

export interface SKU {
  id: string;
  productId: string;
  productName?: string;
  skuCode: string;
  barcode?: string;
  name: string;
  wattage?: string;
  colorTemperature?: string;
  voltage?: string;
  packagingUnit: string;
  cartonQuantity: number;
  tradePrice: number;
  retailPrice: number;
  minimumPrice: number;
  reorderLevel: number;
  isActive: boolean;
  // Extended packaging & master attributes
  brandName?: string;
  categoryName?: string;
  unitsPerPack?: number;
  packsPerCarton?: number;
  weight?: number;
  taxRate?: number;
  status?: 'ACTIVE' | 'DISCONTINUED' | 'UPCOMING';
  // SKU Versioning architecture
  currentVersionId?: string;
  currentVersionNumber?: number;
  versions?: SKUVersion[];
}

// ==============================================================================
// 4. Customers & Visits
// ==============================================================================
export type CustomerType = 'DISTRIBUTOR' | 'DEALER' | 'CUSTOMER' | 'SHOP';

export interface Customer {
  id: string;
  customerCode: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  type: CustomerType;
  taxNumber?: string;
  cnic?: string;
  address: string;
  city: string;
  region: string;
  creditLimit: number;
  creditDays: number;
  openingBalance: number;
  currentBalance: number;
  isCreditLocked: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Extended territory & hierarchy attributes
  zone?: string;
  area?: string;
  territory?: string;
  town?: string;
  route?: string;
  assignedEmployee?: string;
  priceTier?: 'STANDARD' | 'WHOLESALE' | 'DISTRIBUTOR' | 'SPECIAL' | string;
  approvalStatus?: RegistrationRequestStatus | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface CustomerVisit {
  id: string;
  customerId: string;
  customerName?: string;
  salesUserId: string;
  salesUserName?: string;
  checkinTime: string;
  checkoutTime?: string;
  latitude?: number;
  longitude?: number;
  purpose: string;
  notes?: string;
  orderPlaced: boolean;
  recoveryCollected: boolean;
  nextFollowupDate?: string;
  photoUrl?: string;
}

export interface VisitReminder {
  id: string;
  customerId: string;
  customerName: string;
  customerCode?: string;
  phone?: string;
  city?: string;
  address?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  purpose: string;
  reason: 'SCHEDULED_FOLLOWUP' | 'OVERDUE_RECOVERY' | 'ROUTINE_CYCLE' | 'INACTIVE_ACCOUNT' | 'CUSTOM';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
  notes?: string;
  lastVisitedDate?: string;
  currentBalance?: number;
  creditLimit?: number;
  creditDays?: number;
  createdAt?: string;
}

export type RegistrationRequestStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface CustomerRegistrationRequest {
  id: string;
  businessName: string;
  ownerName: string;
  contactNumber: string;
  cnic: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  type: CustomerType;
  proposedCreditLimit: number;
  proposedCreditDays: number;
  proposedOpeningBalance: number;
  additionalNotes?: string;
  salesUserId: string;
  salesUserName: string;
  status: RegistrationRequestStatus;
  rejectionReason?: string;
  createdAt: string;
  approvedAt?: string;
}

// ==============================================================================
// 5. Inventory & Transactions
// ==============================================================================
export type InventoryTransactionType =
  | 'PRODUCTION_IN'
  | 'SALES_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'RETURN_IN'
  | 'DAMAGE_OUT'
  | 'DAMAGE_RECOVERY'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT';

export interface InventoryTransaction {
  id: string;
  transactionNumber: string;
  transactionType: InventoryTransactionType;
  warehouseId: string;
  warehouseName?: string;
  skuId: string;
  skuCode?: string;
  skuName?: string;
  skuVersionId?: string;
  versionNumber?: number;
  unitsPerCartonSnapshot?: number;
  quantity: number;
  unitPrice: number;
  referenceModule: string;
  referenceId: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface InventoryBalance {
  id: string;
  warehouseId: string;
  warehouseName?: string;
  skuId: string;
  skuCode?: string;
  skuName?: string;
  skuVersionId?: string;
  versionNumber?: number;
  unitsPerCartonSnapshot?: number;
  quantityOnHand: number;
  quantityReserved: number;
  quantityDamaged: number;
  availableQuantity: number;
  lastUpdatedAt: string;
}

// ==============================================================================
// 6. Sales Orders & Invoicing
// ==============================================================================
export type OrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CREDIT_CHECK'
  | 'UNDER_REVIEW'
  | 'APPROVAL'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'ON_HOLD'
  | 'REJECTED'
  | 'INVOICED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';

export type CreditCheckStatus = 'GREEN' | 'AMBER' | 'RED';

export interface SalesOrderItem {
  id: string;
  orderId: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  skuVersionId?: string;
  versionNumber?: number;
  unitsPerCartonSnapshot?: number;
  unitTradePriceSnapshot?: number;
  unitRetailPriceSnapshot?: number;
  packagingUnit?: string;
  orderedQuantity: number;
  approvedQuantity?: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  salesUserId: string;
  salesUserName: string;
  orderDate: string;
  status: OrderStatus;
  items: SalesOrderItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  creditCheckStatus: CreditCheckStatus;
  creditCheckNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export type InvoiceStatus = 'POSTED' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  skuVersionId?: string;
  versionNumber?: number;
  unitsPerCartonSnapshot?: number;
  unitTradePriceSnapshot?: number;
  unitRetailPriceSnapshot?: number;
  packagingUnit?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  previousBalance: number;
  newBalance: number;
  paymentStatus: string;
  printedAt?: string;
  createdBy?: string;
  createdAt: string;
}

// ==============================================================================
// 7. Logistics & Dispatch
// ==============================================================================
export type DispatchStatus = 'PENDING' | 'LOADED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED';

export interface Dispatch {
  id: string;
  dispatchNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  warehouseId: string;
  warehouseName: string;
  transporterName: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  addaName?: string;
  bilityNumber?: string;
  dispatchDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  freightCharges: number;
  otherCharges: number;
  status: DispatchStatus;
  gatePassNumber?: string;
  remarks?: string;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  dispatchId?: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  receivedDate: string;
  receivedByName: string;
  status: 'VERIFIED' | 'DISCREPANCY' | 'REJECTED';
  inspectionNotes?: string;
  items: GoodsReceiptItem[];
}

export interface GoodsReceiptItem {
  id: string;
  grnId: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  invoicedQuantity: number;
  receivedQuantity: number;
  shortQuantity: number;
  excessQuantity: number;
  damagedQuantity: number;
  remarks?: string;
}

// ==============================================================================
// 8. Accounts & Customer Ledger
// ==============================================================================
export type PaymentMode = 'CASH' | 'CHEQUE' | 'ONLINE_TRANSFER' | 'PAY_ORDER';

export interface Recovery {
  id: string;
  recoveryNumber: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  salesUserId: string;
  salesUserName: string;
  collectionDate: string;
  amount: number;
  paymentMode: PaymentMode;
  instrumentNumber?: string;
  bankName?: string;
  instrumentDate?: string;
  proofAttachmentUrl?: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  remarks?: string;
  createdAt: string;
}

export type LedgerTransactionType =
  | 'OPENING_BALANCE'
  | 'INVOICE'
  | 'RECOVERY'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'RETURN_ADJUSTMENT';

export interface LedgerEntry {
  id: string;
  entryNumber: string;
  customerId: string;
  customerName: string;
  entryDate: string;
  transactionType: LedgerTransactionType;
  referenceModule: string;
  referenceId: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  description: string;
  createdAt: string;
}

export interface CreditNote {
  id: string;
  noteNumber: string;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  date: string;
  amount: number;
  reason: string;
  status: 'DRAFT' | 'APPROVED' | 'POSTED' | 'CANCELLED';
  approvedBy?: string;
  createdAt: string;
}

// ==============================================================================
// 9. Reverse Logistics & Damage
// ==============================================================================
export interface StockReturnItem {
  id: string;
  returnId: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  claimedQuantity: number;
  receivedQuantity?: number;
  approvedQuantity?: number;
  unitPrice: number;
  reason: string;
  conditionNotes?: string;
  photoUrl?: string;
}

export interface StockReturn {
  id: string;
  returnNumber: string;
  customerId: string;
  customerName: string;
  salesUserId: string;
  salesUserName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  requestDate: string;
  status: 'REPORTED' | 'WAREHOUSE_RECEIVED' | 'INSPECTED' | 'APPROVED' | 'REJECTED' | 'CREDIT_NOTE_ISSUED';
  inspectionResult?: 'SALEABLE' | 'DAMAGED' | 'SCRAP';
  totalClaimedAmount: number;
  totalApprovedAmount: number;
  creditNoteId?: string;
  items: StockReturnItem[];
  createdAt: string;
}

export interface DamageStock {
  id: string;
  damageNumber: string;
  warehouseId: string;
  warehouseName: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  quantity: number;
  unitCost: number;
  sourceType: 'PRODUCTION' | 'TRANSIT' | 'CUSTOMER_RETURN' | 'WAREHOUSE_HANDLING';
  sourceReferenceId?: string;
  resolutionType: 'PENDING' | 'REPAIR' | 'SCRAP' | 'REPLACEMENT' | 'CREDIT_NOTE';
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

// ==============================================================================
// 10. Audit & Notifications
// ==============================================================================
export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  module: string;
  recordType?: string;
  recordId: string;
  details?: string;
  timestamp?: string;
  beforeValue?: Record<string, unknown> | string;
  afterValue?: Record<string, unknown> | string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  createdAt: string;
}

export interface SKUVersion {
  id: string;
  skuId: string;
  versionNumber: number;
  effectiveFrom: string;
  effectiveTo?: string; // null means currently active
  packagingUnit: string;
  unitsPerPack: number;
  packsPerCarton: number;
  unitsPerCarton: number;
  cartonRate: number;
  tradePrice: number;
  retailPrice: number;
  dealerPrice: number;
  costPrice?: number;
  taxRate: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'REPLACED';
  changeReason?: string;
  createdBy?: string;
  createdAt: string;
}

export interface MasterDataChangeAudit {
  id: string;
  entityType: 'SKU' | 'BRAND' | 'CUSTOMER' | 'EMPLOYEE' | 'SALARY' | 'DESIGNATION';
  entityId: string;
  entityName: string;
  fieldChanged: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  effectiveDate: string;
  reason?: string;
  changedBy: string;
  changedByName?: string;
  createdAt: string;
}

export interface TownLedgerSummary {
  townId: string;
  townName: string;
  territoryName: string;
  areaName: string;
  regionName: string;
  totalCustomers: number;
  totalOpeningBalance: number;
  totalInvoicing: number;
  totalRecovery: number;
  totalAdjustments: number;
  totalOutstanding: number;
  assignedEmployees: {
    employeeId: string;
    employeeName: string;
    designation: string;
  }[];
}

export interface DesignationFinancialSummary {
  designationCode: string;
  designationName: string;
  teamSize: number;
  totalSalesTarget: number;
  totalSalesAchievement: number;
  salesAchievementPercent: number | 'N/A';
  totalRecoveryTarget: number;
  totalRecoveryAchievement: number;
  recoveryAchievementPercent: number | 'N/A';
  totalOutstanding: number;
  totalCustomersCount: number;
}

