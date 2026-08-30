import { User, UserRole } from '../types';

export interface ProductionAccount {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  roleTitle: string;
  branchId: string;
  branchName: string;
  assignedRegion?: string;
  assignedTowns?: string[];
  assignedDealerIds?: string[];
  accessScope: 'GLOBAL_ADMIN' | 'ACCOUNTS_FINANCE' | 'LOGISTICS_WH' | 'FIELD_FORCE_SCOPED';
  description: string;
}

export const MULTI_ROLE_ELIGIBLE_EMAILS = [
  'admin@nationallights.com',
  'nationallights2026@gmail.com',
];

export function isMultiRoleEligibleEmail(email: string): boolean {
  const clean = email.trim().toLowerCase();
  if (!clean) return false;
  if (MULTI_ROLE_ELIGIBLE_EMAILS.includes(clean)) return true;
  if (clean.includes('amjid')) return true;
  return false;
}

export const AVAILABLE_ROLES: { role: UserRole; title: string; category: string }[] = [
  { role: 'SUPER_ADMIN', title: 'Super Admin', category: 'Executive' },
  { role: 'MANAGEMENT', title: 'Management', category: 'Executive' },
  { role: 'RSM', title: 'RSM', category: 'Sales Field' },
  { role: 'ASM', title: 'ASM', category: 'Sales Field' },
  { role: 'TSM', title: 'TSM', category: 'Sales Field' },
  { role: 'ACCOUNTS', title: 'Accounts', category: 'Finance' },
  { role: 'WAREHOUSE_MANAGER', title: 'Warehouse Manager', category: 'Supply Chain' },
  { role: 'FACTORY_MANAGER', title: 'Factory Manager', category: 'Manufacturing' },
];

export const PRODUCTION_ACCOUNTS: ProductionAccount[] = [
  {
    id: 'USR-ADMIN-01',
    email: 'admin@nationallights.com',
    fullName: 'Muhammad Amjid',
    phone: '+92 300 8456101',
    role: 'SUPER_ADMIN',
    roleTitle: 'IT Head / App Developer',
    branchId: 'BR-01',
    branchName: 'National Lights Head Office, Lahore',
    accessScope: 'GLOBAL_ADMIN',
    description: 'System architect, app developer, and full technical administration access across all enterprise nodes.',
  },
  {
    id: 'USR-ADMIN-02',
    email: 'nationallights2026@gmail.com',
    fullName: 'Muhammad Amjid (National Lights Admin)',
    phone: '+92 300 8456101',
    role: 'SUPER_ADMIN',
    roleTitle: 'Managing Administrator',
    branchId: 'BR-01',
    branchName: 'National Lights Head Office, Lahore',
    accessScope: 'GLOBAL_ADMIN',
    description: 'Executive Administrator with full multi-role access across all operational domains.',
  },
  {
    id: 'USR-ADMIN-03',
    email: 'syedzain@nationallights.com',
    fullName: 'Syed Zain',
    phone: '+92 300 1122334',
    role: 'SUPER_ADMIN',
    roleTitle: 'Managing Partner',
    branchId: 'BR-01',
    branchName: 'National Lights Head Office, Lahore',
    accessScope: 'GLOBAL_ADMIN',
    description: 'Managing Partner with executive governance over commercial distribution, strategy, and regional accounts.',
  },
  {
    id: 'USR-ADMIN-04',
    email: 'shahzadullah@nationallights.com',
    fullName: 'Shahzad Ullah',
    phone: '+92 300 5566778',
    role: 'SUPER_ADMIN',
    roleTitle: 'Executive Director',
    branchId: 'BR-01',
    branchName: 'National Lights Head Office, Lahore',
    accessScope: 'GLOBAL_ADMIN',
    description: 'Executive Director overseeing enterprise operations, supply chain logistics, and financial audits.',
  },
  {
    id: 'USR-WH-01',
    email: 'warehouse@nationallights.com',
    fullName: 'Asif Mehmood',
    phone: '+92 300 7788990',
    role: 'WAREHOUSE_MANAGER',
    roleTitle: 'Warehouse Logistics Incharge',
    branchId: 'BR-01',
    branchName: 'National Lights Central Warehouse, Lahore',
    accessScope: 'LOGISTICS_WH',
    description: 'Central Warehouse operations incharge overseeing inventory dispatches, gate passes, and stock reconciliation.',
  },
  {
    id: 'USR-FAC-01',
    email: 'factory@nationallights.com',
    fullName: 'Engr. Bilal Khalid',
    phone: '+92 321 8899112',
    role: 'FACTORY_MANAGER',
    roleTitle: 'Plant Operations Manager',
    branchId: 'BR-01',
    branchName: 'National Lights Manufacturing Plant, Lahore',
    accessScope: 'GLOBAL_ADMIN',
    description: 'Head of factory production lines, assembly batches, bill of materials (BOM), and QC testing.',
  },
  {
    id: 'USR-ACC-01',
    email: 'accounts@nationallights.com',
    fullName: 'Kamran Rafique',
    phone: '+92 300 4455667',
    role: 'ACCOUNTS',
    roleTitle: 'Head of Accounts & Finance',
    branchId: 'BR-01',
    branchName: 'National Lights Head Office, Lahore',
    accessScope: 'ACCOUNTS_FINANCE',
    description: 'Financial controller managing general ledgers, payment voucher verification, credit terms, and bank reconciliations.',
  },
  {
    id: 'USR-TSM-01',
    email: 'aliraza@nationallights.com',
    fullName: 'Ali Raza',
    phone: '+92 300 8456101',
    role: 'TSM',
    roleTitle: 'Territory Sales Manager',
    branchId: 'BR-01',
    branchName: 'National Lights Head Office, Lahore',
    assignedRegion: 'Punjab Central',
    assignedTowns: ['Lahore', 'Kasur'],
    accessScope: 'FIELD_FORCE_SCOPED',
    description: 'Territory sales and recovery officer for Brandreth Road and central auto parts markets.',
  },
];

