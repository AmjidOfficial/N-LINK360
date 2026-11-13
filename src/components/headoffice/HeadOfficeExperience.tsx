/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Head Office Desktop Command Center
 * "ONE SMART PLATFORM" Archetype:
 * - Premium, spacious, modern enterprise layout
 * - Brand aesthetic: Premium N-LINK Green, Light Mint/Teal, Dark Charcoal, Light Grey/White surfaces
 * - Sections:
 *   1. OVERVIEW: Today's KPIs, Approval Alerts, Field Force Status, Town Activity, Financial Summary
 *   2. APPROVALS: Dedicated Order Approvals & Payment Confirmations (Sole Approver: Shahzad Ullah)
 *   3. FIELD FORCE: Attendance Monitoring & Shift Status
 *   4. CUSTOMERS: Dealers & Distributors Directory + Customer 360 inspect
 *   5. SALES: Orders Pipeline & Invoices Master List
 *   6. FINANCE: Recovery Ledgers & Audit Logs
 *   7. REPORTS: Operational & Financial Reports with CSV/PDF export
 *   8. SETTINGS: Google Sheets Two-Way Sync & System Preferences
 */

<<<<<<< HEAD
import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { motion } from 'motion/react';
import {
  CreditNote,
  Customer,
  CustomerVisit,
  Dispatch,
  EmployeeAttendance,
  Invoice,
  Recovery,
  SalesOrder,
  SKU,
  StockReturn,
  Target,
  UserProfileUpdateRequest,
} from '../../types';
import { NLinkUser, NLINK_TEAM_ROSTER } from '../../data/nlink-users-team';
import { hasPermission, Permission } from '../../lib/permissions';
=======
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Customer, SalesOrder, Recovery, EmployeeAttendance, UserProfileUpdateRequest } from '../../types';
import { NLinkUser, NLINK_TEAM_ROSTER } from '../../data/nlink-users-team';
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
import { isAuthorizedApproverEmail, invalidateAllSessionsGlobally } from '../../services/production-users';
import { Customer360Screen } from '../creditbook/Customer360Screen';
import { CustomerInvoicesView } from '../creditbook/CustomerInvoicesView';
import { CustomerLedgerView } from '../creditbook/CustomerLedgerView';
import { SimpleOrderEntryDrawer } from '../creditbook/SimpleOrderEntryDrawer';
<<<<<<< HEAD
import { BulkSkuOrderForm } from '../creditbook/BulkSkuOrderForm';
import { SimpleRecoveryDrawer } from '../creditbook/SimpleRecoveryDrawer';
import { FieldOfficerActivityDashboard } from '../creditbook/FieldOfficerActivityDashboard';
import { EmployeeAttendanceLedgerView } from '../creditbook/EmployeeAttendanceLedgerView';
import { NationalLightLogo } from '../NationalLightLogo';
import { ExecutiveSpotlightCard } from '../dashboard/ExecutiveSpotlightCard';
import { FinancialTrendBarChart } from '../dashboard/FinancialTrendBarChart';
import { MiniCalendarWidget } from '../dashboard/MiniCalendarWidget';
import { MoreActionsMenu } from '../ui/MoreActionsMenu';
import { NatureSkeleton } from '../ui/NatureSkeleton';
import { EmployeeManagementModule } from './EmployeeManagementModule';
import { InventoryWarehouseModule } from './InventoryWarehouseModule';
import { PackingLoadingModule } from './PackingLoadingModule';
import { InvoiceGenerationModule } from './InvoiceGenerationModule';
import { DispatchLogisticsModule } from './DispatchLogisticsModule';
import { HrAdminModule } from './HrAdminModule';
import { ReportsAuditModule } from './ReportsAuditModule';

const ExecutiveDashboardView = React.lazy(() => import('../dashboard/ExecutiveDashboardView').then((m) => ({ default: m.ExecutiveDashboardView })));
const ManageTownsInterface = React.lazy(() => import('./ManageTownsInterface').then((m) => ({ default: m.ManageTownsInterface })));
const DistributorTransferModule = React.lazy(() => import('./DistributorTransferModule').then((m) => ({ default: m.DistributorTransferModule })));
const DealerCreditHealthMap = React.lazy(() => import('../d3/DealerCreditHealthMap').then((m) => ({ default: m.DealerCreditHealthMap })));
import { exportSalesSummaryCsv } from '../../utils/reportExport';
=======
import { SimpleRecoveryDrawer } from '../creditbook/SimpleRecoveryDrawer';
import { FieldOfficerActivityDashboard } from '../creditbook/FieldOfficerActivityDashboard';
import { EmployeeAttendanceLedgerView } from '../creditbook/EmployeeAttendanceLedgerView';
import { DealerCreditHealthMap } from '../d3/DealerCreditHealthMap';
import { NationalLightLogo } from '../NationalLightLogo';
import { exportSalesSummaryCsv, exportRecoveryAuditCsv, exportAgingReportCsv } from '../../utils/reportExport';
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
import {
  LayoutDashboard,
  CheckSquare,
  Users2,
  Building2,
  ShoppingBag,
  CreditCard,
  FileBarChart2,
  Settings,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  FileText,
  Receipt,
  Download,
  Phone,
  Eye,
  RefreshCw,
  SlidersHorizontal,
<<<<<<< HEAD
  Sun,
  Moon,
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  ChevronRight,
  LogOut,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  Filter,
  Plus,
  UserCheck,
  Activity,
  Calendar,
  Share2,
  Wallet,
  BookOpen,
  MoreHorizontal,
  Navigation,
  X,
  Sparkles,
<<<<<<< HEAD
  Truck,
  PackageCheck,
  ArrowRightLeft,
  Edit3,
  KeyRound,
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
} from 'lucide-react';
import { downloadSalesInvoicePdf } from '../../utils/exportInvoicePdf';
import { downloadCustomerLedgerPdf } from '../../utils/exportLedgerPdf';
import { AddNewCustomerModal } from '../creditbook/AddNewCustomerModal';
<<<<<<< HEAD
import { EditOrDeleteEntryModal } from '../creditbook/EditOrDeleteEntryModal';
import { TownNode, InventoryBalance, InventoryTransaction, InventoryTransactionType, LeaveRequest } from '../../types';
import { getStoredTownNodes, saveTownNodes } from '../../services/townManagement';
import { OperationalDispatchInvoiceModal, DispatchInvoiceCompletionPayload } from './OperationalDispatchInvoiceModal';
=======
import { ManageTownsInterface } from './ManageTownsInterface';
import { TownNode } from '../../types';
import { getStoredTownNodes, saveTownNodes } from '../../services/townManagement';
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

export type HeadOfficeTab =
  | 'OVERVIEW'
  | 'APPROVALS'
  | 'FIELD_FORCE'
  | 'CUSTOMERS'
  | 'SALES'
  | 'FINANCE'
  | 'REPORTS'
  | 'SETTINGS'
<<<<<<< HEAD
  | 'MANAGE_TOWNS'
  | 'DISTRIBUTOR_TRANSFER'
  | 'EMPLOYEE_MANAGEMENT'
  | 'INVENTORY_WAREHOUSE'
  | 'PACKING_LOADING'
  | 'INVOICE_GENERATION'
  | 'DISPATCH_LOGISTICS'
  | 'HR_ADMIN';
=======
  | 'MANAGE_TOWNS';
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

export interface HeadOfficeExperienceProps {
  currentUser: NLinkUser;
  customers: Customer[];
  orders: SalesOrder[];
  recoveries: Recovery[];
  attendanceRecords?: EmployeeAttendance[];
  profileUpdateRequests?: UserProfileUpdateRequest[];
  townNodes?: TownNode[];
  onUpdateTownNodes?: (nodes: TownNode[]) => void;
  onApproveOrder: (orderId: string, approver?: any) => void;
  onRejectOrder: (orderId: string, approver: any, reason?: string) => void;
  onApproveRecovery: (recoveryId: string, approver?: any) => void;
  onRejectRecovery: (recoveryId: string, approver: any, reason?: string) => void;
  onApproveCustomer?: (customerId: string) => void;
  onRejectCustomer?: (customerId: string, reason?: string) => void;
  onApproveProfileRequest?: (requestId: string) => void;
  onRejectProfileRequest?: (requestId: string, reason?: string) => void;
  onAddCustomer?: (customer: Customer) => void;
  onSyncGoogleSheet?: () => Promise<void>;
  isSyncingSheet?: boolean;
  onPlaceOrder: (order: SalesOrder) => void;
  onRecordRecovery: (recovery: Recovery) => void;
  onOpenRateCard: () => void;
  onOpenSyncModal: () => void;
<<<<<<< HEAD
=======
  onSwitchToFieldMobile: () => void;
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  onSignOut: () => void;
  onPurgeMockData?: () => void;
  onPreviewInvoicePdf?: (order: SalesOrder, customer: Customer) => void;
  onOpenShareModal?: () => void;
  isOnline?: boolean;
  ledgerEntries?: any[];
<<<<<<< HEAD
  inventoryBalances?: InventoryBalance[];
  inventoryTransactions?: InventoryTransaction[];
  leaveRequests?: LeaveRequest[];
  invoices?: Invoice[];
  dispatches?: Dispatch[];
  visits?: CustomerVisit[];
  skus?: SKU[];
  creditNotes?: CreditNote[];
  stockReturns?: StockReturn[];
  targets?: Target[];
  onDispatchAndInvoiceOrder?: (payload: DispatchInvoiceCompletionPayload) => void;
  onCancelOrReverseOrder?: (orderId: string, reason: string) => void;
  onSaveOrderEdit?: (orderId: string, updates: Partial<SalesOrder>) => void;
  onCancelOrReverseRecovery?: (recoveryId: string, reason: string) => void;
  onSaveRecoveryEdit?: (recoveryId: string, updates: Partial<Recovery>) => void;
  onSaveAttendanceEdit?: (recordId: string, updates: Partial<EmployeeAttendance>) => void;
  onDeleteAttendance?: (recordId: string, reason?: string) => void;
  onOpenSalesAuditModal?: () => void;
  onConfirmPacking?: (orderId: string, packingRecord: NonNullable<SalesOrder['packingRecord']>) => void;
  onPostInvoice?: (order: SalesOrder) => void;
  onAssignDispatch?: (orderId: string, payload: { warehouseName: string; transporterName: string; vehicleNumber: string; driverName: string; driverPhone: string; bilityNumber: string; dispatchNoteNumber: string }) => void;
  onConfirmDelivery?: (orderId: string, payload: { status: 'DELIVERED' | 'PARTIALLY_DELIVERED'; deliveryReceiverName: string; deliveryNotes: string; shortageReported?: number; damageReported?: number }) => void;
  onStockAdjustment?: (payload: { skuId: string; skuCode: string; skuName: string; transactionType: InventoryTransactionType; quantity: number; warehouseName: string; referenceId: string; notes: string }) => void;
  onSubmitLeaveRequest?: (req: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>) => void;
  onReviewLeaveRequest?: (requestId: string, decision: 'APPROVED' | 'REJECTED', notes?: string) => void;
  onOpenChangePassword?: () => void;
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
}

