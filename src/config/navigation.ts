/**
 * N-LINK 360 — Single Source of Truth Navigation
 * Desktop = complete management. Mobile field force = simple market workflow.
 */

import {
  LayoutDashboard, Package, Store, Target, Users, GitFork,
  CheckCircle2, BarChart3, Banknote, CreditCard, BookOpen, Warehouse,
  Factory
} from 'lucide-react';
import { User } from '../types';
import { isAdminUser } from '../services/production-users';

export type MainDomain = 'DASHBOARDS' | 'OPERATIONS' | 'REPORTS';
export type OperationSubTab = 'COMPANY' | 'BRANDS_PRODUCTS' | 'DEALERS_DISTRIBUTORS' | 'TARGET' | 'SALES_TEAM' | 'HIERARCHY' | 'APPROVALS';
export type ReportSubTab = 'SALES' | 'RECOVERY' | 'CREDIT' | 'LEDGERS' | 'STOCKS_WAREHOUSE' | 'DEALERS_DISTRIBUTOR';

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

export interface NavGroup { id: MainDomain; label: string; number: string; description: string; items: NavSubItem[]; }

export const NAVIGATION_CONFIG: NavGroup[] = [
  {
    id: 'DASHBOARDS', label: 'Dashboard', number: '1',
    description: 'One clear view of sales, recovery, people, stock and business performance',
    items: [{ id: 'COCKPIT', label: 'Executive Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, domain: 'DASHBOARDS', description: 'Company-wide KPIs, sales, recovery, targets, achievement and operational health' }],
  },
  {
    id: 'OPERATIONS', label: 'Management', number: '2',
    description: 'Master data, HR, customers, products, factory, warehouse and approvals',
    items: [
      { id: 'COMPANY', label: 'Company, Factory & Warehouse', shortLabel: 'Factory / WH', icon: Factory, domain: 'OPERATIONS', description: 'Company, branches, factories, warehouses, stock flow and operational setup', adminOnly: true },
      { id: 'BRANDS_PRODUCTS', label: 'Products & SKUs', shortLabel: 'Products', icon: Package, domain: 'OPERATIONS', description: 'Products, brands, SKUs, packing, prices, tax and stock controls' },
      { id: 'DEALERS_DISTRIBUTORS', label: 'Customers', shortLabel: 'Customers', icon: Store, domain: 'OPERATIONS', description: 'Only two customer types: Distributor and Dealer. Master data, credit, balance and assignments' },
      { id: 'TARGET', label: 'Targets & Achievement', shortLabel: 'Targets', icon: Target, domain: 'OPERATIONS', description: 'Sales and recovery targets by employee, territory and period' },
      { id: 'SALES_TEAM', label: 'Employees & HR', shortLabel: 'Employees', icon: Users, domain: 'OPERATIONS', description: 'Employee master, roles, reporting line, assignments, status and access' },
      { id: 'HIERARCHY', label: 'Region / Area / Territory / Town', shortLabel: 'Hierarchy', icon: GitFork, domain: 'OPERATIONS', description: 'National sales hierarchy and employee/customer assignment structure' },
      { id: 'APPROVALS', label: 'Approval Queue', shortLabel: 'Approvals', icon: CheckCircle2, domain: 'OPERATIONS', badge: 'HO', badgeColor: 'bg-teal-700 text-teal-100', description: 'Head office approval for registrations, orders, invoices and recoveries', adminOnly: true },
    ],
  },
  {
    id: 'REPORTS', label: 'Business', number: '3',
    description: 'Customers, sales, invoices, ledgers, recovery and inventory reporting',
    items: [
      { id: 'SALES', label: 'Sales & Invoices', shortLabel: 'Sales', icon: BarChart3, domain: 'REPORTS', description: 'Orders, posted invoices, sales performance and achievement' },
      { id: 'RECOVERY', label: 'Recovery', shortLabel: 'Recovery', icon: Banknote, domain: 'REPORTS', description: 'Collections, verification, payment methods and recovery performance' },
      { id: 'CREDIT', label: 'Credit & Outstanding', shortLabel: 'Credit', icon: CreditCard, domain: 'REPORTS', description: 'Credit limits, utilization, aging and outstanding receivables' },
      { id: 'LEDGERS', label: 'Customer Ledgers', shortLabel: 'Ledgers', icon: BookOpen, domain: 'REPORTS', description: 'Opening balance, invoices, recoveries, credit notes and running balance' },
      { id: 'STOCKS_WAREHOUSE', label: 'Warehouse & Inventory', shortLabel: 'Inventory', icon: Warehouse, domain: 'REPORTS', description: 'Finished goods, stock movement, receipts, dispatch and valuation' },
      { id: 'DEALERS_DISTRIBUTOR', label: 'Customer Directory', shortLabel: 'Directory', icon: Store, domain: 'REPORTS', description: 'Distributor and Dealer directory with territory and assignment filters' },
    ],
  },
];

export function getFilteredNavItems(group: NavGroup, currentUser: User): NavSubItem[] {
  const isAdmin = isAdminUser(currentUser);
  return group.items.filter((item) => {
    if (item.adminOnly && !isAdmin && currentUser.role !== 'ACCOUNTS' && currentUser.role !== 'WAREHOUSE_MANAGER') return false;
    return true;
  });
}
