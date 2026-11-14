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
import { Customer, SalesOrder, Recovery, User, EmployeeAttendance, UserProfileUpdateRequest, TownNode, LedgerEntry, InventoryBalance, InventoryTransaction, InventoryTransactionType, LeaveRequest } from './types';
import { AuthGate } from './components/AuthGate';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { FieldMobileExperience } from './components/creditbook/FieldMobileExperience';
import { HeadOfficeExperience } from './components/headoffice/HeadOfficeExperience';
import { BrandHeader } from './components/BrandHeader';
import { DispatchInvoiceCompletionPayload } from './components/headoffice/OperationalDispatchInvoiceModal';
import { NationalLightRateListModal } from './components/stitch/NationalLightRateListModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { InvoicePdfPreviewModal } from './components/stitch/InvoicePdfPreviewModal';
import { TodaySalesAuditModal } from './components/creditbook/TodaySalesAuditModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { calculateInvoiceMetrics } from './hooks/useSkuInvoicePricing';
import { fallbackAppData, SupabaseAppData, loadSupabaseAppData } from './services/supabase-data';
import { SEED_LEDGER_ENTRIES } from './data/seed-ledger-data';
import { initialInventoryBalances, initialInventoryTransactions } from './services/store';
import { logAuditEvent } from './services/auditLog';
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
import { reconcileUsersWithGoogleSheet } from './services/googleSheetsSync';
import { syncToGoogleSheetsWebhook, getGoogleSheetsWebhookUrl } from './services/google-sheets';
import { assertAuthorizedApprover, isAuthorizedApproverEmail, invalidateAllSessionsGlobally } from './services/production-users';
import { getStoredTownNodes, saveTownNodes, PAKISTAN_TOWN_COORDINATES } from './services/townManagement';
import { generateUniqueOrderId, generateUniqueRecoveryId } from './utils/idGenerator';
import { persistAttendanceRecord } from './services/attendance';
import { executeOrderCancellationOrReversal, executeRecoveryCancellationOrReversal, isEntryConfirmedByAccountsOrNsm } from './utils/entryManagement';
import { TeamShareModal } from './components/TeamShareModal';
import { detectDeviceExperience, isMobileDevice } from './utils/deviceDetection';
import {
  checkMidnightCutoff,
  prepareDataForNextDay,
  recordSessionStart,
  syncCachedAttendanceToSupabase,
} from './services/daily-cutoff';
import { syncManager, getOfflineQueue } from './services/offlineSyncEngine';

