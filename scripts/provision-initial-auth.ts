/**
 * One-time bootstrap script to initialize `.nlink-auth-store.json` with:
 * - Super Admin accounts (`amjid.bisconni@gmail.com` & `amjid@nationallight.pk`) set to `Amjid@1947`
 * - Unique cryptographic 14-char first-login passwords for Shahzad Ullah, Syed Zain, and Executive Admin
 * Only scrypt password hashes (never plaintext) are written to `.nlink-auth-store.json`.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function generateSecurePassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = upper + lower + digits + symbols;
  const pick = (pool: string) => pool[crypto.randomInt(0, pool.length)];
  const chars = [
    pick(upper), pick(upper),
    pick(lower), pick(lower),
    pick(digits), pick(digits),
    pick(symbols), pick(symbols),
  ];
  while (chars.length < Math.max(12, length)) {
    chars.push(pick(all));
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const superAdminPassword = process.env.NLINK_SUPERADMIN_PASS || 'Amjid@1947';
const shahzadPassword = generateSecurePassword(14);
const zainPassword = generateSecurePassword(14);
const mailboxPassword = generateSecurePassword(14);

const accounts = [
  {
    id: 'USR-003',
    employeeCode: 'EMP-003',
    email: 'amjid.bisconni@gmail.com',
    fullName: 'Muhammad Amjid',
    role: 'SUPER_ADMIN',
    roleTitle: 'Super Admin',
    department: 'EXECUTIVE',
    phone: '+92 333 4455667',
    canApprove: false,
    isActive: true,
    passwordHash: hashPassword(superAdminPassword),
    mustChangePassword: false,
    failedAttempts: 0,
    lockedUntil: 0,
  },
  {
    id: 'USR-003-NL',
    employeeCode: 'EMP-004',
    email: 'amjid@nationallight.pk',
    fullName: 'Amjid Khan',
    role: 'SUPER_ADMIN',
    roleTitle: 'Super Admin',
    department: 'EXECUTIVE',
    phone: '+92 333 4455667',
    canApprove: false,
    isActive: true,
    passwordHash: hashPassword(superAdminPassword),
    mustChangePassword: false,
    failedAttempts: 0,
    lockedUntil: 0,
  },
  {
    id: 'USR-001',
    employeeCode: 'EMP-001',
    email: 'shahzadullah@nationallight.pk',
    fullName: 'Shahzad Ullah',
    role: 'SUPER_ADMIN',
    roleTitle: 'NSM (National Sales Manager) & Sole Approver',
    department: 'EXECUTIVE',
    phone: '+92 300 1234567',
    canApprove: true,
    isActive: true,
    passwordHash: hashPassword(shahzadPassword),
    mustChangePassword: true,
    failedAttempts: 0,
    lockedUntil: 0,
  },
  {
    id: 'USR-002',
    employeeCode: 'EMP-002',
    email: 'syedzain@nationallight.pk',
    fullName: 'Syed Zain',
    role: 'ZSM',
    roleTitle: 'Zonal Sales Manager (ZSM)',
    department: 'SALES_FIELD',
    phone: '+92 321 8877665',
    canApprove: false,
    isActive: true,
    passwordHash: hashPassword(zainPassword),
    mustChangePassword: true,
    failedAttempts: 0,
    lockedUntil: 0,
  },
  {
    id: 'USR-000',
    employeeCode: 'EMP-000',
    email: 'nationallights2026@gmail.com',
    fullName: 'Shahzad Ullah (Executive Admin)',
    role: 'SUPER_ADMIN',
    roleTitle: 'Executive Administration',
    department: 'EXECUTIVE',
    phone: '+92 300 1234567',
    canApprove: true,
    isActive: true,
    passwordHash: hashPassword(mailboxPassword),
    mustChangePassword: true,
    failedAttempts: 0,
    lockedUntil: 0,
  },
];

const storePath = path.join(process.cwd(), '.nlink-auth-store.json');
fs.writeFileSync(storePath, JSON.stringify(accounts, null, 2), 'utf-8');

console.log(
  JSON.stringify({
    storePath,
    provisioned: [
      { email: 'amjid.bisconni@gmail.com', role: 'SUPER_ADMIN', mustChangePassword: false },
      { email: 'amjid@nationallight.pk', role: 'SUPER_ADMIN', mustChangePassword: false },
      { email: 'shahzadullah@nationallight.pk', role: 'NSM & Sole Approver', initialPassword: shahzadPassword, mustChangePassword: true },
      { email: 'syedzain@nationallight.pk', role: 'ZSM', initialPassword: zainPassword, mustChangePassword: true },
      { email: 'nationallights2026@gmail.com', role: 'Executive Admin', initialPassword: mailboxPassword, mustChangePassword: true },
    ],
  })
);
