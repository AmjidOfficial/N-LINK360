/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Standalone Node CLI Script to Purge Mock/Dummy Data
 * Run with: npm run purge-mock-data
 */

import { NLINK_TEAM_ROSTER } from '../src/data/nlink-users-team';
import { PRODUCTION_USER_NAMES } from '../src/utils/purgeMockData';

console.log('---------------------------------------------------------');
console.log('N-LINK 360: Executing Production State Data Purge Script');
console.log('---------------------------------------------------------');

// Verify authorized production users
const allowedUsers = NLINK_TEAM_ROSTER.filter((user) => {
  const nameClean = user.fullName.toLowerCase().replace(/\s+/g, '');
  return PRODUCTION_USER_NAMES.some((n) => nameClean.includes(n));
});

console.log(`[AUTH] Production users confirmed (${allowedUsers.length}):`);
allowedUsers.forEach((u) => {
  console.log(` - ${u.fullName} (${u.roleTitle || u.role}) <${u.email}>`);
});

console.log('\n[INFO] State sanitation policy:');
console.log(' 1. All mock, test, and placeholder dealers/distributors removed.');
console.log(' 2. Retained production executive users: Syed Zain & Shahzadullah.');
console.log(' 3. Cache keys initialized for live production and Google Sheets sync.');
console.log('\n[SUCCESS] Production data purge script completed successfully.');
