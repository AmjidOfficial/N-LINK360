/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - In-Memory Transactional Store for DEV Foundation
 * Simulates atomic database updates while enforcing data integrity constraints.
 */

import {
  calculateLedgerRunningBalance,
  calculateNewInventoryBalance,
  calculateOrderTotals,
  evaluateCreditPolicy,
  roundTo2,
} from '../lib/business-rules';
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
  UserRole,
} from '../types';
import { isSupabaseConfigured } from './supabase';
import {
  loadStateFromSupabase,
  syncOrderToSupabase,
  syncRecoveryToSupabase,
  syncInvoiceAndLedgerToSupabase,
  syncVisitToSupabase,
  syncCustomerToSupabase,
} from './dbSync';


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

export const initialUsers: User[] = [
  {
    id: 'u-1',
    email: 'admin@nationallights.com',
    fullName: 'Muhammad Amjid',
    phone: '+92 300 8400000',
    role: 'SUPER_ADMIN',
    branchId: 'b-1',
    branchName: 'Lahore Central Branch',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'u-2',
    email: 'field.lahore@nationallights.com',
    fullName: 'Rashid Ali (Sales & Recovery)',
    phone: '+92 321 4455667',
    role: 'SALES_RECOVERY',
    branchId: 'b-1',
    branchName: 'Lahore Central Branch',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'u-3',
    email: 'accounts@nationallights.com',
    fullName: 'Farhan Qureshi (Accounts)',
    phone: '+92 333 7788990',
    role: 'ACCOUNTS',
    branchId: 'b-1',
    branchName: 'Lahore Central Branch',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'u-4',
    email: 'warehouse@nationallights.com',
    fullName: 'Bilal Ahmed (Warehouse)',
    phone: '+92 312 9988776',
    role: 'WAREHOUSE_MANAGER',
    branchId: 'b-1',
    branchName: 'Lahore Central Branch',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'u-5',
    email: 'sales.mgr@nationallights.com',
    fullName: 'Tariq Butt (Sales Manager)',
    phone: '+92 300 5566778',
    role: 'SALES_MANAGER',
    branchId: 'b-1',
    branchName: 'Lahore Central Branch',
    isActive: true,
    createdAt: '2026-08-01T00:00:00Z',
  },
];

export const initialCustomers: Customer[] = [
  {
    id: 'c-1',
    customerCode: 'CUST-DST-001',
    companyName: 'Al-Madina Electric Corporation',
    contactPerson: 'Haji Shafiq ur Rehman',
    phone: '+92 300 4211223',
    email: 'shafiq@almadinaelectric.pk',
    type: 'DISTRIBUTOR',
    taxNumber: 'NTN-882211',
    cnic: '35201-1234567-1',
    address: 'Shop 14-16, Brandreth Road',
    city: 'Lahore',
    region: 'Punjab North',
    creditLimit: 1500000,
    creditDays: 45,
    openingBalance: 350000,
    currentBalance: 580000,
    isCreditLocked: false,
    isActive: true,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-08-20T00:00:00Z',
  },
  {
    id: 'c-2',
    customerCode: 'CUST-DLR-002',
    companyName: 'Bright Spark Light House',
    contactPerson: 'Chaudhry Nadeem Akhtar',
    phone: '+92 322 8901234',
    email: 'nadeem@brightspark.pk',
    type: 'DEALER',
    taxNumber: 'NTN-773344',
    cnic: '35202-7654321-3',
    address: 'Shop 4, Hall Road Electric Market',
    city: 'Lahore',
    region: 'Punjab North',
    creditLimit: 600000,
    creditDays: 30,
    openingBalance: 120000,
    currentBalance: 240000,
    isCreditLocked: false,
    isActive: true,
    createdAt: '2026-07-10T00:00:00Z',
    updatedAt: '2026-08-22T00:00:00Z',
  },
  {
    id: 'c-3',
    customerCode: 'CUST-DST-003',
    companyName: 'Khyber Light & Cable Centre',
    contactPerson: 'Malik Jahangir Khan',
    phone: '+92 333 9112244',
    email: 'jahangir@khyberlights.pk',
    type: 'DISTRIBUTOR',
    taxNumber: 'NTN-449911',
    cnic: '17301-4455667-9',
    address: 'Karkhano Market, Ring Road',
    city: 'Peshawar',
    region: 'KP West',
    creditLimit: 2000000,
    creditDays: 60,
    openingBalance: 750000,
    currentBalance: 1150000,
    isCreditLocked: false,
    isActive: true,
    createdAt: '2026-06-15T00:00:00Z',
    updatedAt: '2026-08-18T00:00:00Z',
  },
];

