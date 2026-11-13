/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK-360 - Managing Director & Executive Command Center View
 * Built strictly on the unified Role-Based Dashboard Engine (Section 5 & Section 17).
 */

import React, { useMemo } from 'react';
import type {
  CreditNote,
  Customer,
  CustomerVisit,
  Dispatch,
  EmployeeAttendance,
  InventoryBalance,
  Invoice,
  LeaveRequest,
  LedgerEntry,
  Recovery,
  SalesOrder,
  SKU,
  StockReturn,
  Target,
} from '../../types';
import type { NLinkUser } from '../../data/nlink-users-team';
import { RoleBasedDashboardShell } from './engine';
import type { DashboardDataset, DashboardDatePreset, QuickActionId } from '../../lib/dashboard';

export type { DashboardDatePreset };

export interface ExecutiveDashboardViewProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  pendingOrdersCount?: number;
  pendingRecoveriesCount?: number;
  ledgerEntries?: LedgerEntry[];
  inventoryBalances?: InventoryBalance[];
  skus?: SKU[];
  dispatches?: Dispatch[];
  invoices?: Invoice[];
  attendanceRecords?: EmployeeAttendance[];
  leaveRequests?: LeaveRequest[];
  profileUpdateRequestsCount?: number;
  visits?: CustomerVisit[];
  creditNotes?: CreditNote[];
  stockReturns?: StockReturn[];
  targets?: Target[];
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onOpenApprovals: () => void;
  onOpenNewOrder: () => void;
  onOpenNewRecovery: () => void;
  onOpenCustomerLedger?: (customerId: string) => void;
  onExportReports?: () => void;
  onOpenInventory?: () => void;
  onOpenPacking?: () => void;
  onOpenDispatch?: () => void;
  onOpenInvoicing?: () => void;
  onOpenFinance?: () => void;
  onOpenHrAdmin?: () => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  currentUser,
  customers,
  orders,
  recoveries,
  ledgerEntries,
  inventoryBalances,
  skus,
  dispatches,
  invoices,
  attendanceRecords,
  leaveRequests,
  profileUpdateRequestsCount,
  visits,
  creditNotes,
  stockReturns,
  targets,
  isDarkMode = true,
  onToggleTheme = () => {},
  onOpenApprovals,
  onOpenNewOrder,
  onOpenNewRecovery,
  onOpenCustomerLedger,
  onExportReports,
  onOpenInventory,
  onOpenPacking,
  onOpenDispatch,
  onOpenInvoicing,
  onOpenFinance,
  onOpenHrAdmin,
}) => {
  const dataset = useMemo<DashboardDataset>(
    () => ({
      customers,
      orders,
      recoveries,
      ledgerEntries,
      inventoryBalances,
      skus,
      dispatches,
      invoices,
      attendanceRecords,
      leaveRequests,
      profileUpdateRequestsCount,
      visits,
      creditNotes,
      stockReturns,
      targets,
    }),
    [
      customers,
      orders,
      recoveries,
      ledgerEntries,
      inventoryBalances,
      skus,
      dispatches,
      invoices,
      attendanceRecords,
      leaveRequests,
      profileUpdateRequestsCount,
      visits,
      creditNotes,
      stockReturns,
      targets,
    ]
  );

  const handleQuickAction = (actionId: QuickActionId) => {
    switch (actionId) {
      case 'OPEN_APPROVALS':
        onOpenApprovals();
        break;
      case 'NEW_ORDER':
        onOpenNewOrder();
        break;
      case 'RECORD_RECOVERY':
        onOpenNewRecovery();
        break;
      case 'EXPORT_REPORT':
        onExportReports?.();
        break;
      case 'PACK_ORDERS':
        onOpenPacking?.();
        break;
      case 'DISPATCH_ORDER':
        onOpenDispatch?.();
        break;
      case 'CREATE_INVOICE':
        onOpenInvoicing?.();
        break;
      case 'VIEW_LEDGER':
        onOpenFinance?.();
        break;
      case 'VIEW_ATTENDANCE':
        onOpenHrAdmin?.();
        break;
      default:
        break;
    }
  };

  return (
    <RoleBasedDashboardShell
      currentUser={currentUser}
      dataset={dataset}
      isDarkMode={isDarkMode}
      onToggleTheme={onToggleTheme}
      onQuickAction={handleQuickAction}
      onSelectCustomer={onOpenCustomerLedger}
      onOpenInventory={onOpenInventory}
    />
  );
};