export const HeadOfficeExperience: React.FC<HeadOfficeExperienceProps> = ({
  currentUser,
  customers = [],
  orders = [],
  recoveries = [],
  ledgerEntries = [],
  attendanceRecords = [],
  profileUpdateRequests = [],
  townNodes,
  onUpdateTownNodes,
  onApproveOrder,
  onRejectOrder,
  onApproveRecovery,
  onRejectRecovery,
  onApproveCustomer,
  onRejectCustomer,
  onApproveProfileRequest,
  onRejectProfileRequest,
  onAddCustomer,
  onSyncGoogleSheet,
  isSyncingSheet,
  onPlaceOrder,
  onRecordRecovery,
  onOpenRateCard,
  onOpenSyncModal,
<<<<<<< HEAD
=======
  onSwitchToFieldMobile,
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  onSignOut,
  onPurgeMockData,
  onPreviewInvoicePdf,
  onOpenShareModal,
  isOnline = true,
<<<<<<< HEAD
  inventoryBalances = [],
  inventoryTransactions = [],
  leaveRequests = [],
  invoices,
  dispatches,
  visits,
  skus,
  creditNotes,
  stockReturns,
  targets,
  onDispatchAndInvoiceOrder,
  onCancelOrReverseOrder,
  onSaveOrderEdit,
  onCancelOrReverseRecovery,
  onSaveRecoveryEdit,
  onSaveAttendanceEdit,
  onDeleteAttendance,
  onConfirmPacking,
  onPostInvoice,
  onAssignDispatch,
  onConfirmDelivery,
  onStockAdjustment,
  onSubmitLeaveRequest,
  onReviewLeaveRequest,
  onOpenChangePassword,
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
}) => {
  const [activeTab, setActiveTab] = useState<HeadOfficeTab>('OVERVIEW');
  const [approvalsSubTab, setApprovalsSubTab] = useState<'ORDERS' | 'RECOVERIES' | 'CUSTOMERS' | 'PROFILE_EDITS' | 'AUDIT'>('ORDERS');
  const [fieldForceSubTab, setFieldForceSubTab] = useState<'ROSTER' | 'ATTENDANCE_LEDGER' | 'PERFORMANCE_DASHBOARD'>('ROSTER');
  const [salesSubTab, setSalesSubTab] = useState<'ORDERS' | 'INVOICES'>('ORDERS');
<<<<<<< HEAD
  const [entryManageTarget, setEntryManageTarget] = useState<{ type: 'ORDER' | 'RECOVERY' | 'ATTENDANCE'; data: any } | null>(null);
  const [salesOrderView, setSalesOrderView] = useState<'ORDER_FORM' | 'ORDER_LIST'>('ORDER_FORM');
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  const [dealersViewMode, setDealersViewMode] = useState<'CARDS' | 'TABLE' | 'MAP'>('CARDS');
  const [selectedCustomerIdFor360, setSelectedCustomerIdFor360] = useState<string | null>(null);
  const [customer360SubView, setCustomer360SubView] = useState<'360' | 'INVOICES' | 'LEDGER'>('360');
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [isRecoveryDrawerOpen, setIsRecoveryDrawerOpen] = useState(false);
<<<<<<< HEAD
  const [dispatchModalOrder, setDispatchModalOrder] = useState<SalesOrder | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

  // Dynamic Town Nodes State
  const effectiveTownNodes = townNodes && townNodes.length > 0 ? townNodes : getStoredTownNodes();
  const handleUpdateTowns = (updated: TownNode[]) => {
    if (onUpdateTownNodes) {
      onUpdateTownNodes(updated);
    } else {
      saveTownNodes(updated);
    }
  };

  // Rejection modal state
  const [rejectionTarget, setRejectionTarget] = useState<{ id: string; type: 'ORDER' | 'RECOVERY' | 'CUSTOMER' | 'PROFILE'; code: string } | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Search & Filter states
  const [customerFilterQuery, setCustomerFilterQuery] = useState('');
  const [townFilter, setTownFilter] = useState('ALL');

<<<<<<< HEAD
  // Persistent Theme (Industrial Dark & Emerald default + Light mode toggle)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('nlink_theme_mode');
        if (stored === 'light') return false;
        if (stored === 'dark') return true;
      }
    } catch {}
    return true;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    try {
      localStorage.setItem('nlink_theme_mode', next ? 'dark' : 'light');
    } catch {}
  };

=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  // Pending profile update requests
  const pendingProfileRequests = useMemo(() => {
    return profileUpdateRequests.filter((r) => r.status === 'PENDING');
  }, [profileUpdateRequests]);

<<<<<<< HEAD
  // Sole Approver Check (Shahzad Ullah verified authorized corporate account)
  const isShahzad = isAuthorizedApproverEmail(currentUser?.email, currentUser);