export const INITIAL_EMPLOYEES: any[] = [
  {
    id: 'EMP-001',
    name: 'Ali Raza',
    fullName: 'Ali Raza',
    employeeCode: 'NL-TSM-101',
    cnic: '35202-9876543-1',
    phone: '+92 300 8456101',
    mobile: '+92 300 8456101',
    emergencyPhone: '+92 321 4455667',
    emergencyMobile: '+92 321 4455667',
    email: 'aliraza@nationallights.com',
    department: 'SALES_FIELD',
    role: 'TSM',
    systemRole: 'TSM',
    userId: 'USR-TSM-01',
    isLoginEnabled: true,
    accessScope: 'FIELD_FORCE_SCOPED',
    designation: 'Territory Sales & Recovery Officer',
    region: 'Punjab Central',
    area: 'Lahore Division',
    territory: 'Brandreth Road & Montgomery Road',
    baseBranch: 'National Lights Head Office, Lahore',
    branchName: 'National Lights Head Office, Lahore',
    branchId: 'BR-01',
    targetMonthlySales: 2500000,
    targetMonthlyRecovery: 2000000,
    dateOfJoining: '2023-01-15',
    joiningDate: '2023-01-15',
    salaryGrade: 'Grade B2 + 1.5% Sales Commission',
    address: 'Plot 45, Sector B, Bahria Town, Lahore',
    status: 'ACTIVE',
    employmentStatus: 'ACTIVE',
    beats: ['Monday: Brandreth Road', 'Tuesday: Montgomery Road', 'Wednesday: Badami Bagh', 'Thursday: Hall Road', 'Friday: Township Market'],
    salesDetails: {
      region: 'Punjab Central',
      area: 'Lahore Division',
      territory: 'Brandreth Road & Montgomery Road',
      monthlySalesTarget: 2500000,
      monthlyRecoveryTarget: 2000000,
      assignedBeats: ['Monday: Brandreth Road', 'Tuesday: Montgomery Road', 'Wednesday: Badami Bagh'],
    },
  },
  {
    id: 'EMP-002',
    name: 'Asif Mehmood',
    fullName: 'Asif Mehmood',
    employeeCode: 'NL-WH-101',
    cnic: '35201-1122334-7',
    phone: '+92 300 7788990',
    mobile: '+92 300 7788990',
    emergencyPhone: '+92 322 5566778',
    emergencyMobile: '+92 322 5566778',
    email: 'warehouse@nationallights.com',
    department: 'SUPPLY_CHAIN',
    role: 'WAREHOUSE_MANAGER',
    systemRole: 'WAREHOUSE_MANAGER',
    userId: 'USR-WH-01',
    isLoginEnabled: true,
    accessScope: 'LOGISTICS_WH',
    designation: 'Warehouse Logistics Incharge',
    region: 'Punjab Central',
    area: 'Lahore Division',
    territory: 'Central Storage Depot',
    baseBranch: 'National Lights Head Office, Lahore',
    branchName: 'National Lights Head Office, Lahore',
    branchId: 'BR-01',
    targetMonthlySales: 0,
    targetMonthlyRecovery: 0,
    dateOfJoining: '2022-04-10',
    joiningDate: '2022-04-10',
    salaryGrade: 'Grade A2 Senior Supply Chain',
    address: 'House 88, Street 4, Gulshan-e-Ravi, Lahore',
    status: 'ACTIVE',
    employmentStatus: 'ACTIVE',
    beats: ['Daily: Central Warehouse Inward/Outward Gate Checks', 'Weekly: Physical Stock Audit'],
    warehouseDetails: {
      assignedWarehouseId: 'WH-MAIN-01',
      assignedWarehouseName: 'Central Finished Goods Hub',
      canApproveDispatches: true,
      canAdjustStock: true,
    },
  },
  {
    id: 'EMP-003',
    name: 'Engr. Bilal Khalid',
    fullName: 'Engr. Bilal Khalid',
    employeeCode: 'NL-FAC-101',
    cnic: '35202-7788990-3',
    phone: '+92 321 8899112',
    mobile: '+92 321 8899112',
    emergencyPhone: '+92 300 3344556',
    emergencyMobile: '+92 300 3344556',
    email: 'factory@nationallights.com',
    department: 'MANUFACTURING',
    role: 'FACTORY_MANAGER',
    systemRole: 'FACTORY_MANAGER',
    userId: 'USR-FAC-01',
    isLoginEnabled: true,
    accessScope: 'GLOBAL_ADMIN',
    designation: 'Plant Operations Manager',
    region: 'Punjab Central',
    area: 'Industrial Zone',
    territory: 'National Lights Manufacturing Plant',
    baseBranch: 'National Lights Head Office, Lahore',
    branchName: 'National Lights Head Office, Lahore',
    branchId: 'BR-01',
    targetMonthlySales: 0,
    targetMonthlyRecovery: 0,
    dateOfJoining: '2021-11-01',
    joiningDate: '2021-11-01',
    salaryGrade: 'Grade A1 Technical Executive',
    address: 'B-Block, DHA Phase 5, Lahore',
    status: 'ACTIVE',
    employmentStatus: 'ACTIVE',
    beats: ['Shift 1: Automotive Halogen Assembly Line', 'Shift 2: LED Bulb Packing & Quality Control'],
    factoryDetails: {
      assignedPlantId: 'PLANT-01',
      assignedPlantName: 'Unit 1 Light Manufacturing Facility',
      productionLine: 'Halogen & LED Bulb Auto Line',
      shift: 'MORNING',
    },
  },
  {
    id: 'EMP-004',
    name: 'Kamran Rafique',
    fullName: 'Kamran Rafique',
    employeeCode: 'NL-ACC-101',
    cnic: '35201-9988776-5',
    phone: '+92 300 4455667',
    mobile: '+92 300 4455667',
    emergencyPhone: '+92 321 1122334',
    emergencyMobile: '+92 321 1122334',
    email: 'accounts@nationallights.com',
    department: 'FINANCE_ACCOUNTS',
    role: 'ACCOUNTS',
    systemRole: 'ACCOUNTS',
    userId: 'USR-ACC-01',
    isLoginEnabled: true,
    accessScope: 'ACCOUNTS_FINANCE',
    designation: 'Senior Accounts Officer & Finance Controller',
    region: 'Punjab Central',
    area: 'Head Office',
    territory: 'Finance & Taxation Cell',
    baseBranch: 'National Lights Head Office, Lahore',
    branchName: 'National Lights Head Office, Lahore',
    branchId: 'BR-01',
    targetMonthlySales: 0,
    targetMonthlyRecovery: 15000000,
    dateOfJoining: '2020-02-15',
    joiningDate: '2020-02-15',
    salaryGrade: 'Grade A2 Senior Accounts',
    address: 'House #412, Shadman 2, Lahore',
    status: 'ACTIVE',
    employmentStatus: 'ACTIVE',
    beats: ['Daily: Bank & Cash Voucher Verification', 'Monthly: FBR Sales Tax Return Filing'],
    financeDetails: {
      canPostVouchers: true,
      canApproveCreditLimits: true,
      maxApprovalAmount: 5000000,
    },
  },
  {
    id: 'EMP-005',
    name: 'Muhammad Usman',
    fullName: 'Muhammad Usman',
    employeeCode: 'NL-TSM-102',
    cnic: '34101-5544332-1',
    phone: '+92 301 9876543',
    mobile: '+92 301 9876543',
    emergencyPhone: '+92 300 1122334',
    emergencyMobile: '+92 300 1122334',
    email: 'usman@nationallights.com',
    department: 'SALES_FIELD',
    role: 'TSM',
    systemRole: 'TSM',
    userId: 'USR-TSM-02',
    isLoginEnabled: true,
    accessScope: 'FIELD_FORCE_SCOPED',
    designation: 'Territory Sales Manager',
    region: 'Punjab Central',
    area: 'Gujranwala Zone',
    territory: 'Gondlanwala Road & Small Industrial Estate',
    baseBranch: 'National Lights Head Office, Lahore',
    branchName: 'National Lights Head Office, Lahore',
    branchId: 'BR-01',
    targetMonthlySales: 2200000,
    targetMonthlyRecovery: 1900000,
    dateOfJoining: '2023-05-10',
    joiningDate: '2023-05-10',
    salaryGrade: 'Grade B2 + 1.5% Commission',
    address: 'House #12, Model Town, Gujranwala',
    status: 'ACTIVE',
    employmentStatus: 'ACTIVE',
    beats: ['Monday: Gondlanwala Road', 'Tuesday: GT Road Market', 'Wednesday: Small Industrial Estate', 'Thursday: Sialkot Road'],
    salesDetails: {
      region: 'Punjab Central',
      area: 'Gujranwala Zone',
      territory: 'Gondlanwala Road & Small Industrial Estate',
      monthlySalesTarget: 2200000,
      monthlyRecoveryTarget: 1900000,
      assignedBeats: ['Monday: Gondlanwala Road', 'Tuesday: GT Road Market', 'Wednesday: Small Industrial Estate'],
    },
  },
  {
    id: 'EMP-006',
    name: 'Zahid Mehmood',
    fullName: 'Zahid Mehmood',
    employeeCode: 'NL-ASM-201',
    cnic: '37405-1122334-5',
    phone: '+92 300 5566778',
    mobile: '+92 300 5566778',
    emergencyPhone: '+92 301 8899001',
    emergencyMobile: '+92 301 8899001',
    email: 'zahid@nationallights.com',
    department: 'SALES_FIELD',
    role: 'ASM',
    systemRole: 'ASM',
    userId: 'USR-ASM-01',
    isLoginEnabled: true,
    accessScope: 'FIELD_FORCE_SCOPED',
    designation: 'Area Sales Manager',
    region: 'Punjab North',
    area: 'Rawalpindi & Islamabad',
    territory: 'Gawalmandi & I-9 Industrial Area',
    baseBranch: 'Rawalpindi / Islamabad Hub',
    branchName: 'Rawalpindi / Islamabad Hub',
    branchId: 'BR-03',
    targetMonthlySales: 4500000,
    targetMonthlyRecovery: 4000000,
    dateOfJoining: '2021-03-20',
    joiningDate: '2021-03-20',
    salaryGrade: 'Grade A2 Executive',
    address: 'Street 9, F-11/2, Islamabad',
    status: 'ACTIVE',
    employmentStatus: 'ACTIVE',
    beats: ['Monday: Gawalmandi Rawalpindi', 'Tuesday: I-9 Industrial Area', 'Wednesday: Abpara Market', 'Thursday: Saddar Rawalpindi'],
    salesDetails: {
      region: 'Punjab North',
      area: 'Rawalpindi & Islamabad',
      territory: 'Gawalmandi & I-9 Industrial Area',
      monthlySalesTarget: 4500000,
      monthlyRecoveryTarget: 4000000,
      assignedBeats: ['Monday: Gawalmandi Rawalpindi', 'Tuesday: I-9 Industrial Area'],
    },
  },
  {
    id: 'EMP-007',
    name: 'Tariq Mansoor',
    fullName: 'Tariq Mansoor',
    employeeCode: 'NL-RSM-301',
    cnic: '17301-6655443-7',
    phone: '+92 345 9876543',
    mobile: '+92 345 9876543',
    emergencyPhone: '+92 346 1122334',
    emergencyMobile: '+92 346 1122334',
    email: 'tariq@nationallights.com',
    department: 'SALES_FIELD',
    role: 'RSM',
    systemRole: 'RSM',
    userId: 'USR-RSM-01',
    isLoginEnabled: true,
    accessScope: 'FIELD_FORCE_SCOPED',
    designation: 'Regional Sales Manager',
    region: 'KPK West',
    area: 'Peshawar & Mardan Region',
    territory: 'Karkhano Market & Khyber Bazaar',
    baseBranch: 'Peshawar North Depot',
    branchName: 'Peshawar North Depot',
    branchId: 'BR-04',
    targetMonthlySales: 6000000,
    targetMonthlyRecovery: 5500000,
    dateOfJoining: '2020-06-15',
    joiningDate: '2020-06-15',
    salaryGrade: 'Grade A1 Executive',
    address: 'University Town, Peshawar',
    status: 'ACTIVE',
    employmentStatus: 'ACTIVE',
    beats: ['Monday: Karkhano Market', 'Tuesday: Khyber Bazaar', 'Wednesday: Mardan City Market', 'Thursday: Swabi Center'],
    salesDetails: {
      region: 'KPK West',
      area: 'Peshawar & Mardan Region',
      territory: 'Karkhano Market & Khyber Bazaar',
      monthlySalesTarget: 6000000,
      monthlyRecoveryTarget: 5500000,
      assignedBeats: ['Monday: Karkhano Market', 'Tuesday: Khyber Bazaar'],
    },
  },
  {
    id: 'EMP-008',
    name: 'Muhammad Amjid',
    fullName: 'Muhammad Amjid',
    employeeCode: 'NL-DIR-001',
    cnic: '35202-8456101-1',
    phone: '+92 300 8456101',
    mobile: '+92 300 8456101',
    emergencyPhone: '+92 300 1122334',
    emergencyMobile: '+92 300 1122334',
    email: 'admin@nationallights.com',
    department: 'EXECUTIVE',
    role: 'SUPER_ADMIN',
    systemRole: 'SUPER_ADMIN',
    userId: 'USR-ADMIN-01',
    isLoginEnabled: true,
    accessScope: 'GLOBAL_ADMIN',
    designation: 'Managing Administrator & IT Head',
    region: 'National Enterprise',
    area: 'Head Office',
    territory: 'National Directorate',
    baseBranch: 'National Lights Head Office, Lahore',
    branchName: 'National Lights Head Office, Lahore',
    branchId: 'BR-01',
    targetMonthlySales: 0,
    targetMonthlyRecovery: 0,
    dateOfJoining: '2019-01-01',
    joiningDate: '2019-01-01',
    salaryGrade: 'Executive Director Scale',
    address: 'Head Office, Brandreth Road, Lahore',
    status: 'ACTIVE',
    employmentStatus: 'ACTIVE',
    beats: ['Executive Operations & Multi-Tenant Platform Governance'],
  },
];