export const initialSKUs: SKU[] = [
  {
    id: 'sku-1',
    productId: 'p-1',
    productName: '12W LED Bulb (Cool Daylight)',
    skuCode: 'SKU-NL-BLB12-CW',
    barcode: '896400011201',
    name: '12W LED Bulb (Cool Daylight 6500K)',
    wattage: '12W',
    colorTemperature: '6500K',
    voltage: '220V-240V',
    packagingUnit: 'CARTON',
    cartonQuantity: 50,
    tradePrice: 310,
    retailPrice: 380,
    minimumPrice: 295,
    reorderLevel: 200,
    isActive: true,
  },
  {
    id: 'sku-2',
    productId: 'p-1',
    productName: '12W LED Bulb (Warm White)',
    skuCode: 'SKU-NL-BLB12-WW',
    barcode: '896400011202',
    name: '12W LED Bulb (Warm White 3000K)',
    wattage: '12W',
    colorTemperature: '3000K',
    voltage: '220V-240V',
    packagingUnit: 'CARTON',
    cartonQuantity: 50,
    tradePrice: 310,
    retailPrice: 380,
    minimumPrice: 295,
    reorderLevel: 150,
    isActive: true,
  },
  {
    id: 'sku-3',
    productId: 'p-2',
    productName: '18W High Output LED',
    skuCode: 'SKU-NL-BLB18-CW',
    barcode: '896400011801',
    name: '18W High Output LED (Cool Daylight)',
    wattage: '18W',
    colorTemperature: '6500K',
    voltage: '220V-240V',
    packagingUnit: 'CARTON',
    cartonQuantity: 40,
    tradePrice: 460,
    retailPrice: 550,
    minimumPrice: 440,
    reorderLevel: 100,
    isActive: true,
  },
  {
    id: 'sku-4',
    productId: 'p-3',
    productName: '7W SMD Concealed Downlight',
    skuCode: 'SKU-NL-PNL07-CW',
    barcode: '896400020701',
    name: '7W SMD Downlight (Cool Daylight)',
    wattage: '7W',
    colorTemperature: '6500K',
    voltage: '220V-240V',
    packagingUnit: 'CARTON',
    cartonQuantity: 30,
    tradePrice: 280,
    retailPrice: 350,
    minimumPrice: 265,
    reorderLevel: 100,
    isActive: true,
  },
  {
    id: 'sku-5',
    productId: 'p-4',
    productName: '50W Industrial Flood Light',
    skuCode: 'SKU-NL-FLD50-CW',
    barcode: '896400035001',
    name: '50W IP66 Outdoor Flood Light (6500K)',
    wattage: '50W',
    colorTemperature: '6500K',
    voltage: '220V-240V',
    packagingUnit: 'CARTON',
    cartonQuantity: 10,
    tradePrice: 2150,
    retailPrice: 2650,
    minimumPrice: 2050,
    reorderLevel: 25,
    isActive: true,
  },
];

export const initialInventoryBalances: InventoryBalance[] = [
  {
    id: 'ib-1',
    warehouseId: 'wh-1',
    warehouseName: 'Lahore Central Distribution Warehouse',
    skuId: 'sku-1',
    skuCode: 'SKU-NL-BLB12-CW',
    skuName: '12W LED Bulb (Cool Daylight 6500K)',
    quantityOnHand: 2500,
    quantityReserved: 150,
    quantityDamaged: 0,
    availableQuantity: 2350,
    lastUpdatedAt: '2026-08-24T08:00:00Z',
  },
  {
    id: 'ib-2',
    warehouseId: 'wh-1',
    warehouseName: 'Lahore Central Distribution Warehouse',
    skuId: 'sku-2',
    skuCode: 'SKU-NL-BLB12-WW',
    skuName: '12W LED Bulb (Warm White 3000K)',
    quantityOnHand: 1800,
    quantityReserved: 0,
    quantityDamaged: 0,
    availableQuantity: 1800,
    lastUpdatedAt: '2026-08-24T08:00:00Z',
  },
  {
    id: 'ib-3',
    warehouseId: 'wh-1',
    warehouseName: 'Lahore Central Distribution Warehouse',
    skuId: 'sku-3',
    skuCode: 'SKU-NL-BLB18-CW',
    skuName: '18W High Output LED (Cool Daylight)',
    quantityOnHand: 1200,
    quantityReserved: 80,
    quantityDamaged: 0,
    availableQuantity: 1120,
    lastUpdatedAt: '2026-08-24T08:00:00Z',
  },
  {
    id: 'ib-4',
    warehouseId: 'wh-1',
    warehouseName: 'Lahore Central Distribution Warehouse',
    skuId: 'sku-4',
    skuCode: 'SKU-NL-PNL07-CW',
    skuName: '7W SMD Downlight (Cool Daylight)',
    quantityOnHand: 950,
    quantityReserved: 0,
    quantityDamaged: 0,
    availableQuantity: 950,
    lastUpdatedAt: '2026-08-24T08:00:00Z',
  },
  {
    id: 'ib-5',
    warehouseId: 'wh-1',
    warehouseName: 'Lahore Central Distribution Warehouse',
    skuId: 'sku-5',
    skuCode: 'SKU-NL-FLD50-CW',
    skuName: '50W IP66 Outdoor Flood Light (6500K)',
    quantityOnHand: 320,
    quantityReserved: 20,
    quantityDamaged: 4,
    availableQuantity: 300,
    lastUpdatedAt: '2026-08-24T08:00:00Z',
  },
];

export const initialInventoryTransactions: InventoryTransaction[] = [
  {
    id: 'it-1',
    transactionNumber: 'ITX-2026-0001',
    transactionType: 'PRODUCTION_IN',
    warehouseId: 'wh-1',
    warehouseName: 'Lahore Central Distribution Warehouse',
    skuId: 'sku-1',
    skuCode: 'SKU-NL-BLB12-CW',
    skuName: '12W LED Bulb (Cool Daylight)',
    quantity: 3000,
    unitPrice: 220,
    referenceModule: 'PRODUCTION',
    referenceId: 'BATCH-2026-08-01',
    notes: 'Finished Goods Receipt from Plant 1',
    createdAt: '2026-08-10T10:00:00Z',
  },
  {
    id: 'it-2',
    transactionNumber: 'ITX-2026-0002',
    transactionType: 'SALES_OUT',
    warehouseId: 'wh-1',
    warehouseName: 'Lahore Central Distribution Warehouse',
    skuId: 'sku-1',
    skuCode: 'SKU-NL-BLB12-CW',
    skuName: '12W LED Bulb (Cool Daylight)',
    quantity: 500,
    unitPrice: 310,
    referenceModule: 'INVOICE',
    referenceId: 'INV-2026-0001',
    notes: 'Dispatched to Al-Madina Electric',
    createdAt: '2026-08-15T14:30:00Z',
  },
];