=======
  // Sole Approver Check (Shahzad Ullah)
  const isShahzad = isAuthorizedApproverEmail(currentUser?.email, currentUser) ||
    Boolean(currentUser?.fullName?.toLowerCase().includes('shahzad')) ||
    (currentUser?.role as string) === 'SUPER_ADMIN' ||
    (currentUser?.role as string) === 'MANAGING_DIRECTOR' ||
    (currentUser?.role as string) === 'EXECUTIVE_DIRECTOR';
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

  // Core KPI Calculations for Today
  const todayDateStr = new Date().toISOString().slice(0, 10);

  const todaySales = useMemo(() => {
    return orders
      .filter((o) => (o.orderDate || o.createdAt || '').slice(0, 10) === todayDateStr && o.status !== 'REJECTED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [orders, todayDateStr]);

  const todayRecovery = useMemo(() => {
    return recoveries
      .filter((r) => (r.recordedAt || r.createdAt || '').slice(0, 10) === todayDateStr && r.status !== 'REJECTED')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [recoveries, todayDateStr]);

  const pendingOrders = useMemo(() => {
<<<<<<< HEAD
    return orders.filter(
      (o) =>
        o.status !== 'APPROVED' &&
        o.status !== 'REJECTED' &&
        o.shahzadApproval !== 'APPROVED' &&
        o.dualApprovalStatus !== 'DUAL_APPROVED' &&
        ((o.status as string) === 'SUBMITTED' ||
          (o.status as string) === 'PENDING_APPROVAL' ||
          (o.status as string) === 'PENDING')
    );
  }, [orders]);

  const pendingRecoveries = useMemo(() => {
    return recoveries.filter(
      (r) =>
        r.status !== 'VERIFIED' &&
        r.status !== 'APPROVED' &&
        r.status !== 'REJECTED' &&
        r.shahzadApproval !== 'APPROVED' &&
        r.dualApprovalStatus !== 'DUAL_APPROVED' &&
        ((r.status as string) === 'PENDING_VERIFICATION' ||
          (r.status as string) === 'PENDING')
    );
=======
    return orders.filter((o) => (o.status as string) === 'SUBMITTED' || (o.status as string) === 'PENDING_APPROVAL');
  }, [orders]);

  const pendingRecoveries = useMemo(() => {
    return recoveries.filter((r) => r.status === 'PENDING_VERIFICATION');
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
  }, [recoveries]);

  const pendingCustomers = useMemo(() => {
    return customers.filter(
<<<<<<< HEAD
      (c) =>
        c.approvalStatus !== 'APPROVED' &&
        c.status !== 'ACTIVE' &&
        (c.approvalStatus === 'PENDING_APPROVAL' || c.status === 'PENDING_APPROVAL')
=======
      (c) => c.approvalStatus === 'PENDING_APPROVAL' || c.status === 'PENDING_APPROVAL'
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
    );
  }, [customers]);

  const totalOutstanding = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.currentBalance ?? c.openingBalance ?? 0), 0);
  }, [customers]);

  // Town-wise Activity Breakdown
  const townActivityData = useMemo(() => {
    const map: Record<string, { town: string; sales: number; recovery: number; outstanding: number; customerCount: number }> = {};
    customers.forEach((c) => {
      const t = c.town || c.city || 'Other';
      if (!map[t]) map[t] = { town: t, sales: 0, recovery: 0, outstanding: 0, customerCount: 0 };
      map[t].outstanding += c.currentBalance ?? c.openingBalance ?? 0;
      map[t].customerCount += 1;
    });

    orders.forEach((o) => {
      if (o.status !== 'REJECTED') {
        const c = customers.find((cust) => cust.id === o.customerId || cust.companyName === o.customerName);
        const t = c?.town || c?.city || 'Other';
        if (!map[t]) map[t] = { town: t, sales: 0, recovery: 0, outstanding: 0, customerCount: 0 };
        map[t].sales += o.totalAmount || 0;
      }
    });

    recoveries.forEach((r) => {
      if (r.status !== 'REJECTED') {
        const c = customers.find((cust) => cust.id === r.customerId || cust.companyName === r.customerName);
        const t = c?.town || c?.city || 'Other';
        if (!map[t]) map[t] = { town: t, sales: 0, recovery: 0, outstanding: 0, customerCount: 0 };
        map[t].recovery += r.amount || 0;
      }
    });

    return Object.values(map).sort((a, b) => b.outstanding - a.outstanding);
  }, [customers, orders, recoveries]);

  // Execute Rejection
  const handleConfirmRejection = () => {
    if (!rejectionTarget) return;
    if (!rejectionReasonInput.trim()) {
      alert('Please enter a clear rejection reason.');
      return;
    }
    if (rejectionTarget.type === 'ORDER') {
      onRejectOrder(rejectionTarget.id, 'SHAHZAD', rejectionReasonInput.trim());
    } else if (rejectionTarget.type === 'RECOVERY') {
      onRejectRecovery(rejectionTarget.id, 'SHAHZAD', rejectionReasonInput.trim());
    } else if (rejectionTarget.type === 'CUSTOMER') {
      onRejectCustomer?.(rejectionTarget.id, rejectionReasonInput.trim());
    } else if (rejectionTarget.type === 'PROFILE') {
      onRejectProfileRequest?.(rejectionTarget.id, rejectionReasonInput.trim());
    }
    setRejectionTarget(null);
    setRejectionReasonInput('');
  };

  // Inspect customer in Customer 360
  const selectedCustomerObj = useMemo(() => {
    if (!selectedCustomerIdFor360) return null;
    return (
      customers.find(
        (c) =>
          c.id === selectedCustomerIdFor360 ||
          c.customerCode === selectedCustomerIdFor360 ||
          (c.companyName && c.companyName.toLowerCase() === selectedCustomerIdFor360.toLowerCase())
      ) || null
    );
  }, [selectedCustomerIdFor360, customers]);

  // Customer for Etc Actions Modal
  const [desktopEtcCustomer, setDesktopEtcCustomer] = useState<Customer | null>(null);

  // Direct Button Handlers for Daily Recovery, Ordering, Invoices, Ledgers & 360
  const handleOpenRecoveryForCustomer = (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCustomerIdFor360(cust.id || cust.customerCode);
    setIsRecoveryDrawerOpen(true);
  };

  const handleOpenOrderForCustomer = (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCustomerIdFor360(cust.id || cust.customerCode);
    setIsOrderDrawerOpen(true);
  };

  const handleOpenInvoicesForCustomer = (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCustomerIdFor360(cust.id || cust.customerCode);
    setCustomer360SubView('INVOICES');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLedgerForCustomer = (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCustomerIdFor360(cust.id || cust.customerCode);
    setCustomer360SubView('LEDGER');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpen360ForCustomer = (cust: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCustomerIdFor360(cust.id || cust.customerCode);
    setCustomer360SubView('360');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

<<<<<<< HEAD
  const pendingTotalCount = pendingOrders.length + pendingRecoveries.length + pendingCustomers.length;

  const canViewItem = (perms?: Permission[]) => {
    if (!perms || perms.length === 0) return true;
    return perms.some((p) => hasPermission(currentUser.role, p));
  };

  const rawSidebarGroups: Array<{
    title: string;
    items: Array<{
      id: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number;
      alertBadge?: number;
      requiredPermissions?: Permission[];
    }>;
  }> = [
    {
      title: 'Overview',
      items: [
        { id: 'OVERVIEW' as const, label: 'Executive Dashboard', icon: LayoutDashboard, requiredPermissions: ['dashboard.view'] },
      ],
    },
    {
      title: 'Operations',
      items: [
        { id: 'CUSTOMERS' as const, label: 'Dealers Network', icon: Building2, badge: customers.length, requiredPermissions: ['sales.customers'] },
        { id: 'INVENTORY_WAREHOUSE' as const, label: 'Inventory & Stock', icon: PackageCheck, requiredPermissions: ['inventory.view'] },
        { id: 'PACKING_LOADING' as const, label: 'Packing & Loading', icon: Truck, requiredPermissions: ['inventory.manage', 'dispatch.manage'] },
        { id: 'INVOICE_GENERATION' as const, label: 'Invoicing & Billing', icon: Receipt, requiredPermissions: ['invoice.create', 'invoice.post'] },
        { id: 'DISPATCH_LOGISTICS' as const, label: 'Dispatch & Logistics', icon: Truck, requiredPermissions: ['dispatch.manage'] },
        { id: 'MANAGE_TOWNS' as const, label: 'Town Nodes & Routes', icon: MapPin, requiredPermissions: ['hierarchy.manage'] },
        { id: 'DISTRIBUTOR_TRANSFER' as const, label: 'Distributor Transfer', icon: ArrowRightLeft, requiredPermissions: ['sales.customers', 'hierarchy.manage'] },
      ],
    },
    {
      title: 'Sales & Field',
      items: [
        { id: 'SALES_ORDERS' as const, label: 'Orders Pipeline', icon: ShoppingBag, requiredPermissions: ['sales.order'] },
        { id: 'SALES_INVOICES' as const, label: 'Invoices & Bills', icon: Receipt, requiredPermissions: ['ledger.view'] },
        { id: 'FIELD_FORCE' as const, label: 'Field Force & Attendance', icon: Users2, requiredPermissions: ['hr.view', 'reports.view'] },
      ],
    },
    {
      title: 'Finance & Audit',
      items: [
        { id: 'FINANCE' as const, label: 'Recovery & Collections', icon: CreditCard, requiredPermissions: ['ledger.view'] },
        { id: 'REPORTS' as const, label: 'Reports & Audits', icon: FileBarChart2, requiredPermissions: ['reports.view'] },
      ],
    },
    {
      title: 'Administration',
      items: [
        { id: 'EMPLOYEE_MANAGEMENT' as const, label: 'Employee Management', icon: Users2, requiredPermissions: ['users.manage'] },
        { id: 'HR_ADMIN' as const, label: 'HR & Administration', icon: FileText, requiredPermissions: ['hr.manage'] },
        { id: 'APPROVALS' as const, label: 'Approvals Hub', icon: CheckSquare, alertBadge: pendingTotalCount, requiredPermissions: ['recovery.verify'] },
        { id: 'SETTINGS' as const, label: 'Settings & Sync', icon: Settings, requiredPermissions: ['settings.manage'] },
      ],
    },
  ];

  const sidebarGroups = rawSidebarGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canViewItem(item.requiredPermissions)),
    }))
    .filter((group) => group.items.length > 0);

  const handleSidebarNav = (id: string) => {
    setSelectedCustomerIdFor360(null);
    setIsSidebarOpen(false);
    if (id === 'SALES_ORDERS') {
      setActiveTab('SALES');
      setSalesSubTab('ORDERS');
    } else if (id === 'SALES_INVOICES') {
      setActiveTab('SALES');
      setSalesSubTab('INVOICES');
    } else {
      setActiveTab(id as HeadOfficeTab);
    }
  };

  const isNavItemActive = (id: string) => {
    if (id === 'SALES_ORDERS') return activeTab === 'SALES' && salesSubTab === 'ORDERS';
    if (id === 'SALES_INVOICES') return activeTab === 'SALES' && salesSubTab === 'INVOICES';
    return activeTab === id;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070E0B] text-slate-900 dark:text-emerald-50 flex antialiased">
      {/* Tablet / Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 1. RESPONSIVE COLLAPSIBLE SIDEBAR (260px Expanded / 72px Rail on Desktop >=1024px, Drawer on <1024px) */}
      <aside
        aria-label="ERP Sidebar Navigation"
        className={`fixed inset-y-0 left-0 z-50 w-64 ${
          isSidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'
        } bg-white dark:bg-[#0B1610] border-r border-slate-200 dark:border-emerald-900/50 flex flex-col shrink-0 transition-all duration-200 lg:static lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header & Desktop Collapse Toggle */}
        <div className="h-14 px-3 border-b border-slate-200 dark:border-emerald-900/50 flex items-center justify-between shrink-0">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <NationalLightLogo size="sm" showGlow={false} />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="font-bold text-sm tracking-tight text-[#0B132B] dark:text-white font-display whitespace-nowrap">
                  N-Link 360
                </span>
                <span className="text-[10px] font-semibold text-[#F59E0B] whitespace-nowrap">
                  Head Office
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="hidden lg:flex w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 items-center justify-center cursor-pointer"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 p-2.5 space-y-4 overflow-y-auto">
          {sidebarGroups.map((group) => (
            <div key={group.title}>
              {!isSidebarCollapsed && (
                <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.title}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavItemActive(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSidebarNav(item.id)}
                      title={item.label}
                      className={`w-full ${
                        isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                      } py-2.5 rounded-xl text-xs font-semibold flex items-center transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#0B132B] dark:bg-[#0D9488] text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#F59E0B] dark:text-white' : 'text-[#0D9488]'}`} />
                        {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!isSidebarCollapsed && 'badge' in item && item.badge !== undefined && (
                        <span className="text-[11px] font-mono text-slate-400">{item.badge}</span>
                      )}
                      {!isSidebarCollapsed && 'alertBadge' in item && item.alertBadge !== undefined && item.alertBadge > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F59E0B] text-[#0B132B]">
                          {item.alertBadge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: Account & Mode Switch */}
        <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          {!isSidebarCollapsed && (
            <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0B132B] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser.avatarInitials || 'NL'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                  {isShahzad ? 'Sole Executive Approver' : currentUser.roleTitle || 'Head Office'}
                </span>
              </div>
            </div>
          )}

          <div className={isSidebarCollapsed ? 'flex flex-col gap-1.5' : 'grid grid-cols-1 gap-1.5'}>
            {onOpenChangePassword && (
              <button
                type="button"
                onClick={onOpenChangePassword}
                title="Change Password"
                className="py-2 px-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {!isSidebarCollapsed && <span>Change Password</span>}
              </button>
            )}
            <button
              type="button"
              onClick={onSignOut}
              title="Sign Out"
              className="py-2 px-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {!isSidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Clean 3-Zone Top Header */}
        <header className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-[#0E1A14]/95 backdrop-blur-md border-b border-slate-200 dark:border-emerald-900/50 px-4 lg:px-6 flex items-center justify-between gap-4">
          {/* Left: Tablet Menu Trigger + Contextual Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden btn-ghost px-2"
              aria-label="Open navigation menu"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <div className="flex items-baseline gap-2 truncate">
              <span className="text-xs text-slate-500 hidden sm:inline">N-Link</span>
              <span className="text-xs text-slate-400 hidden sm:inline">/</span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] capitalize truncate tracking-tight">
                {activeTab.toLowerCase().replace(/_/g, ' ')}
              </h1>
            </div>
          </div>

          {/* Center: Unboxed Sync & Authority Metadata */}
          <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
            <span>Supabase Authoritative</span>
            <span aria-hidden="true">&middot;</span>
            <span>Google Sheets Sync</span>
            <span aria-hidden="true">&middot;</span>
            <span className="text-[#0F172A] dark:text-[#F8FAFC] font-medium">
              Approver: Shahzad Ullah
            </span>
          </div>

          {/* Right: Theme Toggle & Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleTheme}
              className="btn-outline px-2.5"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Executive Dark Mode'}
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Executive Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#0B132B]" />}
            </button>

=======
  return (
    <div className="min-h-screen bg-[#f4f6f8] dark:bg-[#070c14] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* 1. Desktop Modern Sidebar */}
      <motion.aside
        initial={{ x: -260, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0"
      >
        {/* Brand & Platform Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <NationalLightLogo size="sm" showGlow={false} />
            <div>
              <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white block">
                N-LINK 360
              </span>
              <span className="text-[10px] text-teal-800 dark:text-teal-400 font-extrabold uppercase tracking-wider block">
                Command Center
              </span>
            </div>
          </div>
        </div>

        {/* User Identity Box */}
        <div className="p-4 mx-3 my-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser.avatarInitials || 'NL'}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                {currentUser.fullName}
              </span>
              <span className="text-[10px] text-teal-800 dark:text-teal-300 font-bold block truncate">
                {isShahzad ? '👑 Sole Signing Authority' : currentUser.roleTitle || 'Head Office'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: 'OVERVIEW' as const, label: 'Overview', icon: LayoutDashboard },
            {
              id: 'APPROVALS' as const,
              label: 'Approvals',
              icon: CheckSquare,
              badge: pendingOrders.length + pendingRecoveries.length + pendingCustomers.length,
            },
            { id: 'FIELD_FORCE' as const, label: 'Field Force', icon: Users2 },
            { id: 'CUSTOMERS' as const, label: 'Dealers', icon: Building2 },
            { id: 'SALES' as const, label: 'Sales & Invoices', icon: ShoppingBag },
            { id: 'FINANCE' as const, label: 'Finance & Recovery', icon: CreditCard },
            { id: 'REPORTS' as const, label: 'Reports', icon: FileBarChart2 },
            { id: 'MANAGE_TOWNS' as const, label: 'Manage Towns', icon: MapPin },
            { id: 'SETTINGS' as const, label: 'Settings & Sync', icon: Settings },
          ].map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                whileHover={{ x: isActive ? 0 : 5, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveTab(item.id);
                  setSelectedCustomerIdFor360(null);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {Boolean(item.badge && item.badge > 0) && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                      isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Footer Actions (Switch to Field Mobile / Logout) */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {onOpenShareModal && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenShareModal}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>🔗 Share Team Working Link</span>
            </motion.button>
          )}

          {onSwitchToFieldMobile && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSwitchToFieldMobile}
              className="w-full py-2.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 hover:bg-teal-100 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>📱 Switch to Mobile Version</span>
            </motion.button>
          )}

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSignOut}
            className="w-full py-2 px-3 rounded-xl text-slate-500 hover:text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </motion.button>
        </div>
      </motion.aside>

      {/* 2. Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Desktop Bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-slate-900 dark:text-white capitalize">
              {activeTab.replace('_', ' ')}
            </h1>
            <span className="text-xs text-slate-400 font-medium">
              National Lights &bull; Enterprise 360
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sole Approver Shield Tag */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>Approver: Shahzad Ullah</span>
            </div>

            {onOpenShareModal && (
              <button
                type="button"
                onClick={onOpenShareModal}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-xs"
                title="Share unique working link with field officers & directors"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Share Team Link</span>
              </button>
            )}
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a

            {onSyncGoogleSheet && (
              <button
                type="button"
                onClick={() => onSyncGoogleSheet()}
                disabled={isSyncingSheet}
<<<<<<< HEAD
                className="btn-outline"
                title="Sync Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#0D9488] dark:text-blue-400 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncingSheet ? 'Syncing...' : 'Sync'}</span>
=======
                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                <span>{isSyncingSheet ? 'Syncing...' : 'Sync Sheet'}</span>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAddCustomerModalOpen(true)}
<<<<<<< HEAD
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
=======
              className="px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Customer</span>
            </button>

            <button
              type="button"
              onClick={onOpenSyncModal}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-700" />
              <span>Sync Cloud</span>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
            </button>
          </div>
        </header>

        {/* Dynamic Body Content */}
<<<<<<< HEAD
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
=======
        <main className="p-6 space-y-6 max-w-7xl">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
          {/* ==================================================== */}
          {/* CUSTOMER 360 OVERLAY IF SELECTED */}
          {/* ==================================================== */}
          {selectedCustomerObj ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {customer360SubView === '360' && (
                <Customer360Screen
                  customer={selectedCustomerObj}
                  currentUser={currentUser}
                  orders={orders}
                  recoveries={recoveries}
                  onBack={() => setSelectedCustomerIdFor360(null)}
                  onOpenNewOrder={() => setIsOrderDrawerOpen(true)}
                  onOpenRecordRecovery={() => setIsRecoveryDrawerOpen(true)}
                  onOpenInvoices={() => setCustomer360SubView('INVOICES')}
                  onOpenLedger={() => setCustomer360SubView('LEDGER')}
                />
              )}

              {customer360SubView === 'INVOICES' && (
                <CustomerInvoicesView
                  customer={selectedCustomerObj}
                  currentUser={currentUser}
                  orders={orders}
                  onBack={() => setCustomer360SubView('360')}
                  onPreviewPdf={onPreviewInvoicePdf}
                />
              )}

              {customer360SubView === 'LEDGER' && (
                <CustomerLedgerView
                  customer={selectedCustomerObj}
                  currentUser={currentUser}
                  orders={orders}
                  recoveries={recoveries}
                  ledgerEntries={ledgerEntries}
                  onBack={() => setCustomer360SubView('360')}
<<<<<<< HEAD
                  onApproveOrder={onApproveOrder}
                  onApproveRecovery={onApproveRecovery}
                  onCancelOrReverseOrder={onCancelOrReverseOrder}
                  onSaveOrderEdit={onSaveOrderEdit}
                  onCancelOrReverseRecovery={onCancelOrReverseRecovery}
                  onSaveRecoveryEdit={onSaveRecoveryEdit}
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                />
              )}
            </div>
          ) : (
            <>
              {/* ==================================================== */}
<<<<<<< HEAD
              {/* EMPLOYEE MANAGEMENT TAB (DEPARTMENT 1) */}
              {/* ==================================================== */}
              {activeTab === 'EMPLOYEE_MANAGEMENT' && (
                <EmployeeManagementModule currentUser={currentUser} />
              )}

              {/* INVENTORY & WAREHOUSE TAB (DEPARTMENT 5) */}
              {activeTab === 'INVENTORY_WAREHOUSE' && (
                <InventoryWarehouseModule
                  currentUser={currentUser}
                  inventoryBalances={inventoryBalances}
                  inventoryTransactions={inventoryTransactions}
                  onStockAdjustment={onStockAdjustment}
                />
              )}

              {/* PACKING & LOADING TAB (DEPARTMENT 6) */}
              {activeTab === 'PACKING_LOADING' && (
                <PackingLoadingModule
                  currentUser={currentUser}
                  orders={orders}
                  inventoryBalances={inventoryBalances}
                  onConfirmPacking={onConfirmPacking || (() => {})}
                />
              )}

              {/* INVOICE GENERATION TAB (DEPARTMENT 7) */}
              {activeTab === 'INVOICE_GENERATION' && (
                <InvoiceGenerationModule
                  currentUser={currentUser}
                  orders={orders}
                  customers={customers}
                  onPostInvoice={onPostInvoice || (() => {})}
                  onPreviewInvoicePdf={onPreviewInvoicePdf}
                />
              )}

              {/* DISPATCH & LOGISTICS TAB (DEPARTMENT 8) */}
              {activeTab === 'DISPATCH_LOGISTICS' && (
                <DispatchLogisticsModule
                  currentUser={currentUser}
                  orders={orders}
                  onAssignDispatch={onAssignDispatch || (() => {})}
                  onConfirmDelivery={onConfirmDelivery || (() => {})}
                />
              )}

              {/* HR & ADMINISTRATION TAB (DEPARTMENT 9) */}
              {activeTab === 'HR_ADMIN' && (
                <HrAdminModule
                  currentUser={currentUser}
                  attendanceRecords={attendanceRecords}
                  leaveRequests={leaveRequests}
                  onSaveAttendanceEdit={onSaveAttendanceEdit}
                  onDeleteAttendance={onDeleteAttendance}
                  onSubmitLeaveRequest={onSubmitLeaveRequest}
                  onReviewLeaveRequest={onReviewLeaveRequest}
                />
              )}

              {/* ==================================================== */}
              {/* 1. OVERVIEW TAB (COMMAND CENTER) */}
              {/* ==================================================== */}
              {activeTab === 'OVERVIEW' && (
                <div className="animate-in fade-in duration-200">
                  <Suspense fallback={<NatureSkeleton variant="full" />}>
                    <ExecutiveDashboardView
                      currentUser={currentUser}
                      customers={customers}
                      orders={orders}
                      recoveries={recoveries}
                      pendingOrdersCount={pendingOrders.length}
                      pendingRecoveriesCount={pendingRecoveries.length}
                      ledgerEntries={ledgerEntries}
                      inventoryBalances={inventoryBalances}
                      skus={skus}
                      dispatches={dispatches}
                      invoices={invoices}
                      attendanceRecords={attendanceRecords}
                      leaveRequests={leaveRequests}
                      profileUpdateRequestsCount={pendingProfileRequests.length}
                      visits={visits}
                      creditNotes={creditNotes}
                      stockReturns={stockReturns}
                      targets={targets}
                      isDarkMode={isDarkMode}
                      onToggleTheme={handleToggleTheme}
                      onOpenApprovals={() => setActiveTab('APPROVALS')}
                      onOpenNewOrder={() => setIsOrderDrawerOpen(true)}
                      onOpenNewRecovery={() => setIsRecoveryDrawerOpen(true)}
                      onOpenCustomerLedger={(customerId) => {
                        setSelectedCustomerIdFor360(customerId);
                        setCustomer360SubView('LEDGER');
                      }}
                      onExportReports={() => exportSalesSummaryCsv(orders)}
                      onOpenInventory={() => setActiveTab('INVENTORY_WAREHOUSE')}
                      onOpenPacking={() => setActiveTab('PACKING_LOADING')}
                      onOpenDispatch={() => setActiveTab('DISPATCH_LOGISTICS')}
                      onOpenInvoicing={() => setActiveTab('INVOICE_GENERATION')}
                      onOpenFinance={() => setActiveTab('FINANCE')}
                      onOpenHrAdmin={() => {
                        if (hasPermission(currentUser.role, 'hr.manage')) {
                          setActiveTab('HR_ADMIN');
                        } else if (
                          hasPermission(currentUser.role, 'hr.view') ||
                          hasPermission(currentUser.role, 'reports.view')
                        ) {
                          setActiveTab('FIELD_FORCE');
                          setFieldForceSubTab('ATTENDANCE_LEDGER');
                        } else {
                          setIsAttendanceModalOpen(true);
                        }
                      }}
                    />
                  </Suspense>
=======
              {/* 1. OVERVIEW TAB (COMMAND CENTER) */}
              {/* ==================================================== */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Top 5 KPI Summary Cards */}
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-3">
                      Today&apos;s Operational Snapshot
                    </span>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Today&apos;s Sales</span>
                        <span className="text-lg font-black font-mono text-teal-800 dark:text-teal-300 mt-1 block">
                          Rs. {todaySales.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Today&apos;s Recovery</span>
                        <span className="text-lg font-black font-mono text-emerald-800 dark:text-emerald-300 mt-1 block">
                          Rs. {todayRecovery.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <span className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 block">Pending Orders</span>
                        <span className="text-lg font-black font-mono text-amber-800 dark:text-amber-300 mt-1 block">
                          {pendingOrders.length}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <span className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 block">Pending Payments</span>
                        <span className="text-lg font-black font-mono text-amber-800 dark:text-amber-300 mt-1 block">
                          {pendingRecoveries.length}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 lg:col-span-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Outstanding</span>
                        <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1 block">
                          Rs. {totalOutstanding.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Operations Command Hub (Direct Clickable Buttons for Daily Recovery, Ordering, Invoices, Ledgers) */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Quick Operations Command Hub
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium">
                            Direct 1-click execution for field and executive actions
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                        Live System
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Button 1: Daily Recovery */}
                      <button
                        type="button"
                        onClick={() => setIsRecoveryDrawerOpen(true)}
                        className="min-h-[48px] px-3.5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                        title="Log payment recovery collection"
                      >
                        <Wallet className="w-4 h-4 stroke-[2.5]" />
                        <span>+ Daily Recovery</span>
                      </button>

                      {/* Button 2: Daily Ordering */}
                      <button
                        type="button"
                        onClick={() => setIsOrderDrawerOpen(true)}
                        className="min-h-[48px] px-3.5 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                        title="Book sales order"
                      >
                        <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                        <span>+ Daily Ordering</span>
                      </button>

                      {/* Button 3: Invoices */}
                      <button
                        type="button"
                        onClick={() => setActiveTab('SALES')}
                        className="min-h-[48px] px-3.5 py-3 rounded-2xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-300 font-bold text-xs flex items-center justify-center gap-2 border border-sky-200 dark:border-sky-800 transition-all active:scale-95 cursor-pointer"
                        title="View bills and commercial invoices"
                      >
                        <Receipt className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                        <span>Invoices &amp; Bills</span>
                      </button>

                      {/* Button 4: Khata Ledgers */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('CUSTOMERS');
                          setDealersViewMode('CARDS');
                        }}
                        className="min-h-[48px] px-3.5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200/80 dark:border-slate-700/80 transition-all active:scale-95 cursor-pointer"
                        title="View Dealer Khata Ledgers &amp; Dossiers"
                      >
                        <BookOpen className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                        <span>Khata Ledgers &amp; Etc</span>
                      </button>
                    </div>
                  </div>

                  {/* Approval Center Callout Banner */}
                  {(pendingOrders.length > 0 || pendingRecoveries.length > 0) && (
                    <div className="bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-slate-900 p-5 rounded-3xl border border-amber-700/50 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                      <div className="space-y-1">
                        <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          Executive Approval Center
                        </span>
                        <h2 className="text-base font-black text-white">
                          {pendingOrders.length} Orders &bull; {pendingRecoveries.length} Payments Awaiting Shahzad Ullah
                        </h2>
                        <p className="text-xs text-amber-200/80">
                          Transactions will post to official customer ledgers only upon executive confirmation.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('APPROVALS')}
                        className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
                      >
                        <span>REVIEW APPROVALS</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Two-Column Overview Layout: Town Activity & Field Force Status */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Town Activity Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Town Activity &amp; Balances
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {townActivityData.length} Active Towns
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                        {townActivityData.map((t) => (
                          <div key={t.town} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">{t.town}</span>
                              <span className="text-[11px] text-slate-400">{t.customerCount} Dealers &bull; Sales: Rs. {t.sales.toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-900 dark:text-white block">
                                Rs. {t.outstanding.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-bold">
                                Rec: Rs. {t.recovery.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Field Force Roster */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Field Force Attendance ({NLINK_TEAM_ROSTER.length})
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          Active Shifts
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                        {NLINK_TEAM_ROSTER.map((officer) => (
                          <div key={officer.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[11px] flex items-center justify-center">
                                {officer.avatarInitials}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">{officer.fullName}</span>
                                <span className="text-[11px] text-slate-400">{officer.roleTitle} &bull; {officer.assignedTowns?.[0] || 'Field'}</span>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              Checked In
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                </div>
              )}

              {/* ==================================================== */}
              {/* 2. APPROVALS TAB (SOLE APPROVER: SHAHZAD ULLAH) */}
              {/* ==================================================== */}
              {activeTab === 'APPROVALS' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                        Executive Approval Center
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Sole Signing Authority: <strong>Shahzad Ullah (Executive Director)</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setApprovalsSubTab('ORDERS')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          approvalsSubTab === 'ORDERS'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Orders Waiting ({pendingOrders.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setApprovalsSubTab('RECOVERIES')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          approvalsSubTab === 'RECOVERIES'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Payments Waiting ({pendingRecoveries.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setApprovalsSubTab('CUSTOMERS')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          approvalsSubTab === 'CUSTOMERS'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        New Customers ({pendingCustomers.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setApprovalsSubTab('PROFILE_EDITS')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          approvalsSubTab === 'PROFILE_EDITS'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Profile Edits ({pendingProfileRequests.length})
                      </button>
                    </div>
                  </div>

                  {/* Order Approvals Queue */}
                  {approvalsSubTab === 'ORDERS' && (
                    <div className="space-y-3">
                      {pendingOrders.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">All Orders Processed</p>
                          <p className="mt-1">No pending orders awaiting Shahzad Ullah&apos;s review.</p>
                        </div>
                      ) : (
                        pendingOrders.map((ord) => {
                          const cust = customers.find((c) => c.id === ord.customerId || c.companyName === ord.customerName);
                          const oldBalance = cust?.currentBalance ?? cust?.openingBalance ?? 0;
                          const ordAmount = ord.totalAmount || 0;
                          const projectedBalance = oldBalance + ordAmount;
                          const creditLimit = cust?.creditLimit || 250000;
                          const isWarning = projectedBalance > creditLimit;

                          return (
                            <div
                              key={ord.id || ord.orderNumber}
                              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
<<<<<<< HEAD
                                    <span className="font-mono tabular-nums font-bold text-sm text-slate-900 dark:text-white">
                                      Order #{ord.orderNumber || ord.id?.slice(-6)}
                                    </span>
                                    {isWarning && (
                                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>Credit Limit Warning</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Customer: <strong className="text-slate-800 dark:text-slate-200">{ord.customerName}</strong> ({cust?.town || 'Town'}) <span aria-hidden="true">&middot;</span> Officer: {ord.salesUserName}
                                  </p>
                                </div>

                                <span className="text-xs font-mono tabular-nums text-slate-400">
=======
                                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                      Order #{ord.orderNumber || ord.id?.slice(-6)}
                                    </span>
                                    {isWarning && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                        Credit Limit Warning
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Customer: <strong>{ord.customerName}</strong> ({cust?.town || 'Town'}) &bull; Officer: {ord.salesUserName}
                                  </p>
                                </div>

                                <span className="text-xs font-mono font-bold text-slate-400">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                  {ord.orderDate || ord.createdAt?.slice(0, 10)}
                                </span>
                              </div>

                              {/* Financial Matrix */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
<<<<<<< HEAD
                                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <span className="text-[10px] text-slate-400 block font-medium">Old Balance</span>
                                  <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
                                    Rs. {oldBalance.toLocaleString()}
                                  </span>
                                </div>
                                <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                                  <span className="text-[10px] text-emerald-800 dark:text-emerald-400 block font-medium">Order Amount</span>
                                  <span className="font-mono tabular-nums font-bold text-emerald-900 dark:text-emerald-200">
                                    Rs. {ordAmount.toLocaleString()}
                                  </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <span className="text-[10px] text-slate-400 block font-medium">Projected Balance</span>
                                  <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
                                    Rs. {projectedBalance.toLocaleString()}
                                  </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <span className="text-[10px] text-slate-400 block font-medium">Credit Limit</span>
                                  <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
=======
                                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                  <span className="text-[10px] text-slate-400 block font-bold">Old Balance</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    Rs. {oldBalance.toLocaleString()}
                                  </span>
                                </div>
                                <div className="bg-teal-50 dark:bg-teal-950/40 p-2.5 rounded-xl">
                                  <span className="text-[10px] text-teal-800 dark:text-teal-300 block font-bold">Order Amount</span>
                                  <span className="font-mono font-black text-teal-900 dark:text-teal-200">
                                    Rs. {ordAmount.toLocaleString()}
                                  </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                  <span className="text-[10px] text-slate-400 block font-bold">Projected Balance</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    Rs. {projectedBalance.toLocaleString()}
                                  </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                  <span className="text-[10px] text-slate-400 block font-bold">Credit Limit</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                    Rs. {creditLimit.toLocaleString()}
                                  </span>
                                </div>
                              </div>

<<<<<<< HEAD
                              {/* Operational 5-Step Flow Stepper */}
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">1. Sales Entry</span>
                                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">&rarr;</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">2. Dispatch Note</span>
                                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">&rarr;</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">3. Stock Availability</span>
                                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">&rarr;</span>
                                <span className="font-semibold text-emerald-800 dark:text-emerald-400">4. Invoice (-15%)</span>
                                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">&rarr;</span>
                                <span className="font-bold text-slate-900 dark:text-white">5. Ledger Post</span>
                              </div>

                              {/* Approver Action Bar */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Items: {ord.items?.length || 1} SKUs <span aria-hidden="true">&middot;</span> Cartons: {ord.items?.reduce((s, i) => s + (i.cartons || 0), 0) || 0}
=======
                              {/* Approver Action Bar */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Items: {ord.items?.length || 1} SKUs &bull; Cartons: {ord.items?.reduce((s, i) => s + (i.cartons || 0), 0) || 0}
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                </span>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setRejectionTarget({ id: ord.id || ord.orderNumber, type: 'ORDER', code: ord.orderNumber })}
<<<<<<< HEAD
                                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-semibold text-xs hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors cursor-pointer"
=======
                                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 font-bold text-xs hover:bg-rose-100 cursor-pointer"
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                  >
                                    Reject
                                  </button>

                                  <button
                                    type="button"
<<<<<<< HEAD
                                    onClick={() => setDispatchModalOrder(ord)}
                                    className="min-h-[40px] px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold text-xs flex items-center gap-1.5 hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors cursor-pointer shadow-xs active:scale-95"
                                    title="Run 5-Step Operational Flow: Sales Entry -> Dispatch Note -> Stock Availability Check -> Invoice (-15%) -> Ledger"
                                  >
                                    <Truck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                                    <span>5-Step Dispatch &amp; Invoice</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={!isShahzad}
                                    onClick={() => onApproveOrder(ord.id || ord.orderNumber, 'SHAHZAD')}
                                    className={`min-h-[40px] px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                                      !isShahzad ? 'opacity-40 cursor-not-allowed hover:bg-[#0D9488]' : ''
                                    }`}
                                    title={!isShahzad ? 'Approval authority strictly restricted to Shahzad Ullah' : 'Approve & Post to Ledger with 15% discount'}
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                                    <span>Approve (Shahzad Ullah)</span>
=======
                                    onClick={() => onApproveOrder(ord.id || ord.orderNumber, 'SHAHZAD')}
                                    className="px-4 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                    <span>Approve (ShahzadUllah)</span>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Payment Confirmations Queue */}
                  {approvalsSubTab === 'RECOVERIES' && (
                    <div className="space-y-3">
                      {pendingRecoveries.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">All Payments Confirmed</p>
                          <p className="mt-1">No pending recoveries awaiting Shahzad Ullah&apos;s verification.</p>
                        </div>
                      ) : (
                        pendingRecoveries.map((rec) => {
                          const cust = customers.find((c) => c.id === rec.customerId || c.companyName === rec.customerName);
                          const balBefore = cust?.currentBalance ?? cust?.openingBalance ?? 0;
                          const balAfter = Math.max(0, balBefore - rec.amount);

                          return (
                            <div
                              key={rec.id}
                              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
<<<<<<< HEAD
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono tabular-nums font-bold text-sm text-slate-900 dark:text-white block">
                                      Recovery #{rec.id}
                                    </span>
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                      Status: Pending Confirmation <span className="text-slate-400 font-normal">(Not in Ledger)</span>
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Customer: <strong className="text-slate-800 dark:text-slate-200">{rec.customerName}</strong> <span aria-hidden="true">&middot;</span> Collector: {rec.salesUserName}
=======
                                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white block">
                                    Recovery #{rec.id}
                                  </span>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Customer: <strong>{rec.customerName}</strong> &bull; Collector: {rec.salesUserName}
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                  </p>
                                </div>

                                <div className="text-right">
<<<<<<< HEAD
                                  <span className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 block">
                                    Rs. {rec.amount.toLocaleString()} PKR
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
=======
                                  <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400 block">
                                    Rs. {rec.amount.toLocaleString()} PKR
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                    {rec.paymentMode} {rec.bankName ? `(${rec.bankName})` : ''}
                                  </span>
                                </div>
                              </div>

<<<<<<< HEAD
                              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-medium">Balance Before</span>
                                  <span className="font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
=======
                              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Balance Before</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                    Rs. {balBefore.toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-right">
<<<<<<< HEAD
                                  <span className="text-[10px] text-slate-400 block font-medium">Balance After Confirmation</span>
                                  <span className="font-mono tabular-nums font-bold text-emerald-800 dark:text-emerald-300">
=======
                                  <span className="text-[10px] text-slate-400 block">Balance After Confirmation</span>
                                  <span className="font-mono font-black text-teal-800 dark:text-teal-300">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                    Rs. {balAfter.toLocaleString()}
                                  </span>
                                </div>
                              </div>

<<<<<<< HEAD
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-[11px] text-slate-500 font-medium">
=======
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-[11px] text-slate-500">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                  Ref: {rec.instrumentNumber || 'Direct Payment'}
                                </span>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setRejectionTarget({ id: rec.id, type: 'RECOVERY', code: rec.id })}
<<<<<<< HEAD
                                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-semibold text-xs hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors cursor-pointer"
=======
                                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 font-bold text-xs hover:bg-rose-100 cursor-pointer"
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                  >
                                    Reject
                                  </button>

                                  <button
                                    type="button"
<<<<<<< HEAD
                                    disabled={!isShahzad}
                                    onClick={() => onApproveRecovery(rec.id, 'SHAHZAD')}
                                    className={`min-h-[40px] px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95 ${
                                      !isShahzad ? 'opacity-40 cursor-not-allowed hover:bg-[#0D9488]' : ''
                                    }`}
                                    title={!isShahzad ? 'Confirmation authority strictly restricted to Shahzad Ullah' : 'Confirm Payment & Credit Ledger'}
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
=======
                                    onClick={() => onApproveRecovery(rec.id, 'SHAHZAD')}
                                    className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                    <span>Confirm (ShahzadUllah)</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* New Customers Approvals Queue */}
                  {approvalsSubTab === 'CUSTOMERS' && (
                    <div className="space-y-3">
                      {pendingCustomers.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">All Customers Approved</p>
                          <p className="mt-1">No pending dealer registrations awaiting Shahzad Ullah&apos;s review.</p>
                        </div>
                      ) : (
                        pendingCustomers.map((cust) => (
                          <div
                            key={cust.id || cust.customerCode}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                    {cust.customerCode || cust.id}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                                    {cust.type || cust.customerType || 'DEALER'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                    Awaiting Shahzad Ullah
                                  </span>
                                </div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                                  {cust.companyName || cust.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Contact: <strong>{cust.contactPerson}</strong> &bull; Phone: {cust.phone} &bull; Town: <strong>{cust.town || cust.city}</strong>
                                </p>
                              </div>

                              <div className="text-right">
                                <span className="text-xs text-slate-400 block font-bold">Requested Credit Limit</span>
                                <span className="text-base font-black font-mono text-teal-800 dark:text-teal-300">
                                  Rs. {(cust.creditLimit || 500000).toLocaleString()} PKR
                                </span>
                                <span className="text-[10px] text-slate-400 block font-bold">
                                  {cust.creditDays || 30} Days Terms
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                <span className="text-[10px] text-slate-400 block font-bold">Opening Balance</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  Rs. {(cust.openingBalance || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                <span className="text-[10px] text-slate-400 block font-bold">Address / Route</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                                  {cust.address || 'Main Market'}
                                </span>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                <span className="text-[10px] text-slate-400 block font-bold">Registered By</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                                  {cust.registeredBy || cust.submittedBy || 'Field Force'}
                                </span>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                                <span className="text-[10px] text-slate-400 block font-bold">Submitted Date</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {(cust.createdAt || new Date().toISOString()).slice(0, 10)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                                Requires executive approval before credit invoices can be booked
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setRejectionTarget({ id: cust.id, type: 'CUSTOMER', code: cust.customerCode || cust.companyName })}
                                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 font-bold text-xs hover:bg-rose-100 cursor-pointer"
                                >
                                  Reject
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onApproveCustomer?.(cust.id)}
                                  className="px-4 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                  <span>Approve Dealer (ShahzadUllah)</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Profile Update Requests Approvals Queue */}
                  {approvalsSubTab === 'PROFILE_EDITS' && (
                    <div className="space-y-3">
                      {pendingProfileRequests.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Profile Change Requests</p>
                          <p className="mt-1">All employee profile information is up to date.</p>
                        </div>
                      ) : (
                        pendingProfileRequests.map((req) => (
                          <div
                            key={req.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                    Request #{req.id}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                    Awaiting Approval
                                  </span>
                                </div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                                  {req.requestedChanges.fullName || req.currentInfo.fullName}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Requested by: <strong>{req.currentInfo.fullName}</strong> ({req.userEmail}) &bull; Date: {req.requestedAt?.slice(0, 10)}
                                </p>
                              </div>
                            </div>

                            {/* Comparison Table */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                              <div className="space-y-1">
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Current Info</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200">Name: {req.currentInfo.fullName}</p>
                                <p className="text-slate-600 dark:text-slate-400">Phone: {req.currentInfo.phone || 'N/A'}</p>
                                <p className="text-slate-600 dark:text-slate-400">Role: {req.currentInfo.roleTitle || 'Field Officer'}</p>
                                <p className="text-slate-600 dark:text-slate-400">Towns: {(req.currentInfo.assignedTowns || []).join(', ')}</p>
                              </div>

                              <div className="space-y-1 sm:border-l sm:border-slate-200 dark:sm:border-slate-700 sm:pl-3">
                                <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 block">Requested Updates</span>
                                <p className="font-bold text-emerald-700 dark:text-emerald-300">
                                  Name: {req.requestedChanges.fullName || req.currentInfo.fullName}
                                </p>
                                <p className="text-emerald-700 dark:text-emerald-300">
                                  Phone: {req.requestedChanges.phone || req.currentInfo.phone || 'N/A'}
                                </p>
                                <p className="text-emerald-700 dark:text-emerald-300">
                                  Role: {req.requestedChanges.roleTitle || req.currentInfo.roleTitle}
                                </p>
                                <p className="text-emerald-700 dark:text-emerald-300">
                                  Towns: {(req.requestedChanges.assignedTowns || req.currentInfo.assignedTowns || []).join(', ')}
                                </p>
                                {req.requestedChanges.reason && (
                                  <p className="text-[11px] text-amber-700 dark:text-amber-300 italic pt-1">
                                    Reason: &ldquo;{req.requestedChanges.reason}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                              <span className="text-[11px] text-slate-400">
                                Approving updates this user&apos;s identity credentials across all system records.
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setRejectionTarget({ id: req.id, type: 'PROFILE', code: req.id })}
                                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 font-bold text-xs hover:bg-rose-100 cursor-pointer"
                                >
                                  Reject
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onApproveProfileRequest?.(req.id)}
                                  className="px-4 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                  <span>Approve Profile Update (Shahzad)</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ==================================================== */}
              {/* 3. CUSTOMERS TAB (DEALERS & CREDIT HEALTH) */}
              {/* ==================================================== */}
              {activeTab === 'CUSTOMERS' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Top Bar: Title, Search, Town Filter, View Modes, Add Dealer */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Dealer Accounts &amp; Customer Khata</span>
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold">
                            Live Ledger
                          </span>
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                          {customers.length} Authorized Dealers &amp; Distributors &bull; Direct 1-click Recovery, Ordering, Invoices &amp; Khata
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Town Filter Dropdown */}
                        <select
                          value={townFilter}
                          onChange={(e) => setTownFilter(e.target.value)}
                          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                        >
                          <option value="ALL">All Towns ({customers.length})</option>
                          {Array.from(new Set(customers.map((c) => c.town || c.city).filter(Boolean))).map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>

                        {/* View Mode Switcher */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                          <button
                            type="button"
                            onClick={() => setDealersViewMode('CARDS')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                              dealersViewMode === 'CARDS'
                                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            🗂️ Cards View
                          </button>
                          <button
                            type="button"
                            onClick={() => setDealersViewMode('TABLE')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                              dealersViewMode === 'TABLE'
                                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            📋 Table View
                          </button>
                          <button
                            type="button"
                            onClick={() => setDealersViewMode('MAP')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                              dealersViewMode === 'MAP'
                                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            🗺️ D3 Map
                          </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-60">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search dealer, shop, code..."
                            value={customerFilterQuery}
                            onChange={(e) => setCustomerFilterQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-teal-600"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsAddCustomerModalOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Dealer</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* D3 Geospatial Visualization Map Section */}
                  {dealersViewMode === 'MAP' && (
                    <DealerCreditHealthMap
                      customers={customers.filter((c) => townFilter === 'ALL' || (c.town || c.city) === townFilter)}
                      invoices={orders as any}
                      recoveries={recoveries}
                      onSelectDealer={(dealer) => handleOpen360ForCustomer(dealer)}
                      selectedDealerId={selectedCustomerIdFor360}
                      height={620}
                    />
                  )}

                  {/* 1. DIRECTORY CARDS VIEW */}
                  {dealersViewMode === 'CARDS' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {customers
                        .filter(
                          (c) =>
                            (townFilter === 'ALL' || (c.town || c.city) === townFilter) &&
                            (!customerFilterQuery ||
                              c.companyName.toLowerCase().includes(customerFilterQuery.toLowerCase()) ||
                              (c.town || '').toLowerCase().includes(customerFilterQuery.toLowerCase()) ||
                              c.customerCode.toLowerCase().includes(customerFilterQuery.toLowerCase()) ||
                              (c.contactPerson || '').toLowerCase().includes(customerFilterQuery.toLowerCase()))
                        )
                        .map((c) => {
                          const netBal = c.currentBalance ?? c.openingBalance ?? 0;
                          const creditLimit = c.creditLimit || 350000;
                          const limitUtil = creditLimit > 0 ? Math.min(100, Math.round((netBal / creditLimit) * 100)) : 0;
                          const hasPhone = Boolean(c.phone && c.phone.trim().length > 5);

                          return (
                            <div
                              key={c.id}
                              className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-500/80 transition-all space-y-3.5 flex flex-col justify-between"
                            >
                              <div>
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-black text-xs flex items-center justify-center shrink-0">
                                      {c.companyName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <h3
                                        onClick={() => handleOpen360ForCustomer(c)}
                                        className="font-black text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:text-teal-700 transition-colors"
                                      >
                                        {c.companyName}
                                      </h3>
                                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                          {c.customerCode}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500">
                                          &bull; {c.contactPerson || 'Proprietor'} &bull; {c.town || c.city}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {hasPhone && (
                                    <a
                                      href={`tel:${c.phone}`}
                                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 text-slate-600 hover:text-teal-700 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 shrink-0"
                                      title="Call Dealer"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>

                                {/* Financial Balance Strip */}
                                <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                  <div>
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                      Net Ledger Balance
                                    </span>
                                    <div className="flex items-baseline gap-1 mt-0.5">
                                      <span className={`text-base font-black font-mono ${netBal > 0 ? 'text-teal-900 dark:text-teal-200' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                        Rs. {netBal.toLocaleString()}
                                      </span>
                                      <span className="text-[9px] font-mono text-slate-400">PKR</span>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                      Credit Limit
                                    </span>
                                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 block mt-0.5">
                                      Rs. {creditLimit.toLocaleString()} ({limitUtil}%)
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* 5 Prominent Clickable Action Buttons */}
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                {/* Button 1: Daily Recovery */}
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenRecoveryForCustomer(c, e)}
                                  className="min-h-[40px] px-2.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                                  title="Log daily payment recovery"
                                >
                                  <Wallet className="w-3.5 h-3.5" />
                                  <span>Daily Recovery</span>
                                </button>

                                {/* Button 2: Daily Ordering */}
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenOrderForCustomer(c, e)}
                                  className="min-h-[40px] px-2.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                                  title="Book sales order"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  <span>Daily Ordering</span>
                                </button>

                                {/* Button 3: Invoices */}
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenInvoicesForCustomer(c, e)}
                                  className="min-h-[40px] px-2.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-sky-200 dark:border-sky-800 transition-all active:scale-95 cursor-pointer"
                                  title="View bills and invoices"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                                  <span>Invoices</span>
                                </button>

                                {/* Button 4: Khata Ledger */}
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenLedgerForCustomer(c, e)}
                                  className="min-h-[40px] px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80 transition-all active:scale-95 cursor-pointer"
                                  title="View Khata ledger statement"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                                  <span>Khata Ledger</span>
                                </button>

                                {/* Button 5: Etc & More Actions */}
                                <button
                                  type="button"
                                  onClick={() => setDesktopEtcCustomer(c)}
                                  className="col-span-2 min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer"
                                  title="WhatsApp statement, map, dossier"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Etc: WhatsApp &bull; Directions &bull; Dossier</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* 2. TABLE VIEW */}
                  {dealersViewMode === 'TABLE' && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
<<<<<<< HEAD
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#F2F4F6] dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-[#E2E8F0] dark:border-slate-800">
                            <tr>
                              <th className="py-2 px-3">Code</th>
                              <th className="py-2 px-3">Dealer / Shop Name</th>
                              <th className="py-2 px-3">Proprietor &amp; Town</th>
                              <th className="py-2 px-3">Phone</th>
                              <th className="py-2 px-3 text-right">Net Balance</th>
                              <th className="py-2 px-3 text-right">Credit Limit</th>
                              <th className="py-2 px-3 text-center">Clickable Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
=======
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-black border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="py-3.5 px-4">Code</th>
                              <th className="py-3.5 px-4">Dealer / Shop Name</th>
                              <th className="py-3.5 px-4">Proprietor &amp; Town</th>
                              <th className="py-3.5 px-4">Phone</th>
                              <th className="py-3.5 px-4 text-right">Net Balance</th>
                              <th className="py-3.5 px-4 text-right">Credit Limit</th>
                              <th className="py-3.5 px-4 text-center">Clickable Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                            {customers
                              .filter(
                                (c) =>
                                  (townFilter === 'ALL' || (c.town || c.city) === townFilter) &&
                                  (!customerFilterQuery ||
                                    c.companyName.toLowerCase().includes(customerFilterQuery.toLowerCase()) ||
                                    (c.town || '').toLowerCase().includes(customerFilterQuery.toLowerCase()) ||
                                    c.customerCode.toLowerCase().includes(customerFilterQuery.toLowerCase()) ||
                                    (c.contactPerson || '').toLowerCase().includes(customerFilterQuery.toLowerCase()))
                              )
                              .map((c) => {
                                const netBal = c.currentBalance ?? c.openingBalance ?? 0;
                                const creditLimit = c.creditLimit || 350000;

                                return (
<<<<<<< HEAD
                                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="py-2 px-3 font-mono tabular-nums font-bold text-[#0D9488] dark:text-blue-400">
                                      {c.customerCode}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span
                                        onClick={() => handleOpen360ForCustomer(c)}
                                        className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-[#0D9488] dark:hover:text-blue-400 block"
                                      >
                                        {c.companyName}
                                      </span>
                                      <span className="text-[10px] font-semibold text-slate-400">
                                        {c.type || 'DEALER'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                      <span className="block font-medium">{c.contactPerson || 'Proprietor'}</span>
                                      <span className="text-[10px] text-slate-400">{c.town || c.city}</span>
                                    </td>
                                    <td className="py-2 px-3 font-mono tabular-nums text-slate-500">
                                      {c.phone || '-'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                                      Rs. {netBal.toLocaleString()}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-500">
                                      Rs. {creditLimit.toLocaleString()}
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={(e) => handleOpenOrderForCustomer(c, e)}
                                          className="px-2.5 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                                        >
                                          <ShoppingBag className="w-3.5 h-3.5" />
                                          <span>+ Order</span>
                                        </button>

                                        <MoreActionsMenu
                                          items={[
                                            {
                                              label: 'Record Recovery',
                                              icon: <Wallet className="w-3.5 h-3.5 text-emerald-600" />,
                                              onClick: () => {
                                                setSelectedCustomerIdFor360(c.id);
                                                setIsRecoveryDrawerOpen(true);
                                              },
                                            },
                                            {
                                              label: 'View Invoices',
                                              icon: <Receipt className="w-3.5 h-3.5 text-[#0D9488]" />,
                                              onClick: () => {
                                                setSelectedCustomerIdFor360(c.id);
                                                setCustomer360SubView('INVOICES');
                                              },
                                            },
                                            {
                                              label: 'Khata Ledger',
                                              icon: <BookOpen className="w-3.5 h-3.5 text-slate-600" />,
                                              onClick: () => {
                                                setSelectedCustomerIdFor360(c.id);
                                                setCustomer360SubView('LEDGER');
                                              },
                                            },
                                            {
                                              label: 'Customer 360',
                                              icon: <Eye className="w-3.5 h-3.5 text-slate-500" />,
                                              onClick: () => handleOpen360ForCustomer(c),
                                            },
                                          ]}
                                        />
=======
                                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="py-3 px-4 font-mono font-bold text-teal-800 dark:text-teal-300">
                                      {c.customerCode}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        onClick={() => handleOpen360ForCustomer(c)}
                                        className="font-black text-slate-900 dark:text-white cursor-pointer hover:text-teal-700 block"
                                      >
                                        {c.companyName}
                                      </span>
                                      <span className="text-[10px] font-black uppercase text-teal-700 dark:text-teal-400">
                                        {c.type || 'DEALER'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                      <span className="block font-medium">{c.contactPerson || 'Proprietor'}</span>
                                      <span className="text-[10px] text-slate-400">{c.town || c.city}</span>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-slate-500">
                                      {c.phone || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                                      Rs. {netBal.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                                      Rs. {creditLimit.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={(e) => handleOpenRecoveryForCustomer(c, e)}
                                          className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                          title="Daily Recovery"
                                        >
                                          <Wallet className="w-3 h-3" />
                                          <span>+ Recovery</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => handleOpenOrderForCustomer(c, e)}
                                          className="px-2.5 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                          title="Daily Ordering"
                                        >
                                          <ShoppingBag className="w-3 h-3" />
                                          <span>+ Order</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => handleOpenInvoicesForCustomer(c, e)}
                                          className="px-2 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                          title="Invoices"
                                        >
                                          <Receipt className="w-3 h-3 text-sky-700" />
                                          <span>Invoices</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => handleOpenLedgerForCustomer(c, e)}
                                          className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                          title="Khata Ledger"
                                        >
                                          <BookOpen className="w-3 h-3 text-teal-700" />
                                          <span>Ledger</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setDesktopEtcCustomer(c)}
                                          className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                          title="Etc & More"
                                        >
                                          <MoreHorizontal className="w-3 h-3" />
                                        </button>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ==================================================== */}
<<<<<<< HEAD
              {/* 4. SALES / ORDERING TAB (Order Form | Order List)    */}
              {/* ==================================================== */}
              {activeTab === 'SALES' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                      <button
                        type="button"
                        onClick={() => setSalesOrderView('ORDER_FORM')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          salesOrderView === 'ORDER_FORM'
                            ? 'bg-[#0B132B] text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        Order Form
                      </button>
                      <button
                        type="button"
                        onClick={() => setSalesOrderView('ORDER_LIST')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          salesOrderView === 'ORDER_LIST'
                            ? 'bg-[#0B132B] text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        Order List ({orders.length})
                      </button>
=======
              {/* 4. SALES TAB */}
              {/* ==================================================== */}
              {activeTab === 'SALES' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        Sales Orders &amp; Invoices
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        {orders.length} Total Booked Orders
                      </p>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                    </div>

                    <button
                      type="button"
                      onClick={onOpenRateCard}
<<<<<<< HEAD
                      className="btn-primary text-xs w-fit"
=======
                      className="px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Rate List</span>
                    </button>
                  </div>

<<<<<<< HEAD
                  {salesOrderView === 'ORDER_FORM' ? (
                    <BulkSkuOrderForm
                      currentUser={currentUser}
                      availableCustomers={customers}
                      onPlaceOrder={onPlaceOrder}
                      onDownloadPdf={(o, c) =>
                        downloadSalesInvoicePdf({
                          customer: c,
                          order: o,
                          previousBalance: c.currentBalance ?? c.openingBalance ?? 0,
                          preparedByName: currentUser.fullName,
                        })
                      }
                      onPreviewPdf={onPreviewInvoicePdf}
                    />
                  ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      {/* Desktop Table View (>= lg) */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#F2F4F6] dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-[#E2E8F0] dark:border-slate-800">
                            <tr>
                              <th className="py-2.5 px-4">Order #</th>
                              <th className="py-2.5 px-4">Dealer / Client</th>
                              <th className="py-2.5 px-4">Booking Date</th>
                              <th className="py-2.5 px-4">Sales Officer</th>
                              <th className="py-2.5 px-4 text-center">SKUs</th>
                              <th className="py-2.5 px-4 text-right">Order Amount</th>
                              <th className="py-2.5 px-4 text-center">Status</th>
                              <th className="py-2.5 px-4 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                            {orders.map((o) => {
                              const c = customers.find((cust) => cust.id === o.customerId || cust.companyName === o.customerName);
                              return (
                                <tr key={o.id || o.orderNumber} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="py-3 px-4 font-mono tabular-nums font-bold text-[#0D9488] dark:text-blue-400">
                                    #{o.orderNumber || o.id?.slice(-6)}
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                    {o.customerName}
                                  </td>
                                  <td className="py-3 px-4 text-slate-500 font-mono tabular-nums text-[11px]">
                                    {o.orderDate || o.createdAt?.slice(0, 10)}
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                    {o.salesUserName}
                                  </td>
                                  <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-500">
                                    {o.items?.length || 1}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                                    Rs. {Number(o.totalAmount || 0).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span
                                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${
                                        o.status === 'APPROVED'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                          : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                      }`}
                                    >
                                      {o.status || 'SUBMITTED'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {o.status !== 'APPROVED' ? (
                                        <button
                                          type="button"
                                          onClick={() => setDispatchModalOrder(o)}
                                          className="px-2.5 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold transition-colors whitespace-nowrap active:scale-95"
                                          title="Execute 5-Step Operational Flow"
                                        >
                                          <Truck className="w-3.5 h-3.5" />
                                          <span>Dispatch</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (c) {
                                              downloadSalesInvoicePdf({
                                                customer: c,
                                                order: o,
                                                previousBalance: c.currentBalance ?? c.openingBalance ?? 0,
                                                preparedByName: currentUser.fullName,
                                              });
                                            }
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold transition-colors whitespace-nowrap active:scale-95"
                                        >
                                          <Download className="w-3.5 h-3.5 text-[#0D9488]" />
                                          <span>PDF</span>
                                        </button>
                                      )}

                                      <MoreActionsMenu
                                        items={[
                                          {
                                            label: 'Download Invoice PDF',
                                            icon: <Download className="w-3.5 h-3.5 text-[#0D9488]" />,
                                            disabled: !c,
                                            onClick: () => {
                                              if (c) {
                                                downloadSalesInvoicePdf({
                                                  customer: c,
                                                  order: o,
                                                  previousBalance: c.currentBalance ?? c.openingBalance ?? 0,
                                                  preparedByName: currentUser.fullName,
                                                });
                                              }
                                            },
                                          },
                                          {
                                            label: 'Open Customer 360',
                                            icon: <Eye className="w-3.5 h-3.5 text-slate-500" />,
                                            disabled: !c,
                                            onClick: () => {
                                              if (c) handleOpen360ForCustomer(c);
                                            },
                                          },
                                          {
                                            label: 'Edit / Reverse Order',
                                            icon: <Edit3 className="w-3.5 h-3.5 text-amber-500" />,
                                            onClick: () => setEntryManageTarget({ type: 'ORDER', data: o }),
                                          },
                                        ]}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile/Tablet Card View (< lg) */}
                      <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {orders.map((o) => {
                          const c = customers.find((cust) => cust.id === o.customerId || cust.companyName === o.customerName);
                          return (
                            <div key={o.id || o.orderNumber} className="p-4 space-y-3">
                              <div className="flex justify-between items-start">
                                <div className="space-y-0.5">
                                  <div className="font-mono font-bold text-xs text-[#0D9488]">#{o.orderNumber || o.id?.slice(-6)}</div>
                                  <div className="font-bold text-slate-900 dark:text-white text-[13px]">{o.customerName}</div>
                                  <div className="text-[10px] text-slate-500 font-medium">By {o.salesUserName} &bull; {o.orderDate || o.createdAt?.slice(0, 10)}</div>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                                  o.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  {o.status || 'SUBMITTED'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                  <div className="text-[9px] uppercase font-bold text-slate-400">Total Amount</div>
                                  <div className="text-sm font-mono font-black text-slate-900 dark:text-white">Rs. {Number(o.totalAmount || 0).toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[9px] uppercase font-bold text-slate-400">SKUs</div>
                                  <div className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">{o.items?.length || 1} SKUs</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {o.status !== 'APPROVED' ? (
                                  <button
                                    type="button"
                                    onClick={() => setDispatchModalOrder(o)}
                                    className="flex-1 min-h-[38px] rounded-xl bg-[#0D9488] text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>Dispatch Flow</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (c) {
                                        downloadSalesInvoicePdf({
                                          customer: c,
                                          order: o,
                                          previousBalance: c.currentBalance ?? c.openingBalance ?? 0,
                                          preparedByName: currentUser.fullName,
                                        });
                                      }
                                    }}
                                    className="flex-1 min-h-[38px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 active:scale-95"
                                  >
                                    <Download className="w-3.5 h-3.5 text-[#0D9488]" />
                                    <span>Download PDF</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => c && handleOpen360ForCustomer(c)}
                                  className="w-10 h-[38px] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95"
                                  title="View Customer 360"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEntryManageTarget({ type: 'ORDER', data: o })}
                                  className="w-10 h-[38px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-amber-600 dark:text-amber-400 active:scale-95 cursor-pointer"
                                  title="Edit or Cancel / Reverse Order"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
=======
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {orders.map((o) => (
                      <div key={o.id || o.orderNumber} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">
                            #{o.orderNumber || o.id?.slice(-6)} &bull; {o.customerName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {o.orderDate || o.createdAt?.slice(0, 10)} &bull; {o.items?.length || 1} SKUs &bull; Officer: {o.salesUserName}
                          </span>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <span className="font-mono font-black text-slate-900 dark:text-white block">
                              Rs. {Number(o.totalAmount || 0).toLocaleString()}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                o.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {o.status || 'SUBMITTED'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const c = customers.find((cust) => cust.id === o.customerId || cust.companyName === o.customerName);
                              if (c) {
                                downloadSalesInvoicePdf({
                                  customer: c,
                                  order: o,
                                  previousBalance: c.currentBalance ?? c.openingBalance ?? 0,
                                  preparedByName: currentUser.fullName,
                                });
                              }
                            }}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                </div>
              )}

              {/* ==================================================== */}
              {/* 5. FINANCE TAB */}
              {/* ==================================================== */}
              {activeTab === 'FINANCE' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      Finance &amp; Collections
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {recoveries.length} Recovery Transactions Logged
                    </p>
                  </div>

<<<<<<< HEAD
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    {/* Desktop Table View (>= lg) */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#F2F4F6] dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-[#E2E8F0] dark:border-slate-800">
                          <tr>
                            <th className="py-2.5 px-4">Receipt #</th>
                            <th className="py-2.5 px-4">Dealer / Client</th>
                            <th className="py-2.5 px-4">Collection Date</th>
                            <th className="py-2.5 px-4">Payment Mode</th>
                            <th className="py-2.5 px-4">Recovery Officer</th>
                            <th className="py-2.5 px-4 text-right">Amount (PKR)</th>
                            <th className="py-2.5 px-4 text-center">Status</th>
                            <th className="py-2.5 px-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                          {recoveries.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 font-mono tabular-nums font-bold text-[#0D9488] dark:text-blue-400">
                                #{r.id}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                {r.customerName}
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-mono tabular-nums text-[11px]">
                                {r.recordedAt?.slice(0, 10)}
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {r.paymentMode}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                {r.salesUserName}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                                Rs. {r.amount.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${
                                    r.status === 'APPROVED'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                      : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                  }`}
                                >
                                  {r.status || 'PENDING'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => setEntryManageTarget({ type: 'RECOVERY', data: r })}
                                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                                  title="Edit or Cancel / Reverse Recovery"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile/Tablet Card View (< lg) */}
                    <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {recoveries.map((r) => {
                        const c = customers.find((cust) => cust.id === r.customerId || cust.companyName === r.customerName);
                        return (
                          <div key={r.id} className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-0.5">
                                <div className="font-mono font-bold text-xs text-[#0D9488]">#{r.id}</div>
                                <div className="font-bold text-slate-900 dark:text-white text-[13px]">{r.customerName}</div>
                                <div className="text-[10px] text-slate-500 font-medium">{r.salesUserName} &bull; {r.recordedAt?.slice(0, 10)}</div>
                              </div>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                                r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {r.status || 'PENDING'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div>
                                <div className="text-[9px] uppercase font-bold text-slate-400">Recovery Amount</div>
                                <div className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-400">Rs. {r.amount.toLocaleString()}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[9px] uppercase font-bold text-slate-400">Payment Mode</div>
                                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{r.paymentMode}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => c && handleOpen360ForCustomer(c)}
                                className="flex-1 min-h-[38px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 active:scale-95"
                              >
                                <Eye className="w-4 h-4 text-slate-500" />
                                <span>View Customer 360</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEntryManageTarget({ type: 'RECOVERY', data: r })}
                                className="w-10 h-[38px] rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-amber-600 dark:text-amber-400 active:scale-95 cursor-pointer"
                                title="Edit or Cancel / Reverse Recovery"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
=======
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {recoveries.map((r) => (
                      <div key={r.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">
                            #{r.id} &bull; {r.customerName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {r.recordedAt?.slice(0, 10)} &bull; {r.paymentMode} &bull; Collector: {r.salesUserName}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm block">
                            Rs. {r.amount.toLocaleString()} PKR
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{r.status || 'PENDING'}</span>
                        </div>
                      </div>
                    ))}
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* 6. FIELD FORCE TAB */}
              {/* ==================================================== */}
              {activeTab === 'FIELD_FORCE' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        Field Force Operations &amp; Shifts
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Attendance logs, geo-locations, and live performance analytics
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setFieldForceSubTab('ROSTER')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          fieldForceSubTab === 'ROSTER'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Team Roster
                      </button>

                      <button
                        type="button"
                        onClick={() => setFieldForceSubTab('ATTENDANCE_LEDGER')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          fieldForceSubTab === 'ATTENDANCE_LEDGER'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Attendance Ledger ({attendanceRecords.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setFieldForceSubTab('PERFORMANCE_DASHBOARD')}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          fieldForceSubTab === 'PERFORMANCE_DASHBOARD'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Performance Dashboard
                      </button>
                    </div>
                  </div>

                  {/* Sub-view: Team Roster */}
                  {fieldForceSubTab === 'ROSTER' && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                      {NLINK_TEAM_ROSTER.map((u) => (
                        <div key={u.id} className="p-4 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-teal-800 text-white font-black flex items-center justify-center text-xs">
                              {u.avatarInitials}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">{u.fullName}</span>
                              <span className="text-[11px] text-slate-400">{u.roleTitle} &bull; {u.assignedTowns?.join(', ')}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Active Shift &bull; Checked In
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sub-view: Attendance Ledger with Date | Checkin time | location | checkout time | location */}
                  {fieldForceSubTab === 'ATTENDANCE_LEDGER' && (
                    <EmployeeAttendanceLedgerView
                      attendanceRecords={attendanceRecords}
                      currentUser={currentUser}
                      orders={orders}
                      recoveries={recoveries}
<<<<<<< HEAD
                      onSaveAttendanceEdit={onSaveAttendanceEdit}
                      onDeleteAttendance={onDeleteAttendance}
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                    />
                  )}

                  {/* Sub-view: Dynamic Activity Dashboard */}
                  {fieldForceSubTab === 'PERFORMANCE_DASHBOARD' && (
                    <FieldOfficerActivityDashboard
                      currentUser={currentUser}
                      customers={customers}
                      orders={orders}
                      recoveries={recoveries}
                      onSelectCustomer={(cId) => {
                        setSelectedCustomerIdFor360(cId);
                        setCustomer360SubView('360');
                      }}
                    />
                  )}
                </div>
              )}

              {/* ==================================================== */}
<<<<<<< HEAD
              {/* 7. REPORTS & AUDIT TAB (DEPARTMENT 10) */}
              {/* ==================================================== */}
              {activeTab === 'REPORTS' && (
                <ReportsAuditModule
                  currentUser={currentUser}
                  customers={customers}
                  orders={orders}
                  recoveries={recoveries}
                  inventoryBalances={inventoryBalances}
                  attendanceRecords={attendanceRecords}
                />
=======
              {/* 7. REPORTS TAB */}
              {/* ==================================================== */}
              {activeTab === 'REPORTS' && (
                <div className="space-y-4 animate-in fade-in duration-200 text-xs">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      Executive Reports &amp; Analytics
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Download and print comprehensive operational summaries
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="font-black text-slate-900 dark:text-white block">Sales Summary Report</span>
                      <p className="text-[11px] text-slate-500">Town-wise order breakdown &amp; volume</p>
                      <button
                        type="button"
                        onClick={() => exportSalesSummaryCsv(orders)}
                        className="w-full py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Orders CSV</span>
                      </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="font-black text-slate-900 dark:text-white block">Recovery Audit Statement</span>
                      <p className="text-[11px] text-slate-500">Shahzad Ullah verified payment records</p>
                      <button
                        type="button"
                        onClick={() => exportRecoveryAuditCsv(recoveries)}
                        className="w-full py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Recovery CSV</span>
                      </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="font-black text-slate-900 dark:text-white block">Outstanding Aging Report</span>
                      <p className="text-[11px] text-slate-500">Dealers with high credit balances</p>
                      <button
                        type="button"
                        onClick={() => exportAgingReportCsv(customers)}
                        className="w-full py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Aging CSV</span>
                      </button>
                    </div>
                  </div>
                </div>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
              )}

              {/* ==================================================== */}
              {/* 8. SETTINGS & SYNC TAB */}
              {/* ==================================================== */}
              {activeTab === 'SETTINGS' && (
                <div className="space-y-4 animate-in fade-in duration-200 text-xs">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      System Settings &amp; Cloud Sync
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Maintain database integrity and two-way Google Sheets sync
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
                    {/* Manage Towns Quick Access */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-slate-900 dark:text-white block">Town Nodes &amp; Geographic Route Configuration</span>
                        <span className="text-[11px] text-slate-500">
                          Add, edit, or deactivate commercial towns and configure officer beats across all provinces.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('MANAGE_TOWNS')}
                        className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Manage Towns ({effectiveTownNodes.filter(t => t.isActive).length} Active)</span>
                      </button>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
<<<<<<< HEAD
                        <span className="font-bold text-slate-900 dark:text-white block">Automatic Background Sync</span>
                        <span className="text-[11px] text-slate-500">Orders, recoveries and ledgers sync automatically in the background</span>
                      </div>
                      {onSyncGoogleSheet && (
                        <button
                          type="button"
                          onClick={() => onSyncGoogleSheet()}
                          disabled={isSyncingSheet}
                          className="btn-primary text-xs"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                          <span>{isSyncingSheet ? 'Syncing...' : 'Sync'}</span>
                        </button>
                      )}
=======
                        <span className="font-black text-slate-900 dark:text-white block">Two-Way Google Sheets Sync</span>
                        <span className="text-[11px] text-slate-500">Synchronize all orders, recoveries and customer ledgers</span>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenSyncModal}
                        className="px-4 py-2 rounded-xl bg-teal-800 text-white font-bold"
                      >
                        Configure Sync
                      </button>
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                    </div>

                    {/* Global Session Invalidation Action */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-black text-rose-700 dark:text-rose-400 block">Invalidate All Sessions Globally</span>
                        <span className="text-[11px] text-slate-500">
                          Force all users &amp; devices to re-authenticate immediately without deleting accounts or records.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to invalidate all active sessions globally? Every user across all devices will be required to re-authenticate. Your accounts and data will remain intact.')) {
                            invalidateAllSessionsGlobally();
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                      >
                        Invalidate Sessions
                      </button>
                    </div>

                    {onPurgeMockData && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-black text-rose-700 block">Purge Mock / Demo Data</span>
                          <span className="text-[11px] text-slate-500">Remove any residual dummy records</span>
                        </div>
                        <button
                          type="button"
                          onClick={onPurgeMockData}
                          className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100"
                        >
                          Purge Demo Data
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* 9. MANAGE TOWNS & GEOGRAPHIC ROUTES TAB */}
              {/* ==================================================== */}
              {activeTab === 'MANAGE_TOWNS' && (
                <div className="animate-in fade-in duration-200">
<<<<<<< HEAD
                  <Suspense fallback={<NatureSkeleton variant="full" />}>
                    <ManageTownsInterface
                      townNodes={effectiveTownNodes}
                      onUpdateTownNodes={handleUpdateTowns}
                    />
                  </Suspense>
                </div>
              )}

              {/* ==================================================== */}
              {/* 10. DISTRIBUTOR REPLACEMENT & MARKET HANDOVER TAB */}
              {/* ==================================================== */}
              {activeTab === 'DISTRIBUTOR_TRANSFER' && (
                <div className="animate-in fade-in duration-200">
                  <Suspense fallback={<NatureSkeleton variant="card" count={2} />}>
                    <DistributorTransferModule
                      currentUser={currentUser}
                      customers={customers}
                      orders={orders}
                      inventoryBalances={inventoryBalances}
                      onUpdateCustomers={(updated) => {
                        if (onAddCustomer) {
                          updated.forEach((c) => onAddCustomer(c));
                        }
                      }}
                    />
                  </Suspense>
=======
                  <ManageTownsInterface
                    townNodes={effectiveTownNodes}
                    onUpdateTownNodes={handleUpdateTowns}
                  />
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Rejection Modal */}
      {rejectionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-black text-rose-700 dark:text-rose-400">
              Decline {rejectionTarget.type === 'ORDER' ? 'Order' : rejectionTarget.type === 'CUSTOMER' ? 'Customer' : 'Recovery'} #{rejectionTarget.code}
            </h3>
            <p className="text-slate-500">
              Please enter the official reason for rejection before declining:
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Credit limit exceeded, verification incomplete, or payment proof unreadable"
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectionTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Customer Modal for Head Office */}
      <AddNewCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onSubmit={(newCust) => onAddCustomer?.(newCust)}
        currentUser={currentUser as any}
        availableTowns={townActivityData.map((t) => t.town).filter((t) => t && t !== 'Other')}
      />

      {/* Drawers: Order Entry & Recovery Entry from Customer 360 */}
      {selectedCustomerObj && (
        <>
          <SimpleOrderEntryDrawer
            isOpen={isOrderDrawerOpen}
            onClose={() => setIsOrderDrawerOpen(false)}
            customer={selectedCustomerObj}
            currentUser={currentUser}
            onPlaceOrder={(order) => {
              onPlaceOrder(order);
              setIsOrderDrawerOpen(false);
            }}
            onPreviewPdf={onPreviewInvoicePdf}
          />

          <SimpleRecoveryDrawer
            isOpen={isRecoveryDrawerOpen}
            onClose={() => setIsRecoveryDrawerOpen(false)}
            customer={selectedCustomerObj}
            currentUser={currentUser}
            onRecordRecovery={(recovery) => {
              onRecordRecovery(recovery);
              setIsRecoveryDrawerOpen(false);
            }}
          />
        </>
      )}

      {/* Desktop Etc Quick Actions Modal */}
      {desktopEtcCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/80 dark:bg-slate-800/60">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-black text-base text-slate-900 dark:text-white truncate">
                    {desktopEtcCustomer.companyName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    {desktopEtcCustomer.customerCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {desktopEtcCustomer.contactPerson || 'Proprietor'} &bull; {desktopEtcCustomer.town || desktopEtcCustomer.city} &bull; {desktopEtcCustomer.phone || 'No phone'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDesktopEtcCustomer(null)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Financial Ledger Snapshot */}
            <div className="p-4 bg-teal-50/50 dark:bg-teal-950/30 border-b border-teal-100 dark:border-teal-900/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                  Net Ledger Balance
                </span>
                <span className="text-base font-black font-mono text-teal-900 dark:text-teal-200">
                  Rs. {(desktopEtcCustomer.currentBalance ?? desktopEtcCustomer.openingBalance ?? 0).toLocaleString()} PKR
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                  Credit Limit
                </span>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  Rs. {(desktopEtcCustomer.creditLimit || 350000).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Items List */}
            <div className="p-5 space-y-2.5 text-xs">
              {/* WhatsApp Statement */}
              <button
                type="button"
                onClick={() => {
                  const net = desktopEtcCustomer.currentBalance ?? desktopEtcCustomer.openingBalance ?? 0;
                  const limit = desktopEtcCustomer.creditLimit || 350000;
                  const text = `Assalam-o-Alaikum ${desktopEtcCustomer.contactPerson || desktopEtcCustomer.companyName},\n\nThis is ${currentUser.fullName} from National Lights Head Office.\n\n*Khata Statement for ${desktopEtcCustomer.companyName}:*\n- Customer Code: ${desktopEtcCustomer.customerCode}\n- Net Ledger Balance: Rs. ${net.toLocaleString()} PKR\n- Sanctioned Credit Limit: Rs. ${limit.toLocaleString()} PKR\n\nPlease let us know if you have any questions or payment clearance updates. Thank you!`;
                  const raw = (desktopEtcCustomer.phone || '').replace(/[^0-9]/g, '');
                  const waNumber = raw.startsWith('0') ? '92' + raw.slice(1) : raw;
                  const url = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
                  window.open(url, '_blank');
                  setDesktopEtcCustomer(null);
                }}
                className="w-full p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-emerald-900 dark:text-emerald-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-xs block">WhatsApp Khata Statement</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300">Share account balance statement with dealer</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-500" />
              </button>

              {/* Direct Call */}
              {desktopEtcCustomer.phone && (
                <a
                  href={`tel:${desktopEtcCustomer.phone}`}
                  onClick={() => setDesktopEtcCustomer(null)}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-900 dark:text-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-black text-xs block">Call Shop Proprietor</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{desktopEtcCustomer.phone}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </a>
              )}

              {/* Google Maps Location */}
              <button
                type="button"
                onClick={() => {
                  const query = desktopEtcCustomer.latitude && desktopEtcCustomer.longitude
                    ? `${desktopEtcCustomer.latitude},${desktopEtcCustomer.longitude}`
                    : encodeURIComponent(`${desktopEtcCustomer.companyName} ${desktopEtcCustomer.town || desktopEtcCustomer.city || ''}`);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                  setDesktopEtcCustomer(null);
                }}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-900 dark:text-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-700 text-white flex items-center justify-center shrink-0">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-xs block">Shop Location &amp; Directions</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">View GPS pin on Google Maps</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* View Full 360 Dossier */}
              <button
                type="button"
                onClick={() => {
                  const target = desktopEtcCustomer;
                  setDesktopEtcCustomer(null);
                  handleOpen360ForCustomer(target);
                }}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-900 dark:text-white transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
<<<<<<< HEAD
                  <div className="w-9 h-9 rounded-xl bg-[#003ECC] text-white flex items-center justify-center shrink-0">
=======
                  <div className="w-9 h-9 rounded-xl bg-indigo-700 text-white flex items-center justify-center shrink-0">
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
                    <Eye className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-black text-xs block">View Full 360 Dossier</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Complete transaction history, credit health &amp; profile</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}
<<<<<<< HEAD

      {/* 5-Step Operational Dispatch & Invoicing Modal */}
      {dispatchModalOrder && (
        <OperationalDispatchInvoiceModal
          isOpen={Boolean(dispatchModalOrder)}
          onClose={() => setDispatchModalOrder(null)}
          order={dispatchModalOrder}
          customer={customers.find((c) => c.id === dispatchModalOrder.customerId || c.companyName === dispatchModalOrder.customerName) || null}
          inventoryBalances={inventoryBalances}
          currentUser={currentUser}
          onCompleteDispatchAndInvoice={onDispatchAndInvoiceOrder || ((payload) => onApproveOrder(payload.orderId, 'SHAHZAD'))}
        />
      )}

      {/* Daily Entry Management: Edit or Cancel / Reverse Modal */}
      {entryManageTarget && (
        <EditOrDeleteEntryModal
          isOpen={Boolean(entryManageTarget)}
          onClose={() => setEntryManageTarget(null)}
          entryType={entryManageTarget.type}
          entryData={entryManageTarget.data}
          currentUser={currentUser}
          onSave={(type, id, updates) => {
            if (type === 'ORDER' && onSaveOrderEdit) {
              onSaveOrderEdit(id, updates);
            } else if (type === 'RECOVERY' && onSaveRecoveryEdit) {
              onSaveRecoveryEdit(id, updates);
            } else if (type === 'ATTENDANCE' && onSaveAttendanceEdit) {
              onSaveAttendanceEdit(id, updates);
            }
          }}
          onDeleteOrReverse={(type, id, reason) => {
            if (type === 'ORDER' && onCancelOrReverseOrder) {
              onCancelOrReverseOrder(id, reason);
            } else if (type === 'RECOVERY' && onCancelOrReverseRecovery) {
              onCancelOrReverseRecovery(id, reason);
            } else if (type === 'ATTENDANCE' && onDeleteAttendance) {
              onDeleteAttendance(id, reason);
            }
          }}
        />
      )}
      {/* Scoped Attendance Ledger Modal (Field Sales & Departmental Quick Action) */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0E1A14] w-full max-w-4xl max-h-[88vh] rounded-2xl border border-slate-200 dark:border-emerald-900/60 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-emerald-900/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-emerald-50">
                  Attendance Ledger — {currentUser.fullName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-emerald-300/70">
                  Personal check-in &amp; field shift history
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAttendanceModalOpen(false)}
                className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-500 dark:text-emerald-200 hover:bg-slate-100 dark:hover:bg-emerald-950/60 cursor-pointer"
                aria-label="Close attendance ledger"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <EmployeeAttendanceLedgerView
                attendanceRecords={attendanceRecords.filter(
                  (r) =>
                    !currentUser.id ||
                    r.employeeId === currentUser.id ||
                    r.userId === currentUser.id
                )}
                currentUser={currentUser}
                orders={orders}
                recoveries={recoveries}
                onBack={() => setIsAttendanceModalOpen(false)}
                onSaveAttendanceEdit={onSaveAttendanceEdit}
                onDeleteAttendance={onDeleteAttendance}
              />
            </div>
          </div>
        </div>
      )}
=======
>>>>>>> b797dab99a15ea2216a925a1d14a7b8ceca1050a
    </div>
  );
};