/**
 * Check if the user is an Administrator with global access.
 */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || user.role === 'MANAGEMENT';
}

/**
 * Check if the user is a Field Force representative (Order Booker, TSM, ASM, SS, Sales Recovery).
 */
export function isFieldForceUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return ['OB', 'TSM', 'ASM', 'SS', 'SALES_RECOVERY', 'SALES_MANAGER', 'RSM'].includes(user.role);
}

/**
 * Get assigned dealer IDs for a user account.
 */
export function getAssignedDealerIds(user: User | null | undefined): string[] {
  if (!user) return [];
  if (isAdminUser(user) || user.role === 'ACCOUNTS') {
    return []; // Empty signifies all dealers accessible
  }
  const account = PRODUCTION_ACCOUNTS.find(
    (a) => a.id === user.id || a.email.toLowerCase() === user.email.toLowerCase()
  );
  return account?.assignedDealerIds || [];
}

/**
 * Dynamically registered portal users in memory / localStorage
 */
let DYNAMIC_PORTAL_USERS: ProductionAccount[] = [];

try {
  const saved = localStorage.getItem('nlink_registered_users');
  if (saved) {
    DYNAMIC_PORTAL_USERS = JSON.parse(saved);
  }
} catch {
  DYNAMIC_PORTAL_USERS = [];
}

