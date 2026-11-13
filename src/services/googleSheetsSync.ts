/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Google Sheets User Synchronization & Roster Reconciliation Service
 * 
 * 1. Connects to Google Sheets API / Webhook URL to fetch user management data (email, phone, status).
 * 2. Runs a background reconciliation process on app load to reconcile local user database with authorized Google Sheet list.
 * 3. Locks out unauthorized accounts immediately.
 */

import { NLinkUser, getStoredUsers, saveStoredUsers } from '../data/nlink-users-team';
import { fetchLiveGoogleSheetUsers } from './liveGoogleSheetSync';
import { getGoogleSheetsWebhookUrl } from './google-sheets';

export interface GoogleSheetUserRecord {
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  fullName?: string;
  role?: string;
}

export interface ReconciliationResult {
  success: boolean;
  authorizedCount: number;
  lockedOutCount: number;
  users: NLinkUser[];
  message: string;
  timestamp: string;
}

/**
 * Connects to Google Sheets API / Webhook endpoint, fetches user management data (email, phone, status),
 * and returns the list of authorized active users.
 */
export async function fetchAuthorizedUsersFromGoogleSheet(): Promise<GoogleSheetUserRecord[]> {
  try {
    const webhookUrl = getGoogleSheetsWebhookUrl();
    // Fetch live roster via GViz / Live Google Sheet synchronizer
    const roster: NLinkUser[] = await fetchLiveGoogleSheetUsers();

    if (Array.isArray(roster) && roster.length > 0) {
      return roster.map((u) => ({
        email: String(u.email || '').trim().toLowerCase(),
        phone: String(u.phone || '').trim(),
        status: u.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        fullName: u.fullName,
        role: u.role,
      }));
    }

    // Fallback attempt via Webhook endpoint if available
    if (webhookUrl && webhookUrl.startsWith('https://script.google.com')) {
      const res = await fetch(`${webhookUrl}?action=getUsers`, {
        method: 'GET',
        mode: 'cors',
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.users)) {
          return data.users.map((r: any) => ({
            email: String(r.email || r.Email || '').trim().toLowerCase(),
            phone: String(r.phone || r.Phone || '').trim(),
            status: String(r.status || r.Status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
            fullName: r.fullName || r.Name || '',
            role: r.role || r.Role || 'SALES_RECOVERY',
          }));
        }
      }
    }
  } catch (err) {
    console.warn('[GoogleSheetsSync] Failed to fetch live users from webhook, using synchronized roster:', err);
  }

  // Default fallback to stored roster
  const stored = getStoredUsers();
  return stored.map((u) => ({
    email: String(u.email || '').trim().toLowerCase(),
    phone: String(u.phone || '').trim(),
    status: u.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    fullName: u.fullName,
    role: u.role,
  }));
}

/**
 * Background process running on application load to reconcile local database's user table
 * with the authorized user list from the Google Sheet, ensuring unauthorized accounts are locked out immediately.
 */
export async function reconcileUsersWithGoogleSheet(
  onStateUpdate?: (result: ReconciliationResult) => void
): Promise<ReconciliationResult> {
  const timestamp = new Date().toISOString();
  try {
    const authorizedRecords = await fetchAuthorizedUsersFromGoogleSheet();
    const currentStoredUsers = getStoredUsers();

    const activeAuthorizedEmails = new Set(
      authorizedRecords
        .filter((r) => r.status === 'ACTIVE')
        .map((r) => r.email.toLowerCase())
    );

    let lockedOutCount = 0;
    const reconciledUsers: NLinkUser[] = currentStoredUsers.map((user) => {
      const userEmail = (user.email || '').toLowerCase();
      // Whitelist core executive accounts
      const isCoreExecutive =
        userEmail === 'shahzadullah@nationallight.pk' ||
        userEmail === 'nationallights2026@gmail.com' ||
        userEmail === 'amjid.bisconni@gmail.com';

      if (isCoreExecutive || activeAuthorizedEmails.has(userEmail)) {
        return { ...user, status: 'ACTIVE' };
      } else {
        lockedOutCount += 1;
        return { ...user, status: 'INACTIVE' };
      }
    });

    // Save reconciled active users to local storage database
    saveStoredUsers(reconciledUsers);

    const result: ReconciliationResult = {
      success: true,
      authorizedCount: activeAuthorizedEmails.size,
      lockedOutCount,
      users: reconciledUsers,
      message: `User reconciliation complete: ${activeAuthorizedEmails.size} authorized, ${lockedOutCount} unauthorized account(s) locked out.`,
      timestamp,
    };

    if (onStateUpdate) {
      onStateUpdate(result);
    }

    return result;
  } catch (err: any) {
    console.error('[GoogleSheetsSync] User reconciliation failed:', err);
    const fallbackUsers = getStoredUsers();
    return {
      success: false,
      authorizedCount: fallbackUsers.length,
      lockedOutCount: 0,
      users: fallbackUsers,
      message: `User reconciliation fallback: Using local cache (${fallbackUsers.length} users).`,
      timestamp,
    };
  }
}