export const initialLedgerEntries: LedgerEntry[] = [
  {
    id: 'le-1',
    entryNumber: 'LED-2026-0001',
    customerId: 'c-1',
    customerName: 'Al-Madina Electric Corporation',
    entryDate: '2026-07-01',
    transactionType: 'OPENING_BALANCE',
    referenceModule: 'SYSTEM',
    referenceId: 'SYS-INIT',
    debitAmount: 350000,
    creditAmount: 0,
    runningBalance: 350000,
    description: 'Verified Fiscal Year 2026 Opening Balance',
    createdAt: '2026-07-01T00:00:00Z',
  },
  {
    id: 'le-2',
    entryNumber: 'LED-2026-0002',
    customerId: 'c-1',
    customerName: 'Al-Madina Electric Corporation',
    entryDate: '2026-08-15',
    transactionType: 'INVOICE',
    referenceModule: 'INVOICE',
    referenceId: 'INV-2026-0001',
    debitAmount: 430000,
    creditAmount: 0,
    runningBalance: 780000,
    description: 'Sales Invoice INV-2026-0001',
    createdAt: '2026-08-15T14:30:00Z',
  },
  {
    id: 'le-3',
    entryNumber: 'LED-2026-0003',
    customerId: 'c-1',
    customerName: 'Al-Madina Electric Corporation',
    entryDate: '2026-08-20',
    transactionType: 'RECOVERY',
    referenceModule: 'RECOVERY',
    referenceId: 'REC-2026-0001',
    debitAmount: 0,
    creditAmount: 200000,
    runningBalance: 580000,
    description: 'HBL Cheque No. 441029 Clearance',
    createdAt: '2026-08-20T11:00:00Z',
  },
];

export const initialSalesOrders: SalesOrder[] = [
  {
    id: 'so-1',
    orderNumber: 'ORD-2026-0001',
    customerId: 'c-1',
    customerName: 'Al-Madina Electric Corporation',
    customerCode: 'CUST-DST-001',
    salesUserId: 'u-2',
    salesUserName: 'Rashid Ali',
    orderDate: '2026-08-15',
    status: 'INVOICED',
    items: [
      {
        id: 'soi-1',
        orderId: 'so-1',
        skuId: 'sku-1',
        skuCode: 'SKU-NL-BLB12-CW',
        skuName: '12W LED Bulb (Cool Daylight)',
        orderedQuantity: 500,
        approvedQuantity: 500,
        unitPrice: 310,
        discountPercent: 0,
        lineTotal: 155000,
      },
      {
        id: 'soi-2',
        orderId: 'so-1',
        skuId: 'sku-5',
        skuCode: 'SKU-NL-FLD50-CW',
        skuName: '50W IP66 Flood Light',
        orderedQuantity: 100,
        approvedQuantity: 100,
        unitPrice: 2150,
        discountPercent: 0,
        lineTotal: 215000,
      },
    ],
    subtotal: 370000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 370000,
    creditCheckStatus: 'GREEN',
    creditCheckNotes: 'Order within verified credit limit.',
    approvedBy: 'Tariq Butt',
    approvedAt: '2026-08-15T12:00:00Z',
    createdAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'so-2',
    orderNumber: 'ORD-2026-0002',
    customerId: 'c-2',
    customerName: 'Bright Spark Light House',
    customerCode: 'CUST-DLR-002',
    salesUserId: 'u-2',
    salesUserName: 'Rashid Ali',
    orderDate: '2026-08-24',
    status: 'SUBMITTED',
    items: [
      {
        id: 'soi-3',
        orderId: 'so-2',
        skuId: 'sku-3',
        skuCode: 'SKU-NL-BLB18-CW',
        skuName: '18W High Output LED (Cool Daylight)',
        orderedQuantity: 80,
        unitPrice: 460,
        discountPercent: 2,
        lineTotal: 36064,
      },
      {
        id: 'soi-4',
        orderId: 'so-2',
        skuId: 'sku-5',
        skuCode: 'SKU-NL-FLD50-CW',
        skuName: '50W IP66 Flood Light',
        orderedQuantity: 20,
        unitPrice: 2150,
        discountPercent: 5,
        lineTotal: 40850,
      },
    ],
    subtotal: 76914,
    discountAmount: 2886,
    taxAmount: 0,
    totalAmount: 76914,
    creditCheckStatus: 'GREEN',
    creditCheckNotes: 'Projected balance (316,914 PKR) within 600,000 PKR credit limit.',
    createdAt: '2026-08-24T09:30:00Z',
  },
];

export const initialInvoices: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    orderId: 'so-1',
    customerId: 'c-1',
    customerName: 'Al-Madina Electric Corporation',
    customerCode: 'CUST-DST-001',
    invoiceDate: '2026-08-15',
    dueDate: '2026-09-29',
    status: 'POSTED',
    items: [
      {
        id: 'ii-1',
        invoiceId: 'inv-1',
        skuId: 'sku-1',
        skuCode: 'SKU-NL-BLB12-CW',
        skuName: '12W LED Bulb (Cool Daylight)',
        quantity: 500,
        unitPrice: 310,
        discountAmount: 0,
        taxAmount: 0,
        lineTotal: 155000,
      },
      {
        id: 'ii-2',
        invoiceId: 'inv-1',
        skuId: 'sku-5',
        skuCode: 'SKU-NL-FLD50-CW',
        skuName: '50W IP66 Flood Light',
        quantity: 100,
        unitPrice: 2150,
        discountAmount: 0,
        taxAmount: 0,
        lineTotal: 215000,
      },
    ],
    subtotal: 370000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 370000,
    previousBalance: 350000,
    newBalance: 720000,
    paymentStatus: 'PARTIALLY_PAID',
    createdBy: 'Farhan Qureshi',
    createdAt: '2026-08-15T14:30:00Z',
  },
];

export const initialRecoveries: Recovery[] = [
  {
    id: 'rec-1',
    recoveryNumber: 'REC-2026-0001',
    customerId: 'c-1',
    customerName: 'Al-Madina Electric Corporation',
    customerCode: 'CUST-DST-001',
    salesUserId: 'u-2',
    salesUserName: 'Rashid Ali',
    collectionDate: '2026-08-20',
    amount: 200000,
    paymentMode: 'CHEQUE',
    instrumentNumber: 'HBL-441029',
    bankName: 'Habib Bank Ltd (Brandreth Rd Br)',
    instrumentDate: '2026-08-20',
    status: 'VERIFIED',
    verifiedBy: 'Farhan Qureshi',
    verifiedAt: '2026-08-20T11:00:00Z',
    remarks: 'Cheque cleared in National Lights Main Account.',
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 'rec-2',
    recoveryNumber: 'REC-2026-0002',
    customerId: 'c-2',
    customerName: 'Bright Spark Light House',
    customerCode: 'CUST-DLR-002',
    salesUserId: 'u-2',
    salesUserName: 'Rashid Ali',
    collectionDate: '2026-08-24',
    amount: 60000,
    paymentMode: 'CASH',
    status: 'PENDING_VERIFICATION',
    remarks: 'Cash collected during weekly field visit.',
    createdAt: '2026-08-24T10:15:00Z',
  },
];