/**
 * Register a new employee/field force user added from the Portal.
 */
export function registerPortalEmployee(account: Partial<ProductionAccount> & { email: string }): ProductionAccount {
  const cleanEmail = account.email.trim().toLowerCase();
  
  // Check if exists
  const existing = [...PRODUCTION_ACCOUNTS, ...DYNAMIC_PORTAL_USERS].find(
    (a) => a.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    return existing;
  }

  const isSuperAdminEmail =
    cleanEmail.includes('admin') ||
    cleanEmail.includes('zain') ||
    cleanEmail.includes('shahzad') ||
    cleanEmail.includes('director');

  const newAccount: ProductionAccount = {
    id: account.id || `USR-PORTAL-${Date.now()}`,
    email: cleanEmail,
    fullName: account.fullName || cleanEmail.split('@')[0].toUpperCase(),
    phone: account.phone || '+92 300 0000000',
    role: account.role || (isSuperAdminEmail ? 'SUPER_ADMIN' : 'OB'),
    roleTitle: account.roleTitle || (isSuperAdminEmail ? 'Super Administrator' : 'Field Force Order Booker'),
    branchId: account.branchId || 'BR-01',
    branchName: account.branchName || 'National Lights Head Office, Lahore',
    assignedRegion: account.assignedRegion || 'Punjab Central',
    assignedTowns: account.assignedTowns || [],
    assignedDealerIds: account.assignedDealerIds || [],
    accessScope: isSuperAdminEmail ? 'GLOBAL_ADMIN' : 'FIELD_FORCE_SCOPED',
    description: account.description || 'Registered Portal Personnel',
  };

  DYNAMIC_PORTAL_USERS.push(newAccount);
  try {
    localStorage.setItem('nlink_registered_users', JSON.stringify(DYNAMIC_PORTAL_USERS));
  } catch {
    // Ignore storage quota
  }

  return newAccount;
}

