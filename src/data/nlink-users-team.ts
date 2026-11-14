/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - User Management, Team Hierarchy & Target vs Achievement Matrix
 * Synced with Google Sheet tabs: Users, Team, Targets
 */

import { UserRole } from '../types';

export interface NLinkUser {
  id: string;
  employeeCode: string;
  userCode?: string;
  fullName: string;
  name?: string;
  email: string;
  phone: string;
  cnic?: string;
  role: UserRole;
  roleTitle: string;
  department: 'SALES_FIELD' | 'EXECUTIVE' | 'FINANCE_ACCOUNTS' | 'SUPPLY_CHAIN' | 'MANUFACTURING';
  region: string;
  area: string;
  territory: string;
  assignedTowns: string[];
  assignedBeats: string[];
  reportingManagerId?: string;
  reportingManagerName?: string;
  reportingTo?: string;
  
  // Targets & Performance (Monthly in PKR)
  monthlySalesTarget: number;
  monthlyRecoveryTarget: number;
  monthlyTarget?: number;
  mtdSalesAchieved: number;
  mtdRecoveryAchieved: number;
  todaySalesAchieved: number;
  todayRecoveryAchieved: number;
  
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  avatarInitials: string;
  zone?: string;
  joiningDate?: string;
  permissionGroup?: string;
  mustChangePassword?: boolean;
  initialPasswordStatus?:
    | 'PENDING_FIRST_LOGIN'
    | 'CHANGED'
    | 'TEMP_RESET_ISSUED'
    | 'ISSUED_CHANGE_REQUIRED'
    | 'RESET_REQUIRED';
  passwordUpdatedAt?: string;
  accountLocked?: boolean;
}

export const NLINK_TEAM_ROSTER: NLinkUser[] = [
  // --- 1. NSM & SOLE EXECUTIVE APPROVER ---
  {
    id: 'USR-001',
    employeeCode: 'EMP-001',
    fullName: 'Shahzad Ullah',
    email: 'shahzadullah@nationallight.pk',
    phone: '+92 300 1234567',
    role: 'SUPER_ADMIN',
    roleTitle: 'NSM (National Sales Manager) & Sole Approver',
    department: 'EXECUTIVE',
    region: 'National',
    area: 'National',
    territory: 'National',
    assignedTowns: ['All Pakistan', 'Peshawar', 'Lahore', 'Rawalpindi', 'Islamabad', 'Karachi'],
    assignedBeats: ['All Beats'],
    monthlySalesTarget: 50000000,
    monthlyRecoveryTarget: 45000000,
    mtdSalesAchieved: 0,
    mtdRecoveryAchieved: 0,
    todaySalesAchieved: 0,
    todayRecoveryAchieved: 0,
    status: 'ACTIVE',
    avatarInitials: 'SU',
    mustChangePassword: true,
    initialPasswordStatus: 'ISSUED_CHANGE_REQUIRED',
  },
  // --- 2. ZSM (SYED ZAIN) ---
  {
    id: 'USR-002',
    employeeCode: 'EMP-002',
    fullName: 'Syed Zain',
    email: 'syedzain@nationallight.pk',
    phone: '+92 321 8877665',
    role: 'ZSM',
    roleTitle: 'ZSM (Zonal Sales Manager)',
    department: 'SALES_FIELD',
    region: 'KPK',
    area: 'Swat & Malakand',
    territory: 'Mingora (Swat)',
    assignedTowns: ['Mingora (Swat)', 'Mardan'],
    assignedBeats: ['Mingora Electric Market', 'GT Road Swat Beat'],
    monthlySalesTarget: 15000000,
    monthlyRecoveryTarget: 12000000,
    mtdSalesAchieved: 0,
    mtdRecoveryAchieved: 0,
    todaySalesAchieved: 0,
    todayRecoveryAchieved: 0,
    status: 'ACTIVE',
    avatarInitials: 'SZ',
    mustChangePassword: true,
    initialPasswordStatus: 'ISSUED_CHANGE_REQUIRED',
  },
  // --- 3. SUPER ADMIN (MUHAMMAD AMJID - PRIMARY) ---
  {
    id: 'USR-003',
    employeeCode: 'EMP-003',
    fullName: 'Muhammad Amjid',
    email: 'amjid.bisconni@gmail.com',
    phone: '+92 333 4455667',
    role: 'SUPER_ADMIN',
    roleTitle: 'Super Admin',
    department: 'EXECUTIVE',
    region: 'National',
    area: 'National',
    territory: 'National',
    assignedTowns: ['All Pakistan'],
    assignedBeats: ['All Beats'],
    monthlySalesTarget: 50000000,
    monthlyRecoveryTarget: 45000000,
    mtdSalesAchieved: 0,
    mtdRecoveryAchieved: 0,
    todaySalesAchieved: 0,
    todayRecoveryAchieved: 0,
    status: 'ACTIVE',
    avatarInitials: 'MA',
    mustChangePassword: false,
    initialPasswordStatus: 'CHANGED',
  },
  // --- 4. SUPER ADMIN (AMJID N-LINK IDENTITY) ---
  {
    id: 'USR-003-NL',
    employeeCode: 'EMP-004',
    fullName: 'Amjid Khan',
    email: 'amjid@nationallight.pk',
    phone: '+92 333 4455667',
    role: 'SUPER_ADMIN',
    roleTitle: 'Super Admin',
    department: 'EXECUTIVE',
    region: 'National',
    area: 'National',
    territory: 'National',
    assignedTowns: ['All Pakistan'],
    assignedBeats: ['All Beats'],
    monthlySalesTarget: 50000000,
    monthlyRecoveryTarget: 45000000,
    mtdSalesAchieved: 0,
    mtdRecoveryAchieved: 0,
    todaySalesAchieved: 0,
    todayRecoveryAchieved: 0,
    status: 'ACTIVE',
    avatarInitials: 'AK',
    mustChangePassword: false,
    initialPasswordStatus: 'CHANGED',
  },
  // --- 5. EXECUTIVE ADMINISTRATION MAILBOX ---
  {
    id: 'USR-000',
    employeeCode: 'EMP-000',
    fullName: 'Shahzad Ullah (Executive Admin)',
    email: 'nationallights2026@gmail.com',
    phone: '+92 300 1234567',
    role: 'SUPER_ADMIN',
    roleTitle: 'Executive Administration',
    department: 'EXECUTIVE',
    region: 'National',
    area: 'National',
    territory: 'National',
    assignedTowns: ['All Pakistan'],
    assignedBeats: ['All Beats'],
    monthlySalesTarget: 50000000,
    monthlyRecoveryTarget: 45000000,
    mtdSalesAchieved: 0,
    mtdRecoveryAchieved: 0,
    todaySalesAchieved: 0,
    todayRecoveryAchieved: 0,
    status: 'ACTIVE',
    avatarInitials: 'NL',
    mustChangePassword: true,
    initialPasswordStatus: 'ISSUED_CHANGE_REQUIRED',
  },
];