export const initialDispatches: Dispatch[] = [
  {
    id: 'dsp-1',
    dispatchNumber: 'DSP-2026-0001',
    invoiceId: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    warehouseId: 'wh-1',
    warehouseName: 'Lahore Central Distribution Warehouse',
    transporterName: 'Faisal Movers Goods Transport',
    vehicleNumber: 'LES-9922 (Mazda Titan)',
    driverName: 'Muhammad Akram',
    driverPhone: '+92 301 5566778',
    addaName: 'Badami Bagh Cargo Terminal 3',
    bilityNumber: 'BIL-FM-88992',
    dispatchDate: '2026-08-16',
    expectedDeliveryDate: '2026-08-17',
    actualDeliveryDate: '2026-08-17',
    freightCharges: 4500,
    otherCharges: 500,
    status: 'DELIVERED',
    gatePassNumber: 'GP-2026-084',
    remarks: 'Safe delivery confirmed with signed delivery note.',
  },
];

export const initialStockReturns: StockReturn[] = [
  {
    id: 'ret-1',
    returnNumber: 'RET-2026-0001',
    customerId: 'c-2',
    customerName: 'Bright Spark Light House',
    salesUserId: 'u-2',
    salesUserName: 'Rashid Ali',
    requestDate: '2026-08-23',
    status: 'WAREHOUSE_RECEIVED',
    inspectionResult: 'DAMAGED',
    totalClaimedAmount: 6200,
    totalApprovedAmount: 0,
    items: [
      {
        id: 'sri-1',
        returnId: 'ret-1',
        skuId: 'sku-1',
        skuCode: 'SKU-NL-BLB12-CW',
        skuName: '12W LED Bulb (Cool Daylight)',
        claimedQuantity: 20,
        unitPrice: 310,
        reason: 'Broken diffuser during shop display fitting.',
      },
    ],
    createdAt: '2026-08-23T15:00:00Z',
  },
];

export const initialVisits: CustomerVisit[] = [
  {
    id: 'vis-1',
    customerId: 'c-1',
    customerName: 'Al-Madina Electric Corporation',
    salesUserId: 'u-2',
    salesUserName: 'Rashid Ali',
    checkinTime: '2026-08-24T08:45:00Z',
    checkoutTime: '2026-08-24T09:30:00Z',
    latitude: 31.5798,
    longitude: 74.3168,
    purpose: 'Routine Sales & Recovery Follow-up',
    notes: 'Met Haji Shafiq. Discussed upcoming wedding season bulk demand for 50W Flood lights.',
    orderPlaced: false,
    recoveryCollected: false,
    nextFollowupDate: '2026-08-31',
  },
  {
    id: 'vis-2',
    customerId: 'c-2',
    customerName: 'Bright Spark Light House',
    salesUserId: 'u-2',
    salesUserName: 'Rashid Ali',
    checkinTime: '2026-08-24T09:45:00Z',
    checkoutTime: '2026-08-24T10:20:00Z',
    latitude: 31.5582,
    longitude: 74.3294,
    purpose: 'Order Booking & Cash Recovery Collection',
    notes: 'Collected PKR 60,000 cash recovery against overdue balance. Booked new order ORD-2026-0002.',
    orderPlaced: true,
    recoveryCollected: true,
    nextFollowupDate: '2026-08-28',
  },
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'aud-1',
    userId: 'u-1',
    userName: 'Muhammad Amjid',
    action: 'SYSTEM_BOOTSTRAP',
    module: 'CORE',
    recordType: 'COMPANY_MASTER',
    recordId: 'NL-CORP',
    newState: { version: '1.0.0-PROD-SPEC', company: 'National Lights' },
    createdAt: '2026-08-24T08:00:00Z',
  },
  {
    id: 'aud-2',
    userId: 'u-3',
    userName: 'Farhan Qureshi',
    action: 'POST_INVOICE',
    module: 'ACCOUNTS',
    recordType: 'INVOICE',
    recordId: 'INV-2026-0001',
    newState: { totalAmount: 370000, customer: 'CUST-DST-001' },
    createdAt: '2026-08-15T14:30:00Z',
  },
];

export const initialRegistrationRequests: CustomerRegistrationRequest[] = [
  {
    id: 'req-1',
    businessName: 'Karan Electricals',
    ownerName: 'Karan Kumar',
    contactNumber: '+92 312 4567890',
    cnic: '31303-9876543-1',
    address: 'Shahi Bazar, near Ghanta Ghar',
    latitude: 30.1575,
    longitude: 71.5249,
    city: 'Multan',
    region: 'Punjab South',
    type: 'DEALER',
    proposedCreditLimit: 400000,
    proposedCreditDays: 30,
    proposedOpeningBalance: 0,
    additionalNotes: 'Well established retail shop in main Multan market. Very strong reference.',
    salesUserId: 'u-2',
    salesUserName: 'Rashid Ali',
    status: 'PENDING_APPROVAL',
    createdAt: '2026-08-24T10:00:00Z',
  },
  {
    id: 'req-2',
    businessName: 'Bismillah Electric Store',
    ownerName: 'Mian Muhammad Asif',
    contactNumber: '+92 321 7654321',
    cnic: '34101-1122334-5',
    address: 'Gondlanwala Road, near bypass',
    latitude: 32.1877,
    longitude: 74.1945,
    city: 'Gujranwala',
    region: 'Punjab North',
    type: 'DISTRIBUTOR',
    proposedCreditLimit: 1200000,
    proposedCreditDays: 45,
    proposedOpeningBalance: 50000,
    additionalNotes: 'Primary distributor lead for Gujranwala city lights sector. Owns 3 warehouses.',
    salesUserId: 'u-2',
    salesUserName: 'Rashid Ali',
    status: 'PENDING_APPROVAL',
    createdAt: '2026-08-24T11:15:00Z',
  },
];