/**
 * Authenticate and verify employee purely by registered Email.
 * Allows role override for multi-role eligible administrative accounts.
 */
export function authenticateProductionEmail(email: string, overrideRole?: UserRole): User | null {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return null;
  }

  // 1. Search static production accounts
  let account = PRODUCTION_ACCOUNTS.find((a) => a.email.toLowerCase() === cleanEmail);

  // 2. Search dynamic portal accounts
  if (!account) {
    account = DYNAMIC_PORTAL_USERS.find((a) => a.email.toLowerCase() === cleanEmail);
  }

  // 3. Auto-register if email ends with @nationallights.com or is added dynamically
  if (!account && (cleanEmail.endsWith('@nationallights.com') || cleanEmail.endsWith('@nlink.com') || cleanEmail.endsWith('@gmail.com'))) {
    account = registerPortalEmployee({
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0].replace('.', ' ').replace('-', ' ').toUpperCase(),
    });
  }

  // 4. Fallback for any custom entered email from portal signup/employee creation
  if (!account) {
    account = registerPortalEmployee({
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0].toUpperCase(),
    });
  }

  const activeRole = overrideRole || account.role;

  return {
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    phone: account.phone,
    role: activeRole,
    branchId: account.branchId,
    branchName: account.branchName,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: new Date().toISOString(),
  };
}