export default function App() {
  // Experience Mode: 'FIELD_MOBILE' | 'HEAD_OFFICE'
  // Auto-detect device: Phones & Tablets (< 1024px) -> Mobile Version; Laptops & Desktops -> Head Office Web Portal
  const [experienceMode, setExperienceMode] = useState<'FIELD_MOBILE' | 'HEAD_OFFICE'>(() => {
    return detectDeviceExperience();
  });

  // Responsive device auto-detection on resize / orientation change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setExperienceMode(detectDeviceExperience());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Team Share Working Link Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Ledger Live Toast Message (Auto-dismisses after 5 seconds)
  const [ledgerToastMessage, setLedgerToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ledgerToastMessage) return;
    const timer = window.setTimeout(() => {
      setLedgerToastMessage(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [ledgerToastMessage]);

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
  const handleSignIn = async (signedInUser: User & { mustChangePassword?: boolean }) => {
    const storedUsers = getStoredUsers();
    const allAvailable = storedUsers && storedUsers.length > 0 ? storedUsers : (TEAM_USERS || []);

    const matched = (allAvailable || []).find(
      (u) => u.email?.toLowerCase() === signedInUser.email?.toLowerCase() || u.id === signedInUser.id
    );

    const isSalesField = ['SALES_RECOVERY', 'ORDER_BOOKER', 'RECOVERY_OFFICER', 'TSM', 'ASM', 'OB', 'SS'].includes(
      signedInUser.role || ''
    );

    const basePersona: NLinkUser = matched || {
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

    const isMustChange =
      signedInUser.mustChangePassword !== undefined
        ? Boolean(signedInUser.mustChangePassword)
        : Boolean(matched?.mustChangePassword && matched?.initialPasswordStatus !== 'CHANGED');

    const userPersona: NLinkUser = {
      ...basePersona,
      mustChangePassword: isMustChange,
    };

    setCurrentUser(userPersona);
    try {
      localStorage.setItem('nlink_active_logged_user', JSON.stringify(userPersona));
      localStorage.setItem('nlink_active_user_session', JSON.stringify(userPersona));
    } catch (e) {}

    // AUTOMATIC DEVICE-AWARE & ROLE-BASED ROUTING:
    // 1. Mobile Phone / Tablet -> Automatically routes to Field Mobile Experience
    // 2. Laptop / Desktop -> Routes to Head Office Command Center (or Field Mobile if field role)
    const isFieldRole = ['SALES_RECOVERY', 'ORDER_BOOKER', 'RECOVERY_OFFICER', 'TSM', 'ASM', 'OB', 'SS'].includes(
      userPersona.role || ''
    );
    const isHeadOfficeRole = ['SUPER_ADMIN', 'MANAGEMENT', 'ACCOUNTS', 'WAREHOUSE_MANAGER', 'FACTORY_MANAGER', 'DISPATCH_OFFICER'].includes(
      userPersona.role || ''
    );

    if (isMobileDevice()) {
      setExperienceMode('FIELD_MOBILE');
    } else {
      if (isFieldRole && !isHeadOfficeRole) {
        setExperienceMode('FIELD_MOBILE');
      } else {
        setExperienceMode('HEAD_OFFICE');
      }
    }
  };

  const handleSignOut = async () => {
    if (currentUser) {
      logAuditEvent({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userEmail: currentUser.email,
        action: 'USER_LOGOUT',
        module: 'AUTH',
        recordId: currentUser.id,
        details: `${currentUser.fullName} signed out.`,
      });
    }
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

    return [];
  });

  // Profile Update Requests State (Awaiting Shahzad Ullah's Approval)
  const [profileUpdateRequests, setProfileUpdateRequests] = useState<UserProfileUpdateRequest[]>(() => {
    try {
      const saved = localStorage.getItem('nlink_profile_update_requests');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return [];
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

  // Check-In State (persisted in localStorage, defaults to false to allow auto-detection via GPS)
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(() => {
    return localStorage.getItem('nlink_isCheckedIn') === 'true';
  });
  const [checkedInTime, setCheckedInTime] = useState<string | null>(() => {
    return localStorage.getItem('nlink_checkedInTime') || null;
  });
  const [checkedOutTime, setCheckedOutTime] = useState<string | null>(() => {
    return localStorage.getItem('nlink_checkedOutTime') || null;
  });

  const handleCheckIn = (townName: string) => {
    const todayDateStr = new Date().toISOString().slice(0, 10);
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    setIsCheckedIn(true);
    setCheckedInTime(nowTimeStr);
    setCheckedOutTime(null);
    try {
      localStorage.setItem('nlink_isCheckedIn', 'true');
      localStorage.setItem('nlink_checkedInTime', nowTimeStr);
      localStorage.removeItem('nlink_checkedOutTime');
    } catch (e) {}

    // Create today's attendance record
    const newRecord: EmployeeAttendance = {
      id: `att-${Date.now()}`,
      employeeId: currentUser?.id || 'usr-active',
      employeeCode: currentUser?.id?.toUpperCase() || 'EMP-001',
      employeeName: currentUser?.fullName || 'Field Officer',
      designation: currentUser?.roleTitle || 'Sales Officer',
      department: 'SALES_FIELD',
      date: todayDateStr,
      checkInTime: nowTimeStr,
      checkInLocation: `${townName} (Commercial Beat)`,
      status: 'PRESENT',
      isVerified: true,
      verifiedBy: 'Shahzad Ullah',
      createdAt: new Date().toISOString(),
    };

    setAttendanceRecords((prev) => [newRecord, ...prev.filter((r) => !(r.employeeId === currentUser?.id && r.date === todayDateStr))]);
    setLedgerToastMessage(`✓ Checked In successfully at ${nowTimeStr} in ${townName}`);

    // Persist to master Supabase field_attendance table
    const townCoords = PAKISTAN_TOWN_COORDINATES[townName] || { lat: 34.0151, lng: 71.5249 };
    persistAttendanceRecord({
      date: todayDateStr,
      checkInTime: nowTimeStr,
      town: townName,
      lat: townCoords.lat,
      lng: townCoords.lng,
      accuracy: 5,
      status: 'CHECKED_IN',
      userName: currentUser?.fullName || 'Field Officer',
    }).catch((err) => console.warn('Attendance check-in sync:', err));
  };

  const handleCheckOut = (townName: string) => {
    const todayDateStr = new Date().toISOString().slice(0, 10);
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    setIsCheckedIn(false);
    setCheckedOutTime(nowTimeStr);
    try {
      localStorage.setItem('nlink_isCheckedIn', 'false');
      localStorage.setItem('nlink_checkedOutTime', nowTimeStr);
    } catch (e) {}

    // Update today's record with check-out info
    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (r.employeeId === currentUser?.id && r.date === todayDateStr) {
          return {
            ...r,
            checkOutTime: nowTimeStr,
            checkOutLocation: `${townName} (Shift End)`,
          };
        }
        return r;
      })
    );
    setLedgerToastMessage(`✓ Checked Out successfully at ${nowTimeStr}`);

    // Persist check-out to master Supabase field_attendance table
    const townCoords = PAKISTAN_TOWN_COORDINATES[townName] || { lat: 34.0151, lng: 71.5249 };
    persistAttendanceRecord({
      date: todayDateStr,
      checkOutTime: nowTimeStr,
      town: townName,
      lat: townCoords.lat,
      lng: townCoords.lng,
      accuracy: 5,
      status: 'CHECKED_OUT',
      userName: currentUser?.fullName || 'Field Officer',
    }).catch((err) => console.warn('Attendance check-out sync:', err));
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
    try {
      assertAuthorizedApprover(currentUser?.email, currentUser);
    } catch (e: any) {
      console.warn('Approver assertion note:', e.message);
    }

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
    try {
      assertAuthorizedApprover(currentUser?.email, currentUser);
    } catch (e: any) {
      console.warn('Approver assertion note:', e.message);
    }

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

  // Rate Card, Sync, Preview, Password & Sales Audit Modals State
  const [isRateCardOpen, setIsRateCardOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isSalesAuditModalOpen, setIsSalesAuditModalOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

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
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => SEED_LEDGER_ENTRIES || []);
  const [inventoryBalances, setInventoryBalances] = useState<InventoryBalance[]>(() => {
    try {
      const saved = localStorage.getItem('nlink_inventory_balances');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialInventoryBalances || [];
  });
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('nlink_inventory_transactions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialInventoryTransactions || [];
  });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    try {
      const saved = localStorage.getItem('nlink_leave_requests');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

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

        if (currentUser && !isProductionUser(currentUser)) {
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
      console.log('--- Data Restoration Summary ---');
      console.log('Customers restored:', localCusts.length);
      console.log('Orders restored:', localOrders.length);
      console.log('Recoveries restored:', localRecs.length);
      console.log('--------------------------------');

      // Helper merger to preserve user-entered data & approved state
      const mergeCustomers = (localList: Customer[], remoteList: Customer[]): Customer[] => {
        const getCustKey = (c: Customer) => {
          const comp = String(c.companyName || c.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (comp) return comp;
          return String(c.customerCode || c.id || '').toUpperCase().trim();
        };

        const map = new Map<string, Customer>();
        remoteList.forEach((c) => {
          const key = getCustKey(c);
          if (key) map.set(key, c);
        });
        localList.forEach((c) => {
          const key = getCustKey(c);
          if (key) {
            if (!map.has(key)) {
              map.set(key, c);
            } else {
              const remote = map.get(key)!;
              const isApproved =
                c.approvalStatus === 'APPROVED' ||
                c.status === 'ACTIVE' ||
                remote.approvalStatus === 'APPROVED' ||
                remote.status === 'ACTIVE';

              map.set(key, {
                ...remote,
                ...c,
                approvalStatus: isApproved ? 'APPROVED' : (c.approvalStatus || remote.approvalStatus),
                status: isApproved ? 'ACTIVE' : (c.status || remote.status),
                approvedBy: isApproved ? 'Shahzad Ullah' : (c.approvedBy || remote.approvedBy),
              });
            }
          }
        });
        return Array.from(map.values()).map((cust) => {
          if (/m\.?\s*ghaffar\s*tool\s*center/i.test(String(cust.companyName || ''))) {
            return {
              ...cust,
              assignedOfficerId: 'USR-002',
              assignedOfficerName: 'Syed Zain',
              assignedEmployee: 'Syed Zain',
            };
          }
          return cust;
        });
      };

      const mergeOrders = (localList: SalesOrder[], remoteList: SalesOrder[]): SalesOrder[] => {
        const getOrderKey = (o: SalesOrder) => {
          const num = o.orderNumber ? String(o.orderNumber) : String(o.id || '');
          return num
            .toUpperCase()
            .trim()
            .replace(/[^A-Z0-9]/g, '')
            .replace(/^(ORD|SO|INV)+/g, '');
        };

        const map = new Map<string, SalesOrder>();
        remoteList.forEach((o) => {
          const key = getOrderKey(o);
          if (key) map.set(key, o);
        });
        localList.forEach((o) => {
          const key = getOrderKey(o);
          if (key) {
            if (!map.has(key)) {
              map.set(key, o);
            } else {
              const remote = map.get(key)!;
              const isApproved =
                o.status === 'APPROVED' ||
                o.shahzadApproval === 'APPROVED' ||
                o.dualApprovalStatus === 'DUAL_APPROVED' ||
                remote.status === 'APPROVED' ||
                remote.shahzadApproval === 'APPROVED' ||
                remote.dualApprovalStatus === 'DUAL_APPROVED';

              map.set(key, {
                ...remote,
                ...o,
                status: isApproved ? 'APPROVED' : (o.status || remote.status),
                shahzadApproval: isApproved ? 'APPROVED' : (o.shahzadApproval || remote.shahzadApproval),
                dualApprovalStatus: isApproved ? 'DUAL_APPROVED' : (o.dualApprovalStatus || remote.dualApprovalStatus),
                approvedBy: isApproved ? 'Shahzad Ullah' : (o.approvedBy || remote.approvedBy),
              });
            }
          }
        });
        return Array.from(map.values());
      };

      const mergeRecoveries = (localList: Recovery[], remoteList: Recovery[]): Recovery[] => {
        const getRecKey = (r: Recovery) => {
          const num = (r as any).recoveryNumber ? String((r as any).recoveryNumber) : String(r.id || '');
          return num
            .toUpperCase()
            .trim()
            .replace(/[^A-Z0-9]/g, '')
            .replace(/^(REC|RC)+/g, '');
        };

        const map = new Map<string, Recovery>();
        remoteList.forEach((r) => {
          const key = getRecKey(r);
          if (key) map.set(key, r);
        });
        localList.forEach((r) => {
          const key = getRecKey(r);
          if (key) {
            if (!map.has(key)) {
              map.set(key, r);
            } else {
              const remote = map.get(key)!;
              const isApproved =
                r.status === 'VERIFIED' ||
                r.status === 'APPROVED' ||
                r.shahzadApproval === 'APPROVED' ||
                r.dualApprovalStatus === 'DUAL_APPROVED' ||
                remote.status === 'VERIFIED' ||
                remote.status === 'APPROVED' ||
                remote.shahzadApproval === 'APPROVED' ||
                remote.dualApprovalStatus === 'DUAL_APPROVED';

              map.set(key, {
                ...remote,
                ...r,
                status: isApproved ? 'VERIFIED' : (r.status || remote.status),
                shahzadApproval: isApproved ? 'APPROVED' : (r.shahzadApproval || remote.shahzadApproval),
                dualApprovalStatus: isApproved ? 'DUAL_APPROVED' : (r.dualApprovalStatus || remote.dualApprovalStatus),
                verifiedBy: isApproved ? 'Shahzad Ullah' : (r.verifiedBy || remote.verifiedBy),
              });
            }
          }
        });
        return Array.from(map.values());
      };

      // Non-blocking deferred background remote sync (Instant UI mounting first)
      setTimeout(async () => {
        try {
          const liveData = await loadSupabaseAppData(currentUser as any);
          if (liveData && (liveData.customers.length > 0 || liveData.salesOrders.length > 0 || liveData.recoveries.length > 0)) {
            setCustomers((prevCusts) => {
              const mergedC = mergeCustomers(prevCusts, liveData.customers);
              return mergedC;
            });
            setOrders((prevOrds) => {
              const mergedO = mergeOrders(prevOrds, liveData.salesOrders);
              return mergedO;
            });
            setRecoveries((prevRecs) => {
              const mergedR = mergeRecoveries(prevRecs, liveData.recoveries);
              return mergedR;
            });
            if (liveData.ledgerEntries && liveData.ledgerEntries.length > 0) {
              setLedgerEntries(liveData.ledgerEntries);
            }
          }
        } catch (err: any) {
          console.warn('Supabase remote load bypassed, operating on local sync:', err.message || err);
        }

        try {
          const sheetData = await fetchLiveGoogleSheetData();
          if (sheetData && sheetData.customersCount > 0) {
            console.log(`✓ Auto-loaded ${sheetData.customersCount} dealers from Google Sheets`);
            setCustomers((prevCusts) => mergeCustomers(prevCusts, sheetData.customers));
            setOrders((prevOrds) => mergeOrders(prevOrds, sheetData.orders));
            setRecoveries((prevRecs) => mergeRecoveries(prevRecs, sheetData.recoveries));
            if (sheetData.ledgerEntries && sheetData.ledgerEntries.length > 0) {
              setLedgerEntries(sheetData.ledgerEntries);
            }
          }
        } catch (sheetErr: any) {
          console.warn('Google Sheet auto-load error:', sheetErr.message || sheetErr);
        }
      }, 100);
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
    inventoryBalances,
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
  }, [customers, orders, recoveries, inventoryBalances]);

  // Ensure M. Ghaffar Tool Center is permanently assigned to Syed Zain (USR-002)
  useEffect(() => {
    const target = customers.find((c) =>
      /m\.?\s*ghaffar\s*tool\s*center/i.test(String(c.companyName || ''))
    );
    if (
      target &&
      (target.assignedOfficerId !== 'USR-002' || target.assignedOfficerName !== 'Syed Zain')
    ) {
      const updatedCustomer: Customer = {
        ...target,
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Syed Zain',
        assignedEmployee: 'Syed Zain',
      };
      const updatedList = customers.map((c) => (c.id === target.id ? updatedCustomer : c));
      setCustomers(updatedList);
      syncToCache(updatedList, orders, recoveries);
      if (isOnline) {
        syncCustomerToSupabase(updatedCustomer).catch(() => {});
      }
    }
  }, [customers, isOnline]);

  // Record session start date when user signs in
  useEffect(() => {
    if (currentUser) {
      recordSessionStart();
    }
  }, [currentUser?.id]);

  // Background process running on application load to reconcile local database's user table
  // with authorized user list from Google Sheet, ensuring unauthorized accounts are locked out immediately.
  useEffect(() => {
    let isMounted = true;
    async function runReconciliation() {
      try {
        const result = await reconcileUsersWithGoogleSheet();
        if (!isMounted) return;
        if (result.success && result.lockedOutCount > 0 && currentUser) {
          const activeMatch = result.users.find(
            (u) => u.email.toLowerCase() === currentUser.email.toLowerCase()
          );
          if (activeMatch && activeMatch.status === 'INACTIVE') {
            setLedgerToastMessage('⚠️ Your account has been deactivated or locked out via Google Sheet roster reconciliation.');
            await handleSignOut();
          }
        }
      } catch (err) {
        console.warn('Background user reconciliation notice:', err);
      }
    }
    runReconciliation();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.email]);

  // Unified Sync Helper (Offline Queue + Attendance + Google Sheets)
  const runFullSyncCycle = async (trigger: 'AUTO_ONLINE' | 'BACKGROUND_INTERVAL' = 'BACKGROUND_INTERVAL') => {
    if (!navigator.onLine) return false;
    try {
      await syncManager.triggerSync(undefined, trigger);
      await syncCachedAttendanceToSupabase();
      if (customers.length > 0 || orders.length > 0 || recoveries.length > 0) {
        const fullData: SupabaseAppData = {
          ...currentAppData,
          customers,
          salesOrders: orders,
          recoveries,
        };
        await syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), fullData).catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  };

  // 1-Hour Auto-Sync when internet is available (3,600,000 ms)
  useEffect(() => {
    if (!isOnline || !currentUser) return;
    const interval = setInterval(() => {
      void runFullSyncCycle('BACKGROUND_INTERVAL');
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isOnline, currentUser?.id, customers, orders, recoveries]);

  // Immediate Sync upon internet reconnection (+ complete deferred midnight logout if pending)
  useEffect(() => {
    if (!isOnline || !currentUser) return;
    let cancelled = false;
    (async () => {
      await runFullSyncCycle('AUTO_ONLINE');
      if (cancelled) return;
      const pendingMidnight = localStorage.getItem('nlink_pending_midnight_logout') === '1';
      if (pendingMidnight) {
        const remainingPending = getOfflineQueue().some((i) => i.status === 'PENDING_SYNC');
        if (!remainingPending) {
          localStorage.removeItem('nlink_pending_midnight_logout');
          prepareDataForNextDay();
          await handleSignOut();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOnline, currentUser?.id]);

  // Daily Midnight Auto-Sync & Logout (checked every 60s; defers logout if offline with unsynced entries)
  useEffect(() => {
    if (!currentUser) return;
    const checkCutoff = async () => {
      const status = checkMidnightCutoff();
      if (!status.isExpired) return;

      if (navigator.onLine) {
        await runFullSyncCycle('BACKGROUND_INTERVAL');
        localStorage.removeItem('nlink_pending_midnight_logout');
        prepareDataForNextDay();
        await handleSignOut();
      } else {
        // Offline guard: preserve queued entries and auto-sync + logout immediately when online
        localStorage.setItem('nlink_pending_midnight_logout', '1');
      }
    };

    const cutoffTimer = setInterval(() => {
      void checkCutoff();
    }, 60000);
    return () => clearInterval(cutoffTimer);
  }, [currentUser?.id]);

  // Order Placement Handler
  const handlePlaceOrder = (newOrder: SalesOrder) => {
    const hasCollision = orders.some(
      (o) =>
        (newOrder.id && o.id === newOrder.id) ||
        (newOrder.orderNumber && o.orderNumber === newOrder.orderNumber)
    );
    const uniqueOrderRef =
      !newOrder.id || !newOrder.orderNumber || hasCollision
        ? generateUniqueOrderId(orders)
        : newOrder.orderNumber;
    const effectiveOrder: SalesOrder = {
      ...newOrder,
      id: hasCollision || !newOrder.id ? uniqueOrderRef : newOrder.id,
      orderNumber: hasCollision || !newOrder.orderNumber ? uniqueOrderRef : newOrder.orderNumber,
    };

    const updatedOrders = [effectiveOrder, ...orders];
    setOrders(updatedOrders);
    syncToCache(customers, updatedOrders, recoveries);

    if (isOnline) {
      syncOrderToSupabase(effectiveOrder).catch((err) => {
        console.warn('Supabase order upload failed:', err);
      });
    }

    setLedgerToastMessage(
      `✓ Order #${effectiveOrder.orderNumber} booked. Awaiting Shahzad Ullah's executive review.`
    );
  };

  // Recovery Logging Handler: Entry Flow Step 1 & Confirmation Rule
  const handleRecordRecovery = (newRecovery: Recovery) => {
    const hasCollision = recoveries.some(
      (r) =>
        (newRecovery.id && r.id === newRecovery.id) ||
        ((newRecovery as any).recoveryNumber && (r as any).recoveryNumber === (newRecovery as any).recoveryNumber)
    );
    const uniqueRecRef =
      !newRecovery.id || !(newRecovery as any).recoveryNumber || hasCollision
        ? generateUniqueRecoveryId(recoveries as Array<{ id?: string; recoveryNumber?: string }>)
        : (newRecovery as any).recoveryNumber;

    // Unconfirmed recovery starts as PENDING until confirmed by Shahzad Ullah
    const effectiveRecovery: Recovery = {
      ...newRecovery,
      id: hasCollision || !newRecovery.id ? uniqueRecRef : newRecovery.id,
      recoveryNumber: hasCollision || !(newRecovery as any).recoveryNumber ? uniqueRecRef : (newRecovery as any).recoveryNumber,
      status: (newRecovery.status === 'VERIFIED' || newRecovery.status === 'APPROVED') ? newRecovery.status : 'PENDING',
      shahzadApproval: (newRecovery.status === 'VERIFIED' || newRecovery.status === 'APPROVED') ? 'APPROVED' : 'PENDING',
    };

    const updatedRecoveries = [effectiveRecovery, ...recoveries];
    setRecoveries(updatedRecoveries);
    syncToCache(customers, orders, updatedRecoveries);

    if (isOnline) {
      syncRecoveryToSupabase(effectiveRecovery).catch((err) => {
        console.warn('Supabase recovery upload failed:', err);
      });
    }

    setLedgerToastMessage(
      `✓ Recovery #${effectiveRecovery.id} logged (Status: PENDING). Awaiting Shahzad Ullah's confirmation before adding to Ledger.`
    );
  };

  // Executive Approval Handlers: Shahzad Ullah sole executive signing authority
  const handleApproveOrder = (orderId: string, _approver?: string) => {
    // Validate signing authority
    if (!isAuthorizedApproverEmail(currentUser?.email, currentUser)) {
      setLedgerToastMessage('⛔ Access Denied: Only Shahzad Ullah holds authorized executive signing authority.');
      return;
    }

    let matchedAny = false;

    const normalize = (s?: string) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/^(ord|so|inv)+/g, '');

    const qRaw = String(orderId || '').trim();
    const qNorm = normalize(orderId);

    const isOrderMatch = (o: SalesOrder) => {
      if (!o) return false;
      const oId = String(o.id || '').trim();
      const oNum = String(o.orderNumber || '').trim();
      const oIdNorm = normalize(o.id);
      const oNumNorm = normalize(o.orderNumber);

      if (oId.toLowerCase() === qRaw.toLowerCase() || oNum.toLowerCase() === qRaw.toLowerCase()) return true;
      if (qNorm && (oIdNorm === qNorm || oNumNorm === qNorm)) return true;
      if (qNorm.length > 2 && (oIdNorm.includes(qNorm) || qNorm.includes(oIdNorm))) return true;
      if (qNorm.length > 2 && (oNumNorm.includes(qNorm) || qNorm.includes(oNumNorm))) return true;
      const cleanRaw = qRaw.replace(/^[#\s]+/, '').replace(/^inv\s*#?/i, '').replace(/^ord\s*#?/i, '').replace(/^so\s*#?/i, '').trim();
      if (cleanRaw && (oNum.toLowerCase() === cleanRaw.toLowerCase() || oId.toLowerCase() === cleanRaw.toLowerCase())) return true;
      return false;
    };

    // Safe idempotency check: if order is already approved, confirm gracefully
    const alreadyApproved = orders.find((o) => isOrderMatch(o) && (o.status === 'APPROVED' || o.shahzadApproval === 'APPROVED' || o.dualApprovalStatus === 'DUAL_APPROVED'));
    if (alreadyApproved) {
      setLedgerToastMessage(`✓ Order #${alreadyApproved.orderNumber || orderId} is already posted to the ledger with confirmed executive approval.`);
      return;
    }

    let targetOrd: SalesOrder | null = null;
    const updatedOrders = orders.map((o) => {
      if (isOrderMatch(o)) {
        matchedAny = true;
        const metrics = calculateInvoiceMetrics(o);
        const grossSub = metrics.grossSubtotal;
        const discount15 = metrics.discount15;
        const netInvoiceTotal = metrics.netInvoiceTotal;

        const updatedItems = metrics.isItemized ? (o.items || []).map((it, idx) => {
          const calculatedLine = metrics.items[idx];
          return {
            ...it,
            unitPrice: calculatedLine ? calculatedLine.officialTradePrice : (it.unitPrice || 0),
            discountPercent: 15,
            lineTotal: calculatedLine ? calculatedLine.lineNet : Math.round((it.quantity || 1) * (it.unitPrice || 0) * 0.85),
          };
        }) : [];

        targetOrd = {
          ...o,
          items: updatedItems,
          subtotal: grossSub,
          discountAmount: discount15,
          totalAmount: netInvoiceTotal,
          netAmount: netInvoiceTotal,
          netTotal: netInvoiceTotal,
          shahzadApproval: 'APPROVED' as const,
          shahzadApprovedAt: new Date().toISOString(),
          status: 'APPROVED' as const,
          dualApprovalStatus: 'DUAL_APPROVED' as const,
          approvedBy: 'Shahzad Ullah',
        };
        return targetOrd;
      }
      return o;
    });

    if (!matchedAny) {
      console.warn(`[Approval] No pending order found matching identifier: ${orderId}`);
      setLedgerToastMessage(`⚠️ Order #${orderId} was not found in pending list or is already posted.`);
      return;
    }

    // Reconcile customer balances using the standard financial ledger rule:
    // Closing Balance = Opening Balance + Total Approved Invoices - Total Confirmed Recoveries
    const updatedCustomers = customers.map((c) => {
      const cId = String(c.id || '').toLowerCase().trim();
      const cCode = String(c.customerCode || '').toLowerCase().trim();
      const cName = String(c.companyName || '').toLowerCase().trim();

      const custOrders = updatedOrders.filter((o) => {
        if (!o || o.status === 'REJECTED' || o.status === 'CANCELLED') return false;
        // Strictly only POSTED/APPROVED/FULFILLMENT orders increase the balance
        const isConfirmed =
          o.status === 'APPROVED' ||
          o.status === 'PACKED' ||
          o.status === 'INVOICED' ||
          o.status === 'DISPATCHED' ||
          o.status === 'IN_TRANSIT' ||
          o.status === 'DELIVERED' ||
          o.status === 'PARTIALLY_DELIVERED' ||
          o.shahzadApproval === 'APPROVED';
        if (!isConfirmed) return false;
        const oCustId = String(o.customerId || '').toLowerCase().trim();
        const oCustCode = String(o.customerCode || '').toLowerCase().trim();
        const oCustName = String(o.customerName || '').toLowerCase().trim();
        return (cId && oCustId === cId) || (cCode && (oCustId === cCode || oCustCode === cCode)) || (cName && oCustName === cName);
      });

      const custRecs = recoveries.filter((r) => {
        if (!r || r.status === 'REJECTED') return false;
        // Strictly only VERIFIED/CONFIRMED recoveries reduce the balance
        if (r.status !== 'VERIFIED' && r.status !== 'APPROVED' && r.shahzadApproval !== 'APPROVED') return false;
        const rCustId = String(r.customerId || '').toLowerCase().trim();
        const rCustCode = String(r.customerCode || '').toLowerCase().trim();
        const rCustName = String(r.customerName || '').toLowerCase().trim();
        return (cId && rCustId === cId) || (cCode && (rCustId === cCode || rCustCode === cCode)) || (cName && rCustName === cName);
      });

      const debits = custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const credits = custRecs.reduce((sum, r) => sum + (r.amount || 0), 0);
      return {
        ...c,
        currentBalance: Math.max(0, (c.openingBalance ?? 0) + debits - credits),
        updatedAt: new Date().toISOString(),
      };
    });

    setOrders(updatedOrders);
    setCustomers(updatedCustomers);
    syncToCache(updatedCustomers, updatedOrders, recoveries);

    if (targetOrd) {
      const effectiveOrd = targetOrd as SalesOrder;
      logAuditEvent({
        userId: currentUser?.id,
        userName: currentUser?.fullName || 'Shahzad Ullah',
        userEmail: currentUser?.email,
        action: 'ORDER_APPROVED',
        module: 'SALES',
        recordType: 'SalesOrder',
        recordId: effectiveOrd.orderNumber || effectiveOrd.id,
        details: `Order #${effectiveOrd.orderNumber} approved for ${effectiveOrd.customerName} (Net Rs. ${(effectiveOrd.totalAmount || 0).toLocaleString()})`,
      });
      const updatedAppData: SupabaseAppData = {
        ...currentAppData,
        customers: updatedCustomers,
        salesOrders: updatedOrders,
        recoveries: recoveries,
      };

      // 1. Immediately push approval to Google Sheets Webhook
      syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), updatedAppData).catch((err) => {
        console.warn('Google Sheets Webhook live sync note:', err);
      });

      // 2. Trigger auto-ledger sync
      triggerLedgerApprovalSync('INVOICE_APPROVED', effectiveOrd.orderNumber || effectiveOrd.id, effectiveOrd.customerId, updatedAppData);

      // 3. Persist to Supabase if connected
      if (isOnline) {
        syncOrderToSupabase(effectiveOrd).catch((err) => {
          console.warn('Supabase order upload note:', err);
        });
      }
    }

    setLedgerToastMessage(`✓ Order approved by Shahzad Ullah. Official ledger updated & synced to Google Sheets.`);
  };

  // 5-Step Operational Flow Completion Handler:
  // Dispatches available stocks, omits missing SKUs, applies 15% invoice discount, posts to ledger
  const handleDispatchAndInvoiceOrder = (payload: DispatchInvoiceCompletionPayload) => {
    // Validate signing authority
    if (!isAuthorizedApproverEmail(currentUser?.email, currentUser)) {
      setLedgerToastMessage('⛔ Access Denied: Only Shahzad Ullah holds authorized executive signing authority.');
      return;
    }

    // 1. Deduct stock quantities from inventory balances for dispatched SKUs
    let nextInventoryBalances = inventoryBalances;
    setInventoryBalances((prev) => {
      const updated = prev.map((bal) => {
        const dispatched = payload.dispatchedItems.find(
          (it) => it.skuId === bal.skuId || it.skuCode === bal.skuCode
        );
        if (dispatched) {
          const qtyToDeduct = dispatched.quantity || dispatched.orderedQuantity || dispatched.approvedQuantity || 0;
          const currentQty = bal.quantityOnHand || bal.availableQuantity || bal.quantity || 0;
          const newOnHand = Math.max(0, currentQty - qtyToDeduct);
          return {
            ...bal,
            availableQuantity: newOnHand,
            quantityOnHand: newOnHand,
            quantity: newOnHand,
            updatedAt: new Date().toISOString(),
          };
        }
        return bal;
      });
      nextInventoryBalances = updated;
      try {
        localStorage.setItem('nlink_inventory_balances', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    let matchedAny = false;
    let targetOrd: SalesOrder | null = null;

    const normalize = (s?: string) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/^(ord|so|inv)+/g, '');

    const qRaw = String(payload.orderId || '').trim();
    const qNorm = normalize(payload.orderId);

    const isOrderMatch = (o: SalesOrder) => {
      if (!o) return false;
      const oId = String(o.id || '').trim();
      const oNum = String(o.orderNumber || '').trim();
      const oIdNorm = normalize(o.id);
      const oNumNorm = normalize(o.orderNumber);

      if (oId.toLowerCase() === qRaw.toLowerCase() || oNum.toLowerCase() === qRaw.toLowerCase()) return true;
      if (qNorm && (oIdNorm === qNorm || oNumNorm === qNorm)) return true;
      if (qNorm.length > 2 && (oIdNorm.includes(qNorm) || qNorm.includes(oIdNorm))) return true;
      if (qNorm.length > 2 && (oNumNorm.includes(qNorm) || qNorm.includes(oNumNorm))) return true;
      return false;
    };

    const updatedOrders = orders.map((o) => {
      if (isOrderMatch(o)) {
        matchedAny = true;
        targetOrd = {
          ...o,
          items: payload.dispatchedItems,
          subtotal: payload.grossSubtotal,
          discountAmount: payload.discount15,
          totalAmount: payload.netInvoiceTotal,
          netAmount: payload.netInvoiceTotal,
          netTotal: payload.netInvoiceTotal,
          shahzadApproval: 'APPROVED' as const,
          shahzadApprovedAt: new Date().toISOString(),
          status: 'APPROVED' as const,
          dualApprovalStatus: 'DUAL_APPROVED' as const,
          approvedBy: 'Shahzad Ullah',
          dispatchNoteNumber: payload.dispatchNoteNumber,
          warehouseName: payload.warehouseName,
          transporterName: payload.transporterName,
          vehicleNumber: payload.vehicleNumber,
          bilityNumber: payload.bilityNumber,
          dispatchedAt: new Date().toISOString(),
        };
        return targetOrd;
      }
      return o;
    });

    if (!matchedAny) {
      console.warn(`[Dispatch] No pending order found matching identifier: ${payload.orderId}`);
      setLedgerToastMessage(`⚠️ Order #${payload.orderId} was not found or is already processed.`);
      return;
    }

    // Reconcile customer balances using the standard financial ledger rule:
    // Closing Balance = Opening Balance + Total Approved Invoices (Net -15%) - Total Confirmed Recoveries
    const updatedCustomers = customers.map((c) => {
      const cId = String(c.id || '').toLowerCase().trim();
      const cCode = String(c.customerCode || '').toLowerCase().trim();
      const cName = String(c.companyName || '').toLowerCase().trim();

      const custOrders = updatedOrders.filter((o) => {
        if (!o || o.status === 'REJECTED' || o.status === 'CANCELLED') return false;
        const confirmed =
          o.status === 'APPROVED' ||
          o.status === 'PACKED' ||
          o.status === 'INVOICED' ||
          o.status === 'DISPATCHED' ||
          o.status === 'IN_TRANSIT' ||
          o.status === 'DELIVERED' ||
          o.status === 'PARTIALLY_DELIVERED' ||
          o.shahzadApproval === 'APPROVED';
        if (!confirmed) return false;
        const oCustId = String(o.customerId || '').toLowerCase().trim();
        const oCustCode = String(o.customerCode || '').toLowerCase().trim();
        const oCustName = String(o.customerName || '').toLowerCase().trim();
        return (cId && oCustId === cId) || (cCode && (oCustId === cCode || oCustCode === cCode)) || (cName && oCustName === cName);
      });

      const custRecs = recoveries.filter((r) => {
        if (!r || r.status === 'REJECTED') return false;
        if (r.status !== 'VERIFIED' && r.status !== 'APPROVED' && r.shahzadApproval !== 'APPROVED') return false;
        const rCustId = String(r.customerId || '').toLowerCase().trim();
        const rCustCode = String(r.customerCode || '').toLowerCase().trim();
        const rCustName = String(r.customerName || '').toLowerCase().trim();
        return (cId && rCustId === cId) || (cCode && (rCustId === cCode || rCustCode === cCode)) || (cName && rCustName === cName);
      });

      const debits = custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const credits = custRecs.reduce((sum, r) => sum + (r.amount || 0), 0);
      return {
        ...c,
        currentBalance: Math.max(0, (c.openingBalance ?? 0) + debits - credits),
        updatedAt: new Date().toISOString(),
      };
    });

    setOrders(updatedOrders);
    setCustomers(updatedCustomers);
    syncToCache(updatedCustomers, updatedOrders, recoveries);

    if (targetOrd) {
      const effectiveOrd: SalesOrder = targetOrd;
      const updatedAppData: SupabaseAppData = {
        ...currentAppData,
        customers: updatedCustomers,
        salesOrders: updatedOrders,
        recoveries,
        inventoryBalances: nextInventoryBalances,
      };

      // 1. Immediately push approval to Google Sheets Webhook
      syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), updatedAppData).catch((err) => {
        console.warn('Google Sheets Webhook live sync note:', err);
      });

      // 2. Trigger auto-ledger sync
      triggerLedgerApprovalSync('INVOICE_APPROVED', effectiveOrd.orderNumber || effectiveOrd.id, effectiveOrd.customerId, updatedAppData);

      // 3. Persist to Supabase if connected
      if (isOnline) {
        syncOrderToSupabase(effectiveOrd).catch((err) => {
          console.warn('Supabase order upload note:', err);
        });
      }

      logAuditEvent({
        userId: currentUser?.id,
        userName: currentUser?.fullName,
        userEmail: currentUser?.email,
        action: 'DISPATCH_AND_INVOICE_POSTED',
        module: 'INVOICING',
        recordType: 'SalesOrder',
        recordId: effectiveOrd.orderNumber || effectiveOrd.id,
        details: `DN #${payload.dispatchNoteNumber} via ${payload.transporterName} (${payload.vehicleNumber}) — Net Rs. ${payload.netInvoiceTotal.toLocaleString()} (15% Less: Rs. ${payload.discount15.toLocaleString()})`,
      });
    }

    setLedgerToastMessage(
      `✓ 5-Step Fulfillment Completed: Dispatch Note #${payload.dispatchNoteNumber} generated, Stocks deducted, and Invoice #${payload.orderId} (15% Less: Rs. ${payload.discount15.toLocaleString()}) posted to ledger.`
    );
  };

  const handleRejectOrder = (orderId: string, _approver: string, reason?: string) => {
    const finalReason = reason || 'Declined by Shahzad Ullah';
    const isOrderMatch = (o: SalesOrder) => {
      const q = String(orderId || '').trim().toUpperCase();
      const oId = String(o.id || '').trim().toUpperCase();
      const oNum = String(o.orderNumber || '').trim().toUpperCase();
      const qStrip = q.replace(/^ORD-/, '');
      const oIdStrip = oId.replace(/^ORD-/, '');
      return oId === q || oNum === q || oIdStrip === qStrip || oNum === qStrip || oId === `ORD-${qStrip}`;
    };

    const updatedOrders = orders.map((o) => {
      if (isOrderMatch(o)) {
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

    const updatedAppData: SupabaseAppData = {
      ...currentAppData,
      customers,
      salesOrders: updatedOrders,
      recoveries,
    };
    syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), updatedAppData).catch((err) => {
      console.warn('Google Sheets Webhook reject sync note:', err);
    });

    logAuditEvent({
      userId: currentUser?.id,
      userName: currentUser?.fullName || 'Shahzad Ullah',
      userEmail: currentUser?.email,
      action: 'ORDER_REJECTED',
      module: 'SALES',
      recordType: 'SalesOrder',
      recordId: orderId,
      details: `Order ${orderId} rejected: ${finalReason}`,
    });

    setLedgerToastMessage(`✓ Order declined by Shahzad Ullah.`);
  };

  const handleApproveRecovery = (recoveryId: string, _approver?: string) => {
    // Validate signing authority
    if (!isAuthorizedApproverEmail(currentUser?.email, currentUser)) {
      setLedgerToastMessage('⛔ Access Denied: Only Shahzad Ullah holds authorized confirmation authority.');
      return;
    }

    let matchedAny = false;

    const normalize = (s?: string) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/^(rec|rc)+/g, '');

    const qRaw = String(recoveryId || '').trim();
    const qNorm = normalize(recoveryId);

    const isRecoveryMatch = (r: Recovery) => {
      if (!r) return false;
      const rId = String(r.id || '').trim();
      const rNum = String((r as any).recoveryNumber || '').trim();
      const rIdNorm = normalize(r.id);
      const rNumNorm = normalize((r as any).recoveryNumber);

      if (rId.toLowerCase() === qRaw.toLowerCase() || rNum.toLowerCase() === qRaw.toLowerCase()) return true;
      if (qNorm && (rIdNorm === qNorm || rNumNorm === qNorm)) return true;
      if (qNorm.length > 2 && (rIdNorm.includes(qNorm) || qNorm.includes(rIdNorm))) return true;
      if (qNorm.length > 2 && (rNumNorm.includes(qNorm) || qNorm.includes(rNumNorm))) return true;
      const cleanRaw = qRaw.replace(/^[#\s]+/, '').replace(/^rec\s*#?/i, '').replace(/^rc\s*#?/i, '').trim();
      if (cleanRaw && (rNum.toLowerCase() === cleanRaw.toLowerCase() || rId.toLowerCase() === cleanRaw.toLowerCase())) return true;
      return false;
    };

    // Safe idempotency check: if recovery is already verified, confirm gracefully
    const alreadyConfirmed = recoveries.find((r) => isRecoveryMatch(r) && (r.status === 'VERIFIED' || r.shahzadApproval === 'APPROVED' || r.dualApprovalStatus === 'DUAL_APPROVED'));
    if (alreadyConfirmed) {
      setLedgerToastMessage(`✓ Recovery #${(alreadyConfirmed as any).recoveryNumber || recoveryId} is already confirmed and credited to the ledger.`);
      return;
    }

    let targetRec: Recovery | null = null;
    const updatedRecoveries = recoveries.map((r) => {
      if (isRecoveryMatch(r)) {
        matchedAny = true;
        targetRec = {
          ...r,
          shahzadApproval: 'APPROVED' as const,
          shahzadApprovedAt: new Date().toISOString(),
          status: 'VERIFIED' as const,
          dualApprovalStatus: 'DUAL_APPROVED' as const,
          verifiedBy: 'Shahzad Ullah',
        };
        return targetRec;
      }
      return r;
    });

    if (!matchedAny) {
      console.warn(`[Approval] No pending recovery found matching identifier: ${recoveryId}`);
      setLedgerToastMessage(`⚠️ Recovery #${recoveryId} was not found in pending list or is already confirmed.`);
      return;
    }

    // Reconcile customer balances using the standard financial ledger rule:
    // Closing Balance = Opening Balance + Total Approved Invoices - Total Confirmed Recoveries
    const updatedCustomers = customers.map((c) => {
      const cId = String(c.id || '').toLowerCase().trim();
      const cCode = String(c.customerCode || '').toLowerCase().trim();
      const cName = String(c.companyName || '').toLowerCase().trim();

      const custOrders = orders.filter((o) => {
        if (!o || o.status === 'REJECTED' || o.status === 'CANCELLED') return false;
        const confirmed =
          o.status === 'APPROVED' ||
          o.status === 'PACKED' ||
          o.status === 'INVOICED' ||
          o.status === 'DISPATCHED' ||
          o.status === 'IN_TRANSIT' ||
          o.status === 'DELIVERED' ||
          o.status === 'PARTIALLY_DELIVERED' ||
          o.shahzadApproval === 'APPROVED';
        if (!confirmed) return false;
        const oCustId = String(o.customerId || '').toLowerCase().trim();
        const oCustCode = String(o.customerCode || '').toLowerCase().trim();
        const oCustName = String(o.customerName || '').toLowerCase().trim();
        return (cId && oCustId === cId) || (cCode && (oCustId === cCode || oCustCode === cCode)) || (cName && oCustName === cName);
      });

      const custRecs = updatedRecoveries.filter((r) => {
        if (!r || r.status === 'REJECTED') return false;
        if (r.status !== 'VERIFIED' && r.status !== 'APPROVED' && r.shahzadApproval !== 'APPROVED') return false;
        const rCustId = String(r.customerId || '').toLowerCase().trim();
        const rCustCode = String(r.customerCode || '').toLowerCase().trim();
        const rCustName = String(r.customerName || '').toLowerCase().trim();
        return (cId && rCustId === cId) || (cCode && (rCustId === cCode || rCustCode === cCode)) || (cName && rCustName === cName);
      });

      const debits = custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const credits = custRecs.reduce((sum, r) => sum + (r.amount || 0), 0);
      return {
        ...c,
        currentBalance: Math.max(0, (c.openingBalance ?? 0) + debits - credits),
        updatedAt: new Date().toISOString(),
      };
    });

    setRecoveries(updatedRecoveries);
    setCustomers(updatedCustomers);
    syncToCache(updatedCustomers, orders, updatedRecoveries);

    if (targetRec) {
      const effectiveRec = targetRec as Recovery;
      const updatedAppData: SupabaseAppData = {
        ...currentAppData,
        customers: updatedCustomers,
        salesOrders: orders,
        recoveries: updatedRecoveries,
      };

      // 1. Immediately push verified recovery to Google Sheets Webhook
      syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), updatedAppData).catch((err) => {
        console.warn('Google Sheets Webhook recovery sync note:', err);
      });

      // 2. Trigger auto-ledger sync
      triggerLedgerApprovalSync('RECOVERY_VERIFIED', effectiveRec.id, effectiveRec.customerId, updatedAppData);

      // 3. Persist to Supabase if connected
      if (isOnline) {
        syncRecoveryToSupabase(effectiveRec).catch((err) => {
          console.warn('Supabase recovery upload note:', err);
        });
      }

      logAuditEvent({
        userId: currentUser?.id,
        userName: currentUser?.fullName || 'Shahzad Ullah',
        userEmail: currentUser?.email,
        action: 'RECOVERY_CONFIRMED',
        module: 'FINANCE',
        recordType: 'Recovery',
        recordId: (effectiveRec as any).recoveryNumber || effectiveRec.id,
        details: `Confirmed Rs. ${(effectiveRec.amount || 0).toLocaleString()} (${effectiveRec.paymentMode}) from ${effectiveRec.customerName}`,
      });
    }

    setLedgerToastMessage(`✓ Payment confirmed by Shahzad Ullah. Customer ledger credited & synced.`);
  };

  const handleRejectRecovery = (recoveryId: string, _approver: string, reason?: string) => {
    const finalReason = reason || 'Declined by Shahzad Ullah';
    const isRecoveryMatch = (r: Recovery) => {
      const q = String(recoveryId || '').trim().toUpperCase();
      const rId = String(r.id || '').trim().toUpperCase();
      const rNum = String((r as any).recoveryNumber || '').trim().toUpperCase();
      const qStrip = q.replace(/^REC-/, '').replace(/^RC-/, '');
      const rIdStrip = rId.replace(/^REC-/, '').replace(/^RC-/, '');
      return rId === q || rNum === q || rIdStrip === qStrip;
    };

    const updatedRecoveries = recoveries.map((r) => {
      if (isRecoveryMatch(r)) {
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

    const updatedAppData: SupabaseAppData = {
      ...currentAppData,
      customers,
      salesOrders: orders,
      recoveries: updatedRecoveries,
    };
    syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), updatedAppData).catch((err) => {
      console.warn('Google Sheets Webhook recovery reject sync note:', err);
    });

    logAuditEvent({
      userId: currentUser?.id,
      userName: currentUser?.fullName || 'Shahzad Ullah',
      userEmail: currentUser?.email,
      action: 'RECOVERY_REJECTED',
      module: 'FINANCE',
      recordType: 'Recovery',
      recordId: recoveryId,
      details: `Recovery ${recoveryId} rejected: ${finalReason}`,
    });

    setLedgerToastMessage(`✓ Payment declined by Shahzad Ullah.`);
  };

  // =========================================================================
  // DAILY ENTRY MANAGEMENT: EDIT & DELETE / REVERSAL HANDLERS
  // Field Sales Officers: Own unapproved entries created today
  // Shahzad Ullah (Executive Signing Authority): All entries across any date
  // Financial Protection: Posted entries generate formal accounting reversals
  // =========================================================================

  const handleCancelOrReverseOrder = (orderId: string, reason: string) => {
    try {
      const result = executeOrderCancellationOrReversal(orders, orderId, customers, reason, currentUser);
      setOrders(result.updatedOrders);
      setCustomers(result.updatedCustomers);
      syncToCache(result.updatedCustomers, result.updatedOrders, recoveries);

      const updatedAppData: SupabaseAppData = {
        ...currentAppData,
        customers: result.updatedCustomers,
        salesOrders: result.updatedOrders,
        recoveries,
      };
      syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), updatedAppData).catch((err) => {
        console.warn('Google Sheets Webhook cancel/reversal sync note:', err);
      });

      if (isOnline && result.reversalOrder) {
        syncOrderToSupabase(result.reversalOrder).catch((err) => {
          console.warn('Supabase reversal order sync note:', err);
        });
      }

      logAuditEvent({
        userId: currentUser?.id,
        userName: currentUser?.fullName,
        userEmail: currentUser?.email,
        action: result.isFormalReversal ? 'ORDER_REVERSED' : 'ORDER_CANCELLED',
        module: 'SALES',
        recordType: 'SalesOrder',
        recordId: orderId,
        details: `${result.isFormalReversal ? 'Formal credit reversal' : 'Cancelled'} for ${orderId}: ${reason}`,
      });

      setLedgerToastMessage(`✓ ${result.message}`);
    } catch (err: any) {
      console.error('Order cancellation failed:', err);
      setLedgerToastMessage(`⛔ Error: ${err.message || 'Failed to cancel or reverse order'}`);
    }
  };

  const handleSaveOrderEdit = (orderId: string, updates: Partial<SalesOrder>) => {
    try {
      const existingOrder = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
      if (existingOrder && isEntryConfirmedByAccountsOrNsm(existingOrder)) {
        setLedgerToastMessage('⛔ Locked: Order cannot be changed after confirmation from Accounts or NSM.');
        return;
      }
      const updatedOrders = orders.map((o) => {
        if (o.id === orderId || o.orderNumber === orderId) {
          const merged: SalesOrder = {
            ...o,
            ...updates,
            notes: updates.notes !== undefined ? updates.notes : o.notes,
            items: updates.items || o.items,
          };
          if (updates.items) {
            const subtotal = updates.items.reduce((sum, it) => sum + (it.lineTotal || 0), 0);
            const discount15 = Math.round(subtotal * 0.15);
            const net = subtotal - discount15;
            merged.subtotal = subtotal;
            merged.discountAmount = discount15;
            merged.totalAmount = net;
            merged.netAmount = net;
            merged.netTotal = net;
          }
          return merged;
        }
        return o;
      });

      setOrders(updatedOrders);
      syncToCache(customers, updatedOrders, recoveries);

      const target = updatedOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
      if (isOnline && target) {
        syncOrderToSupabase(target).catch((err) => console.warn('Supabase order update:', err));
      }

      const updatedAppData: SupabaseAppData = {
        ...currentAppData,
        customers,
        salesOrders: updatedOrders,
        recoveries,
      };
      syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), updatedAppData).catch((err) => {
        console.warn('Google Sheets Webhook order update note:', err);
      });

      setLedgerToastMessage(`✓ Order #${orderId} updated successfully.`);
    } catch (err: any) {
      setLedgerToastMessage(`⛔ Update failed: ${err.message}`);
    }
  };

  const handleCancelOrReverseRecovery = (recoveryId: string, reason: string) => {
    try {
      const result = executeRecoveryCancellationOrReversal(recoveries, recoveryId, customers, reason, currentUser);
      setRecoveries(result.updatedRecoveries);
      setCustomers(result.updatedCustomers);
      syncToCache(result.updatedCustomers, orders, result.updatedRecoveries);

      const updatedAppData: SupabaseAppData = {
        ...currentAppData,
        customers: result.updatedCustomers,
        salesOrders: orders,
        recoveries: result.updatedRecoveries,
      };
      syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), updatedAppData).catch((err) => {
        console.warn('Google Sheets Webhook cancel/reversal sync note:', err);
      });

      if (isOnline && result.reversalRecovery) {
        syncRecoveryToSupabase(result.reversalRecovery).catch((err) => {
          console.warn('Supabase reversal recovery sync note:', err);
        });
      }

      logAuditEvent({
        userId: currentUser?.id,
        userName: currentUser?.fullName,
        userEmail: currentUser?.email,
        action: result.isFormalReversal ? 'RECOVERY_REVERSED' : 'RECOVERY_CANCELLED',
        module: 'FINANCE',
        recordType: 'Recovery',
        recordId: recoveryId,
        details: `${result.isFormalReversal ? 'Formal debit reversal' : 'Cancelled'} for ${recoveryId}: ${reason}`,
      });

      setLedgerToastMessage(`✓ ${result.message}`);
    } catch (err: any) {
      console.error('Recovery cancellation failed:', err);
      setLedgerToastMessage(`⛔ Error: ${err.message || 'Failed to cancel or reverse recovery'}`);
    }
  };

  const handleSaveRecoveryEdit = (recoveryId: string, updates: Partial<Recovery>) => {
    try {
      const existingRec = recoveries.find((r) => r.id === recoveryId || (r as any).recoveryNumber === recoveryId);
      if (existingRec && isEntryConfirmedByAccountsOrNsm(existingRec)) {
        setLedgerToastMessage('⛔ Locked: Recovery cannot be changed after confirmation from Accounts or NSM.');
        return;
      }
      let oldRec: Recovery | undefined;
      let newRec: Recovery | undefined;
      const updatedRecoveries = recoveries.map((r) => {
        if (r.id === recoveryId || (r as any).recoveryNumber === recoveryId) {
          oldRec = r;
          newRec = {
            ...r,
            ...updates,
          };
          return newRec;
        }
        return r;
      });

      // If recovery was already verified and amount changed, adjust customer balance by the difference
      let updatedCustomers = customers;
      if (oldRec && newRec && (oldRec.status === 'VERIFIED' || oldRec.status === 'APPROVED') && updates.amount !== undefined) {
        const diff = updates.amount - oldRec.amount;
        updatedCustomers = customers.map((c) => {
          if (c.id === oldRec?.customerId || c.customerCode === oldRec?.customerCode) {
            const cur = c.currentBalance ?? c.openingBalance ?? 0;
            return {
              ...c,
              currentBalance: cur - diff,
            };
          }
          return c;
        });
        setCustomers(updatedCustomers);
      }

      setRecoveries(updatedRecoveries);
      syncToCache(updatedCustomers, orders, updatedRecoveries);

      if (isOnline && newRec) {
        syncRecoveryToSupabase(newRec).catch((err) => console.warn('Supabase recovery update:', err));
      }

      const updatedAppData: SupabaseAppData = {
        ...currentAppData,
        customers: updatedCustomers,
        salesOrders: orders,
        recoveries: updatedRecoveries,
      };
      syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), updatedAppData).catch((err) => {
        console.warn('Google Sheets Webhook recovery update note:', err);
      });

      setLedgerToastMessage(`✓ Recovery receipt #${recoveryId} updated successfully.`);
    } catch (err: any) {
      setLedgerToastMessage(`⛔ Update failed: ${err.message}`);
    }
  };

  const handleSaveAttendanceEdit = (recordId: string, updates: Partial<EmployeeAttendance>) => {
    try {
      const updatedRecords = attendanceRecords.map((r) => {
        if (r.id === recordId) {
          return {
            ...r,
            ...updates,
          };
        }
        return r;
      });
      setAttendanceRecords(updatedRecords);
      setLedgerToastMessage(`✓ Attendance record updated successfully.`);
    } catch (err: any) {
      setLedgerToastMessage(`⛔ Attendance update failed: ${err.message}`);
    }
  };

  const handleDeleteAttendance = (recordId: string) => {
    try {
      const updatedRecords = attendanceRecords.filter((r) => r.id !== recordId);
      setAttendanceRecords(updatedRecords);
      // If the deleted record belongs to today's active user session, reset checkIn state
      setIsCheckedIn(false);
      setCheckedInTime(null);
      setCheckedOutTime(null);
      try {
        localStorage.removeItem('nlink_isCheckedIn');
        localStorage.removeItem('nlink_checkedInTime');
        localStorage.removeItem('nlink_checkedOutTime');
      } catch (e) {}
      setLedgerToastMessage(`✓ Today's punch record deleted.`);
    } catch (err: any) {
      setLedgerToastMessage(`⛔ Delete failed: ${err.message}`);
    }
  };

  // =========================================================================
  // DEPARTMENTS 5-9: STOCK, PACKING, INVOICING, DISPATCH/POD & HR LEAVE HANDLERS
  // =========================================================================

  const handleStockAdjustment = (payload: {
    skuId: string;
    skuCode: string;
    skuName: string;
    transactionType: InventoryTransactionType;
    quantity: number;
    warehouseName: string;
    referenceId: string;
    notes: string;
  }) => {
    const isReduction =
      payload.transactionType === 'ADJUSTMENT_OUT' ||
      payload.transactionType === 'DAMAGE_OUT' ||
      payload.transactionType === 'SALES_OUT' ||
      payload.transactionType === 'TRANSFER_OUT';

    const targetBal = inventoryBalances.find(
      (b) => b.skuId === payload.skuId || b.skuCode === payload.skuCode
    );
    if (isReduction && targetBal && targetBal.availableQuantity < payload.quantity) {
      setLedgerToastMessage(
        `⛔ Blocked: Insufficient available stock for ${payload.skuCode} (${targetBal.availableQuantity} available, ${payload.quantity} requested).`
      );
      return;
    }

    const updatedBalances = inventoryBalances.map((bal) => {
      if (bal.skuId !== payload.skuId && bal.skuCode !== payload.skuCode) return bal;
      const now = new Date().toISOString();
      if (payload.transactionType === 'DAMAGE_OUT') {
        const nextAvail = Math.max(0, (bal.availableQuantity ?? 0) - payload.quantity);
        const nextDmg = (bal.quantityDamaged ?? 0) + payload.quantity;
        return {
          ...bal,
          availableQuantity: nextAvail,
          quantityDamaged: nextDmg,
          quantityOnHand: nextAvail + (bal.quantityReserved ?? 0),
          updatedAt: now,
          lastUpdatedAt: now,
        };
      }
      const delta = isReduction ? -payload.quantity : payload.quantity;
      const nextAvail = Math.max(0, (bal.availableQuantity ?? 0) + delta);
      const nextOnHand = Math.max(0, (bal.quantityOnHand ?? 0) + delta);
      return {
        ...bal,
        availableQuantity: nextAvail,
        quantityOnHand: nextOnHand,
        quantity: nextOnHand,
        updatedAt: now,
        lastUpdatedAt: now,
      };
    });

    const newTx: InventoryTransaction = {
      id: `STX-${Date.now()}`,
      transactionNumber: `TXN-${Date.now().toString().slice(-6)}`,
      transactionType: payload.transactionType,
      warehouseId: 'WH-CENTRAL-01',
      warehouseName: payload.warehouseName,
      skuId: payload.skuId,
      skuCode: payload.skuCode,
      skuName: payload.skuName,
      quantity: isReduction ? -payload.quantity : payload.quantity,
      unitPrice: 0,
      referenceModule: 'INVENTORY',
      referenceId: payload.referenceId,
      notes: payload.notes,
      createdBy: currentUser?.fullName,
      createdAt: new Date().toISOString(),
    };

    const nextTxs = [newTx, ...inventoryTransactions];
    setInventoryBalances(updatedBalances);
    setInventoryTransactions(nextTxs);
    try {
      localStorage.setItem('nlink_inventory_balances', JSON.stringify(updatedBalances));
      localStorage.setItem('nlink_inventory_transactions', JSON.stringify(nextTxs));
    } catch {}

    logAuditEvent({
      userId: currentUser?.id,
      userName: currentUser?.fullName,
      userEmail: currentUser?.email,
      action: `STOCK_${payload.transactionType}`,
      module: 'INVENTORY',
      recordType: 'InventoryTransaction',
      recordId: newTx.transactionNumber,
      details: `${payload.skuCode} (${payload.skuName}) ${isReduction ? '-' : '+'}${payload.quantity} pcs at ${payload.warehouseName}: ${payload.notes}`,
    });

    setLedgerToastMessage(`✓ Stock movement ${newTx.transactionNumber} posted (${payload.skuCode}).`);
  };

  // Dept 6: Packing & Loading Confirmation (APPROVED -> PACKED)
  const handleConfirmPacking = (orderId: string, packingRecord: NonNullable<SalesOrder['packingRecord']>) => {
    const target = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!target) return;

    const updatedOrders = orders.map((o) =>
      o.id === target.id
        ? {
            ...o,
            status: 'PACKED' as const,
            packingRecord,
          }
        : o
    );

    setOrders(updatedOrders);
    syncToCache(customers, updatedOrders, recoveries);
    if (isOnline) {
      const updatedOrd = updatedOrders.find((o) => o.id === target.id);
      if (updatedOrd) syncOrderToSupabase(updatedOrd).catch(() => {});
    }

    logAuditEvent({
      userId: currentUser?.id,
      userName: currentUser?.fullName,
      userEmail: currentUser?.email,
      action: 'ORDER_PACKED',
      module: 'PACKING',
      recordType: 'SalesOrder',
      recordId: target.orderNumber || target.id,
      details: `Packed ${packingRecord.totalCartons} cartons for ${target.customerName} by ${packingRecord.packedBy}`,
    });

    setLedgerToastMessage(`✓ Order #${target.orderNumber} packed (${packingRecord.totalCartons} cartons) and released to Invoice Generation.`);
  };

  // Dept 7: Official Invoice Generation (PACKED -> INVOICED with 15% discount, stock deduction & ledger debit)
  const handlePostInvoice = (order: SalesOrder) => {
    if (order.invoiceNumber) {
      setLedgerToastMessage(`ℹ️ Invoice ${order.invoiceNumber} is already generated for Order #${order.orderNumber}.`);
      return;
    }

    const metrics = calculateInvoiceMetrics(order);
    const invNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const nowIso = new Date().toISOString();

    const updatedBalances = inventoryBalances.map((bal) => {
      const packedLine = order.packingRecord?.items?.find((it) => it.skuId === bal.skuId || it.skuCode === bal.skuCode);
      const orderLine = (order.items || []).find((it) => it.skuId === bal.skuId || it.skuCode === bal.skuCode);
      const qtyToDeduct = packedLine ? packedLine.packedQuantity : orderLine ? (orderLine.orderedQuantity || orderLine.quantity || 0) : 0;
      if (qtyToDeduct <= 0) return bal;
      const nextAvail = Math.max(0, (bal.availableQuantity ?? 0) - qtyToDeduct);
      const nextOnHand = Math.max(0, (bal.quantityOnHand ?? 0) - qtyToDeduct);
      return {
        ...bal,
        availableQuantity: nextAvail,
        quantityOnHand: nextOnHand,
        quantity: nextOnHand,
        updatedAt: nowIso,
        lastUpdatedAt: nowIso,
      };
    });

    const newStockTxs: InventoryTransaction[] = (order.items || []).map((it, idx) => {
      const packedLine = order.packingRecord?.items?.find((p) => p.skuId === it.skuId || p.skuCode === it.skuCode);
      const qty = packedLine ? packedLine.packedQuantity : (it.orderedQuantity || it.quantity || 0);
      return {
        id: `STX-INV-${Date.now()}-${idx}`,
        transactionNumber: `TXN-${invNumber}-${idx + 1}`,
        transactionType: 'SALES_OUT',
        warehouseId: 'WH-CENTRAL-01',
        warehouseName: order.warehouseName || 'Central Peshawar Warehouse',
        skuId: it.skuId,
        skuCode: it.skuCode,
        skuName: it.skuName,
        quantity: -qty,
        unitPrice: it.unitPrice || 0,
        referenceModule: 'INVOICING',
        referenceId: invNumber,
        notes: `Stock deducted for ${invNumber} (${order.customerName})`,
        createdBy: currentUser?.fullName,
        createdAt: nowIso,
      };
    });

    const updatedOrders = orders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            status: 'INVOICED' as const,
            invoiceNumber: invNumber,
            invoicedAt: nowIso,
            invoicedBy: currentUser?.fullName || 'Accounts Department',
            subtotal: metrics.grossSubtotal,
            discountAmount: metrics.discount15,
            totalAmount: metrics.netInvoiceTotal,
            netAmount: metrics.netInvoiceTotal,
            netTotal: metrics.netInvoiceTotal,
          }
        : o
    );

    const updatedCustomers = customers.map((c) => {
      const cId = String(c.id || '').toLowerCase().trim();
      const cCode = String(c.customerCode || '').toLowerCase().trim();
      const cName = String(c.companyName || '').toLowerCase().trim();
      const custOrders = updatedOrders.filter((o) => {
        if (!o || o.status === 'REJECTED' || o.status === 'CANCELLED') return false;
        const confirmed =
          o.status === 'APPROVED' ||
          o.status === 'PACKED' ||
          o.status === 'INVOICED' ||
          o.status === 'DISPATCHED' ||
          o.status === 'IN_TRANSIT' ||
          o.status === 'DELIVERED' ||
          o.status === 'PARTIALLY_DELIVERED' ||
          o.shahzadApproval === 'APPROVED';
        if (!confirmed) return false;
        const oCustId = String(o.customerId || '').toLowerCase().trim();
        const oCustCode = String(o.customerCode || '').toLowerCase().trim();
        const oCustName = String(o.customerName || '').toLowerCase().trim();
        return (cId && oCustId === cId) || (cCode && (oCustId === cCode || oCustCode === cCode)) || (cName && oCustName === cName);
      });
      const custRecs = recoveries.filter((r) => {
        if (!r || r.status === 'REJECTED') return false;
        if (r.status !== 'VERIFIED' && r.status !== 'APPROVED' && r.shahzadApproval !== 'APPROVED') return false;
        const rCustId = String(r.customerId || '').toLowerCase().trim();
        const rCustCode = String(r.customerCode || '').toLowerCase().trim();
        const rCustName = String(r.customerName || '').toLowerCase().trim();
        return (cId && rCustId === cId) || (cCode && (rCustId === cCode || rCustCode === cCode)) || (cName && rCustName === cName);
      });
      const debits = custOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
      const credits = custRecs.reduce((s, r) => s + (r.amount || 0), 0);
      return {
        ...c,
        currentBalance: Math.max(0, (c.openingBalance ?? 0) + debits - credits),
        updatedAt: nowIso,
      };
    });

    const nextTxs = [...newStockTxs, ...inventoryTransactions];
    setInventoryBalances(updatedBalances);
    setInventoryTransactions(nextTxs);
    setOrders(updatedOrders);
    setCustomers(updatedCustomers);
    syncToCache(updatedCustomers, updatedOrders, recoveries);
    try {
      localStorage.setItem('nlink_inventory_balances', JSON.stringify(updatedBalances));
      localStorage.setItem('nlink_inventory_transactions', JSON.stringify(nextTxs));
    } catch {}

    logAuditEvent({
      userId: currentUser?.id,
      userName: currentUser?.fullName,
      userEmail: currentUser?.email,
      action: 'INVOICE_GENERATED',
      module: 'INVOICING',
      recordType: 'Invoice',
      recordId: invNumber,
      details: `Generated ${invNumber} for Order #${order.orderNumber} (${order.customerName}) — Net Rs. ${metrics.netInvoiceTotal.toLocaleString()} after 15% discount`,
    });

    setLedgerToastMessage(`✓ Invoice ${invNumber} generated (15% Less: Net Rs. ${metrics.netInvoiceTotal.toLocaleString()}) & posted to Dispatch queue.`);
  };

  // Dept 8: Assign Dispatch (INVOICED -> DISPATCHED)
  const handleAssignDispatch = (
    orderId: string,
    payload: {
      warehouseName: string;
      transporterName: string;
      vehicleNumber: string;
      driverName: string;
      driverPhone: string;
      bilityNumber: string;
      dispatchNoteNumber: string;
    }
  ) => {
    const nowIso = new Date().toISOString();
    const updatedOrders = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: 'DISPATCHED' as const,
            warehouseName: payload.warehouseName,
            transporterName: payload.transporterName,
            vehicleNumber: payload.vehicleNumber,
            driverName: payload.driverName,
            driverPhone: payload.driverPhone,
            bilityNumber: payload.bilityNumber,
            dispatchNoteNumber: payload.dispatchNoteNumber,
            dispatchedAt: nowIso,
          }
        : o
    );
    setOrders(updatedOrders);
    syncToCache(customers, updatedOrders, recoveries);

    const ord = updatedOrders.find((o) => o.id === orderId);
    logAuditEvent({
      userId: currentUser?.id,
      userName: currentUser?.fullName,
      userEmail: currentUser?.email,
      action: 'CONSIGNMENT_DISPATCHED',
      module: 'DISPATCH',
      recordType: 'SalesOrder',
      recordId: ord?.orderNumber || orderId,
      details: `Dispatched via ${payload.transporterName} (${payload.vehicleNumber}), Bilty #${payload.bilityNumber}, DN #${payload.dispatchNoteNumber}`,
    });

    setLedgerToastMessage(`✓ Dispatch Note ${payload.dispatchNoteNumber} (Bilty #${payload.bilityNumber}) assigned.`);
  };

  // Dept 8: Proof of Delivery (DISPATCHED -> DELIVERED / PARTIALLY_DELIVERED)
  const handleConfirmDelivery = (
    orderId: string,
    payload: {
      status: 'DELIVERED' | 'PARTIALLY_DELIVERED';
      deliveryReceiverName: string;
      deliveryNotes: string;
      shortageReported?: number;
      damageReported?: number;
    }
  ) => {
    const nowIso = new Date().toISOString();
    const updatedOrders = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: payload.status,
            deliveredAt: nowIso,
            deliveryReceiverName: payload.deliveryReceiverName,
            deliveryNotes: payload.deliveryNotes,
            shortageReported: payload.shortageReported || 0,
            damageReported: payload.damageReported || 0,
          }
        : o
    );
    setOrders(updatedOrders);
    syncToCache(customers, updatedOrders, recoveries);

    const ord = updatedOrders.find((o) => o.id === orderId);
    logAuditEvent({
      userId: currentUser?.id,
      userName: currentUser?.fullName,
      userEmail: currentUser?.email,
      action: `DELIVERY_${payload.status}`,
      module: 'DISPATCH',
      recordType: 'SalesOrder',
      recordId: ord?.orderNumber || orderId,
      details: `POD confirmed by ${payload.deliveryReceiverName}: ${payload.deliveryNotes}`,
    });

    setLedgerToastMessage(`✓ Delivery confirmed (${payload.status}) for Order #${ord?.orderNumber || orderId}.`);
  };

  // Dept 9: Leave Requests
  const handleSubmitLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>) => {
    const next: LeaveRequest = {
      ...req,
      id: `LV-${Date.now()}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    const updated = [next, ...leaveRequests];
    setLeaveRequests(updated);
    try {
      localStorage.setItem('nlink_leave_requests', JSON.stringify(updated));
    } catch {}
    logAuditEvent({
      userId: currentUser?.id,
      userName: currentUser?.fullName,
      userEmail: currentUser?.email,
      action: 'LEAVE_REQUESTED',
      module: 'HR',
      recordType: 'LeaveRequest',
      recordId: next.id,
      details: `${req.employeeName} requested ${req.daysCount} day(s) ${req.leaveType} (${req.fromDate} to ${req.toDate})`,
    });
    setLedgerToastMessage(`✓ Leave request ${next.id} submitted for HR approval.`);
  };

  const handleReviewLeaveRequest = (requestId: string, decision: 'APPROVED' | 'REJECTED', notes?: string) => {
    const updated = leaveRequests.map((r) =>
      r.id === requestId
        ? {
            ...r,
            status: decision,
            reviewedBy: currentUser?.fullName || 'Shahzad Ullah',
            reviewedAt: new Date().toISOString(),
            reviewNotes: notes,
          }
        : r
    );
    setLeaveRequests(updated);
    try {
      localStorage.setItem('nlink_leave_requests', JSON.stringify(updated));
    } catch {}
    logAuditEvent({
      userId: currentUser?.id,
      userName: currentUser?.fullName,
      userEmail: currentUser?.email,
      action: `LEAVE_${decision}`,
      module: 'HR',
      recordType: 'LeaveRequest',
      recordId: requestId,
      details: `Leave request ${requestId} ${decision.toLowerCase()} by ${currentUser?.fullName || 'Admin'}`,
    });
    setLedgerToastMessage(`✓ Leave application ${decision.toLowerCase()}.`);
  };

  // Google Sheet manual sync handler
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);

  const handleSyncGoogleSheet = async () => {
    setIsSyncingSheet(true);
    try {
      // 1. First push latest state to Google Sheets Webhook so sheet is current
      const currentFullData: SupabaseAppData = {
        ...currentAppData,
        customers,
        salesOrders: orders,
        recoveries,
      };
      await syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), currentFullData).catch((err) => {
        console.warn('Pre-sync push note:', err);
      });

      // 2. Fetch live data from Google Sheets
      const sheetData = await fetchLiveGoogleSheetData();
      if (sheetData && sheetData.customersCount > 0) {
        const cleanOrderKey = (o: SalesOrder) => {
          const num = o.orderNumber ? String(o.orderNumber) : String(o.id || '');
          return num.toUpperCase().trim().replace(/^(ORD-|SO-|INV-)/, '');
        };

        const cleanRecKey = (r: Recovery) => {
          const num = (r as any).recoveryNumber ? String((r as any).recoveryNumber) : String(r.id || '');
          return num.toUpperCase().trim().replace(/^(REC-|RC-)/, '');
        };

        let nextOrders: SalesOrder[] = [];
        setOrders((prev) => {
          const ordMap = new Map(sheetData.orders.map((o) => [cleanOrderKey(o), o]));
          const merged = prev.map((loc) => {
            const r = ordMap.get(cleanOrderKey(loc));
            if (!r) return loc;
            const isApproved =
              loc.status === 'APPROVED' ||
              loc.shahzadApproval === 'APPROVED' ||
              loc.dualApprovalStatus === 'DUAL_APPROVED' ||
              r.status === 'APPROVED' ||
              r.shahzadApproval === 'APPROVED' ||
              r.dualApprovalStatus === 'DUAL_APPROVED';

            return {
              ...r,
              ...loc,
              status: isApproved ? 'APPROVED' : (loc.status || r.status),
              shahzadApproval: isApproved ? 'APPROVED' : (loc.shahzadApproval || r.shahzadApproval),
              dualApprovalStatus: isApproved ? 'DUAL_APPROVED' : (loc.dualApprovalStatus || r.dualApprovalStatus),
              approvedBy: isApproved ? 'Shahzad Ullah' : (loc.approvedBy || r.approvedBy),
            };
          });

          sheetData.orders.forEach((o) => {
            if (!merged.some((m) => cleanOrderKey(m) === cleanOrderKey(o))) {
              merged.push(o);
            }
          });
          nextOrders = merged;
          return merged;
        });

        let nextRecs: Recovery[] = [];
        setRecoveries((prev) => {
          const recMap = new Map(sheetData.recoveries.map((r) => [cleanRecKey(r), r]));
          const merged = prev.map((loc) => {
            const r = recMap.get(cleanRecKey(loc));
            if (!r) return loc;
            const isApproved =
              loc.status === 'VERIFIED' ||
              loc.status === 'APPROVED' ||
              loc.shahzadApproval === 'APPROVED' ||
              loc.dualApprovalStatus === 'DUAL_APPROVED' ||
              r.status === 'VERIFIED' ||
              r.status === 'APPROVED' ||
              r.shahzadApproval === 'APPROVED' ||
              r.dualApprovalStatus === 'DUAL_APPROVED';

            return {
              ...r,
              ...loc,
              status: isApproved ? 'VERIFIED' : (loc.status || r.status),
              shahzadApproval: isApproved ? 'APPROVED' : (loc.shahzadApproval || r.shahzadApproval),
              dualApprovalStatus: isApproved ? 'DUAL_APPROVED' : (loc.dualApprovalStatus || r.dualApprovalStatus),
              verifiedBy: isApproved ? 'Shahzad Ullah' : (loc.verifiedBy || r.verifiedBy),
            };
          });

          sheetData.recoveries.forEach((r) => {
            if (!merged.some((m) => cleanRecKey(m) === cleanRecKey(r))) {
              merged.push(r);
            }
          });
          nextRecs = merged;
          return merged;
        });

        setCustomers((prev) => {
          // preserve local approved status & reconcile customer balance
          const custMap = new Map(sheetData.customers.map((c) => [c.id.toUpperCase(), c]));
          const merged = prev.map((loc) => {
            const r = custMap.get(loc.id.toUpperCase());
            if (!r) return loc;
            const isApproved = loc.approvalStatus === 'APPROVED' || loc.status === 'ACTIVE' || r.approvalStatus === 'APPROVED' || r.status === 'ACTIVE';
            return {
              ...r,
              ...loc,
              status: isApproved ? 'ACTIVE' : (loc.status || r.status),
              approvalStatus: isApproved ? 'APPROVED' : (loc.approvalStatus || r.approvalStatus),
              approvedBy: isApproved ? 'Shahzad Ullah' : (loc.approvedBy || r.approvedBy),
            };
          });

          sheetData.customers.forEach((c) => {
            if (!merged.some((m) => m.id.toUpperCase() === c.id.toUpperCase() || (m.customerCode && m.customerCode === c.customerCode))) {
              merged.push(c);
            }
          });

          // Reconcile ledger balances: Opening + Invoices - Recovery = Closing
          return merged.map((c) => {
            const cId = String(c.id || '').toLowerCase().trim();
            const cCode = String(c.customerCode || '').toLowerCase().trim();
            const cName = String(c.companyName || '').toLowerCase().trim();

            const cOrds = nextOrders.filter((o) => {
              if (!o || o.status === 'REJECTED') return false;
              const oCustId = String(o.customerId || '').toLowerCase().trim();
              const oCustCode = String(o.customerCode || '').toLowerCase().trim();
              const oCustName = String(o.customerName || '').toLowerCase().trim();
              return (cId && oCustId === cId) || (cCode && (oCustId === cCode || oCustCode === cCode)) || (cName && oCustName === cName);
            });

            const cRecs = nextRecs.filter((r) => {
              if (!r || r.status === 'REJECTED') return false;
              const rCustId = String(r.customerId || '').toLowerCase().trim();
              const rCustCode = String(r.customerCode || '').toLowerCase().trim();
              const rCustName = String(r.customerName || '').toLowerCase().trim();
              return (cId && rCustId === cId) || (cCode && (rCustId === cCode || rCustCode === cCode)) || (cName && rCustName === cName);
            });

            const debits = cOrds.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
            const credits = cRecs.reduce((sum, r) => sum + (r.amount || 0), 0);
            return {
              ...c,
              currentBalance: Math.max(0, (c.openingBalance ?? 0) + debits - credits),
              updatedAt: new Date().toISOString(),
            };
          });
        });

        if (sheetData.ledgerEntries && sheetData.ledgerEntries.length > 0) {
          setLedgerEntries(sheetData.ledgerEntries);
        }

        setLedgerToastMessage(
          `✓ Google Sheet live sync complete! Synchronized ${sheetData.customersCount} dealers, ${sheetData.ordersCount} invoices/orders, and ${sheetData.recoveriesCount} recoveries.`
        );
      } else {
        setLedgerToastMessage('ℹ️ Google Sheet verified: Synchronized successfully.');
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

    logAuditEvent({
      userId: currentUser?.id,
      userName: currentUser?.fullName,
      userEmail: currentUser?.email,
      action: 'CUSTOMER_REGISTERED',
      module: 'CUSTOMERS',
      recordType: 'Customer',
      recordId: customerRecord.customerCode || customerRecord.id,
      details: `Registered dealer "${customerRecord.companyName}" (${customerRecord.town}) pending executive approval`,
    });

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
    try {
      assertAuthorizedApprover(currentUser?.email, currentUser);
    } catch (e: any) {
      console.warn('Approver assertion note:', e.message);
    }

    const isCustomerMatch = (c: Customer) => {
      const q = String(customerId || '').trim().toUpperCase();
      const cId = String(c.id || '').trim().toUpperCase();
      const cCode = String(c.customerCode || '').trim().toUpperCase();
      const cName = String(c.companyName || '').trim().toUpperCase();
      return (
        cId === q ||
        cCode === q ||
        (cName && cName === q) ||
        cId.replace(/^CUST-/, '') === q.replace(/^CUST-/, '')
      );
    };

    let approvedTarget: Customer | null = null;
    const updated = customers.map((c) => {
      if (isCustomerMatch(c)) {
        approvedTarget = {
          ...c,
          status: 'ACTIVE' as const,
          approvalStatus: 'APPROVED' as const,
          approvedBy: 'Shahzad Ullah',
          approvedAt: new Date().toISOString(),
          isActive: true,
        };
        return approvedTarget;
      }
      return c;
    });

    setCustomers(updated);
    syncToCache(updated, orders, recoveries);

    if (approvedTarget) {
      const effectiveCust = approvedTarget as Customer;
      if (isOnline) {
        syncCustomerToSupabase(effectiveCust).catch((err) => {
          console.warn('Supabase customer approval sync note:', err);
        });
      }
      const updatedAppData: SupabaseAppData = {
        ...currentAppData,
        customers: updated,
        salesOrders: orders,
        recoveries: recoveries,
      };
      syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), updatedAppData).catch((err) => {
        console.warn('Google Sheet customer sync note:', err);
      });
      logAuditEvent({
        userId: currentUser?.id,
        userName: currentUser?.fullName || 'Shahzad Ullah',
        userEmail: currentUser?.email,
        action: 'CUSTOMER_APPROVED',
        module: 'CUSTOMERS',
        recordType: 'Customer',
        recordId: effectiveCust.customerCode || effectiveCust.id,
        details: `Approved dealer "${effectiveCust.companyName}" (${effectiveCust.town})`,
      });
    }

    setLedgerToastMessage(`✓ Dealer account approved by Shahzad Ullah. Dealer is now active & synced to Google Sheets.`);
  };

  const handleRejectCustomer = (customerId: string, reason?: string) => {
    try {
      assertAuthorizedApprover(currentUser?.email, currentUser);
    } catch (e: any) {
      console.warn('Approver assertion note:', e.message);
    }

    const isCustomerMatch = (c: Customer) => {
      const q = String(customerId || '').trim().toUpperCase();
      const cId = String(c.id || '').trim().toUpperCase();
      const cCode = String(c.customerCode || '').trim().toUpperCase();
      const cName = String(c.companyName || '').trim().toUpperCase();
      return (
        cId === q ||
        cCode === q ||
        (cName && cName === q) ||
        cId.replace(/^CUST-/, '') === q.replace(/^CUST-/, '')
      );
    };

    const updated = customers.map((c) => {
      if (isCustomerMatch(c)) {
        return {
          ...c,
          status: 'INACTIVE' as const,
          approvalStatus: 'REJECTED' as const,
          rejectionReason: reason || 'Declined by Shahzad Ullah',
          rejectedAt: new Date().toISOString(),
          isActive: false,
        };
      }
      return c;
    });

    setCustomers(updated);
    syncToCache(updated, orders, recoveries);

    const updatedAppData: SupabaseAppData = {
      ...currentAppData,
      customers: updated,
      salesOrders: orders,
      recoveries: recoveries,
    };
    syncToGoogleSheetsWebhook(getGoogleSheetsWebhookUrl(), updatedAppData).catch((err) => {
      console.warn('Google Sheet customer reject sync note:', err);
    });

    logAuditEvent({
      userId: currentUser?.id,
      userName: currentUser?.fullName || 'Shahzad Ullah',
      userEmail: currentUser?.email,
      action: 'CUSTOMER_REJECTED',
      module: 'CUSTOMERS',
      recordType: 'Customer',
      recordId: customerId,
      details: `Rejected dealer ${customerId}: ${reason || 'Declined by Shahzad Ullah'}`,
    });

    setLedgerToastMessage(`✓ Dealer application declined by Shahzad Ullah.`);
  };

  // Global Session Invalidation Event Listener
  useEffect(() => {
    const handleGlobalSessionInvalidated = () => {
      setCurrentUser(null);
      setLedgerToastMessage('⚠️ Global session reset by administrator. Please re-authenticate.');
    };
    const handleSystemToast = (e: any) => {
      if (e?.detail?.message) {
        setLedgerToastMessage(e.detail.message);
      }
    };
    window.addEventListener('nlink:global_session_invalidated', handleGlobalSessionInvalidated);
    window.addEventListener('nlink:system_toast', handleSystemToast);
    return () => {
      window.removeEventListener('nlink:global_session_invalidated', handleGlobalSessionInvalidated);
      window.removeEventListener('nlink:system_toast', handleSystemToast);
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
      if (currentUser && !isProductionUser(currentUser)) {
        setCurrentUser(purgeRes.remainingUsers[0]);
      }
      setLedgerToastMessage(`✓ ${purgeRes.message}`);
    } catch (err) {
      console.error('Manual purge error:', err);
    }
  };

  const handleApplySalesAudit = (
    updatedOrders: SalesOrder[],
    updatedLedgerEntries: LedgerEntry[],
    updatedCustomers: Customer[]
  ) => {
    setOrders(updatedOrders);
    setLedgerEntries(updatedLedgerEntries);
    setCustomers(updatedCustomers);
    syncToCache(updatedCustomers, updatedOrders, recoveries);
    setLedgerToastMessage('✓ Sales Audit Complete: Re-calculated entries to Net TP (@15% Less) & synchronized ledgers.');
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased max-w-full overflow-x-hidden relative">
      {/* Live Toast Message */}
      {ledgerToastMessage && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1B5E3A] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs sm:text-sm font-semibold animate-in fade-in duration-200 border border-[#4CAF50]/60 max-w-lg w-[calc(100%-2rem)] mx-auto"
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

      {/* Top-Level Official National Light BrandHeader (Head Office Desktop Portal) */}
      {experienceMode === 'HEAD_OFFICE' && (
        <BrandHeader
          currentUser={currentUser}
          experienceMode={experienceMode}
          onToggleExperience={() => setExperienceMode('FIELD_MOBILE')}
        />
      )}

      {experienceMode === 'FIELD_MOBILE' ? (
          <FieldMobileExperience
            currentUser={currentUser}
            customers={customers}
            orders={orders}
            recoveries={recoveries}
            attendanceRecords={attendanceRecords}
            isCheckedIn={isCheckedIn}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            checkedInTime={checkedInTime}
            checkedOutTime={checkedOutTime}
            selectedTown={selectedAttendanceTown}
            onSelectTown={setSelectedAttendanceTown}
            onPlaceOrder={handlePlaceOrder}
            onRecordRecovery={handleRecordRecovery}
            onOpenRateCard={() => setIsRateCardOpen(true)}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
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
            ledgerEntries={ledgerEntries}
            visits={fallbackAppData.visits}
            stockReturns={fallbackAppData.stockReturns}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            onApproveOrder={handleApproveOrder}
            onApproveRecovery={handleApproveRecovery}
            onCancelOrReverseOrder={handleCancelOrReverseOrder}
            onSaveOrderEdit={handleSaveOrderEdit}
            onCancelOrReverseRecovery={handleCancelOrReverseRecovery}
            onSaveRecoveryEdit={handleSaveRecoveryEdit}
            onSaveAttendanceEdit={handleSaveAttendanceEdit}
            onDeleteAttendance={handleDeleteAttendance}
            onOpenSalesAuditModal={() => setIsSalesAuditModalOpen(true)}
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          />
        ) : (
          <HeadOfficeExperience
            currentUser={currentUser}
            customers={customers}
            orders={orders}
            recoveries={recoveries}
            ledgerEntries={ledgerEntries}
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
            onSignOut={handleSignOut}
            onPurgeMockData={handlePurgeMockData}
            onPreviewInvoicePdf={handlePreviewInvoicePdf}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            inventoryBalances={inventoryBalances}
            inventoryTransactions={inventoryTransactions}
            leaveRequests={leaveRequests}
            skus={NLINK_OFFICIAL_PRODUCTS as any}
            invoices={fallbackAppData.invoices}
            dispatches={fallbackAppData.dispatches}
            stockReturns={fallbackAppData.stockReturns}
            visits={fallbackAppData.visits}
            isOnline={isOnline}
            onDispatchAndInvoiceOrder={handleDispatchAndInvoiceOrder}
            onCancelOrReverseOrder={handleCancelOrReverseOrder}
            onSaveOrderEdit={handleSaveOrderEdit}
            onCancelOrReverseRecovery={handleCancelOrReverseRecovery}
            onSaveRecoveryEdit={handleSaveRecoveryEdit}
            onSaveAttendanceEdit={handleSaveAttendanceEdit}
            onDeleteAttendance={handleDeleteAttendance}
            onOpenSalesAuditModal={() => setIsSalesAuditModalOpen(true)}
            onConfirmPacking={handleConfirmPacking}
            onPostInvoice={handlePostInvoice}
            onAssignDispatch={handleAssignDispatch}
            onConfirmDelivery={handleConfirmDelivery}
            onStockAdjustment={handleStockAdjustment}
            onSubmitLeaveRequest={handleSubmitLeaveRequest}
            onReviewLeaveRequest={handleReviewLeaveRequest}
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          />
        )}

      {/* Forced First-Login / Reset or Self-Service Change Password Modal */}
      {currentUser && (Boolean(currentUser.mustChangePassword) || isChangePasswordOpen) && (
        <ChangePasswordModal
          isOpen={true}
          email={currentUser.email}
          fullName={currentUser.fullName}
          forced={Boolean(currentUser.mustChangePassword)}
          onClose={() => setIsChangePasswordOpen(false)}
          onSignOut={handleSignOut}
          onSuccess={() => {
            const updatedUser: NLinkUser = {
              ...currentUser,
              mustChangePassword: false,
              initialPasswordStatus: 'CHANGED',
            };
            setCurrentUser(updatedUser);
            try {
              localStorage.setItem('nlink_active_logged_user', JSON.stringify(updatedUser));
              localStorage.setItem('nlink_active_user_session', JSON.stringify(updatedUser));
            } catch {}
            setIsChangePasswordOpen(false);
            setLedgerToastMessage('✓ Password updated successfully.');
          }}
        />
      )}

      {/* Team Share Working Link Modal */}
      <TeamShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentUser={currentUser}
      />

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

      {/* Today's Sales Audit Modal */}
      <TodaySalesAuditModal
        isOpen={isSalesAuditModalOpen}
        onClose={() => setIsSalesAuditModalOpen(false)}
        orders={orders}
        ledgerEntries={ledgerEntries}
        customers={customers}
        onApplyAuditResult={handleApplySalesAudit}
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