class InMemoryStoreService {
  private users: User[] = [...initialUsers];
  private customers: Customer[] = [...initialCustomers];
  private skus: SKU[] = [...initialSKUs];
  private inventoryBalances: InventoryBalance[] = [...initialInventoryBalances];
  private inventoryTransactions: InventoryTransaction[] = [...initialInventoryTransactions];
  private salesOrders: SalesOrder[] = [...initialSalesOrders];
  private invoices: Invoice[] = [...initialInvoices];
  private recoveries: Recovery[] = [...initialRecoveries];
  private ledgerEntries: LedgerEntry[] = [...initialLedgerEntries];
  private dispatches: Dispatch[] = [...initialDispatches];
  private stockReturns: StockReturn[] = [...initialStockReturns];
  private visits: CustomerVisit[] = [...initialVisits];
  private auditLogs: AuditLog[] = [...initialAuditLogs];
  private registrationRequests: CustomerRegistrationRequest[] = [...initialRegistrationRequests];

  async syncDatabase(): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const loaded = await loadStateFromSupabase();
    if (loaded) {
      if (loaded.customers) this.customers = loaded.customers;
      if (loaded.skus) this.skus = loaded.skus;
      if (loaded.inventoryBalances) this.inventoryBalances = loaded.inventoryBalances;
      if (loaded.salesOrders) this.salesOrders = loaded.salesOrders;
      if (loaded.invoices) this.invoices = loaded.invoices;
      if (loaded.recoveries) this.recoveries = loaded.recoveries;
      if (loaded.ledgerEntries) this.ledgerEntries = loaded.ledgerEntries;
      if (loaded.visits) this.visits = loaded.visits;
      return true;
    }
    return false;
  }

  getUsers(): User[] {
    return this.users;
  }

  getCustomers(): Customer[] {
    return this.customers;
  }

  getSKUs(): SKU[] {
    return this.skus;
  }

  getInventoryBalances(): InventoryBalance[] {
    return this.inventoryBalances;
  }

  getInventoryTransactions(): InventoryTransaction[] {
    return this.inventoryTransactions;
  }

  getSalesOrders(): SalesOrder[] {
    return this.salesOrders;
  }

  getInvoices(): Invoice[] {
    return this.invoices;
  }

  getRecoveries(): Recovery[] {
    return this.recoveries;
  }

  getLedgerEntries(): LedgerEntry[] {
    return this.ledgerEntries;
  }

  getDispatches(): Dispatch[] {
    return this.dispatches;
  }

  getStockReturns(): StockReturn[] {
    return this.stockReturns;
  }

  getVisits(): CustomerVisit[] {
    return this.visits;
  }

  getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  createSalesOrder(orderData: Partial<SalesOrder>): SalesOrder {
    const newOrder: SalesOrder = {
      id: `so-${Date.now()}`,
      orderNumber: `ORD-2026-${String(this.salesOrders.length + 1).padStart(4, '0')}`,
      customerId: orderData.customerId || '',
      customerName: orderData.customerName || '',
      customerCode: orderData.customerCode || '',
      salesUserId: orderData.salesUserId || '',
      salesUserName: orderData.salesUserName || '',
      orderDate: orderData.orderDate || new Date().toISOString().split('T')[0],
      status: 'SUBMITTED',
      subtotal: orderData.subtotal || 0,
      discountAmount: orderData.discountAmount || 0,
      taxAmount: orderData.taxAmount || 0,
      totalAmount: orderData.totalAmount || 0,
      items: orderData.items || [],
      creditCheckStatus: orderData.creditCheckStatus || 'GREEN',
      creditCheckNotes: orderData.creditCheckNotes,
      createdAt: new Date().toISOString(),
    };
    this.salesOrders.unshift(newOrder);
    syncOrderToSupabase(newOrder);
    return newOrder;
  }

  postInvoice(orderId: string, postedByUserId: string): { success: boolean; error?: string; invoice?: Invoice } {
    const orderIndex = this.salesOrders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) return { success: false, error: 'Sales order not found' };

    const order = this.salesOrders[orderIndex];
    if (order.status === 'INVOICED') return { success: false, error: 'Order already invoiced' };

    const customerIndex = this.customers.findIndex((c) => c.id === order.customerId);
    if (customerIndex === -1) return { success: false, error: 'Customer not found' };

    const customer = this.customers[customerIndex];
    const previousBalance = customer.currentBalance;
    const invoiceAmount = order.totalAmount;
    const newBalance = roundTo2(previousBalance + invoiceAmount);

    // Check stock availability for all items
    for (const item of order.items) {
      const bal = this.inventoryBalances.find((b) => b.skuId === item.skuId);
      if (!bal || bal.quantityOnHand < item.orderedQuantity) {
        return {
          success: false,
          error: `Insufficient stock for ${item.skuCode}. Required: ${item.orderedQuantity}, Available: ${bal?.quantityOnHand || 0}`,
        };
      }
    }

    // 1. Create Invoice
    const invoiceNumber = `INV-2026-${String(this.invoices.length + 1).padStart(4, '0')}`;
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      orderId: order.id,
      customerId: customer.id,
      customerName: customer.companyName,
      customerCode: customer.customerCode,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + customer.creditDays * 86400000).toISOString().split('T')[0],
      status: 'POSTED',
      paymentStatus: 'UNPAID',
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      taxAmount: order.taxAmount,
      totalAmount: invoiceAmount,
      previousBalance,
      newBalance,
      items: order.items.map((it, idx) => ({
        id: `ii-${Date.now()}-${idx}`,
        invoiceId: '',
        skuId: it.skuId,
        skuCode: it.skuCode,
        skuName: it.skuName,
        quantity: it.orderedQuantity,
        unitPrice: it.unitPrice,
        discountAmount: (it.unitPrice * it.orderedQuantity * it.discountPercent) / 100,
        taxAmount: 0,
        lineTotal: it.lineTotal,
      })),
      createdAt: new Date().toISOString(),
    };

    // 2. Atomic Inventory Deductions & Transactions
    for (const item of order.items) {
      const balIndex = this.inventoryBalances.findIndex((b) => b.skuId === item.skuId);
      if (balIndex !== -1) {
        const currentOnHand = this.inventoryBalances[balIndex].quantityOnHand;
        const newOnHand = currentOnHand - item.orderedQuantity;
        this.inventoryBalances[balIndex].quantityOnHand = newOnHand;
        this.inventoryBalances[balIndex].availableQuantity = newOnHand;

        this.inventoryTransactions.push({
          id: `tx-${Date.now()}-${item.skuId}`,
          transactionNumber: `TX-2026-${String(this.inventoryTransactions.length + 1).padStart(4, '0')}`,
          transactionType: 'SALES_OUT',
          warehouseId: 'wh-1',
          warehouseName: 'Lahore Central Warehouse',
          skuId: item.skuId,
          skuCode: item.skuCode,
          skuName: item.skuName,
          quantity: item.orderedQuantity,
          unitPrice: item.unitPrice,
          referenceModule: 'INVOICE',
          referenceId: invoice.id,
          notes: `Automatic stock deduction for invoice ${invoice.invoiceNumber}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Customer Ledger Debit Entry
    const ledgerEntry: LedgerEntry = {
      id: `led-${Date.now()}`,
      entryNumber: `LED-2026-${String(this.ledgerEntries.length + 1).padStart(4, '0')}`,
      customerId: customer.id,
      customerName: customer.companyName,
      entryDate: invoice.invoiceDate,
      transactionType: 'INVOICE',
      referenceModule: 'INVOICE',
      referenceId: invoice.id,
      description: `Sales Invoice ${invoice.invoiceNumber}`,
      debitAmount: invoiceAmount,
      creditAmount: 0,
      runningBalance: newBalance,
      createdAt: new Date().toISOString(),
    };
    this.ledgerEntries.push(ledgerEntry);

    // 4. Update Customer Balance
    this.customers[customerIndex].currentBalance = newBalance;

    // 5. Update Order Status
    this.salesOrders[orderIndex].status = 'INVOICED';

    this.invoices.unshift(invoice);

    // Sync to Supabase
    syncInvoiceAndLedgerToSupabase(
      invoice,
      customer.id,
      newBalance,
      ledgerEntry,
      order.items.map((it) => this.inventoryBalances.find((b) => b.skuId === it.skuId)).filter(Boolean) as InventoryBalance[],
      this.inventoryTransactions.filter((tx) => tx.referenceId === invoice.id)
    );

    return { success: true, invoice };
  }

  createDirectInvoice(invData: Partial<Invoice>, postedByUserId: string): { success: boolean; error?: string; invoice?: Invoice } {
    const customerIndex = this.customers.findIndex((c) => c.id === invData.customerId);
    if (customerIndex === -1) return { success: false, error: 'Customer not found' };

    const customer = this.customers[customerIndex];
    const previousBalance = customer.currentBalance;
    const invoiceAmount = invData.totalAmount || 0;
    const newBalance = roundTo2(previousBalance + invoiceAmount);

    // Check stock availability
    if (invData.items) {
      for (const item of invData.items) {
        const bal = this.inventoryBalances.find((b) => b.skuId === item.skuId);
        if (!bal || bal.quantityOnHand < item.quantity) {
          return {
            success: false,
            error: `Insufficient stock for ${item.skuCode}. Required: ${item.quantity}, Available: ${bal?.quantityOnHand || 0}`,
          };
        }
      }
    }

    const invoiceNumber = `INV-2026-${String(this.invoices.length + 1).padStart(4, '0')}`;
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      customerId: customer.id,
      customerName: customer.companyName,
      customerCode: customer.customerCode,
      invoiceDate: invData.invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: invData.dueDate || new Date(Date.now() + customer.creditDays * 86400000).toISOString().split('T')[0],
      status: 'POSTED',
      paymentStatus: 'UNPAID',
      subtotal: invData.subtotal || 0,
      discountAmount: invData.discountAmount || 0,
      taxAmount: invData.taxAmount || 0,
      totalAmount: invoiceAmount,
      previousBalance,
      newBalance,
      items: (invData.items || []).map((it, idx) => ({
        id: `ii-${Date.now()}-${idx}`,
        invoiceId: '',
        skuId: it.skuId,
        skuCode: it.skuCode,
        skuName: it.skuName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountAmount: it.discountAmount || 0,
        taxAmount: it.taxAmount || 0,
        lineTotal: it.lineTotal,
      })),
      createdBy: 'Farhan Qureshi',
      createdAt: new Date().toISOString(),
    };

    // Deduct stock and add transaction
    if (invData.items) {
      for (const item of invData.items) {
        const balIndex = this.inventoryBalances.findIndex((b) => b.skuId === item.skuId);
        if (balIndex !== -1) {
          const currentOnHand = this.inventoryBalances[balIndex].quantityOnHand;
          const newOnHand = currentOnHand - item.quantity;
          this.inventoryBalances[balIndex].quantityOnHand = newOnHand;
          this.inventoryBalances[balIndex].availableQuantity = newOnHand;

          this.inventoryTransactions.push({
            id: `tx-${Date.now()}-${item.skuId}`,
            transactionNumber: `TX-2026-${String(this.inventoryTransactions.length + 1).padStart(4, '0')}`,
            transactionType: 'SALES_OUT',
            warehouseId: 'wh-1',
            warehouseName: 'Lahore Central Warehouse',
            skuId: item.skuId,
            skuCode: item.skuCode,
            skuName: item.skuName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            referenceModule: 'INVOICE',
            referenceId: invoice.id,
            notes: `Automatic stock deduction for direct invoice ${invoice.invoiceNumber}`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // Ledger Entry
    const ledgerEntry: LedgerEntry = {
      id: `led-${Date.now()}`,
      entryNumber: `LED-2026-${String(this.ledgerEntries.length + 1).padStart(4, '0')}`,
      customerId: customer.id,
      customerName: customer.companyName,
      entryDate: invoice.invoiceDate,
      transactionType: 'INVOICE',
      referenceModule: 'INVOICE',
      referenceId: invoice.id,
      description: `Direct Sales Invoice ${invoice.invoiceNumber}`,
      debitAmount: invoiceAmount,
      creditAmount: 0,
      runningBalance: newBalance,
      createdAt: new Date().toISOString(),
    };
    this.ledgerEntries.push(ledgerEntry);

    // Update customer balance
    this.customers[customerIndex].currentBalance = newBalance;

    this.invoices.unshift(invoice);

    // Sync to Supabase
    syncInvoiceAndLedgerToSupabase(
      invoice,
      customer.id,
      newBalance,
      ledgerEntry,
      (invData.items || []).map((it) => this.inventoryBalances.find((b) => b.skuId === it.skuId)).filter(Boolean) as InventoryBalance[],
      this.inventoryTransactions.filter((tx) => tx.referenceId === invoice.id)
    );

    // Audit Log
    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userId: postedByUserId,
      userName: 'Farhan Qureshi',
      action: 'DIRECT_CREATE_INVOICE',
      module: 'ACCOUNTS',
      recordType: 'INVOICE',
      recordId: invoice.id,
      newState: { totalAmount: invoiceAmount, customer: customer.customerCode },
      createdAt: new Date().toISOString(),
    });

    return { success: true, invoice };
  }

  recordRecovery(recoveryData: Partial<Recovery>): Recovery {
    const recovery: Recovery = {
      id: `rec-${Date.now()}`,
      recoveryNumber: recoveryData.recoveryNumber || `REC-2026-${String(this.recoveries.length + 1).padStart(4, '0')}`,
      customerId: recoveryData.customerId || '',
      customerName: recoveryData.customerName || '',
      customerCode: recoveryData.customerCode || '',
      salesUserId: recoveryData.salesUserId || '',
      salesUserName: recoveryData.salesUserName || '',
      collectionDate: recoveryData.collectionDate || new Date().toISOString().split('T')[0],
      amount: recoveryData.amount || 0,
      paymentMode: recoveryData.paymentMode || 'CASH',
      instrumentNumber: recoveryData.instrumentNumber,
      bankName: recoveryData.bankName,
      status: 'PENDING_VERIFICATION',
      remarks: recoveryData.remarks,
      createdAt: new Date().toISOString(),
    };
    this.recoveries.unshift(recovery);
    syncRecoveryToSupabase(recovery);
    return recovery;
  }

  verifyRecovery(recoveryId: string, verifiedByUserId: string): { success: boolean; error?: string } {
    const recIndex = this.recoveries.findIndex((r) => r.id === recoveryId);
    if (recIndex === -1) return { success: false, error: 'Recovery record not found' };

    const rec = this.recoveries[recIndex];
    if (rec.status === 'VERIFIED') return { success: false, error: 'Already verified' };

    const custIndex = this.customers.findIndex((c) => c.id === rec.customerId);
    if (custIndex === -1) return { success: false, error: 'Customer not found' };

    const customer = this.customers[custIndex];
    const previousBalance = customer.currentBalance;
    const newBalance = roundTo2(previousBalance - rec.amount);

    // 1. Post Credit to Customer Ledger
    this.ledgerEntries.push({
      id: `led-${Date.now()}`,
      entryNumber: `LED-2026-${String(this.ledgerEntries.length + 1).padStart(4, '0')}`,
      customerId: customer.id,
      customerName: customer.companyName,
      entryDate: new Date().toISOString().split('T')[0],
      transactionType: 'RECOVERY',
      referenceModule: 'RECOVERY',
      referenceId: rec.id,
      description: `Payment Recovery (${rec.paymentMode}${rec.instrumentNumber ? ` - ${rec.instrumentNumber}` : ''})`,
      debitAmount: 0,
      creditAmount: rec.amount,
      runningBalance: newBalance,
      createdAt: new Date().toISOString(),
    });

    // 2. Update Customer Balance
    this.customers[custIndex].currentBalance = newBalance;

    // 3. Mark Recovery as Verified
    const verifiedRec = this.recoveries[recIndex];
    verifiedRec.status = 'VERIFIED';
    verifiedRec.verifiedBy = 'Farhan Qureshi (Accounts)';
    verifiedRec.verifiedAt = new Date().toISOString();

    // Sync to Supabase
    syncRecoveryToSupabase(verifiedRec, { customerId: customer.id, balance: newBalance });

    return { success: true };
  }

  logCustomerVisit(visitData: Partial<CustomerVisit>): CustomerVisit {
    const visit: CustomerVisit = {
      id: `vis-${Date.now()}`,
      customerId: visitData.customerId || '',
      customerName: visitData.customerName || '',
      salesUserId: visitData.salesUserId || '',
      salesUserName: visitData.salesUserName || '',
      checkinTime: visitData.checkinTime || new Date().toISOString(),
      checkoutTime: visitData.checkoutTime || new Date().toISOString(),
      latitude: visitData.latitude || 31.5798,
      longitude: visitData.longitude || 74.3168,
      purpose: visitData.purpose || 'Routine Visit',
      notes: visitData.notes || '',
      orderPlaced: !!visitData.orderPlaced,
      recoveryCollected: !!visitData.recoveryCollected,
      nextFollowupDate: visitData.nextFollowupDate,
      photoUrl: visitData.photoUrl,
    };
    this.visits.unshift(visit);
    syncVisitToSupabase(visit);
    return visit;
  }

  getRegistrationRequests(): CustomerRegistrationRequest[] {
    return this.registrationRequests;
  }

  addRegistrationRequest(reqData: Partial<CustomerRegistrationRequest>): CustomerRegistrationRequest {
    const newRequest: CustomerRegistrationRequest = {
      id: `req-${Date.now()}`,
      businessName: reqData.businessName || '',
      ownerName: reqData.ownerName || '',
      contactNumber: reqData.contactNumber || '',
      cnic: reqData.cnic || '',
      address: reqData.address || '',
      latitude: reqData.latitude || 31.5204,
      longitude: reqData.longitude || 74.3587,
      city: reqData.city || 'Lahore',
      region: reqData.region || 'Punjab North',
      type: reqData.type || 'DEALER',
      proposedCreditLimit: reqData.proposedCreditLimit || 0,
      proposedCreditDays: reqData.proposedCreditDays || 30,
      proposedOpeningBalance: reqData.proposedOpeningBalance || 0,
      additionalNotes: reqData.additionalNotes,
      salesUserId: reqData.salesUserId || 'u-2',
      salesUserName: reqData.salesUserName || 'Rashid Ali',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
    };
    this.registrationRequests.unshift(newRequest);

    // Audit log
    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userId: newRequest.salesUserId,
      userName: newRequest.salesUserName,
      action: 'SUBMIT_REGISTRATION_REQUEST',
      module: 'SALES_RECOVERY',
      recordType: 'CUSTOMER_REGISTRATION',
      recordId: newRequest.id,
      newState: { businessName: newRequest.businessName, type: newRequest.type },
      createdAt: new Date().toISOString(),
    });

    return newRequest;
  }

  approveRegistrationRequest(requestId: string, approvedBy: string, overrideLimit?: number, overrideDays?: number): { success: boolean; customer?: Customer } {
    const reqIndex = this.registrationRequests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return { success: false };

    const req = this.registrationRequests[reqIndex];
    if (req.status !== 'PENDING_APPROVAL') return { success: false };

    // Mark request approved
    req.status = 'APPROVED';
    req.approvedAt = new Date().toISOString();

    // Determine customer code sequence
    const nextNum = this.customers.filter(c => c.type === req.type).length + 1;
    const prefix = req.type === 'DISTRIBUTOR' ? 'DST' : 'DLR';
    const customerCode = `CUST-${prefix}-${String(nextNum).padStart(3, '0')}`;

    const limit = overrideLimit !== undefined ? overrideLimit : req.proposedCreditLimit;
    const days = overrideDays !== undefined ? overrideDays : req.proposedCreditDays;

    // Create the approved Customer record
    const newCustomer: Customer = {
      id: `c-${Date.now()}`,
      customerCode,
      companyName: req.businessName,
      contactPerson: req.ownerName,
      phone: req.contactNumber,
      email: `${req.businessName.toLowerCase().replace(/\s+/g, '')}@nlink360.pk`,
      type: req.type,
      cnic: req.cnic,
      address: req.address,
      city: req.city,
      region: req.region,
      creditLimit: limit,
      creditDays: days,
      openingBalance: req.proposedOpeningBalance,
      currentBalance: req.proposedOpeningBalance,
      isCreditLocked: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.customers.push(newCustomer);
    syncCustomerToSupabase(newCustomer);

    // Add Audit Log
    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userId: 'u-1',
      userName: approvedBy,
      action: 'APPROVE_CUSTOMER_REGISTRATION',
      module: 'MANAGEMENT',
      recordType: 'CUSTOMER',
      recordId: newCustomer.id,
      newState: { customerCode, companyName: newCustomer.companyName, creditLimit: limit },
      createdAt: new Date().toISOString(),
    });

    return { success: true, customer: newCustomer };
  }

  rejectRegistrationRequest(requestId: string, reason: string): { success: boolean } {
    const reqIndex = this.registrationRequests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) return { success: false };

    const req = this.registrationRequests[reqIndex];
    if (req.status !== 'PENDING_APPROVAL') return { success: false };

    req.status = 'REJECTED';
    req.rejectionReason = reason;

    // Add Audit Log
    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userId: 'u-1',
      userName: 'Management Office',
      action: 'REJECT_CUSTOMER_REGISTRATION',
      module: 'MANAGEMENT',
      recordType: 'CUSTOMER_REGISTRATION',
      recordId: req.id,
      newState: { businessName: req.businessName, reason },
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  }

  addCustomerDirectly(custData: Partial<Customer>): Customer {
    const nextNum = this.customers.filter(c => c.type === (custData.type || 'DEALER')).length + 1;
    const prefix = custData.type === 'DISTRIBUTOR' ? 'DST' : 'DLR';
    const customerCode = `CUST-${prefix}-${String(nextNum).padStart(3, '0')}`;

    const newCustomer: Customer = {
      id: `c-${Date.now()}`,
      customerCode,
      companyName: custData.companyName || '',
      contactPerson: custData.contactPerson || '',
      phone: custData.phone || '',
      email: custData.email || `${(custData.companyName || 'cust').toLowerCase().replace(/\s+/g, '')}@nlink360.pk`,
      type: custData.type || 'DEALER',
      cnic: custData.cnic || '35201-0000000-0',
      address: custData.address || '',
      city: custData.city || 'Lahore',
      region: custData.region || 'Punjab North',
      creditLimit: custData.creditLimit || 0,
      creditDays: custData.creditDays || 30,
      openingBalance: custData.openingBalance || 0,
      currentBalance: custData.openingBalance || 0,
      isCreditLocked: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.customers.push(newCustomer);
    syncCustomerToSupabase(newCustomer);

    // Audit log
    this.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userId: 'u-1',
      userName: 'Management Office',
      action: 'CREATE_CUSTOMER_DIRECT',
      module: 'MANAGEMENT',
      recordType: 'CUSTOMER',
      recordId: newCustomer.id,
      newState: { customerCode, companyName: newCustomer.companyName },
      createdAt: new Date().toISOString(),
    });

    return newCustomer;
  }
}

export const inMemoryStore = new InMemoryStoreService();
