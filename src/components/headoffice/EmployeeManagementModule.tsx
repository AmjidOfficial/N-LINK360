/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Department 1: Employee Management, Identity & Access Control
 * National Lights (Pvt.) Ltd. - Peshawar Head Office
 */

import React, { useState, useMemo } from 'react';
import {
  Users2,
  UserPlus,
  Search,
  ShieldCheck,
  Key,
  Copy,
  CheckCircle2,
  X,
  Edit3,
  RefreshCw,
  ShieldAlert,
  Lock,
  Unlock,
  Mail,
} from 'lucide-react';
import {
  NLinkUser,
  getStoredUsers,
  saveStoredUsers,
  generateAutoCredentials,
  autoCreateNationalLightEmail,
  generateCryptographicInitialPassword,
} from '../../data/nlink-users-team';
import { UserRole, PasswordRecoveryRequest } from '../../types';
import { getEffectivePermissionGroup } from '../../lib/permissions';
import {
  getAuditLogs,
  logAuditEvent,
  getPasswordRecoveryRequests,
  resolvePasswordRecoveryRequest,
} from '../../services/auditLog';
import { safeApiFetch } from '../../lib/safeFetch';
import { setClientCredentialHash } from '../../services/auth';

interface EmployeeManagementModuleProps {
  currentUser: NLinkUser;
}

const ROLE_OPTIONS: Array<{ role: UserRole; title: string; dept: NLinkUser['department'] }> = [
  { role: 'SALES_RECOVERY', title: 'Sales Officer (SO)', dept: 'SALES_FIELD' },
  { role: 'SS', title: 'Sales Supervisor (SS)', dept: 'SALES_FIELD' },
  { role: 'TSM', title: 'Territory Manager (TSM)', dept: 'SALES_FIELD' },
  { role: 'ZSM', title: 'Zonal Sales Manager (ZSM)', dept: 'SALES_FIELD' },
  { role: 'RSM', title: 'Regional Sales Manager (RSM)', dept: 'SALES_FIELD' },
  { role: 'ACCOUNTS', title: 'Accounts & Finance Officer', dept: 'FINANCE_ACCOUNTS' },
  { role: 'WAREHOUSE_MANAGER', title: 'Warehouse & Inventory Manager', dept: 'SUPPLY_CHAIN' },
  { role: 'FACTORY_MANAGER', title: 'Packing & Production Manager', dept: 'MANUFACTURING' },
  { role: 'DISPATCH_OFFICER', title: 'Dispatch & Logistics Officer', dept: 'SUPPLY_CHAIN' },
  { role: 'MANAGEMENT', title: 'HR & Administration Manager', dept: 'EXECUTIVE' },
  { role: 'SUPER_ADMIN', title: 'Director / Super Admin', dept: 'EXECUTIVE' },
];

