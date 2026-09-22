/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Light Enterprise Field Intelligence
 * Built with dual-experience architecture:
 * 1. Field Mobile Experience: Fast, touch-friendly, CreditBook-inspired simplicity
 * 2. Head Office Command Center: Premium, spacious, modern enterprise dashboard
 *
 * SOLE SIGNING AUTHORITY: Shahzad Ullah (Executive Director)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { NLinkUser, TEAM_USERS, getStoredUsers, NLINK_TEAM_ROSTER } from './data/nlink-users-team';
import { Customer, SalesOrder, Recovery, User, EmployeeAttendance, UserProfileUpdateRequest, TownNode } from './types';
import { AuthGate } from './components/AuthGate';
import { FieldMobileExperience } from './components/creditbook/FieldMobileExperience';
import { HeadOfficeExperience } from './components/headoffice/HeadOfficeExperience';
import { NationalLightRateListModal } from './components/stitch/NationalLightRateListModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { InvoicePdfPreviewModal } from './components/stitch/InvoicePdfPreviewModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { fallbackAppData, SupabaseAppData, loadSupabaseAppData } from './services/supabase-data';
import {
  syncOrderToSupabase,
  syncRecoveryToSupabase,
  syncCustomerToSupabase,
} from './services/dbSync';
import { NLINK_OFFICIAL_PRODUCTS } from './data/nlink-products';
import {
  getLocalDatabaseCache,
  saveLocalDatabaseCache,
  triggerLedgerApprovalSync,
  executeTwoWaySync,
  registerAppDataProvider,
} from './services/googleSheetsTwoWaySyncService';
import { purgeMockDataFromState, isProductionUser } from './utils/purgeMockData';
import { generateSalesInvoicePdfBlob, downloadSalesInvoicePdf, buildInvoiceWhatsAppText } from './utils/exportInvoicePdf';
import { fetchLiveGoogleSheetData } from './services/liveGoogleSheetSync';
import { assertAuthorizedApprover, invalidateAllSessionsGlobally } from './services/production-users';
import { getStoredTownNodes, saveTownNodes } from './services/townManagement';

