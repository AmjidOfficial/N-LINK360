/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Distributor Transfer & Market Handover Service
 * Handles Distributor Replacement, Territory Splits, Market Bills Transfer,
 * Physical Stock Handovers, and Executive Approvals (Shahzad Ullah).
 */

import {
  DistributorTransferRequest,
  DistributorTransferType,
  DistributorTransferStatus,
  Customer,
  SalesOrder,
  InventoryBalance,
} from '../types';
import { assertAuthorizedApprover, isAuthorizedApproverEmail } from './production-users';

const STORAGE_KEY = 'nlink_distributor_transfer_requests';

/**
 * Retrieve all distributor transfer requests from storage
 */
export const getStoredDistributorTransfers = (): DistributorTransferRequest[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.warn('Error reading distributor transfers:', err);
  }
  return getSeedDistributorTransfers();
};

/**
 * Persist distributor transfer requests to storage
 */
export const saveDistributorTransfers = (requests: DistributorTransferRequest[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch (err) {
    console.warn('Error saving distributor transfers:', err);
  }
};

/**
 * Seed initial distributor transfer records for demonstration & audit
 */
export const getSeedDistributorTransfers = (): DistributorTransferRequest[] => {
  return [];
};

/**
 * Create a new Distributor Replacement / Transfer Request
 */
export const createDistributorTransfer = (
  payload: Omit<DistributorTransferRequest, 'id' | 'transferNumber' | 'createdAt' | 'status'>
): DistributorTransferRequest => {
  const existing = getStoredDistributorTransfers();
  const nextNum = existing.length + 1;
  const transferNumber = `TRF-${String(nextNum).padStart(3, '0')}`;
  const id = `trf-${Date.now()}`;

  const newRequest: DistributorTransferRequest = {
    ...payload,
    id,
    transferNumber,
    status: 'SUBMITTED',
    createdAt: new Date().toISOString(),
  };

  const updated = [newRequest, ...existing];
  saveDistributorTransfers(updated);
  return newRequest;
};

/**
 * Approve a Distributor Transfer Request (Requires Shahzad Ullah Executive Authority)
 */
export const approveDistributorTransfer = (
  transferId: string,
  currentUserEmail?: string,
  currentUserObj?: any
): { success: boolean; request: DistributorTransferRequest; message: string } => {
  assertAuthorizedApprover(currentUserEmail, currentUserObj);

  const existing = getStoredDistributorTransfers();
  let targetReq: DistributorTransferRequest | null = null;

  const updated = existing.map((req) => {
    if (req.id === transferId || req.transferNumber === transferId) {
      targetReq = {
        ...req,
        status: 'APPROVED' as DistributorTransferStatus,
        accountsApproved: true,
        accountsApprovedBy: 'Accounts Dept',
        accountsApprovedAt: new Date().toISOString(),
        inventoryApproved: true,
        inventoryApprovedBy: 'Warehouse Manager',
        inventoryApprovedAt: new Date().toISOString(),
        executiveApproved: true,
        executiveApprovedBy: 'Shahzad Ullah',
        executiveApprovedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return targetReq;
    }
    return req;
  });

  if (!targetReq) {
    throw new Error(`Distributor transfer #${transferId} not found.`);
  }

  saveDistributorTransfers(updated);
  return {
    success: true,
    request: targetReq,
    message: `✓ Distributor Transfer #${targetReq.transferNumber} approved by Shahzad Ullah. Dealer assignments & receivables updated.`,
  };
};

/**
 * Execute Dealer Reassignments for an approved transfer
 */
export const executeDealerReassignment = (
  transfer: DistributorTransferRequest,
  customers: Customer[]
): Customer[] => {
  if (transfer.transferredDealerIds.length === 0) return customers;

  const transferredSet = new Set(transfer.transferredDealerIds);
  return customers.map((c) => {
    if (transferredSet.has(c.id) || transferredSet.has(c.customerCode)) {
      return {
        ...c,
        assignedDistributorId: transfer.targetDistributorId,
        assignedDistributorName: transfer.targetDistributorName,
        updatedAt: new Date().toISOString(),
      };
    }
    return c;
  });
};