export const EmployeeManagementModule: React.FC<EmployeeManagementModuleProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<NLinkUser[]>(() => getStoredUsers());
  const [recoveryRequests, setRecoveryRequests] = useState<PasswordRecoveryRequest[]>(() => getPasswordRecoveryRequests());
  const [subTab, setSubTab] = useState<'DIRECTORY' | 'RECOVERY_REQUESTS' | 'PERMISSIONS' | 'AUDIT'>('DIRECTORY');

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<NLinkUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Add / Edit form state
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState<NLinkUser['department']>('SALES_FIELD');
  const [role, setRole] = useState<UserRole>('SALES_RECOVERY');
  const [roleTitle, setRoleTitle] = useState('Sales Officer (SO)');
  const [phone, setPhone] = useState('+92 300 ');
  const [region, setRegion] = useState('KPK');
  const [zone, setZone] = useState('KPK Central');
  const [area, setArea] = useState('Peshawar Region');
  const [territory, setTerritory] = useState('Peshawar City');
  const [town, setTown] = useState('Peshawar');
  const [reportingTo, setReportingTo] = useState('Shahzad Ullah');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'ACTIVE' | 'ON_LEAVE' | 'INACTIVE'>('ACTIVE');

  // One-time credentials reveal modal
  const [credentialsModal, setCredentialsModal] = useState<{
    mode: 'CREATED' | 'RESET';
    fullName: string;
    email: string;
    employeeCode: string;
    password: string;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [notice, setNotice] = useState('');

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.employeeCode.toLowerCase().includes(q) ||
        (u.territory || '').toLowerCase().includes(q);
      const matchesDept = departmentFilter === 'ALL' || u.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [users, searchQuery, departmentFilter]);

  const employeeAuditLogs = useMemo(() => {
    return getAuditLogs()
      .filter((a) => a.module === 'EMPLOYEES' || a.module === 'AUTH')
      .slice(0, 50);
  }, [users, recoveryRequests, notice, subTab]);

  const pendingRecoveryCount = recoveryRequests.filter((r) => r.status === 'PENDING_ADMIN_REVIEW').length;

  const resetForm = () => {
    setFullName('');
    setDepartment('SALES_FIELD');
    setRole('SALES_RECOVERY');
    setRoleTitle('Sales Officer (SO)');
    setPhone('+92 300 ');
    setRegion('KPK');
    setZone('KPK Central');
    setArea('Peshawar Region');
    setTerritory('Peshawar City');
    setTown('Peshawar');
    setReportingTo('Shahzad Ullah');
    setJoiningDate(new Date().toISOString().slice(0, 10));
    setStatus('ACTIVE');
  };

  const openEditModal = (u: NLinkUser) => {
    setEditingUser(u);
    setFullName(u.fullName);
    setDepartment(u.department);
    setRole(u.role);
    setRoleTitle(u.roleTitle);
    setPhone(u.phone);
    setRegion(u.region || 'KPK');
    setZone(u.zone || u.area || 'KPK Central');
    setArea(u.area || 'Peshawar Region');
    setTerritory(u.territory || 'Peshawar City');
    setTown(u.assignedTowns?.join(', ') || 'Peshawar');
    setReportingTo(u.reportingTo || 'Shahzad Ullah');
    setJoiningDate(u.joiningDate || new Date().toISOString().slice(0, 10));
    setStatus(u.status);
  };

  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSubmitting(true);

    try {
      const { employeeCode, email, password } = generateAutoCredentials(fullName, role, users);
      const assignedTownsList = town
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const newUser: NLinkUser = {
        id: `usr_${Date.now()}`,
        employeeCode,
        fullName: fullName.trim(),
        email,
        phone: phone.trim() || '+92 300 0000000',
        role,
        roleTitle,
        permissionGroup: getEffectivePermissionGroup(role),
        department,
        region,
        zone,
        area,
        territory,
        assignedTowns: assignedTownsList.length > 0 ? assignedTownsList : ['Peshawar'],
        assignedBeats: [`${assignedTownsList[0] || 'Peshawar'} Main Beat`],
        reportingTo: reportingTo.trim() || 'Shahzad Ullah',
        joiningDate,
        monthlySalesTarget: 5000000,
        monthlyRecoveryTarget: 4000000,
        mtdSalesAchieved: 0,
        mtdRecoveryAchieved: 0,
        todaySalesAchieved: 0,
        todayRecoveryAchieved: 0,
        status,
        mustChangePassword: true,
        initialPasswordStatus: 'ISSUED_CHANGE_REQUIRED',
        avatarInitials: fullName
          .trim()
          .split(/\s+/)
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
      };

      let effectivePassword = password;
      // Server provisioning (hashes password cleanly & prevents plaintext storage)
      const apiRes = await safeApiFetch<any>('/api/employees/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newUser.id,
          employeeCode: newUser.employeeCode,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
          roleTitle: newUser.roleTitle,
          department: newUser.department,
          phone: newUser.phone,
          initialPassword: password,
          createdBy: currentUser.fullName,
        }),
      });
      if (!apiRes.isStaticFallback && apiRes.data?.oneTimeInitialPassword) {
        effectivePassword = apiRes.data.oneTimeInitialPassword;
      }
      await setClientCredentialHash(newUser.email, effectivePassword, true);

      const updated = [newUser, ...users];
      setUsers(updated);
      saveStoredUsers(updated);

      logAuditEvent({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userEmail: currentUser.email,
        action: 'EMPLOYEE_CREATED',
        module: 'EMPLOYEES',
        recordType: 'Employee',
        recordId: newUser.employeeCode,
        details: `Provisioned ${newUser.fullName} (${newUser.email}) as ${newUser.roleTitle}. Admin notification sent to nationallights2026@gmail.com.`,
      });

      setCredentialsModal({
        mode: 'CREATED',
        fullName: newUser.fullName,
        email: newUser.email,
        employeeCode: newUser.employeeCode,
        password: effectivePassword,
      });

      setNotice(
        `Employee created: ${newUser.email} (${newUser.employeeCode}). Central mailbox nationallights2026@gmail.com notified.`
      );
      resetForm();
      setIsAddModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !fullName.trim()) return;

    const assignedTownsList = town
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const updated = users.map((u) =>
      u.id === editingUser.id
        ? {
            ...u,
            fullName: fullName.trim(),
            department,
            role,
            roleTitle,
            permissionGroup: getEffectivePermissionGroup(role),
            phone: phone.trim(),
            region,
            zone,
            area,
            territory,
            assignedTowns: assignedTownsList.length > 0 ? assignedTownsList : u.assignedTowns,
            reportingTo: reportingTo.trim(),
            joiningDate,
            status,
          }
        : u
    );

    setUsers(updated);
    saveStoredUsers(updated);
    logAuditEvent({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userEmail: currentUser.email,
      action: 'EMPLOYEE_UPDATED',
      module: 'EMPLOYEES',
      recordType: 'Employee',
      recordId: editingUser.employeeCode,
      details: `Updated profile/hierarchy for ${fullName.trim()} (${editingUser.email}) — Role: ${roleTitle}, Territory: ${territory}`,
    });
    setNotice(`Updated employee profile for ${fullName.trim()}.`);
    setEditingUser(null);
    resetForm();
  };

  const handleAdminPasswordReset = async (targetUser: NLinkUser, recoveryReqId?: string) => {
    let tempPassword = generateCryptographicInitialPassword(14);
    const apiRes = await safeApiFetch<any>('/api/employees/admin-reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: targetUser.email,
        fullName: targetUser.fullName,
        temporaryPassword: tempPassword,
        resetBy: currentUser.fullName,
        recoveryRequestId: recoveryReqId,
      }),
    });
    if (!apiRes.isStaticFallback && apiRes.data?.oneTimeTemporaryPassword) {
      tempPassword = apiRes.data.oneTimeTemporaryPassword;
    }
    await setClientCredentialHash(targetUser.email, tempPassword, true);

    const updatedUsers = users.map((u) =>
      u.id === targetUser.id
        ? {
            ...u,
            mustChangePassword: true,
            initialPasswordStatus: 'RESET_REQUIRED' as const,
            accountLocked: false,
            passwordUpdatedAt: new Date().toISOString(),
          }
        : u
    );
    setUsers(updatedUsers);
    saveStoredUsers(updatedUsers);

    if (recoveryReqId) {
      const nextReqs = resolvePasswordRecoveryRequest(
        recoveryReqId,
        'RESET_ISSUED',
        currentUser.fullName,
        'Temporary password generated by admin; forced change enabled.'
      );
      setRecoveryRequests(nextReqs);
    }

    logAuditEvent({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userEmail: currentUser.email,
      action: 'ADMIN_PASSWORD_RESET',
      module: 'AUTH',
      recordType: 'Employee',
      recordId: targetUser.employeeCode,
      details: `Temporary password issued for ${targetUser.email}. Force change on next login enabled.`,
    });

    setCredentialsModal({
      mode: 'RESET',
      fullName: targetUser.fullName,
      email: targetUser.email,
      employeeCode: targetUser.employeeCode,
      password: tempPassword,
    });
    setNotice(`Temporary password generated for ${targetUser.email}. Employee must change it on next login.`);
  };

  const handleToggleStatus = (user: NLinkUser) => {
    const nextStatus: 'ACTIVE' | 'INACTIVE' = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = users.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u));
    setUsers(updated);
    saveStoredUsers(updated);

    logAuditEvent({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userEmail: currentUser.email,
      action: nextStatus === 'ACTIVE' ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
      module: 'EMPLOYEES',
      recordType: 'Employee',
      recordId: user.employeeCode,
      details: `${user.fullName} (${user.email}) status changed to ${nextStatus}`,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2500);
  };

  const previewIdentity = fullName.trim() ? autoCreateNationalLightEmail(fullName, users) : 'name@nationallight.pk';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Department 1 &middot; Identity &amp; Access Management
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            Employee Management &amp; N-LINK Credentials
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Unique <span className="font-mono">@nationallight.pk</span> provisioning, cryptographic initial passwords, and unified field permissions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'DIRECTORY', label: `Directory (${users.length})` },
            { id: 'RECOVERY_REQUESTS', label: `Recovery Queue (${pendingRecoveryCount})` },
            { id: 'PERMISSIONS', label: 'Role & Permission Matrix' },
            { id: 'AUDIT', label: `Identity Audit (${employeeAuditLogs.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              subTab === t.id
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notice */}
      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice('')} className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* DIRECTORY TAB */}
      {subTab === 'DIRECTORY' && (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID, identity, territory..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'EXECUTIVE', 'SALES_FIELD', 'FINANCE_ACCOUNTS', 'SUPPLY_CHAIN', 'MANUFACTURING'].map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setDepartmentFilter(dept)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    departmentFilter === dept
                      ? 'bg-[#0B132B] dark:bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {dept === 'ALL' ? 'All' : dept.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">N-LINK Identity</th>
                    <th className="py-3 px-4">Role &amp; Permission Group</th>
                    <th className="py-3 px-4">Hierarchy / Territory</th>
                    <th className="py-3 px-4">Password &amp; Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        No employees match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const permGroup = u.permissionGroup || getEffectivePermissionGroup(u.role);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {u.avatarInitials || 'NL'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">{u.fullName}</div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {u.employeeCode} &middot; {u.phone}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                            {u.email}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{u.roleTitle}</div>
                            <div className="text-[11px] text-slate-500">
                              {u.department.replace(/_/g, ' ')} &middot; <span className="font-mono">{permGroup}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 dark:text-slate-200">
                              {u.territory} &middot; {u.region}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Reports to: {u.reportingTo || 'Shahzad Ullah'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className={`font-semibold ${u.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {u.status}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {u.mustChangePassword ? 'Change Required' : u.initialPasswordStatus || 'VERIFIED'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(u)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                                title="Edit Employee Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAdminPasswordReset(u)}
                                className="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                                title="Issue One-Time Temporary Password"
                              >
                                <Key className="w-3.5 h-3.5" />
                                <span>Reset Pass</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                className={`px-2.5 py-1.5 rounded-lg border font-semibold text-[11px] flex items-center gap-1 cursor-pointer ${
                                  u.status === 'ACTIVE'
                                    ? 'border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                    : 'border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                }`}
                              >
                                {u.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                <span>{u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* PASSWORD RECOVERY QUEUE TAB */}
      {subTab === 'RECOVERY_REQUESTS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Admin-Assisted Password Recovery Queue
              </h3>
              <p className="text-xs text-slate-500">
                Requests logged by <span className="font-mono">nationallights2026@gmail.com</span>. Plaintext passwords are never emailed.
              </p>
            </div>
          </div>
          {recoveryRequests.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              No password recovery requests submitted.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recoveryRequests.map((req) => {
                const matchedEmp = users.find(
                  (u) =>
                    u.email.toLowerCase() === req.identifier.toLowerCase() ||
                    u.employeeCode.toLowerCase() === req.identifier.toLowerCase()
                );
                return (
                  <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {matchedEmp?.fullName || req.employeeName || req.identifier}
                        <span className="ml-2 font-mono text-emerald-600 dark:text-emerald-400">{req.identifier}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Ref #{req.id} &middot; {req.requestedAt.slice(0, 16).replace('T', ' ')} &middot; Mailbox: {req.notifiedMailbox}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {req.status}
                      </span>
                      {req.status === 'PENDING_ADMIN_REVIEW' && matchedEmp && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAdminPasswordReset(matchedEmp, req.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                          >
                            Issue Temporary Password
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = resolvePasswordRecoveryRequest(req.id, 'DECLINED', currentUser.fullName, 'Verification declined by admin.');
                              setRecoveryRequests(next);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 font-semibold cursor-pointer"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PERMISSION MATRIX TAB */}
      {subTab === 'PERMISSIONS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <h3 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">
              Section 6 Operational Equality Rule: FIELD_SALES_USER
            </h3>
            <p className="text-emerald-800 dark:text-emerald-200 mt-1 leading-relaxed">
              Territory Manager (TSM), Sales Supervisor (SS), and Sales Officer (OB / SALES_RECOVERY) share the exact same underlying permission group (<strong>FIELD_SALES_USER</strong>). Job titles are displayed on profiles without creating separate access restrictions. Sole executive approval authority remains exclusively with <strong>Shahzad Ullah</strong>.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">FIELD_SALES_USER</div>
              <div className="text-[11px] text-slate-500">Applies to: TSM, Sales Supervisor, Sales Officer</div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300 pt-2">
                <li>✓ Attendance &amp; GPS Check-In / Out</li>
                <li>✓ Dealer Registration Proposals</li>
                <li>✓ Book Sales Orders &amp; Log Recoveries</li>
                <li>✗ Cannot self-approve or post invoices</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">HEAD_OFFICE_OPERATIONS</div>
              <div className="text-[11px] text-slate-500">Applies to: Warehouse, Packing, Accounts, Dispatch</div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300 pt-2">
                <li>✓ Inventory &amp; Stock Adjustments</li>
                <li>✓ Packing Verification (APPROVED → PACKED)</li>
                <li>✓ Invoice Generation (15% Less, PACKED → INVOICED)</li>
                <li>✓ Dispatch &amp; POD Delivery Confirmation</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">EXECUTIVE_APPROVER</div>
              <div className="text-[11px] text-slate-500">Applies to: Shahzad Ullah (Executive Director)</div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300 pt-2">
                <li>✓ Sole Approval of Orders, Recoveries &amp; Dealers</li>
                <li>✓ Employee Provisioning &amp; Password Resets</li>
                <li>✓ Ledger Reversals, Adjustments &amp; Audit Reports</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* IDENTITY AUDIT TAB */}
      {subTab === 'AUDIT' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employeeAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400">
                      No identity or authentication audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  employeeAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {(log.timestamp || log.createdAt).slice(0, 19).replace('T', ' ')}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {log.userName || log.userEmail || 'System'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD OR EDIT EMPLOYEE MODAL */}
      {(isAddModalOpen || editingUser) && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingUser ? `Edit Employee · ${editingUser.employeeCode}` : 'Add Employee & Provision N-LINK ID'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingUser ? editingUser.email : 'Generates unique @nationallight.pk login & cryptographic initial password.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingUser ? handleSaveEditEmployee : handleAddEmployeeSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ahmed Khan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
                {!editingUser && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    Generated Identity: <span className="text-emerald-500 font-bold">{previewIdentity}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Designation / Role</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setRole(nextRole);
                      const found = ROLE_OPTIONS.find((opt) => opt.role === nextRole);
                      if (found) {
                        setRoleTitle(found.title);
                        setDepartment(found.dept);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.role} value={opt.role}>
                        {opt.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as NLinkUser['department'])}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  >
                    <option value="SALES_FIELD">Sales &amp; Field Force</option>
                    <option value="EXECUTIVE">Executive &amp; HR</option>
                    <option value="FINANCE_ACCOUNTS">Accounts &amp; Finance</option>
                    <option value="SUPPLY_CHAIN">Warehouse &amp; Dispatch</option>
                    <option value="MANUFACTURING">Packing &amp; Production</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Contact Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Region</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Zone</label>
                  <input
                    type="text"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Territory</label>
                  <input
                    type="text"
                    value={territory}
                    onChange={(e) => setTerritory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Towns</label>
                  <input
                    type="text"
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                    placeholder="Peshawar, Mardan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Reporting Manager</label>
                  <input
                    type="text"
                    value={reportingTo}
                    onChange={(e) => setReportingTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Employment Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-900 dark:text-amber-200">
                  Generates a 14-character cryptographic initial password displayed ONCE with Copy. Employee must change it on first login.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2.5 px-5 rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>{editingUser ? 'Save Employee Changes' : 'Create Employee & Generate ID'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONE-TIME INITIAL / RESET CREDENTIAL MODAL */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-500/50 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="text-center space-y-1.5">
              <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {credentialsModal.mode === 'CREATED' ? 'Employee Account Provisioned' : 'Temporary Password Issued'}
              </h3>
              <p className="text-xs text-slate-500">
                Shown ONCE for <strong className="text-slate-800 dark:text-slate-200">{credentialsModal.fullName}</strong>. Copy now; it will not be shown again.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Employee ID:</span>
                <span className="font-bold text-slate-900 dark:text-white">{credentialsModal.employeeCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">N-LINK Identity:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{credentialsModal.email}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-400">{credentialsModal.mode === 'CREATED' ? 'Initial Password:' : 'Temp Password:'}</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 select-all">{credentialsModal.password}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `N-LINK Identity: ${credentialsModal.email}\nEmployee ID: ${credentialsModal.employeeCode}\nTemporary Password: ${credentialsModal.password}\n(Change required upon login)`
                  )
                }
                className="flex-1 btn-primary py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedPass ? 'Copied!' : 'Copy Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCredentialsModal(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