export default function App() {
  // Experience Mode: 'FIELD_MOBILE' | 'HEAD_OFFICE'
  // Specification Section 9: Field users route to Attendance, Head Office users route to Command Center
  const [experienceMode, setExperienceMode] = useState<'FIELD_MOBILE' | 'HEAD_OFFICE'>(() => {
    try {
      const savedUser = localStorage.getItem('nlink_active_logged_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        const fieldRoles = ['SALES_RECOVERY', 'ORDER_BOOKER', 'RECOVERY_OFFICER', 'TSM', 'ASM', 'OB', 'SS'];
        if (
          (fieldRoles.includes(u.role) || u.department === 'SALES_FIELD') &&
          !['SUPER_ADMIN', 'MANAGING_DIRECTOR', 'EXECUTIVE_DIRECTOR'].includes(u.role)
        ) {
          return 'FIELD_MOBILE';
        }
        return 'HEAD_OFFICE';
      }
    } catch {}
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return 'FIELD_MOBILE';
    }
    return 'HEAD_OFFICE';
  });

  // Ledger Live Toast Message
  const [ledgerToastMessage, setLedgerToastMessage] = useState<string | null>(null);

  // Active User Persona
  const [currentUser, setCurrentUser] = useState<NLinkUser | null>(() => {
    try {
      const saved = localStorage.getItem('nlink_active_logged_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login handler with automatic role-based home screen routing
  const handleSignIn = async (signedInUser: User) => {
    const storedUsers = getStoredUsers();
    const allAvailable = storedUsers && storedUsers.length > 0 ? storedUsers : (TEAM_USERS || []);

    const matched = (allAvailable || []).find(
      (u) => u.email?.toLowerCase() === signedInUser.email?.toLowerCase() || u.id === signedInUser.id
    );

    const isSalesField = ['SALES_RECOVERY', 'ORDER_BOOKER', 'RECOVERY_OFFICER', 'TSM', 'ASM', 'OB', 'SS'].includes(
      signedInUser.role || ''
    );

    const userPersona: NLinkUser = matched || {
      id: signedInUser.id || `USR-${Date.now()}`,
      employeeCode: 'EMP-001',
      fullName: signedInUser.fullName || signedInUser.email?.split('@')[0] || 'National Lights Personnel',
      email: signedInUser.email,
      phone: signedInUser.phone || '+92 300 1234567',
      role: signedInUser.role || 'SALES_RECOVERY',
      roleTitle: signedInUser.role || 'Field Officer',
      department: isSalesField ? 'SALES_FIELD' : 'EXECUTIVE',
      region: 'National',
      area: 'National',
      territory: 'National',
      assignedTowns: ['Abbottabad', 'Peshawar', 'Rawalpindi', 'Lahore'],
      assignedBeats: ['All Beats'],
      monthlySalesTarget: 5000000,
      monthlyRecoveryTarget: 4000000,
      mtdSalesAchieved: 0,
      mtdRecoveryAchieved: 0,
      todaySalesAchieved: 0,
      todayRecoveryAchieved: 0,
      status: 'ACTIVE',
      avatarInitials: signedInUser.fullName?.slice(0, 2).toUpperCase() || 'NL',
    };

    setCurrentUser(userPersona);
    try {
      localStorage.setItem('nlink_active_logged_user', JSON.stringify(userPersona));
    } catch (e) {}

    // AUTOMATIC ROLE-BASED HOME SCREEN ROUTING (Specification Section 9):
    // FIELD USER: LOGIN -> ATTENDANCE (FieldMobileExperience)
    // HEAD OFFICE: LOGIN -> HEAD OFFICE COMMAND CENTER (HeadOfficeExperience)
    const fieldRoles = ['SALES_RECOVERY', 'ORDER_BOOKER', 'RECOVERY_OFFICER', 'TSM', 'ASM', 'OB', 'SS'];
    const isFieldRole = fieldRoles.includes(userPersona.role) || userPersona.department === 'SALES_FIELD';
    const isHeadOfficeRole = [
      'SUPER_ADMIN',
      'MANAGING_DIRECTOR',
      'EXECUTIVE_DIRECTOR',
      'ACCOUNTS',
      'WAREHOUSE_MANAGER',
      'FACTORY_MANAGER',
      'DISPATCH_OFFICER',
      'MANAGEMENT',
    ].includes(userPersona.role);

    if (isFieldRole && !isHeadOfficeRole) {
      setExperienceMode('FIELD_MOBILE');
    } else {
      setExperienceMode('HEAD_OFFICE');
    }
  };

  const handleSignOut = async () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('nlink_active_logged_user');
    } catch (e) {}
  };

  // Configurable Geographic Town Nodes State
  const [townNodes, setTownNodes] = useState<TownNode[]>(() => getStoredTownNodes());

  const handleUpdateTownNodes = (updated: TownNode[]) => {
    setTownNodes(updated);
    saveTownNodes(updated);
  };

  // Listen to cross-component town node update events
  useEffect(() => {
    const handleTownsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setTownNodes(e.detail);
      }
    };
    window.addEventListener('nlink_town_nodes_updated', handleTownsUpdated);
    return () => window.removeEventListener('nlink_town_nodes_updated', handleTownsUpdated);
  }, []);

  // Selected Attendance Town State
  const [selectedAttendanceTown, setSelectedAttendanceTown] = useState<string>(() => {
    return 'Abbottabad';
  });

  // Comprehensive Attendance Ledger State (Date | Checkin time | location | checkout time | location)
  const [attendanceRecords, setAttendanceRecords] = useState<EmployeeAttendance[]>(() => {
    try {
      const saved = localStorage.getItem('nlink_employee_attendance_records');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const twoDaysAgoStr = new Date(Date.now() - 172800000).toISOString().slice(0, 10);

    return [
      {
        id: 'att-today-1',
        employeeId: 'usr-hashir',
        employeeCode: 'EMP-001',
        employeeName: 'Muhammad Hashir',
        designation: 'Sales & Recovery Executive',
        department: 'SALES_FIELD',
        date: todayStr,
        checkInTime: '09:12 AM',
        checkInLocation: 'Abbottabad (Main Commercial Beat)',
        checkOutTime: undefined,
        checkOutLocation: undefined,
        status: 'PRESENT',
        workingHours: 4.5,
        isVerified: true,
        verifiedBy: 'Shahzad Ullah',
        createdAt: `${todayStr}T09:12:00Z`,
      },
      {
        id: 'att-today-2',
        employeeId: 'usr-shahzad',
        employeeCode: 'EMP-002',
        employeeName: 'Shahzad Ullah',
        designation: 'Executive Director (Sole Authority)',
        department: 'EXECUTIVE',
        date: todayStr,
        checkInTime: '08:45 AM',
        checkInLocation: 'Head Office (Executive Suite)',
        checkOutTime: undefined,
        checkOutLocation: undefined,
        status: 'PRESENT',
        workingHours: 5.0,
        isVerified: true,
        verifiedBy: 'System Auto-Audit',
        createdAt: `${todayStr}T08:45:00Z`,
      },
      {
        id: 'att-today-3',
        employeeId: 'usr-abid',
        employeeCode: 'EMP-003',
        employeeName: 'Abid Ali',
        designation: 'Order Booker & Field Executive',
        department: 'SALES_FIELD',
        date: todayStr,
        checkInTime: '09:05 AM',
        checkInLocation: 'Peshawar (Duran Pur Route & Beat)',
        checkOutTime: undefined,
        checkOutLocation: undefined,
        status: 'PRESENT',
        workingHours: 4.6,
        isVerified: true,
        verifiedBy: 'Shahzad Ullah',
        createdAt: `${todayStr}T09:05:00Z`,
      },
      {
        id: 'att-yest-1',
        employeeId: 'usr-hashir',
        employeeCode: 'EMP-001',
        employeeName: 'Muhammad Hashir',
        designation: 'Sales & Recovery Executive',
        department: 'SALES_FIELD',
        date: yesterdayStr,
        checkInTime: '09:00 AM',
        checkInLocation: 'Mansehra (Karakoram Highway Market)',
        checkOutTime: '05:45 PM',
        checkOutLocation: 'Mansehra (City Commercial Beat)',
        status: 'PRESENT',
        workingHours: 8.75,
        isVerified: true,
        verifiedBy: 'Shahzad Ullah',
        createdAt: `${yesterdayStr}T09:00:00Z`,
      },
      {
        id: 'att-yest-2',
        employeeId: 'usr-abid',
        employeeCode: 'EMP-003',
        employeeName: 'Abid Ali',
        designation: 'Order Booker & Field Executive',
        department: 'SALES_FIELD',
        date: yesterdayStr,
        checkInTime: '09:15 AM',
        checkInLocation: 'Peshawar (Karkhano Market Beat)',
        checkOutTime: '06:00 PM',
        checkOutLocation: 'Peshawar (Saddar Road)',
        status: 'PRESENT',
        workingHours: 8.75,
        isVerified: true,
        verifiedBy: 'Shahzad Ullah',
        createdAt: `${yesterdayStr}T09:15:00Z`,
      },
      {
        id: 'att-2ago-1',
        employeeId: 'usr-hashir',
        employeeCode: 'EMP-001',
        employeeName: 'Muhammad Hashir',
        designation: 'Sales & Recovery Executive',
        department: 'SALES_FIELD',
        date: twoDaysAgoStr,
        checkInTime: '08:50 AM',
        checkInLocation: 'Haripur (GT Road Commercial Hub)',
        checkOutTime: '05:30 PM',
        checkOutLocation: 'Haripur (Main Bazaar Beat)',
        status: 'PRESENT',
        workingHours: 8.65,
        isVerified: true,
        verifiedBy: 'Shahzad Ullah',
        createdAt: `${twoDaysAgoStr}T08:50:00Z`,
      },
    ];
  });

  // Profile Update Requests State (Awaiting Shahzad Ullah's Approval)
  const [profileUpdateRequests, setProfileUpdateRequests] = useState<UserProfileUpdateRequest[]>(() => {
    try {
      const saved = localStorage.getItem('nlink_profile_update_requests');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return [
      {
        id: 'req-prof-101',
        userId: 'usr-abid',
        userEmail: 'abid@nationallight.pk',
        currentFullName: 'Abid Ali',
        currentRole: 'ORDER_BOOKER',
        requestedFullName: 'Abid Ali Khan',
        requestedPhone: '+92 300 9876543',
        requestedTowns: ['Peshawar', 'Duran Pur Route', 'Nowshera'],
        requestedRouteBeat: 'Duran Pur Commercial Route',
        reason: 'Adding Duran Pur commercial route coverage and updating official mobile contact number.',
        status: 'PENDING_APPROVAL',
        requestedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        currentInfo: {
          fullName: 'Abid Ali',
          phone: '+92 301 2345678',
          roleTitle: 'Order Booker',
          assignedTowns: ['Peshawar'],
        },
        requestedChanges: {
          fullName: 'Abid Ali Khan',
          phone: '+92 300 9876543',
          roleTitle: 'Senior Field Officer & Order Booker',
          assignedTowns: ['Peshawar', 'Nowshera'],
          reason: 'Adding Duran Pur commercial route coverage and updating official mobile contact number.',
        },
      } as any,
    ];
  });

  // Save attendance & profile requests to local storage
  useEffect(() => {
    try {
      localStorage.setItem('nlink_employee_attendance_records', JSON.stringify(attendanceRecords));
    } catch (e) {}
  }, [attendanceRecords]);

  useEffect(() => {
    try {
      localStorage.setItem('nlink_profile_update_requests', JSON.stringify(profileUpdateRequests));
    } catch (e) {}
  }, [profileUpdateRequests]);

  // Check-In State
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(true);
  const [checkedInTime, setCheckedInTime] = useState<string | null>('09:12 AM');
  const [checkedOutTime, setCheckedOutTime] = useState<string | null>(null);

  const handleToggleCheckIn = () => {
    const todayDateStr = new Date().toISOString().slice(0, 10);
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    if (!isCheckedIn) {
      setIsCheckedIn(true);
      setCheckedInTime(nowTimeStr);
      setCheckedOutTime(null);

      // Create or update today's attendance record
      const newRecord: EmployeeAttendance = {
        id: `att-${Date.now()}`,
        employeeId: currentUser?.id || 'usr-active',
        employeeCode: currentUser?.id?.toUpperCase() || 'EMP-001',
        employeeName: currentUser?.fullName || 'Field Officer',
        designation: currentUser?.roleTitle || 'Sales Officer',
        department: 'SALES_FIELD',
        date: todayDateStr,
        checkInTime: nowTimeStr,
        checkInLocation: `${selectedAttendanceTown} (Commercial Beat)`,
        status: 'PRESENT',
        isVerified: true,
        verifiedBy: 'Shahzad Ullah',
        createdAt: new Date().toISOString(),
      };

      setAttendanceRecords((prev) => [newRecord, ...prev.filter((r) => !(r.employeeId === currentUser?.id && r.date === todayDateStr))]);
      setLedgerToastMessage(`✓ Checked In successfully at ${nowTimeStr} in ${selectedAttendanceTown}`);
    } else {
      setIsCheckedIn(false);
      setCheckedOutTime(nowTimeStr);

      // Update existing record with checkout info
      setAttendanceRecords((prev) =>
        prev.map((r) => {
          if (r.employeeId === currentUser?.id && r.date === todayDateStr) {
            return {
              ...r,
              checkOutTime: nowTimeStr,
              checkOutLocation: `${selectedAttendanceTown} (Shift End)`,
            };
          }
          return r;
        })
      );
      setLedgerToastMessage(`✓ Checked Out successfully at ${nowTimeStr}`);
    }
  };

  // Submit Profile Update Request Handler
  const handleSubmitProfileUpdateRequest = (req: UserProfileUpdateRequest) => {
    const newReq: UserProfileUpdateRequest = {
      ...req,
      id: req.id || `req-prof-${Date.now()}`,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    } as any;

    setProfileUpdateRequests((prev) => [newReq, ...prev.filter((r) => r.id !== newReq.id)]);
    setLedgerToastMessage('✓ Profile change request submitted to Shahzad Ullah for executive approval.');
  };

  // Approve Profile Update Request
  const handleApproveProfileRequest = (requestId: string) => {
    assertAuthorizedApprover(currentUser?.email);

    setProfileUpdateRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'APPROVED' as any,
            reviewedBy: 'Shahzad Ullah',
            reviewedAt: new Date().toISOString(),
          };
        }
        return r;
      })
    );

    // Apply updates to the active user or stored user team if matched
    const req = profileUpdateRequests.find((r) => r.id === requestId);
    if (req && currentUser && (currentUser.id === req.userId || currentUser.email === req.userEmail)) {
      const updatedUser: NLinkUser = {
        ...currentUser,
        fullName: req.requestedChanges?.fullName || req.requestedFullName || currentUser.fullName,
        phone: req.requestedChanges?.phone || req.requestedPhone || currentUser.phone,
        roleTitle: req.requestedChanges?.roleTitle || req.currentRole || currentUser.roleTitle,
        assignedTowns: req.requestedChanges?.assignedTowns || req.requestedTowns || currentUser.assignedTowns,
      };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('nlink_active_logged_user', JSON.stringify(updatedUser));
      } catch (e) {}
    }

    setLedgerToastMessage('✓ Profile changes approved by Shahzad Ullah and applied successfully.');
  };

  // Reject Profile Update Request
  const handleRejectProfileRequest = (requestId: string, reason?: string) => {
    assertAuthorizedApprover(currentUser?.email);

    setProfileUpdateRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'REJECTED' as any,
            rejectionReason: reason || 'Declined by Shahzad Ullah',
            reviewedBy: 'Shahzad Ullah',
            reviewedAt: new Date().toISOString(),
          };
        }
        return r;
      })
    );
    setLedgerToastMessage('✓ Profile update request declined.');
  };

  // Synchronize default town when user persona changes
  useEffect(() => {
    if (currentUser && currentUser.assignedTowns && currentUser.assignedTowns.length > 0) {
      if (!currentUser.assignedTowns.includes('All Pakistan')) {
        setSelectedAttendanceTown(currentUser.assignedTowns[0]);
      }
    }
  }, [currentUser]);

  // Rate Card, Sync & Preview Modals State
  const [isRateCardOpen, setIsRateCardOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // PDF Preview Modal State
  const [previewPdfData, setPreviewPdfData] = useState<{
    isOpen: boolean;
    dataUrl: string;
    filename: string;
    order?: SalesOrder;
    customer?: Customer;
  }>({
    isOpen: false,
    dataUrl: '',
    filename: '',
  });

  // Network Connectivity
  const { isOnline, offlineQueue } = useOnlineStatus();

  // Central State Datasets
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);

  // Load cached database on mount & purge all mock/dummy data
  useEffect(() => {
    const initData = async () => {
      let localCusts: Customer[] = [];
      let localOrders: SalesOrder[] = [];
      let localRecs: Recovery[] = [];

      try {
        const purgeRes = purgeMockDataFromState();
        localCusts = purgeRes.remainingCustomers;
        localOrders = purgeRes.remainingOrders;
        localRecs = purgeRes.remainingRecoveries;

        if (!isProductionUser(currentUser)) {
          setCurrentUser(purgeRes.remainingUsers[0]);
        }
      } catch (err) {
        console.warn('Database initialization:', err);
        const cached = getLocalDatabaseCache();
        if (cached?.customers) localCusts = cached.customers;
        if (cached?.orders) localOrders = cached.orders;
        if (cached?.recoveries) localRecs = cached.recoveries;
      }

      setCustomers(localCusts);
      setOrders(localOrders);
      setRecoveries(localRecs);

      // Fetch live Supabase database content
      try {
        const liveData = await loadSupabaseAppData(currentUser);
        if (liveData && (liveData.customers.length > 0 || liveData.salesOrders.length > 0 || liveData.recoveries.length > 0)) {
          setCustomers(liveData.customers);
          setOrders(liveData.salesOrders);
          setRecoveries(liveData.recoveries);
          syncToCache(liveData.customers, liveData.salesOrders, liveData.recoveries);
        }
      } catch (err: any) {
        console.warn('Supabase remote load bypassed, operating on local sync:', err.message || err);
      }

      // Live Google Sheets direct GViz sync on launch
      try {
        const sheetData = await fetchLiveGoogleSheetData();
        if (sheetData && sheetData.customersCount > 0) {
          console.log(`✓ Auto-loaded ${sheetData.customersCount} dealers from Google Sheets`);
          setCustomers(sheetData.customers);
          setOrders(sheetData.orders);
          setRecoveries(sheetData.recoveries);
          syncToCache(sheetData.customers, sheetData.orders, sheetData.recoveries);
        }
      } catch (sheetErr: any) {
        console.warn('Google Sheet auto-load error:', sheetErr.message || sheetErr);
      }
    };

    initData();
  }, []);

  // Synchronize state changes to cache
  const syncToCache = (newCusts: Customer[], newOrds: SalesOrder[], newRecs: Recovery[]) => {
    saveLocalDatabaseCache({
      customers: newCusts,
      orders: newOrds,
      recoveries: newRecs,
      visits: [],
      attendance: [],
      lastUpdated: new Date().toISOString(),
    });
  };

  // Google Sheets app data provider
  const currentAppData: SupabaseAppData = {
    customers,
    skus: NLINK_OFFICIAL_PRODUCTS as any,
    inventoryBalances: fallbackAppData.inventoryBalances,
    salesOrders: orders,
    invoices: fallbackAppData.invoices,
    recoveries,
    ledgerEntries: fallbackAppData.ledgerEntries,
    dispatches: fallbackAppData.dispatches,
    stockReturns: fallbackAppData.stockReturns,
    visits: fallbackAppData.visits,
  };

  useEffect(() => {
    registerAppDataProvider(() => currentAppData);
  }, [customers, orders, recoveries]);

  // Order Placement Handler
  const handlePlaceOrder = (newOrder: SalesOrder) => {
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    syncToCache(customers, updatedOrders, recoveries);

    if (isOnline) {
      syncOrderToSupabase(newOrder).catch((err) => {
        console.warn('Supabase order upload failed:', err);
      });
    }

    setLedgerToastMessage(
      `✓ Order #${newOrder.orderNumber} booked. Awaiting Shahzad Ullah's executive review.`
    );
  };

  // Recovery Logging Handler
  const handleRecordRecovery = (newRecovery: Recovery) => {
    const updatedRecoveries = [newRecovery, ...recoveries];
    setRecoveries(updatedRecoveries);
    syncToCache(customers, orders, updatedRecoveries);

    if (isOnline) {
      syncRecoveryToSupabase(newRecovery).catch((err) => {
        console.warn('Supabase recovery upload failed:', err);
      });
    }

    setLedgerToastMessage(
      `✓ Recovery #${newRecovery.id} submitted. Awaiting Shahzad Ullah's confirmation.`
    );
  };

  // Executive Approval Handlers: Shahzad Ullah sole executive signing authority
  const handleApproveOrder = (orderId: string, _approver?: string) => {
    let approvedTotal = 0;
    let targetCustomerId = '';

    const updatedOrders = orders.map((o) => {
      if (o.id === orderId || o.orderNumber === orderId) {
        approvedTotal = o.totalAmount || 0;
        targetCustomerId = o.customerId;
        return {
          ...o,
          shahzadApproval: 'APPROVED' as const,
          shahzadApprovedAt: new Date().toISOString(),
          status: 'APPROVED' as const,
          dualApprovalStatus: 'APPROVED' as const,
          approvedBy: 'Shahzad Ullah',
        };
      }
      return o;
    });

    // Immediate ledger posting upon Shahzad Ullah's approval
    const updatedCustomers = customers.map((c) => {
      if (c.id === targetCustomerId) {
        const newBal = (c.currentBalance ?? c.openingBalance ?? 0) + approvedTotal;
        return {
          ...c,
          currentBalance: newBal,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    setOrders(updatedOrders);
    setCustomers(updatedCustomers);
    syncToCache(updatedCustomers, updatedOrders, recoveries);

    const targetOrd = updatedOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (targetOrd) {
      triggerLedgerApprovalSync('INVOICE_APPROVED', targetOrd.orderNumber || targetOrd.id, targetOrd.customerId, currentAppData);
    }

    setLedgerToastMessage(`✓ Order approved by Shahzad Ullah. Official ledger updated.`);
  };

  const handleRejectOrder = (orderId: string, _approver: string, reason?: string) => {
    const finalReason = reason || 'Declined by Shahzad Ullah';
    const updatedOrders = orders.map((o) => {
      if (o.id === orderId || o.orderNumber === orderId) {
        return {
          ...o,
          shahzadApproval: 'REJECTED' as const,
          shahzadRejectionReason: finalReason,
          status: 'REJECTED' as const,
          dualApprovalStatus: 'REJECTED' as const,
          rejectionReason: finalReason,
          approvedBy: 'Shahzad Ullah',
        };
      }
      return o;
    });

    setOrders(updatedOrders);
    syncToCache(customers, updatedOrders, recoveries);
    setLedgerToastMessage(`✓ Order declined by Shahzad Ullah.`);
  };

  const handleApproveRecovery = (recoveryId: string, _approver?: string) => {
    let confirmedAmount = 0;
    let targetCustomerId = '';

    const updatedRecoveries = recoveries.map((r) => {
      if (r.id === recoveryId) {
        confirmedAmount = r.amount || 0;
        targetCustomerId = r.customerId;
        return {
          ...r,
          shahzadApproval: 'APPROVED' as const,
          shahzadApprovedAt: new Date().toISOString(),
          status: 'VERIFIED' as const,
          dualApprovalStatus: 'APPROVED' as const,
          verifiedBy: 'Shahzad Ullah',
        };
      }
      return r;
    });

    // Immediate ledger credit upon Shahzad Ullah's confirmation
    const updatedCustomers = customers.map((c) => {
      if (c.id === targetCustomerId) {
        const newBal = Math.max(0, (c.currentBalance ?? c.openingBalance ?? 0) - confirmedAmount);
        return {
          ...c,
          currentBalance: newBal,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    setRecoveries(updatedRecoveries);
    setCustomers(updatedCustomers);
    syncToCache(updatedCustomers, orders, updatedRecoveries);

    const targetRec = updatedRecoveries.find((r) => r.id === recoveryId);
    if (targetRec) {
      triggerLedgerApprovalSync('RECOVERY_VERIFIED', targetRec.id, targetRec.customerId, currentAppData);
    }

    setLedgerToastMessage(`✓ Payment confirmed by Shahzad Ullah. Customer ledger credited.`);
  };

  const handleRejectRecovery = (recoveryId: string, _approver: string, reason?: string) => {
    const finalReason = reason || 'Declined by Shahzad Ullah';
    const updatedRecoveries = recoveries.map((r) => {
      if (r.id === recoveryId) {
        return {
          ...r,
          shahzadApproval: 'REJECTED' as const,
          shahzadRejectionReason: finalReason,
          status: 'REJECTED' as const,
          dualApprovalStatus: 'REJECTED' as const,
          rejectionReason: finalReason,
          verifiedBy: 'Shahzad Ullah',
        };
      }
      return r;
    });

    setRecoveries(updatedRecoveries);
    syncToCache(customers, orders, updatedRecoveries);
    setLedgerToastMessage(`✓ Payment declined by Shahzad Ullah.`);
  };

  // Google Sheet manual sync handler
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);

  const handleSyncGoogleSheet = async () => {
    setIsSyncingSheet(true);
    try {
      const sheetData = await fetchLiveGoogleSheetData();
      if (sheetData && sheetData.customersCount > 0) {
        setCustomers(sheetData.customers);
        setOrders(sheetData.orders);
        setRecoveries(sheetData.recoveries);
        syncToCache(sheetData.customers, sheetData.orders, sheetData.recoveries);
        setLedgerToastMessage(
          `✓ Google Sheet live sync complete! Loaded ${sheetData.customersCount} dealers, ${sheetData.ordersCount} invoices/orders, and ${sheetData.recoveriesCount} recoveries.`
        );
      } else {
        setLedgerToastMessage('ℹ️ Sheet checked: No records found.');
      }
    } catch (err: any) {
      console.error('Google sheet sync failed:', err);
      setLedgerToastMessage(`⚠️ Sync failed: ${err.message || 'Error connecting to Google Sheet'}`);
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Customer Management & Sole Approval (Shahzad Ullah) Handlers
  const handleAddCustomer = (newCust: Customer) => {
    const customerRecord: Customer = {
      ...newCust,
      status: 'PENDING_APPROVAL',
      approvalStatus: 'PENDING_APPROVAL',
      registeredBy: currentUser?.fullName || 'Field Force',
      createdAt: newCust.createdAt || new Date().toISOString(),
    };

    const updated = [customerRecord, ...customers];
    setCustomers(updated);
    syncToCache(updated, orders, recoveries);

    if (isOnline) {
      syncCustomerToSupabase(customerRecord).catch((err) => {
        console.warn('Supabase customer upload failed:', err);
      });
    }

    setLedgerToastMessage(
      `✓ Dealer "${customerRecord.companyName}" registered. Awaiting Shahzad Ullah's approval.`
    );
  };

  const handleUpdateCustomerCoordinates = (updatedCustomer: Customer) => {
    const updated = customers.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c));
    setCustomers(updated);
    syncToCache(updated, orders, recoveries);
    if (isOnline) {
      syncCustomerToSupabase(updatedCustomer).catch((err) => {
        console.warn('Supabase customer GPS update failed:', err);
      });
    }
    setLedgerToastMessage(
      `✓ Dealer "${updatedCustomer.companyName}" shop GPS location verified & saved.`
    );
  };

  const handleApproveCustomer = (customerId: string) => {
    assertAuthorizedApprover(currentUser?.email);

    const updated = customers.map((c) => {
      if (c.id === customerId) {
        return {
          ...c,
          status: 'ACTIVE' as const,
          approvalStatus: 'APPROVED' as const,
          approvedBy: 'Shahzad Ullah',
          approvedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    setCustomers(updated);
    syncToCache(updated, orders, recoveries);
    setLedgerToastMessage(`✓ Dealer account approved by Shahzad Ullah. Dealer is now active.`);
  };

  const handleRejectCustomer = (customerId: string, reason?: string) => {
    assertAuthorizedApprover(currentUser?.email);

    const updated = customers.map((c) => {
      if (c.id === customerId) {
        return {
          ...c,
          status: 'INACTIVE' as const,
          approvalStatus: 'REJECTED' as const,
          rejectionReason: reason || 'Declined by Shahzad Ullah',
          rejectedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    setCustomers(updated);
    syncToCache(updated, orders, recoveries);
    setLedgerToastMessage(`✓ Dealer application declined by Shahzad Ullah.`);
  };

  // Global Session Invalidation Event Listener
  useEffect(() => {
    const handleGlobalSessionInvalidated = () => {
      setCurrentUser(null);
      setLedgerToastMessage('⚠️ Global session reset by administrator. Please re-authenticate.');
    };
    window.addEventListener('nlink:global_session_invalidated', handleGlobalSessionInvalidated);
    return () => {
      window.removeEventListener('nlink:global_session_invalidated', handleGlobalSessionInvalidated);
    };
  }, []);

  // PDF Generation & Live Preview Handlers
  const handleDownloadInvoicePdf = (order: SalesOrder, customer: Customer) => {
    downloadSalesInvoicePdf({
      customer,
      order,
      previousBalance: customer.currentBalance ?? customer.openingBalance ?? 0,
      preparedByName: currentUser?.fullName || 'Field Officer',
    });
  };

  const handlePreviewInvoicePdf = (order: SalesOrder, customer: Customer) => {
    const blob = generateSalesInvoicePdfBlob({
      customer,
      order,
      previousBalance: customer.currentBalance ?? customer.openingBalance ?? 0,
      preparedByName: currentUser?.fullName || 'Field Officer',
    });
    const url = URL.createObjectURL(blob);
    setPreviewPdfData({
      isOpen: true,
      dataUrl: url,
      filename: `National_Lights_Invoice_${(order.orderNumber || order.id).replace('#', '')}.pdf`,
      order,
      customer,
    });
  };

  const handleWhatsAppShareInvoice = (order: SalesOrder, customer: Customer) => {
    const text = buildInvoiceWhatsAppText(customer, order, {
      officerName: currentUser?.fullName,
      officerPhone: currentUser?.phone,
    });
    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePurgeMockData = () => {
    try {
      const purgeRes = purgeMockDataFromState({ customers, orders, recoveries });
      setCustomers(purgeRes.remainingCustomers);
      setOrders(purgeRes.remainingOrders);
      setRecoveries(purgeRes.remainingRecoveries);
      if (!isProductionUser(currentUser)) {
        setCurrentUser(purgeRes.remainingUsers[0]);
      }
      setLedgerToastMessage(`✓ ${purgeRes.message}`);
    } catch (err) {
      console.error('Manual purge error:', err);
    }
  };

  if (!currentUser) {
    return (
      <AuthGate
        currentUser={null}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      >
        <div />
      </AuthGate>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] dark:bg-[#070c14] text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Live Toast Message */}
      {ledgerToastMessage && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-teal-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-in fade-in duration-200 border border-teal-500/30 max-w-lg mx-auto"
        >
          <span className="flex-1">{ledgerToastMessage}</span>
          <button
            type="button"
            onClick={() => setLedgerToastMessage(null)}
            className="text-white/80 hover:text-white p-1 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Offline Connectivity Notification Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-xs sticky top-0 z-40">
          <span>⚠ Offline Mode Active — Transactions will be saved locally &amp; synced when online.</span>
          {offlineQueue.length > 0 && (
            <span className="px-2 py-0.5 bg-slate-950 text-amber-300 rounded font-mono text-[10px]">
              {offlineQueue.length} Pending Sync
            </span>
          )}
        </div>
      )}

      {/* Render Experience Based on Selected Mode */}
      {experienceMode === 'FIELD_MOBILE' ? (
        <FieldMobileExperience
          currentUser={currentUser}
          customers={customers}
          orders={orders}
          recoveries={recoveries}
          attendanceRecords={attendanceRecords}
          isCheckedIn={isCheckedIn}
          onToggleCheckIn={handleToggleCheckIn}
          checkedInTime={checkedInTime}
          checkedOutTime={checkedOutTime}
          selectedTown={selectedAttendanceTown}
          onSelectTown={setSelectedAttendanceTown}
          onPlaceOrder={handlePlaceOrder}
          onRecordRecovery={handleRecordRecovery}
          onOpenRateCard={() => setIsRateCardOpen(true)}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onSwitchToHeadOffice={() => setExperienceMode('HEAD_OFFICE')}
          onSignOut={handleSignOut}
          onDownloadInvoicePdf={handleDownloadInvoicePdf}
          onPreviewInvoicePdf={handlePreviewInvoicePdf}
          onWhatsAppShareInvoice={handleWhatsAppShareInvoice}
          onAddCustomer={handleAddCustomer}
          onUpdateCustomerCoordinates={handleUpdateCustomerCoordinates}
          onSyncGoogleSheet={handleSyncGoogleSheet}
          isSyncingSheet={isSyncingSheet}
          onSubmitProfileUpdateRequest={handleSubmitProfileUpdateRequest}
          pendingProfileRequest={profileUpdateRequests.find((r) => r.userId === currentUser.id && r.status === 'PENDING') || null}
          townNodes={townNodes}
        />
      ) : (
        <HeadOfficeExperience
          currentUser={currentUser}
          customers={customers}
          orders={orders}
          recoveries={recoveries}
          attendanceRecords={attendanceRecords}
          profileUpdateRequests={profileUpdateRequests}
          townNodes={townNodes}
          onUpdateTownNodes={handleUpdateTownNodes}
          onApproveOrder={handleApproveOrder}
          onRejectOrder={handleRejectOrder}
          onApproveRecovery={handleApproveRecovery}
          onRejectRecovery={handleRejectRecovery}
          onApproveCustomer={handleApproveCustomer}
          onRejectCustomer={handleRejectCustomer}
          onApproveProfileRequest={handleApproveProfileRequest}
          onRejectProfileRequest={handleRejectProfileRequest}
          onAddCustomer={handleAddCustomer}
          onSyncGoogleSheet={handleSyncGoogleSheet}
          isSyncingSheet={isSyncingSheet}
          onPlaceOrder={handlePlaceOrder}
          onRecordRecovery={handleRecordRecovery}
          onOpenRateCard={() => setIsRateCardOpen(true)}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onSwitchToFieldMobile={() => setExperienceMode('FIELD_MOBILE')}
          onSignOut={handleSignOut}
          onPurgeMockData={handlePurgeMockData}
          onPreviewInvoicePdf={handlePreviewInvoicePdf}
          isOnline={isOnline}
        />
      )}

      {/* Official Rate List Modal */}
      <NationalLightRateListModal
        isOpen={isRateCardOpen}
        onClose={() => setIsRateCardOpen(false)}
      />

      {/* Google Sheets Sync Modal */}
      <GoogleSheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        appData={currentAppData}
        onSyncComplete={(msg) => setLedgerToastMessage(msg)}
      />

      {/* Live PDF Preview Modal */}
      <InvoicePdfPreviewModal
        isOpen={previewPdfData.isOpen}
        onClose={() => setPreviewPdfData((prev) => ({ ...prev, isOpen: false }))}
        pdfDataUrl={previewPdfData.dataUrl}
        pdfFilename={previewPdfData.filename}
        order={previewPdfData.order}
        customer={previewPdfData.customer}
        officerName={currentUser?.fullName}
        onDownload={() => {
          if (previewPdfData.order && previewPdfData.customer) {
            handleDownloadInvoicePdf(previewPdfData.order, previewPdfData.customer);
          }
        }}
      />
    </div>
  );
}