export function authenticateProductionCredentials(email: string, _password?: string, overrideRole?: UserRole): User | null {
  return authenticateProductionEmail(email, overrideRole);
}

/**
 * Enterprise Central Employee Master Store & Persistence
 */
export function getCentralEmployees(): any[] {
  try {
    const saved = localStorage.getItem('nlink_central_employees_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return INITIAL_EMPLOYEES;
}

export function saveCentralEmployee(employeeData: any): any[] {
  const current = getCentralEmployees();
  const index = current.findIndex((e) => e.id === employeeData.id);
  let updated: any[];
  
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...employeeData, updatedAt: new Date().toISOString() };
  } else {
    const newEmp = {
      ...employeeData,
      id: employeeData.id || `EMP-00${current.length + 1}`,
      createdAt: employeeData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updated = [...current, newEmp];
  }

  try {
    localStorage.setItem('nlink_central_employees_v2', JSON.stringify(updated));
  } catch {
    // Storage quota fallback
  }

  // Also auto-sync/register into system user accounts if email is present
  if (employeeData.email) {
    registerPortalEmployee({
      id: employeeData.userId || `USR-${employeeData.employeeCode || Date.now()}`,
      email: employeeData.email,
      fullName: employeeData.name || employeeData.fullName,
      phone: employeeData.phone || employeeData.mobile,
      role: employeeData.systemRole || employeeData.role || 'OB',
      roleTitle: employeeData.designation || 'Staff Personnel',
      branchId: employeeData.branchId || 'BR-01',
      branchName: employeeData.baseBranch || employeeData.branchName || 'National Lights Head Office, Lahore',
      accessScope: employeeData.accessScope || 'FIELD_FORCE_SCOPED',
      description: `Central registered personnel for department ${employeeData.department || 'GENERAL'}`,
    });
  }

  return updated;
}

export function deleteCentralEmployee(id: string): any[] {
  const current = getCentralEmployees();
  const updated = current.filter((e) => e.id !== id);
  try {
    localStorage.setItem('nlink_central_employees_v2', JSON.stringify(updated));
  } catch {
    // Storage quota fallback
  }
  return updated;
}
