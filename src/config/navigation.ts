/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Single Source of Truth Navigation Configuration
 * Synchronized across Desktop Persistent Sidebar and Mobile Drawer Navigation
 */

import {
  LayoutDashboard,
  Building2,
  Package,
  Store,
  Target,
  Users,
  GitFork,
  CheckCircle2,
  BarChart3,
  Banknote,
  CreditCard,
  BookOpen,
  Warehouse,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { User } from '../types';
import { isAdminUser } from '../services/production-users';

export type MainDomain = 'DASHBOARDS' | 'OPERATIONS' | 'REPORTS';

export type OperationSubTab =
  | 'COMPANY'
  | 'BRANDS_PRODUCTS'
  | 'DEALERS_DISTRIBUTORS'
  | 'TARGET'
  | 'SALES_TEAM'
  | 'HIERARCHY'
  | 'APPROVALS';

export type ReportSubTab =
  | 'SALES'
  | 'RECOVERY'
  | 'CREDIT'
  | 'LEDGERS'
  | 'STOCKS_WAREHOUSE'
  | 'DEALERS_DISTRIBUTOR';

export interface NavSubItem {
  id: OperationSubTab | ReportSubTab | 'COCKPIT';
  label: string;
  shortLabel?: string;
  icon: any;
  domain: MainDomain;
  badge?: string;
  badgeColor?: string;
  description: string;
  adminOnly?: boolean;
  allowedRoles?: string[];
}

export interface NavGroup {
  id: MainDomain;
  label: string;
  number: string;
  description: string;
  items: NavSubItem[];
}

export const NAVIGATION_CONFIG: NavGroup[] = [
  {
    id: 'DASHBOARDS',
    label: 'Dashboards',
    number: '1',
    description: 'Executive overview, MTD sales analytics & territory quotas',
    items: [
      {
        id: 'COCKPIT',
        label: 'Executive Cockpit',
        shortLabel: 'Cockpit',
        icon: LayoutDashboard,
        domain: 'DASHBOARDS',
        description: 'Global KPI metrics, MTD sales drill-down & territory health',
      },
    ],
  },
  {
    id: 'OPERATIONS',
    label: 'Operations',
    number: '2',
    description: 'Commercial masters, dealers, sales team & approvals',
    items: [
      {
        id: 'COMPANY',
        label: 'Company & Branch',
        shortLabel: 'Branches',
        icon: Building2,
        domain: 'OPERATIONS',
        description: 'Manage national branch hubs, warehouses & dispatch centers',
        adminOnly: true,
      },
      {
        id: 'BRANDS_PRODUCTS',
        label: 'Brands & SKUs',
        shortLabel: 'SKUs',
        icon: Package,
        domain: 'OPERATIONS',
        description: 'Automotive light bulb catalogue, master trade pricing & cartons',
      },
      {
        id: 'DEALERS_DISTRIBUTORS',
        label: 'Dealers & Accounts',
        shortLabel: 'Dealers',
        icon: Store,
        domain: 'OPERATIONS',
        description: 'Dynamic dealer/distributor registry, credit terms & multi-designation assignments',
      },
      {
        id: 'TARGET',
        label: 'Target Allocation',
        shortLabel: 'Targets',
        icon: Target,
        domain: 'OPERATIONS',
        description: 'Sales and recovery monthly target quotas by territory officer',
      },
      {
        id: 'SALES_TEAM',
        label: 'Sales Team & Beats',
        shortLabel: 'Sales Team',
        icon: Users,
        domain: 'OPERATIONS',
        description: 'Field force officers, route beats & GPS check-in assignments',
      },
      {
        id: 'HIERARCHY',
        label: 'Territory Hierarchy',
        shortLabel: 'Hierarchy',
        icon: GitFork,
        domain: 'OPERATIONS',
        description: '5-tier governance structure from Head Office to Town Beats',
      },
      {
        id: 'APPROVALS',
        label: 'Approval Queue',
        shortLabel: 'Approval Queue',
        icon: CheckCircle2,
        domain: 'OPERATIONS',
        badge: 'HO',
        badgeColor: 'bg-teal-700 text-teal-100',
        description: 'Review, authorize or reject pending registrations, invoices and recoveries',
        adminOnly: true,
      },
    ],
  },
  {
    id: 'REPORTS',
    label: 'Reports',
    number: '3',
    description: 'Financial registers, recovery logs & customer ledgers',
    items: [
      {
        id: 'SALES',
        label: 'Sales & Order Ledger',
        shortLabel: 'Sales Ledger',
        icon: BarChart3,
        domain: 'REPORTS',
        description: 'Commercial sales register, posted invoices & dispatch orders',
      },
      {
        id: 'RECOVERY',
        label: 'Accounts & Recovery',
        shortLabel: 'Recoveries',
        icon: Banknote,
        domain: 'REPORTS',
        description: 'Realized payment collections, bank slips & voucher receipts',
      },
      {
        id: 'CREDIT',
        label: 'Credit Risk Matrix',
        shortLabel: 'Credit Matrix',
        icon: CreditCard,
        domain: 'REPORTS',
        description: 'Outstanding receivables, aging analysis & credit utilization',
      },
      {
        id: 'LEDGERS',
        label: 'Customer 360° Ledger',
        shortLabel: 'Ledgers',
        icon: BookOpen,
        domain: 'REPORTS',
        description: 'Full double-entry party statement of accounts with PDF/Print export',
      },
      {
        id: 'STOCKS_WAREHOUSE',
        label: 'Warehouse & Stocks',
        shortLabel: 'Stocks',
        icon: Warehouse,
        domain: 'REPORTS',
        description: 'Finished goods inventory balances, carton counts & valuations',
      },
      {
        id: 'DEALERS_DISTRIBUTOR',
        label: 'Dealer Directory',
        shortLabel: 'Directory',
        icon: Store,
        domain: 'REPORTS',
        description: 'Geographical directory of active dealers across all regions',
      },
    ],
  },
];

/**
 * Filter items according to the current user permissions
 */
export function getFilteredNavItems(group: NavGroup, currentUser: User): NavSubItem[] {
  const isAdmin = isAdminUser(currentUser);
  return group.items.filter((item) => {
    if (item.adminOnly && !isAdmin && currentUser.role !== 'ACCOUNTS') {
      return false;
    }
    return true;
  });
}
