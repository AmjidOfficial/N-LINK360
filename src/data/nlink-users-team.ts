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
  // --- 1. SUPER ADMIN / EXECUTIVE ---
  {
    id: 'USR-001',
    employeeCode: 'EMP-001',
    fullName: 'Shahzad Ullah',
    email: 'shahzadullah@nationallights.com',
    phone: '+92 300 1234567',
    role: 'SUPER_ADMIN',
    roleTitle: 'Managing Director / Super Admin',
    department: 'EXECUTIVE',
    region: 'National',
    area: 'National',
    territory: 'National',
    assignedTowns: ['All Pakistan'],
    assignedBeats: ['All Beats'],
    monthlySalesTarget: 50000000,
    monthlyRecoveryTarget: 45000000,
    mtdSalesAchieved: 42800000,
    mtdRecoveryAchieved: 39500000,
    todaySalesAchieved: 1450000,
    todayRecoveryAchieved: 1200000,
    status: 'ACTIVE',
    avatarInitials: 'SU',
  },
  {
    id: 'USR-002',
    employeeCode: 'EMP-002',
    fullName: 'Syed Zain',
    email: 'syedzain@nationallights.com',
    phone: '+92 321 9876543',
    role: 'MANAGEMENT',
    roleTitle: 'Executive Director / Operations',
    department: 'EXECUTIVE',
    region: 'National',
    area: 'National',
    territory: 'National',
    assignedTowns: ['All Pakistan'],
    assignedBeats: ['All Beats'],
    monthlySalesTarget: 50000000,
    monthlyRecoveryTarget: 45000000,
    mtdSalesAchieved: 42800000,
    mtdRecoveryAchieved: 39500000,
    todaySalesAchieved: 1450000,
    todayRecoveryAchieved: 1200000,
    status: 'ACTIVE',
    avatarInitials: 'SZ',
  },

  // --- 2. RSM - REGIONAL SALES MANAGERS (Tier 3) ---
  {
    id: 'USR-010',
    employeeCode: 'EMP-010',
    fullName: 'Tariq Mehmood',
    email: 'tariq.rsm@nationallights.com',
    phone: '+92 300 4455667',
    role: 'RSM',
    roleTitle: 'Regional Sales Manager (RSM) - Punjab Central',
    department: 'SALES_FIELD',
    region: 'Punjab Central',
    area: 'Lahore & Gujranwala & Faisalabad',
    territory: 'Punjab Central Zone',
    assignedTowns: ['Lahore', 'Gujranwala', 'Faisalabad', 'Sialkot', 'Gujrat'],
    assignedBeats: ['Central Beats Roster'],
    reportingManagerId: 'USR-001',
    reportingManagerName: 'Shahzad Ullah',
    monthlySalesTarget: 18000000,
    monthlyRecoveryTarget: 16000000,
    mtdSalesAchieved: 15600000,
    mtdRecoveryAchieved: 14200000,
    todaySalesAchieved: 580000,
    todayRecoveryAchieved: 490000,
    status: 'ACTIVE',
    avatarInitials: 'TM',
  },
  {
    id: 'USR-011',
    employeeCode: 'EMP-011',
    fullName: 'Shahid Khan',
    email: 'shahid.rsm@nationallights.com',
    phone: '+92 333 5566778',
    role: 'RSM',
    roleTitle: 'Regional Sales Manager (RSM) - Punjab North & KPK',
    department: 'SALES_FIELD',
    region: 'Punjab North',
    area: 'Rawalpindi, Islamabad & Peshawar',
    territory: 'North Zone',
    assignedTowns: ['Rawalpindi', 'Islamabad', 'Peshawar', 'Wah Cantt', 'Attock'],
    assignedBeats: ['North Beats Roster'],
    reportingManagerId: 'USR-001',
    reportingManagerName: 'Shahzad Ullah',
    monthlySalesTarget: 14000000,
    monthlyRecoveryTarget: 12500000,
    mtdSalesAchieved: 12100000,
    mtdRecoveryAchieved: 11300000,
    todaySalesAchieved: 420000,
    todayRecoveryAchieved: 380000,
    status: 'ACTIVE',
    avatarInitials: 'SK',
  },
  {
    id: 'USR-012',
    employeeCode: 'EMP-012',
    fullName: 'Farooq Memon',
    email: 'farooq.rsm@nationallights.com',
    phone: '+92 301 6677889',
    role: 'RSM',
    roleTitle: 'Regional Sales Manager (RSM) - Sindh South',
    department: 'SALES_FIELD',
    region: 'Sindh South',
    area: 'Karachi & Hyderabad',
    territory: 'South Zone',
    assignedTowns: ['Karachi', 'Hyderabad', 'Sukkur'],
    assignedBeats: ['South Beats Roster'],
    reportingManagerId: 'USR-001',
    reportingManagerName: 'Shahzad Ullah',
    monthlySalesTarget: 18000000,
    monthlyRecoveryTarget: 16500000,
    mtdSalesAchieved: 15100000,
    mtdRecoveryAchieved: 14000000,
    todaySalesAchieved: 450000,
    todayRecoveryAchieved: 330000,
    status: 'ACTIVE',
    avatarInitials: 'FM',
  },

  // --- 3. ZSM - ZONAL SALES MANAGERS (Tier 2) ---
  {
    id: 'USR-020',
    employeeCode: 'EMP-020',
    fullName: 'Babar Azam',
    email: 'babar.zsm@nationallights.com',
    phone: '+92 302 7788990',
    role: 'ZSM',
    roleTitle: 'Zonal Sales Manager (ZSM) - Lahore Zone',
    department: 'SALES_FIELD',
    region: 'Punjab Central',
    area: 'Lahore Division',
    territory: 'Brandreth & Commercial Hubs',
    assignedTowns: ['Lahore', 'Kasur', 'Sheikhupura'],
    assignedBeats: ['Brandreth Road Auto Market', 'Montgomery Road Beat', 'Badami Bagh'],
    reportingManagerId: 'USR-010',
    reportingManagerName: 'Tariq Mehmood',
    monthlySalesTarget: 8000000,
    monthlyRecoveryTarget: 7200000,
    mtdSalesAchieved: 7100000,
    mtdRecoveryAchieved: 6500000,
    todaySalesAchieved: 290000,
    todayRecoveryAchieved: 260000,
    status: 'ACTIVE',
    avatarInitials: 'BA',
  },
  {
    id: 'USR-021',
    employeeCode: 'EMP-021',
    fullName: 'Mohammad Rizwan',
    email: 'rizwan.zsm@nationallights.com',
    phone: '+92 321 8899001',
    role: 'ZSM',
    roleTitle: 'Zonal Sales Manager (ZSM) - Gujranwala Zone',
    department: 'SALES_FIELD',
    region: 'Punjab Central',
    area: 'Gujranwala Division',
    territory: 'G.T Road & Sialkot Auto Zone',
    assignedTowns: ['Gujranwala', 'Sialkot', 'Gujrat'],
    assignedBeats: ['Small Industrial Estate Beat', 'G.T Road Market', 'Circular Road Beat'],
    reportingManagerId: 'USR-010',
    reportingManagerName: 'Tariq Mehmood',
    monthlySalesTarget: 6000000,
    monthlyRecoveryTarget: 5400000,
    mtdSalesAchieved: 5100000,
    mtdRecoveryAchieved: 4700000,
    todaySalesAchieved: 180000,
    todayRecoveryAchieved: 140000,
    status: 'ACTIVE',
    avatarInitials: 'MR',
  },
  {
    id: 'USR-022',
    employeeCode: 'EMP-022',
    fullName: 'Yasir Shah',
    email: 'yasir.zsm@nationallights.com',
    phone: '+92 345 9900112',
    role: 'ZSM',
    roleTitle: 'Zonal Sales Manager (ZSM) - Rawalpindi & Islamabad Zone',
    department: 'SALES_FIELD',
    region: 'Punjab North',
    area: 'Rawalpindi & ICT Division',
    territory: 'Twin Cities Auto & Electrical Zone',
    assignedTowns: ['Rawalpindi', 'Islamabad'],
    assignedBeats: ['Gawalmandi Auto Market', 'Saddar Auto Market', 'Blue Area Commercial Beat'],
    reportingManagerId: 'USR-011',
    reportingManagerName: 'Shahid Khan',
    monthlySalesTarget: 7500000,
    monthlyRecoveryTarget: 6800000,
    mtdSalesAchieved: 6600000,
    mtdRecoveryAchieved: 6100000,
    todaySalesAchieved: 220000,
    todayRecoveryAchieved: 210000,
    status: 'ACTIVE',
    avatarInitials: 'YS',
  },

  // --- 4. TSM - TERRITORY SALES MANAGERS (Tier 1 - Frontline) ---
  {
    id: 'USR-030',
    employeeCode: 'EMP-030',
    fullName: 'Sohail Ahmed',
    email: 'sohail.tsm@nationallights.com',
    phone: '+92 300 1122334',
    role: 'TSM',
    roleTitle: 'Territory Sales Manager (TSM) - Lahore Central',
    department: 'SALES_FIELD',
    region: 'Punjab Central',
    area: 'Lahore Division',
    territory: 'Brandreth Road Core',
    assignedTowns: ['Lahore'],
    assignedBeats: ['Brandreth Road Auto Market', 'Montgomery Road Beat'],
    reportingManagerId: 'USR-020',
    reportingManagerName: 'Babar Azam',
    monthlySalesTarget: 4500000,
    monthlyRecoveryTarget: 4000000,
    mtdSalesAchieved: 4100000,
    mtdRecoveryAchieved: 3750000,
    todaySalesAchieved: 160000,
    todayRecoveryAchieved: 145000,
    status: 'ACTIVE',
    avatarInitials: 'SA',
  },
  {
    id: 'USR-031',
    employeeCode: 'EMP-031',
    fullName: 'Tariq Malik',
    email: 'tariq.tsm@nationallights.com',
    phone: '+92 304 2233445',
    role: 'TSM',
    roleTitle: 'Territory Sales Manager (TSM) - Rawalpindi Saddar',
    department: 'SALES_FIELD',
    region: 'Punjab North',
    area: 'Rawalpindi Division',
    territory: 'Saddar & Gawalmandi',
    assignedTowns: ['Rawalpindi'],
    assignedBeats: ['Saddar Auto Market', 'Gawalmandi Auto Market'],
    reportingManagerId: 'USR-022',
    reportingManagerName: 'Yasir Shah',
    monthlySalesTarget: 3800000,
    monthlyRecoveryTarget: 3400000,
    mtdSalesAchieved: 3300000,
    mtdRecoveryAchieved: 3050000,
    todaySalesAchieved: 120000,
    todayRecoveryAchieved: 110000,
    status: 'ACTIVE',
    avatarInitials: 'TM',
  },
  {
    id: 'USR-032',
    employeeCode: 'EMP-032',
    fullName: 'Muhammad Usman',
    email: 'usman.tsm@nationallights.com',
    phone: '+92 301 5234567',
    role: 'TSM',
    roleTitle: 'Territory Sales Manager (TSM) - Gujranwala & Sialkot',
    department: 'SALES_FIELD',
    region: 'Punjab Central',
    area: 'Gujranwala Division',
    territory: 'Gujranwala & Sialkot Beat',
    assignedTowns: ['Gujranwala', 'Sialkot'],
    assignedBeats: ['Small Industrial Estate Beat', 'G.T Road Market'],
    reportingManagerId: 'USR-021',
    reportingManagerName: 'Mohammad Rizwan',
    monthlySalesTarget: 4000000,
    monthlyRecoveryTarget: 3600000,
    mtdSalesAchieved: 3650000,
    mtdRecoveryAchieved: 3400000,
    todaySalesAchieved: 130000,
    todayRecoveryAchieved: 115000,
    status: 'ACTIVE',
    avatarInitials: 'MU',
  },
  {
    id: 'USR-033',
    employeeCode: 'EMP-033',
    fullName: 'Farhan Siddiqui',
    email: 'farhan.tsm@nationallights.com',
    phone: '+92 321 8345678',
    role: 'TSM',
    roleTitle: 'Territory Sales Manager (TSM) - Karachi South & Plaza',
    department: 'SALES_FIELD',
    region: 'Sindh South',
    area: 'Karachi City',
    territory: 'Plaza Auto Market & M.A. Jinnah Road',
    assignedTowns: ['Karachi'],
    assignedBeats: ['Plaza Auto Market', 'M.A. Jinnah Road Commercial'],
    reportingManagerId: 'USR-012',
    reportingManagerName: 'Farooq Memon',
    monthlySalesTarget: 5000000,
    monthlyRecoveryTarget: 4500000,
    mtdSalesAchieved: 4600000,
    mtdRecoveryAchieved: 4200000,
    todaySalesAchieved: 175000,
    todayRecoveryAchieved: 150000,
    status: 'ACTIVE',
    avatarInitials: 'FS',
  },
  {
    id: 'USR-034',
    employeeCode: 'EMP-034',
    fullName: 'Bilal Khan',
    email: 'bilal.tsm@nationallights.com',
    phone: '+92 333 5566779',
    role: 'TSM',
    roleTitle: 'Territory Sales Manager (TSM) - Peshawar & Corridor',
    department: 'SALES_FIELD',
    region: 'Punjab North',
    area: 'Peshawar Division',
    territory: 'Karkhano & Jamrud Road',
    assignedTowns: ['Peshawar'],
    assignedBeats: ['Karkhano Auto Market', 'Jamrud Road Beat'],
    reportingManagerId: 'USR-011',
    reportingManagerName: 'Shahid Khan',
    monthlySalesTarget: 3200000,
    monthlyRecoveryTarget: 2900000,
    mtdSalesAchieved: 2950000,
    mtdRecoveryAchieved: 2700000,
    todaySalesAchieved: 105000,
    todayRecoveryAchieved: 95000,
    status: 'ACTIVE',
    avatarInitials: 'BK',
  },

  // --- 5. ACCOUNTS & FINANCE OFFICER ---
  {
    id: 'USR-050',
    employeeCode: 'ACC-001',
    fullName: 'Zainab Fatima',
    email: 'accounts@nationallights.com',
    phone: '+92 300 8899112',
    role: 'ACCOUNTS',
    roleTitle: 'Chief Accounts & Credit Officer',
    department: 'FINANCE_ACCOUNTS',
    region: 'Head Office',
    area: 'Finance Dept',
    territory: 'National',
    assignedTowns: ['Head Office Lahore'],
    assignedBeats: ['Corporate Finance'],
    monthlySalesTarget: 0,
    monthlyRecoveryTarget: 45000000,
    mtdSalesAchieved: 0,
    mtdRecoveryAchieved: 39500000,
    todaySalesAchieved: 0,
    todayRecoveryAchieved: 1200000,
    status: 'ACTIVE',
    avatarInitials: 'ZF',
  },
];

/**
 * Automatically generates unique user credentials, username and secure initial password
 */
export function generateAutoCredentials(fullName: string, role: UserRole, existingUsers: NLinkUser[] = NLINK_TEAM_ROSTER) {
  const cleanName = fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const prefix = role === 'TSM' ? 'TSM' : role === 'ZSM' ? 'ZSM' : role === 'RSM' ? 'RSM' : role === 'ACCOUNTS' ? 'ACC' : 'EMP';
  
  // Find highest index
  const nextNum = existingUsers.length + 1;
  const employeeCode = `${prefix}-${String(nextNum).padStart(3, '0')}`;
  
  // Format username email
  const nameParts = fullName.trim().toLowerCase().split(/\s+/);
  const userHandle = nameParts.length > 1 
    ? `${nameParts[0]}.${nameParts[nameParts.length - 1]}`
    : nameParts[0] || 'officer';
  
  const email = `${userHandle.replace(/[^a-z0-9.]/g, '')}@nationallights.com`;
  const username = `nl.${userHandle.replace(/[^a-z0-9]/g, '')}`;
  
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

export const TEAM_USERS: NLinkUser[] = NLINK_TEAM_ROSTER;