export const USERS_STORAGE_KEY = 'nlink_team_roster_v7';

/**
 * Loads team users from localStorage with fallback to default roster
 */
export function getStoredUsers(): NLinkUser[] {
  try {
    if (typeof localStorage === 'undefined') return NLINK_TEAM_ROSTER;
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return NLINK_TEAM_ROSTER;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter(
        (u: NLinkUser) => u.email && !u.email.toLowerCase().endsWith('@nationallights.com')
      );
    }
    return NLINK_TEAM_ROSTER;
  } catch (e) {
    console.error('Failed to load stored users:', e);
    return NLINK_TEAM_ROSTER;
  }
}

/**
 * Saves users roster to localStorage
 */
export function saveStoredUsers(users: NLinkUser[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to persist users:', e);
  }
}

/**
 * Automatically creates the official @nationallight.pk N-LINK login identity.
 * Rule: lowercase, remove spaces & unsupported chars, check uniqueness, add numeric suffix on collision (e.g. ahmedkhan2@nationallight.pk).
 */
export function autoCreateNationalLightEmail(fullName: string, existingUsers: NLinkUser[] = getStoredUsers()): string {
  const cleanHandle = fullName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '') || 'employee';

  const existingEmails = new Set(
    existingUsers.map((u) => String(u.email || '').trim().toLowerCase()).filter(Boolean)
  );

  let candidate = `${cleanHandle}@nationallight.pk`;
  let suffix = 2;
  while (existingEmails.has(candidate)) {
    candidate = `${cleanHandle}${suffix}@nationallight.pk`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Cryptographically generates a 14-character secure initial password with uppercase, lowercase, digits, and special symbols.
 */
export function generateCryptographicInitialPassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = upper + lower + digits + symbols;

  const getRand = (max: number): number => {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return arr[0] % max;
    }
    return Math.floor(Math.random() * max);
  };

  const chars: string[] = [
    upper[getRand(upper.length)],
    upper[getRand(upper.length)],
    lower[getRand(lower.length)],
    lower[getRand(lower.length)],
    digits[getRand(digits.length)],
    digits[getRand(digits.length)],
    symbols[getRand(symbols.length)],
    symbols[getRand(symbols.length)],
  ];

  while (chars.length < Math.max(12, length)) {
    chars.push(all[getRand(all.length)]);
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = getRand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/**
 * Automatically generates unique employee code, unique N-LINK identity (@nationallight.pk), and cryptographic initial password.
 */
export function generateAutoCredentials(fullName: string, role: UserRole, existingUsers: NLinkUser[] = getStoredUsers()) {
  const prefix =
    role === 'TSM' || role === 'SS' || role === 'OB' || role === 'SALES_RECOVERY' ? 'FSO' :
    role === 'ZSM' ? 'ZSM' :
    role === 'RSM' ? 'RSM' :
    role === 'ACCOUNTS' ? 'ACC' :
    role === 'WAREHOUSE_MANAGER' || role === 'WAREHOUSE' ? 'WHM' :
    role === 'DISPATCH_OFFICER' || role === 'DISPATCH' ? 'DSP' :
    role === 'FACTORY_MANAGER' || role === 'FACTORY' ? 'FAC' :
    role === 'MANAGEMENT' ? 'MGT' : 'EMP';

  // Ensure unique employeeCode across existing users
  const existingCodes = new Set(existingUsers.map((u) => String(u.employeeCode || '').toUpperCase()));
  let seq = existingUsers.length + 1;
  let employeeCode = `${prefix}-${String(seq).padStart(3, '0')}`;
  while (existingCodes.has(employeeCode.toUpperCase())) {
    seq += 1;
    employeeCode = `${prefix}-${String(seq).padStart(3, '0')}`;
  }

  const email = autoCreateNationalLightEmail(fullName, existingUsers);
  const userHandle = email.split('@')[0];
  const username = `nl.${userHandle}`;
  const password = generateCryptographicInitialPassword(14);

  return {
    employeeCode,
    username,
    email,
    password,
  };
}

export const TEAM_USERS: NLinkUser[] = getStoredUsers();
