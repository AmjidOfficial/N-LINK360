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
  fullName: string;
  email: string;
  phone: string;
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
  
  // Targets & Performance (Monthly in PKR)
  monthlySalesTarget: number;
  monthlyRecoveryTarget: number;
  mtdSalesAchieved: number;
  mtdRecoveryAchieved: number;
  todaySalesAchieved: number;
  todayRecoveryAchieved: number;
  
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  avatarInitials: string;
}

export const NLINK_TEAM_ROSTER: NLinkUser[] = [
  // --- 1. SUPER ADMIN / MANAGING DIRECTOR ---
  {
    id: 'USR-001',
    employeeCode: 'EMP-001',
    fullName: 'Shahzad Ullah',
    email: 'shahzadullah@nationallight.pk',
    phone: '+92 300 1234567',
    role: 'SUPER_ADMIN',
    roleTitle: 'MD',
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
  },
  // --- 2. MANAGEMENT / EXECUTIVE DIRECTOR ---
  {
    id: 'USR-002',
    employeeCode: 'EMP-002',
    fullName: 'Syed Zain',
    email: 'syedzain@nationallight.pk',
    phone: '+92 321 9876543',
    role: 'MANAGEMENT',
    roleTitle: 'ED',
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
    avatarInitials: 'SZ',
  },
];

export const USERS_STORAGE_KEY = 'nlink_team_roster_v3';

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
      // Ensure emails end with @nationallight.pk
      return parsed.map((u: NLinkUser) => {
        if (u.email && u.email.includes('@nationallights.com')) {
          return { ...u, email: u.email.replace('@nationallights.com', '@nationallight.pk') };
        }
        return u;
      });
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
 * Automatically creates the official @nationallight.pk corporate email address
 */
export function autoCreateNationalLightEmail(fullName: string): string {
  const parts = fullName.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'officer@nationallight.pk';
  const handle = parts.length > 1
    ? `${parts[0]}.${parts[parts.length - 1]}`
    : parts[0];
  const cleanHandle = handle.replace(/[^a-z0-9.]/g, '');
  return `${cleanHandle}@nationallight.pk`;
}

/**
 * Automatically generates unique user credentials, username and secure initial password
 */
export function generateAutoCredentials(fullName: string, role: UserRole, existingUsers: NLinkUser[] = getStoredUsers()) {
  const prefix = role === 'TSM' ? 'TSM' : role === 'ZSM' ? 'ZSM' : role === 'RSM' ? 'RSM' : role === 'ACCOUNTS' ? 'ACC' : role === 'MANAGEMENT' ? 'MGT' : 'EMP';
  
  // Find highest index
  const nextNum = existingUsers.length + 1;
  const employeeCode = `${prefix}-${String(nextNum).padStart(3, '0')}`;
  
  // Format username email with official @nationallight.pk domain
  const email = autoCreateNationalLightEmail(fullName);
  const userHandle = email.split('@')[0];
  const username = `nl.${userHandle}`;
  
  // Generate random 4-char suffix for security
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let randSuffix = '';
  for (let i = 0; i < 4; i++) {
    randSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const password = `NL@2026#${randSuffix}`;

  return {
    employeeCode,
    username,
    email,
    password,
  };
}

export const TEAM_USERS: NLinkUser[] = getStoredUsers();
