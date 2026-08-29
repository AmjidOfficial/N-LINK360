/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Dynamic Role, User & Hierarchy Management
 * Head Office Complete Control Center
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Users,
  Building2,
  Check,
  Edit2,
  Trash2,
  Save,
  MapPin,
  Lock,
  ChevronRight,
  Sparkles,
  Layers,
  AlertCircle
} from 'lucide-react';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, Permission, setCustomRolePermissions } from '../lib/permissions';
import { User, UserRole } from '../types';

interface RoleAndHierarchyManagementTabProps {
  currentUser: User;
  users?: User[];
  onAddUser?: (user: Partial<User>) => void;
  onUpdateUser?: (userId: string, updates: Partial<User>) => void;
}

interface CustomRoleDef {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
}

interface HierarchyNode {
  id: string;
  name: string;
  type: 'REGION' | 'ZONE' | 'AREA' | 'TERRITORY' | 'TOWN' | 'ROUTE';
  parentId?: string;
  assignedManager?: string;
}

export const RoleAndHierarchyManagementTab: React.FC<RoleAndHierarchyManagementTabProps> = ({
  currentUser,
  users = [],
  onAddUser,
  onUpdateUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ROLES' | 'USERS' | 'HIERARCHY'>('ROLES');

  // Custom Roles state
  const [rolesList, setRolesList] = useState<CustomRoleDef[]>([
    {
      id: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'Unrestricted full system and enterprise control',
      permissions: ALL_PERMISSIONS.map((p) => p.key),
      isSystem: true,
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'MANAGEMENT',
      name: 'Management & Directors',
      description: 'Executive dashboards, financial audit, and enterprise reporting',
      permissions: DEFAULT_ROLE_PERMISSIONS.MANAGEMENT,
      isSystem: true,
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'SALES_MANAGER',
      name: 'Sales Manager',
      description: 'Territory supervision, order approvals, and sales force monitoring',
      permissions: DEFAULT_ROLE_PERMISSIONS.SALES_MANAGER,
      isSystem: true,
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'SALES_RECOVERY',
      name: 'Sales & Recovery Officer (OB)',
      description: 'Mobile field booking, collection receipts, and customer visits',
      permissions: DEFAULT_ROLE_PERMISSIONS.SALES_RECOVERY,
      isSystem: true,
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'ACCOUNTS',
      name: 'Finance & Accounts',
      description: 'Customer ledgers, invoice posting, and recovery verification',
      permissions: DEFAULT_ROLE_PERMISSIONS.ACCOUNTS,
      isSystem: true,
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'WAREHOUSE_MANAGER',
      name: 'Warehouse In-Charge',
      description: 'Stock transactions, warehouse balances, and dispatches',
      permissions: DEFAULT_ROLE_PERMISSIONS.WAREHOUSE_MANAGER,
      isSystem: true,
      createdAt: '2026-08-01T00:00:00Z',
    },
  ]);

  // Selected or New Role editor state
  const [selectedRole, setSelectedRole] = useState<CustomRoleDef>(rolesList[0]);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState<Permission[]>(['dashboard.view', 'sales.customers']);

  // Employee creation state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<string>('SALES_RECOVERY');
  const [newUserDepartment, setNewUserDepartment] = useState('Sales & Distribution');
  const [newUserTerritory, setNewUserTerritory] = useState('Lahore Central');

  // Hierarchy state
  const [hierarchyNodes, setHierarchyNodes] = useState<HierarchyNode[]>([
    { id: 'h-1', name: 'National Lights Pakistan (HQ)', type: 'REGION' },
    { id: 'h-2', name: 'Punjab North Zone', type: 'ZONE', parentId: 'h-1', assignedManager: 'Tariq Butt' },
    { id: 'h-3', name: 'Lahore Metropolitan Area', type: 'AREA', parentId: 'h-2', assignedManager: 'Tariq Butt' },
    { id: 'h-4', name: 'Lahore Central Territory', type: 'TERRITORY', parentId: 'h-3', assignedManager: 'Rashid Ali' },
    { id: 'h-5', name: 'Brandreth Road Town', type: 'TOWN', parentId: 'h-4' },
    { id: 'h-6', name: 'Shah Alam Market Route A', type: 'ROUTE', parentId: 'h-5' },
    { id: 'h-7', name: 'Khyber Pakhtunkhwa Zone', type: 'ZONE', parentId: 'h-1', assignedManager: 'Amjid Khan' },
    { id: 'h-8', name: 'Peshawar City Territory', type: 'TERRITORY', parentId: 'h-7', assignedManager: 'Farooq Shah' },
  ]);

  const [newHierarchyName, setNewHierarchyName] = useState('');
  const [newHierarchyType, setNewHierarchyType] = useState<HierarchyNode['type']>('TOWN');
  const [newHierarchyParent, setNewHierarchyParent] = useState<string>('h-4');

  // Group permissions by category
  const permissionGroups = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.group)));

  const handleTogglePermission = (perm: Permission) => {
    if (isCreatingRole) {
      if (newRolePermissions.includes(perm)) {
        setNewRolePermissions(newRolePermissions.filter((p) => p !== perm));
      } else {
        setNewRolePermissions([...newRolePermissions, perm]);
      }
    } else {
      if (selectedRole.isSystem && selectedRole.id === 'SUPER_ADMIN') {
        alert('Super Admin permissions are fixed and cannot be modified.');
        return;
      }
      const updatedPerms = selectedRole.permissions.includes(perm)
        ? selectedRole.permissions.filter((p) => p !== perm)
        : [...selectedRole.permissions, perm];

      const updated = { ...selectedRole, permissions: updatedPerms };
      setSelectedRole(updated);
      const newRoles = rolesList.map((r) => (r.id === selectedRole.id ? updated : r));
      setRolesList(newRoles);

      // Sync with global runtime
      const roleDict: Record<string, Permission[]> = {};
      newRoles.forEach((r) => {
        roleDict[r.id] = r.permissions;
      });
      setCustomRolePermissions(roleDict);
    }
  };

  const handleSaveNewRole = () => {
    if (!newRoleName.trim()) {
      alert('Please provide a valid Role Name.');
      return;
    }
    const roleId = newRoleName.toUpperCase().replace(/\s+/g, '_');
    const newRole: CustomRoleDef = {
      id: roleId,
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || 'Custom Head Office Role',
      permissions: newRolePermissions,
      isSystem: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [...rolesList, newRole];
    setRolesList(updated);
    setSelectedRole(newRole);
    setIsCreatingRole(false);
    setNewRoleName('');
    setNewRoleDesc('');

    // Sync
    const roleDict: Record<string, Permission[]> = {};
    updated.forEach((r) => {
      roleDict[r.id] = r.permissions;
    });
    setCustomRolePermissions(roleDict);

    alert(`Role "${newRole.name}" created successfully and registered in system RBAC.`);
  };

  const handleCreateEmployee = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      alert('Please provide employee name and official email address.');
      return;
    }
    const createdUser: Partial<User> = {
      id: `usr-${Date.now()}`,
      fullName: newUserName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim() || '+92 300 0000000',
      role: newUserRole as UserRole,
      branchId: 'b-1',
      branchName: newUserTerritory,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    onAddUser?.(createdUser);
    setIsAddUserOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    alert(`Employee "${createdUser.fullName}" assigned role ${newUserRole} and added to active directory.`);
  };

  const handleAddHierarchyNode = () => {
    if (!newHierarchyName.trim()) {
      alert('Please enter a territory or route name.');
      return;
    }
    const newNode: HierarchyNode = {
      id: `h-${Date.now()}`,
      name: newHierarchyName.trim(),
      type: newHierarchyType,
      parentId: newHierarchyParent,
    };
    setHierarchyNodes([...hierarchyNodes, newNode]);
    setNewHierarchyName('');
    alert(`Hierarchy level "${newNode.name}" added successfully.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 p-4 sm:p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">Head Office User, Role & Hierarchy Management</h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Create dynamic roles, assign granular permissions, manage organizational routes and register field personnel.
            </p>
          </div>
        </div>

        {/* Sub-Tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-950/80 p-1 border border-slate-700 overflow-x-auto max-w-full scrollbar-none shrink-0">
          <button
            onClick={() => setActiveSubTab('ROLES')}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              activeSubTab === 'ROLES' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Roles & Permissions
          </button>
          <button
            onClick={() => setActiveSubTab('USERS')}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              activeSubTab === 'USERS' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            Employees ({users.length || 5})
          </button>
          <button
            onClick={() => setActiveSubTab('HIERARCHY')}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 sm:px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              activeSubTab === 'HIERARCHY' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            Territory Hierarchy
          </button>
        </div>
      </div>

      {/* 1. ROLES & PERMISSIONS TAB */}
      {activeSubTab === 'ROLES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Roles List Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Configured Roles</h3>
              <button
                onClick={() => {
                  setIsCreatingRole(true);
                  setNewRoleName('');
                  setNewRoleDesc('');
                  setNewRolePermissions(['dashboard.view']);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                + Create Role
              </button>
            </div>

            <div className="space-y-2">
              {rolesList.map((role) => {
                const isSelected = !isCreatingRole && selectedRole.id === role.id;
                return (
                  <div
                    key={role.id}
                    onClick={() => {
                      setSelectedRole(role);
                      setIsCreatingRole(false);
                    }}
                    className={`cursor-pointer rounded-2xl p-4 transition-all border ${
                      isSelected
                        ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{role.name}</h4>
                          {role.isSystem ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                              SYSTEM
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              CUSTOM
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{role.description}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {role.permissions.length} perms
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permissions Matrix & Editor */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              {isCreatingRole ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Define New Head Office Role</h3>
                      <p className="text-xs text-slate-500">Configure role attributes and assign permissions below.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsCreatingRole(false)}
                        className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNewRole}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save & Register Role
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase">Role Name *</label>
                      <input
                        type="text"
                        placeholder="e.g., Regional Audit Officer"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase">Description</label>
                      <input
                        type="text"
                        placeholder="Brief summary of duties and responsibilities"
                        value={newRoleDesc}
                        onChange={(e) => setNewRoleDesc(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">{selectedRole.name}</h3>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        {selectedRole.permissions.length} Granted
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedRole.description}</p>
                  </div>
                  {selectedRole.id !== 'SUPER_ADMIN' && (
                    <p className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      ✓ Changes to checkboxes auto-save to RBAC
                    </p>
                  )}
                </div>
              )}

              {/* Granular Permission Checkbox Matrix */}
              <div className="space-y-6">
                {permissionGroups.map((group) => {
                  const perms = ALL_PERMISSIONS.filter((p) => p.group === group);
                  const activePerms = isCreatingRole ? newRolePermissions : selectedRole.permissions;

                  return (
                    <div key={group} className="space-y-2.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">{group}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {perms.map((perm) => {
                          const isChecked = activePerms.includes(perm.key);
                          const isDisabled = selectedRole.id === 'SUPER_ADMIN' && !isCreatingRole;

                          return (
                            <label
                              key={perm.key}
                              onClick={() => !isDisabled && handleTogglePermission(perm.key)}
                              className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer select-none ${
                                isChecked
                                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold shadow-xs'
                                  : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                              } ${isDisabled ? 'opacity-80 cursor-not-allowed' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => {}}
                                className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <div className="min-w-0">
                                <p className="text-xs leading-tight">{perm.label}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{perm.key}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. EMPLOYEES & USERS DIRECTORY TAB */}
      {activeSubTab === 'USERS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">National Lights Active Personnel Directory</h3>
              <p className="text-xs text-slate-500">
                Staff members, assigned dynamic roles, territory assignments and official contact codes.
              </p>
            </div>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" />
              + Add New Employee
            </button>
          </div>

          {/* Add Employee Modal */}
          {isAddUserOpen && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                <h4 className="text-sm font-black text-slate-900">Register New Staff Member & Link Role</h4>
                <button
                  onClick={() => setIsAddUserOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Tariq Mehmood"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Official Email *</label>
                  <input
                    type="email"
                    placeholder="tariq@nationallights.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Mobile Number</label>
                  <input
                    type="text"
                    placeholder="+92 300 1234567"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Assigned Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={newUserDepartment}
                    onChange={(e) => setNewUserDepartment(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Territory / Branch</label>
                  <input
                    type="text"
                    value={newUserTerritory}
                    onChange={(e) => setNewUserTerritory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsAddUserOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEmployee}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                >
                  Confirm & Activate User
                </button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Employee Name & Email</th>
                  <th className="px-4 py-3.5">Assigned Role</th>
                  <th className="px-4 py-3.5">Assigned Territory</th>
                  <th className="px-4 py-3.5">Phone Number</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(users.length > 0
                  ? users
                  : [
                      {
                        id: 'u-1',
                        fullName: 'Muhammad Amjid',
                        email: 'admin@nationallights.com',
                        phone: '+92 300 8400000',
                        role: 'SUPER_ADMIN' as UserRole,
                        branchName: 'Lahore Head Office',
                        isActive: true,
                      },
                      {
                        id: 'u-2',
                        fullName: 'Rashid Ali',
                        email: 'field.lahore@nationallights.com',
                        phone: '+92 321 4455667',
                        role: 'SALES_RECOVERY' as UserRole,
                        branchName: 'Lahore Central Territory',
                        isActive: true,
                      },
                      {
                        id: 'u-3',
                        fullName: 'Farhan Qureshi',
                        email: 'accounts@nationallights.com',
                        phone: '+92 333 7788990',
                        role: 'ACCOUNTS' as UserRole,
                        branchName: 'Head Office Finance',
                        isActive: true,
                      },
                      {
                        id: 'u-4',
                        fullName: 'Bilal Ahmed',
                        email: 'warehouse@nationallights.com',
                        phone: '+92 312 9988776',
                        role: 'WAREHOUSE_MANAGER' as UserRole,
                        branchName: 'Lahore Central Warehouse',
                        isActive: true,
                      },
                      {
                        id: 'u-5',
                        fullName: 'Tariq Butt',
                        email: 'sales.mgr@nationallights.com',
                        phone: '+92 300 5566778',
                        role: 'SALES_MANAGER' as UserRole,
                        branchName: 'Punjab North Zone',
                        isActive: true,
                      },
                    ]
                ).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5 font-medium">
                      <p className="font-bold text-slate-900">{u.fullName}</p>
                      <p className="text-[11px] text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">{u.branchName || 'Lahore Region'}</td>
                    <td className="px-4 py-3.5 text-slate-600">{u.phone}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        ACTIVE
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => alert(`Editing permissions for employee ${u.fullName}`)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                      >
                        Edit Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TERRITORY HIERARCHY TAB */}
      {activeSubTab === 'HIERARCHY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Hierarchy Add Form */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Add Hierarchy Unit</h3>
              <p className="text-xs text-slate-500">
                Structure your sales territories down to specific towns and delivery routes.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase">Unit Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Peshawar Cantt Route B"
                    value={newHierarchyName}
                    onChange={(e) => setNewHierarchyName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase">Hierarchy Level</label>
                  <select
                    value={newHierarchyType}
                    onChange={(e) => setNewHierarchyType(e.target.value as HierarchyNode['type'])}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="REGION">Region</option>
                    <option value="ZONE">Zone</option>
                    <option value="AREA">Area</option>
                    <option value="TERRITORY">Territory</option>
                    <option value="TOWN">Town</option>
                    <option value="ROUTE">Route</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase">Parent Territory Unit</label>
                  <select
                    value={newHierarchyParent}
                    onChange={(e) => setNewHierarchyParent(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    {hierarchyNodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.type})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAddHierarchyNode}
                  className="w-full mt-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
                >
                  + Add to Organization Hierarchy
                </button>
              </div>
            </div>
          </div>

          {/* Hierarchy Tree Visualizer */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Current Sales Organizational Tree
              </h3>
              <div className="space-y-2">
                {hierarchyNodes.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black">
                        {node.type[0]}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{node.name}</p>
                        <p className="text-[10px] text-slate-400">
                          Type: <span className="font-semibold text-slate-600">{node.type}</span>
                          {node.assignedManager && ` · Supervisor: ${node.assignedManager}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {node.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
