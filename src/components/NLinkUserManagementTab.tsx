/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - User Management, Team Hierarchy, Attendance & Employee Provisioning
 * Synced with Google Sheet tabs: Users, Team Data, and Attendance Register
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Search,
  Download,
  Building2,
  MapPin,
  Phone,
  Mail,
  Award,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Coins,
  Clock,
  Calendar,
  UserPlus,
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  MapPinCheck,
  LogOut,
  LogIn,
  Layers,
} from 'lucide-react';
import { NLinkUser, generateAutoCredentials } from '../data/nlink-users-team';
import { UserRole, EmployeeAttendance, AttendanceStatus } from '../types';

interface NLinkUserManagementTabProps {
  currentUser: NLinkUser;
  allUsers: NLinkUser[];
  onSelectUserToImpersonate?: (user: NLinkUser) => void;
  onAddUser?: (newUser: NLinkUser) => void;
}

export const NLinkUserManagementTab: React.FC<NLinkUserManagementTabProps> = ({
  currentUser,
  allUsers: initialUsers,
  onSelectUserToImpersonate,
  onAddUser,
}) => {
  const [usersList, setUsersList] = useState<NLinkUser[]>(initialUsers);

  useEffect(() => {
    setUsersList(initialUsers);
  }, [initialUsers]);

  // Main active view within tab
  const [activeSubView, setActiveSubView] = useState<'ROSTER' | 'ATTENDANCE' | 'ADD_EMPLOYEE'>('ROSTER');

  // Filters for Roster
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // --------------------------------------------------------------------------
  // ATTENDANCE STATE & ENGINE
  // --------------------------------------------------------------------------
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string>(todayDateStr);
  const [attendanceFilterStatus, setAttendanceFilterStatus] = useState<string>('ALL');
  const [attendanceSearch, setAttendanceSearch] = useState('');

  // Local Attendance Storage / Initial Mock State for the Team
  const [attendanceRecords, setAttendanceRecords] = useState<EmployeeAttendance[]>(() => {
    const cached = localStorage.getItem('nlink_team_attendance_records');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.warn('Failed to parse cached attendance', e);
      }
    }
    // Seed initial realistic attendance for today
    return initialUsers.map((u, idx) => {
      const isCurrentUser = u.id === currentUser.id;
      let status: AttendanceStatus = 'PRESENT';
      let checkInTime = '08:45 AM';
      let checkOutTime: string | undefined = undefined;

      if (u.role === 'TSM') {
        status = idx % 4 === 0 ? 'FIELD_DUTY' : idx % 5 === 0 ? 'LATE' : 'PRESENT';
        checkInTime = idx % 5 === 0 ? '09:40 AM' : '08:50 AM';
      } else if (idx === 6) {
        status = 'ON_LEAVE';
        checkInTime = '';
      }

      return {
        id: `att_${u.id}_${todayDateStr}`,
        employeeId: u.id,
        employeeCode: u.employeeCode,
        employeeName: u.fullName,
        designation: u.roleTitle,
        department: u.department,
        date: todayDateStr,
        checkInTime: status === 'ON_LEAVE' ? undefined : checkInTime,
        checkOutTime: isCurrentUser ? undefined : '05:30 PM',
        status: status,
        location: u.territory || `${u.region} Zone`,
        workingHours: status === 'ON_LEAVE' ? 0 : 8.5,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
    });
  });

  // Save to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem('nlink_team_attendance_records', JSON.stringify(attendanceRecords));
    } catch (e) {
      console.warn('Failed to persist attendance', e);
    }
  }, [attendanceRecords]);

  // Current User Attendance Status
  const currentUserAttendance = useMemo(() => {
    return attendanceRecords.find(
      (a) => (a.employeeId === currentUser.id || a.employeeCode === currentUser.employeeCode) && a.date === selectedAttendanceDate
    );
  }, [attendanceRecords, currentUser, selectedAttendanceDate]);

  // Action: Mark Check In for Current User
  const handleCheckInCurrentUser = () => {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const existing = attendanceRecords.find(
      (a) => (a.employeeId === currentUser.id || a.employeeCode === currentUser.employeeCode) && a.date === selectedAttendanceDate
    );

    if (existing) {
      const updated = attendanceRecords.map((a) =>
        a.id === existing.id
          ? { ...a, checkInTime: nowTime, status: 'PRESENT' as AttendanceStatus, location: currentUser.territory || 'On Duty' }
          : a
      );
      setAttendanceRecords(updated);
    } else {
      const newRec: EmployeeAttendance = {
        id: `att_${currentUser.id}_${selectedAttendanceDate}_${Date.now()}`,
        employeeId: currentUser.id,
        employeeCode: currentUser.employeeCode,
        employeeName: currentUser.fullName,
        designation: currentUser.roleTitle,
        department: currentUser.department,
        date: selectedAttendanceDate,
        checkInTime: nowTime,
        status: 'PRESENT',
        location: currentUser.territory || `${currentUser.region} Beat`,
        workingHours: 8,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      setAttendanceRecords([newRec, ...attendanceRecords]);
    }
    alert(`Attendance marked! Checked in at ${nowTime} for ${currentUser.fullName} (${currentUser.territory}).`);
  };

  // Action: Mark Check Out for Current User
  const handleCheckOutCurrentUser = () => {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const existing = attendanceRecords.find(
      (a) => (a.employeeId === currentUser.id || a.employeeCode === currentUser.employeeCode) && a.date === selectedAttendanceDate
    );

    if (existing) {
      const updated = attendanceRecords.map((a) =>
        a.id === existing.id
          ? { ...a, checkOutTime: nowTime, workingHours: 8.5 }
          : a
      );
      setAttendanceRecords(updated);
      alert(`Duty closed! Checked out at ${nowTime} for ${currentUser.fullName}.`);
    } else {
      alert('Please check in first before checking out.');
    }
  };

  // Action: Admin updates employee status
  const handleUpdateEmployeeStatus = (employeeId: string, newStatus: AttendanceStatus) => {
    const existing = attendanceRecords.find(
      (a) => a.employeeId === employeeId && a.date === selectedAttendanceDate
    );
    const targetUser = usersList.find((u) => u.id === employeeId);
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (existing) {
      const updated = attendanceRecords.map((a) =>
        a.id === existing.id
          ? {
              ...a,
              status: newStatus,
              checkInTime: newStatus === 'ON_LEAVE' || newStatus === 'ABSENT' ? undefined : a.checkInTime || nowTime,
              workingHours: newStatus === 'ON_LEAVE' || newStatus === 'ABSENT' ? 0 : 8,
            }
          : a
      );
      setAttendanceRecords(updated);
    } else if (targetUser) {
      const newRec: EmployeeAttendance = {
        id: `att_${targetUser.id}_${selectedAttendanceDate}_${Date.now()}`,
        employeeId: targetUser.id,
        employeeCode: targetUser.employeeCode,
        employeeName: targetUser.fullName,
        designation: targetUser.roleTitle,
        department: targetUser.department,
        date: selectedAttendanceDate,
        checkInTime: newStatus === 'ON_LEAVE' || newStatus === 'ABSENT' ? undefined : nowTime,
        status: newStatus,
        location: targetUser.territory || `${targetUser.region} Zone`,
        workingHours: newStatus === 'ON_LEAVE' || newStatus === 'ABSENT' ? 0 : 8,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      setAttendanceRecords([newRec, ...attendanceRecords]);
    }
  };

  // Filtered Attendance for Table
  const filteredAttendance = useMemo(() => {
    // Merge users list with attendance records for the selected date
    return usersList.map((user) => {
      const rec = attendanceRecords.find(
        (a) => (a.employeeId === user.id || a.employeeCode === user.employeeCode) && a.date === selectedAttendanceDate
      );
      return {
        user,
        record: rec || {
          id: `att_placeholder_${user.id}`,
          employeeId: user.id,
          employeeCode: user.employeeCode,
          employeeName: user.fullName,
          designation: user.roleTitle,
          department: user.department,
          date: selectedAttendanceDate,
          status: 'ABSENT' as AttendanceStatus,
          workingHours: 0,
          location: user.territory,
          createdAt: new Date().toISOString(),
        },
      };
    }).filter(({ user, record }) => {
      const matchStatus = attendanceFilterStatus === 'ALL' || record.status === attendanceFilterStatus;
      const matchSearch =
        !attendanceSearch.trim() ||
        user.fullName.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        user.employeeCode.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        user.territory.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
        user.roleTitle.toLowerCase().includes(attendanceSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [usersList, attendanceRecords, selectedAttendanceDate, attendanceFilterStatus, attendanceSearch]);

  // Attendance Summary Stats
  const attendanceStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let fieldDuty = 0;
    let onLeave = 0;
    let absent = 0;

    usersList.forEach((u) => {
      const rec = attendanceRecords.find(
        (a) => (a.employeeId === u.id || a.employeeCode === u.employeeCode) && a.date === selectedAttendanceDate
      );
      if (!rec || rec.status === 'ABSENT') {
        absent++;
      } else if (rec.status === 'PRESENT') {
        present++;
      } else if (rec.status === 'LATE') {
        late++;
      } else if (rec.status === 'FIELD_DUTY') {
        fieldDuty++;
      } else if (rec.status === 'ON_LEAVE') {
        onLeave++;
      }
    });

    const activeTotal = usersList.length;
    const attended = present + late + fieldDuty;
    const attendanceRate = activeTotal > 0 ? Math.round((attended / activeTotal) * 100) : 0;

    return { total: activeTotal, present, late, fieldDuty, onLeave, absent, attendanceRate };
  }, [usersList, attendanceRecords, selectedAttendanceDate]);

  // Export Attendance CSV
  const handleExportAttendanceCsv = () => {
    const headers = [
      'Date',
      'Employee Code',
      'Full Name',
      'Designation / Role',
      'Department',
      'Region',
      'Territory / Beat',
      'Check-In Time',
      'Check-Out Time',
      'Duty Status',
      'Working Hours',
    ];

    const rows = filteredAttendance.map(({ user, record }) => [
      selectedAttendanceDate,
      user.employeeCode,
      `"${user.fullName}"`,
      `"${user.roleTitle}"`,
      user.department,
      user.region,
      `"${user.territory}"`,
      record.checkInTime || 'Not Checked In',
      record.checkOutTime || 'Duty in Progress',
      record.status,
      record.workingHours || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NationalLights_Attendance_${selectedAttendanceDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --------------------------------------------------------------------------
  // ADD EMPLOYEE & AUTO-CREDENTIALS GENERATOR STATE
  // --------------------------------------------------------------------------
  const [newEmpFullName, setNewEmpFullName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<UserRole>('TSM');
  const [newEmpDepartment, setNewEmpDepartment] = useState<'SALES_FIELD' | 'FINANCE_ACCOUNTS' | 'EXECUTIVE' | 'SUPPLY_CHAIN' | 'MANUFACTURING'>('SALES_FIELD');
  const [newEmpRegion, setNewEmpRegion] = useState('Karachi');
  const [newEmpArea, setNewEmpArea] = useState('Karachi South');
  const [newEmpTerritory, setNewEmpTerritory] = useState('Saddar & Electronic Market');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpSalesTarget, setNewEmpSalesTarget] = useState<number>(3500000);
  const [newEmpRecoveryTarget, setNewEmpRecoveryTarget] = useState<number>(3000000);
  const [newEmpShowPassword, setNewEmpShowPassword] = useState(false);
  const [newEmpCopied, setNewEmpCopied] = useState(false);
  const [newEmpSuccessBanner, setNewEmpSuccessBanner] = useState<string | null>(null);

  // Auto-calculated credentials
  const generatedCredentials = useMemo(() => {
    return generateAutoCredentials(newEmpFullName || 'New Officer', newEmpRole, usersList);
  }, [newEmpFullName, newEmpRole, usersList]);

  // Handle Add Employee Submit
  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpFullName.trim()) {
      alert('Please enter employee full name.');
      return;
    }
    const cleanPhone = newEmpPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      alert('Please enter a valid 10-11 digit WhatsApp / Mobile number for employee.');
      return;
    }

    const roleTitles: Record<string, string> = {
      TSM: `Territory Sales Manager (TSM) - ${newEmpTerritory}`,
      ZSM: `Zonal Sales Manager (ZSM) - ${newEmpArea}`,
      RSM: `Regional Sales Manager (RSM) - ${newEmpRegion}`,
      SUPER_ADMIN: 'Top Management / Super Admin',
      MANAGEMENT: 'Executive Management / Director',
      ACCOUNTS: 'Accounts & Finance Officer',
      SALES_RECOVERY: `Sales & Recovery Field Officer - ${newEmpTerritory}`,
    };

    const initials = newEmpFullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const createdUser: NLinkUser = {
      id: `USR-${Date.now()}`,
      employeeCode: generatedCredentials.employeeCode,
      fullName: newEmpFullName.trim(),
      email: generatedCredentials.email,
      phone: newEmpPhone.trim(),
      role: newEmpRole,
      roleTitle: roleTitles[newEmpRole] || `${newEmpRole} - ${newEmpTerritory}`,
      department: newEmpDepartment,
      region: newEmpRegion,
      area: newEmpArea,
      territory: newEmpTerritory,
      assignedTowns: [newEmpTerritory],
      assignedBeats: [`${newEmpTerritory} Beat 1`, `${newEmpTerritory} Beat 2`],
      monthlySalesTarget: newEmpSalesTarget,
      monthlyRecoveryTarget: newEmpRecoveryTarget,
      mtdSalesAchieved: 0,
      mtdRecoveryAchieved: 0,
      todaySalesAchieved: 0,
      todayRecoveryAchieved: 0,
      status: 'ACTIVE',
      avatarInitials: initials || 'NL',
    };

    // Update users list state
    setUsersList((prev) => [createdUser, ...prev]);

    // Parent callback if provided
    if (onAddUser) {
      onAddUser(createdUser);
    }

    // Automatically seed today's attendance record
    const newAtt: EmployeeAttendance = {
      id: `att_${createdUser.id}_${todayDateStr}`,
      employeeId: createdUser.id,
      employeeCode: createdUser.employeeCode,
      employeeName: createdUser.fullName,
      designation: createdUser.roleTitle,
      department: createdUser.department,
      date: todayDateStr,
      checkInTime: '09:00 AM',
      status: 'PRESENT',
      location: createdUser.territory,
      workingHours: 8,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    setAttendanceRecords((prev) => [newAtt, ...prev]);

    setNewEmpSuccessBanner(
      `Employee Added Successfully! ID: ${createdUser.employeeCode} | Username: ${generatedCredentials.email} | Password: ${generatedCredentials.password} (Synced with Google Sheets Roster)`
    );

    // Reset form
    setNewEmpFullName('');
    setNewEmpPhone('');
  };

  const handleCopyCredentials = () => {
    const credText = `National Lights - Employee System Access Credentials\nName: ${newEmpFullName || 'Employee'}\nEmployee ID: ${generatedCredentials.employeeCode}\nUsername / Email: ${generatedCredentials.email}\nSystem Username: ${generatedCredentials.username}\nPassword: ${generatedCredentials.password}\nRole: ${newEmpRole}\nTerritory: ${newEmpTerritory}, ${newEmpRegion}`;
    navigator.clipboard.writeText(credText);
    setNewEmpCopied(true);
    setTimeout(() => setNewEmpCopied(false), 3000);
  };

  // --------------------------------------------------------------------------
  // ROSTER FILTERING
  // --------------------------------------------------------------------------
  const uniqueRegions = useMemo(() => {
    return Array.from(new Set(usersList.map((u) => u.region).filter(Boolean)));
  }, [usersList]);

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchRegion = regionFilter === 'ALL' || u.region === regionFilter;
      const matchSearch =
        !searchQuery.trim() ||
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.territory.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRole && matchRegion && matchSearch;
    });
  }, [usersList, roleFilter, regionFilter, searchQuery]);

  const handleExportCsv = () => {
    const headers = [
      'Employee Code',
      'Full Name',
      'Role / Designation',
      'Department',
      'Email',
      'Phone',
      'Region',
      'Area',
      'Territory',
      'Reporting Manager',
      'Monthly Sales Target (PKR)',
      'Monthly Recovery Target (PKR)',
      'Status',
    ];

    const rows = filteredUsers.map((u) => [
      u.employeeCode,
      `"${u.fullName}"`,
      `"${u.roleTitle}"`,
      u.department,
      u.email,
      u.phone,
      u.region,
      `"${u.area}"`,
      `"${u.territory}"`,
      `"${u.reportingManagerName || 'Executive Board'}"`,
      u.monthlySalesTarget,
      u.monthlyRecoveryTarget,
      u.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NLink_User_Team_Roster_${todayDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="user-management-tab">
      {/* 1. Header Banner & Sub-Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Users className="w-3 h-3 mr-1 text-emerald-600" /> National Lights HR &amp; Field Force Command
              </span>
              <span className="text-xs text-slate-400 font-medium">Google Sheets Live 2-Way Synced</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">Field Force, Employee Attendance &amp; Credential Directory</h2>
            <p className="text-xs text-slate-500">
              4-Tier Reporting Hierarchy (1- TSM &gt; 2- ZSM &gt; 3- RSM &gt; 4- Top Management), Daily Attendance Register, &amp; Auto-Provisioning.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSubView('ADD_EMPLOYEE')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                activeSubView === 'ADD_EMPLOYEE'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Employee (Auto-ID &amp; Password)
            </button>
          </div>
        </div>

        {/* Sub-view Navigation Pill Bar */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveSubView('ROSTER')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubView === 'ROSTER'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Team Directory &amp; Roster ({usersList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('ATTENDANCE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubView === 'ATTENDANCE'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            Employee Attendance Register &amp; Punch
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold">
              {attendanceStats.attendanceRate}% Present
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('ADD_EMPLOYEE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeSubView === 'ADD_EMPLOYEE'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            Auto-Generate Credentials &amp; Provisioning
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: ATTENDANCE REGISTER & DUTY PUNCH                               */}
      {/* ========================================================================= */}
      {activeSubView === 'ATTENDANCE' && (
        <div className="space-y-6">
          {/* A. Current Active User Attendance Punch Card */}
          <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Live Duty Punch
                </span>
                <span className="text-xs text-slate-300">
                  {currentUser.fullName} ({currentUser.employeeCode}) - {currentUser.roleTitle}
                </span>
              </div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                {currentUserAttendance?.checkInTime ? (
                  <span>Checked In Today at <span className="text-emerald-400 font-mono">{currentUserAttendance.checkInTime}</span></span>
                ) : (
                  <span>Duty Not Yet Started For Today</span>
                )}
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Territory Beat: <strong>{currentUser.territory || `${currentUser.region} Beat`}</strong>
                {currentUserAttendance?.checkOutTime && (
                  <span className="ml-2 bg-slate-800/80 px-2 py-0.5 rounded text-[11px] text-amber-300">
                    Checked Out: {currentUserAttendance.checkOutTime}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleCheckInCurrentUser}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                Punch Check-In Now
              </button>

              <button
                type="button"
                onClick={handleCheckOutCurrentUser}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-700 active:scale-95"
              >
                <LogOut className="w-4 h-4 text-amber-400" />
                Punch Check-Out
              </button>
            </div>
          </div>

          {/* B. Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Staff</span>
              <span className="text-xl font-black text-slate-900">{attendanceStats.total}</span>
              <span className="text-[10px] text-slate-500 block">National Lights Team</span>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200/80 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-emerald-800 block">Present Today</span>
              <span className="text-xl font-black text-emerald-700">{attendanceStats.present}</span>
              <span className="text-[10px] text-emerald-600 block">Checked In &amp; Active</span>
            </div>

            <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200/80 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-blue-800 block">On Field Duty</span>
              <span className="text-xl font-black text-blue-700">{attendanceStats.fieldDuty}</span>
              <span className="text-[10px] text-blue-600 block">Dealer Visits / Route</span>
            </div>

            <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-amber-800 block">Late Check-In</span>
              <span className="text-xl font-black text-amber-700">{attendanceStats.late}</span>
              <span className="text-[10px] text-amber-600 block">After 09:15 AM</span>
            </div>

            <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200/80 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-purple-800 block">On Approved Leave</span>
              <span className="text-xl font-black text-purple-700">{attendanceStats.onLeave}</span>
              <span className="text-[10px] text-purple-600 block">Official Leave</span>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200/80 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-rose-800 block">Absent / Unmarked</span>
              <span className="text-xl font-black text-rose-700">{attendanceStats.absent}</span>
              <span className="text-[10px] text-rose-600 block">Rate: {attendanceStats.attendanceRate}%</span>
            </div>
          </div>

          {/* C. Filter & Action Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Attendance Date:</span>
                <input
                  type="date"
                  value={selectedAttendanceDate}
                  onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <select
                value={attendanceFilterStatus}
                onChange={(e) => setAttendanceFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Statuses ({usersList.length})</option>
                <option value="PRESENT">Present</option>
                <option value="FIELD_DUTY">Field Duty (TSM / Recovery)</option>
                <option value="LATE">Late</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="ABSENT">Absent / Unmarked</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by officer name, code, beat..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleExportAttendanceCsv}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Export Attendance CSV
              </button>
            </div>
          </div>

          {/* D. Full Attendance Register Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Officer &amp; Code</th>
                    <th className="py-3 px-4">Hierarchy Role &amp; Tier</th>
                    <th className="py-3 px-4">Territory / Beat</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Duty Status</th>
                    <th className="py-3 px-4 text-right">Admin Mark / Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAttendance.map(({ user, record }) => {
                    const isMe = user.id === currentUser.id;
                    return (
                      <tr key={user.id} className={`hover:bg-slate-50/60 transition-colors ${isMe ? 'bg-emerald-50/30' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                              {user.avatarInitials}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                                {user.fullName}
                                {isMe && (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                                    You
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500 font-semibold">{user.employeeCode}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">{user.roleTitle}</span>
                          <span className="text-[10px] text-slate-400 block">{user.department}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-slate-700 font-medium block">{user.territory}</span>
                          <span className="text-[10px] text-slate-400 block">{user.region}</span>
                        </td>

                        <td className="py-3 px-4">
                          {record.checkInTime ? (
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {record.checkInTime}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">--:--</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {record.checkOutTime ? (
                            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {record.checkOutTime}
                            </span>
                          ) : record.checkInTime ? (
                            <span className="text-emerald-600 font-semibold text-[11px] animate-pulse">On Duty</span>
                          ) : (
                            <span className="text-slate-400 italic">--:--</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {record.status === 'PRESENT' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              PRESENT
                            </span>
                          )}
                          {record.status === 'FIELD_DUTY' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                              FIELD DUTY
                            </span>
                          )}
                          {record.status === 'LATE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                              LATE
                            </span>
                          )}
                          {record.status === 'ON_LEAVE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              ON LEAVE
                            </span>
                          )}
                          {record.status === 'ABSENT' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                              ABSENT
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateEmployeeStatus(user.id, 'PRESENT')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                              title="Mark Present"
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateEmployeeStatus(user.id, 'FIELD_DUTY')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200"
                              title="Mark Field Duty"
                            >
                              Field
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateEmployeeStatus(user.id, 'ON_LEAVE')}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200"
                              title="Mark Leave"
                            >
                              Leave
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: ADD EMPLOYEE WITH AUTO USERNAME, ID & PASSWORD GENERATION     */}
      {/* ========================================================================= */}
      {activeSubView === 'ADD_EMPLOYEE' && (
        <div className="space-y-6">
          {newEmpSuccessBanner && (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl text-xs text-emerald-900 font-medium flex items-start justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">Employee Provisioned &amp; Credentials Generated</h4>
                  <p className="mt-0.5">{newEmpSuccessBanner}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewEmpSuccessBanner(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    New Field Officer / Employee Registration
                  </h3>
                  <p className="text-xs text-slate-500">
                    System automatically generates User ID, Login Email, Username, and Secure Password in real-time.
                  </p>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  Auto-Provisioning
                </span>
              </div>

              <form onSubmit={handleAddEmployeeSubmit} className="space-y-4">
                {/* Row 1: Full Name & WhatsApp Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Employee Full Name*
                    </label>
                    <input
                      type="text"
                      required
                      value={newEmpFullName}
                      onChange={(e) => setNewEmpFullName(e.target.value)}
                      placeholder="e.g. Salman Khan"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" /> WhatsApp Number*
                      </span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-extrabold uppercase">
                        Mandatory
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newEmpPhone}
                      onChange={(e) => setNewEmpPhone(e.target.value)}
                      placeholder="e.g. 0300 1234567"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Row 2: Role / Hierarchy Tier & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      System Hierarchy Role*
                    </label>
                    <select
                      value={newEmpRole}
                      onChange={(e) => setNewEmpRole(e.target.value as UserRole)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="TSM">1- TSM (Territory Sales Manager)</option>
                      <option value="ZSM">2- ZSM (Zonal Sales Manager)</option>
                      <option value="RSM">3- RSM (Regional Sales Manager)</option>
                      <option value="MANAGEMENT">4- TOP MANAGEMENT (Director)</option>
                      <option value="SUPER_ADMIN">4- TOP MANAGEMENT (Super Admin)</option>
                      <option value="ACCOUNTS">Accounts &amp; Credit Finance Officer</option>
                      <option value="SALES_RECOVERY">Sales &amp; Recovery Field Officer</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Department*
                    </label>
                    <select
                      value={newEmpDepartment}
                      onChange={(e) => setNewEmpDepartment(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="SALES_FIELD">Sales &amp; Field Force</option>
                      <option value="FINANCE_ACCOUNTS">Finance &amp; Accounts</option>
                      <option value="EXECUTIVE">Executive Management</option>
                      <option value="SUPPLY_CHAIN">Supply Chain &amp; Logistics</option>
                      <option value="MANUFACTURING">Manufacturing &amp; Quality</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Region, Area & Territory */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Region*</label>
                    <select
                      value={newEmpRegion}
                      onChange={(e) => setNewEmpRegion(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Karachi">Karachi Region</option>
                      <option value="Punjab Central">Punjab Central</option>
                      <option value="Punjab North">Punjab North</option>
                      <option value="Punjab South">Punjab South</option>
                      <option value="Sindh Rural">Sindh Rural</option>
                      <option value="KPK & Corridor">KPK &amp; Corridor</option>
                      <option value="National">National HQ</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Area Division*</label>
                    <input
                      type="text"
                      required
                      value={newEmpArea}
                      onChange={(e) => setNewEmpArea(e.target.value)}
                      placeholder="e.g. Karachi Central Zone"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Territory / Beat*</label>
                    <input
                      type="text"
                      required
                      value={newEmpTerritory}
                      onChange={(e) => setNewEmpTerritory(e.target.value)}
                      placeholder="e.g. Saddar &amp; Electronic Market"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Row 4: Targets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Monthly Sales Target (PKR)</label>
                    <input
                      type="number"
                      value={newEmpSalesTarget}
                      onChange={(e) => setNewEmpSalesTarget(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Monthly Recovery Target (PKR)</label>
                    <input
                      type="number"
                      value={newEmpRecoveryTarget}
                      onChange={(e) => setNewEmpRecoveryTarget(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Save &amp; Provision Employee (Push to Google Sheets)
                  </button>
                </div>
              </form>
            </div>

            {/* Right 1 Col: Live Auto-Generated Credentials Card */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 p-5 shadow-md flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="font-bold text-sm text-white">Auto-Generated Credentials</h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded">
                    LIVE
                  </span>
                </div>

                <div className="space-y-3 mt-3 text-xs">
                  {/* Generated Employee ID / Code */}
                  <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Auto Employee ID / Code:</span>
                    <span className="font-mono text-sm font-black text-emerald-400">
                      {generatedCredentials.employeeCode}
                    </span>
                  </div>

                  {/* Generated Username / Login Email */}
                  <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Login Email / Username:</span>
                    <span className="font-mono text-xs font-bold text-blue-300 break-all">
                      {generatedCredentials.email}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      System Username: <span className="text-white font-mono">{generatedCredentials.username}</span>
                    </span>
                  </div>

                  {/* Generated Password */}
                  <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Auto-Generated Password:</span>
                      <button
                        type="button"
                        onClick={() => setNewEmpShowPassword(!newEmpShowPassword)}
                        className="text-slate-400 hover:text-white"
                      >
                        {newEmpShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="font-mono text-xs font-black text-amber-300 tracking-wider">
                      {newEmpShowPassword ? generatedCredentials.password : '••••••••••••'}
                    </span>
                  </div>

                  {/* Google Sheets Sync Note */}
                  <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40 text-[11px] text-emerald-300">
                    <span className="font-bold block flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Google Sheets Integration:
                    </span>
                    This employee will automatically sync into the corporate "Users &amp; Team Data" spreadsheet tab upon saving.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyCredentials}
                className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                {newEmpCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-slate-950" />
                    Credentials Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-950" />
                    Copy Credentials (For Officer / WhatsApp)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: TEAM DIRECTORY & ROSTER                                        */}
      {/* ========================================================================= */}
      {activeSubView === 'ROSTER' && (
        <div className="space-y-6">
          {/* 2. Filter bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search officer name, code, email, territory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Roles / Hierarchy Tiers</option>
                <option value="SUPER_ADMIN">4 - Top Management (Super Admin)</option>
                <option value="MANAGEMENT">4 - Top Management (Executive)</option>
                <option value="RSM">3 - Regional Sales Manager (RSM)</option>
                <option value="ZSM">2 - Zonal Sales Manager (ZSM)</option>
                <option value="TSM">1 - Territory Sales Manager (TSM)</option>
                <option value="ACCOUNTS">Accounts &amp; Finance</option>
              </select>

              {/* Region Filter */}
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Regions</option>
                {uniqueRegions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* 3. Team User Cards / Roster */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUsers.map((user) => {
              const isMe = user.id === currentUser.id;
              const salesPct =
                user.monthlySalesTarget > 0 ? (user.mtdSalesAchieved / user.monthlySalesTarget) * 100 : 0;
              const recPct =
                user.monthlyRecoveryTarget > 0 ? (user.mtdRecoveryAchieved / user.monthlyRecoveryTarget) * 100 : 0;

              return (
                <div
                  key={user.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition-all hover:shadow-md ${
                    isMe ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200/80'
                  }`}
                >
                  {/* Top Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        {user.avatarInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{user.fullName}</h4>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Active Session
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{user.roleTitle}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {user.status}
                      </span>
                      <span className="block font-mono text-[10px] text-slate-400 mt-1 font-semibold">{user.employeeCode}</span>
                    </div>
                  </div>

                  {/* Territory & Hierarchy details */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center text-slate-600 gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        <strong>{user.region}:</strong> {user.territory}
                      </span>
                    </div>
                    <div className="flex items-center text-slate-600 gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-500">{user.email}</span>
                    </div>
                    <div className="flex items-center text-slate-600 gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">{user.phone}</span>
                    </div>
                    {user.reportingManagerName && (
                      <div className="flex items-center text-slate-600 gap-1.5 pt-1 border-t border-slate-200/60">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Reports to: <strong className="text-slate-800">{user.reportingManagerName}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Target vs Achievement Metrics */}
                  {user.monthlySalesTarget > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-semibold text-emerald-800 uppercase block">Sales MTD</span>
                        <span className="font-bold text-slate-900 text-xs">
                          Rs. {(user.mtdSalesAchieved / 1000000).toFixed(2)}M
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold block">{salesPct.toFixed(0)}% Target</span>
                      </div>

                      <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                        <span className="text-[10px] font-semibold text-blue-800 uppercase block">Rec MTD</span>
                        <span className="font-bold text-slate-900 text-xs">
                          Rs. {(user.mtdRecoveryAchieved / 1000000).toFixed(2)}M
                        </span>
                        <span className="text-[10px] text-blue-700 font-bold block">{recPct.toFixed(0)}% Target</span>
                      </div>
                    </div>
                  )}

                  {/* Fast switch button */}
                  {onSelectUserToImpersonate && !isMe && (
                    <button
                      type="button"
                      onClick={() => onSelectUserToImpersonate(user)}
                      className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Switch Role / View as {user.fullName}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
