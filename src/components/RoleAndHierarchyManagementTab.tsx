/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Dynamic Role, User & Hierarchy Management
 * Head Office Complete Control Center
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Users,
  Building2,
  Check,
  Edit2,
  MapPin,
  Lock,
  ChevronRight,
  Layers,
  DollarSign,
  Briefcase,
  Award,
  Target as TargetIcon,
  Key,
  ShieldAlert
} from 'lucide-react';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, Permission, setCustomRolePermissions } from '../lib/permissions';
import {
  Designation,
  Employee,
  EmployeeSalary,
  EmployeeTownAssignment,
  SalaryAllowance,
  Target,
  User,
  UserRole
} from '../types';
import { calculateTargetAchievement } from '../lib/business-rules';

interface RoleAndHierarchyManagementTabProps {
  currentUser: User;
  users?: User[];
  employees?: Employee[];
  designations?: Designation[];
  employeeSalaries?: EmployeeSalary[];
  employeeTownAssignments?: EmployeeTownAssignment[];
  targets?: Target[];
  onAddUser?: (user: Partial<User>) => void;
  onUpdateUser?: (userId: string, updates: Partial<User>) => void;
  onSaveEmployee?: (employee: Partial<Employee>) => void;
  onSaveSalary?: (salary: Partial<EmployeeSalary>) => void;
  onSaveTownAssignment?: (assignment: Partial<EmployeeTownAssignment>) => void;
  onSaveTarget?: (target: Partial<Target>) => void;
}

interface CustomRoleDef {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
}

export const RoleAndHierarchyManagementTab: React.FC<RoleAndHierarchyManagementTabProps> = ({
  currentUser: _currentUser,
  users = [],
  employees = [],
  designations = [],
  employeeSalaries = [],
  employeeTownAssignments = [],
  targets = [],
  onAddUser: _onAddUser,
  onUpdateUser: _onUpdateUser,
  onSaveEmployee,
  onSaveSalary,
  onSaveTownAssignment,
  onSaveTarget,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'EMPLOYEES' | 'DESIGNATIONS' | 'SALARIES' | 'TARGETS' | 'TOWNS' | 'ROLES' | 'USERS'
  >('EMPLOYEES');

  // Custom Designations state
  const [customDesignations, setCustomDesignations] = useState<Designation[]>([]);
  const [desCode, setDesCode] = useState('');
  const [desName, setDesName] = useState('');
  const [desDept, setDesDept] = useState('SALES');
  const [desDescription, setDesDescription] = useState('');
  const [desGrade, setDesGrade] = useState('M-1');
  const [isDesignationModalOpen, setIsDesignationModalOpen] = useState(false);

  // Controlled Designations fallback (seeded from enterprise architecture)
  const defaultDesignations: Designation[] = [
    { id: 'des-nsm', code: 'NSM', name: 'National Sales Manager', description: 'Overall nationwide sales director', department: 'SALES', gradeLevel: 'M-1', isActive: true },
    { id: 'des-rsm', code: 'RSM', name: 'Regional Sales Manager', description: 'Head of regional distribution', department: 'SALES', gradeLevel: 'M-2', isActive: true },
    { id: 'des-asm', code: 'ASM', name: 'Area Sales Manager', description: 'Supervises territory sales managers', department: 'SALES', gradeLevel: 'M-3', isActive: true },
    { id: 'des-tsm', code: 'TSM', name: 'Territory Sales Manager', description: 'Field sales supervision', department: 'SALES', gradeLevel: 'O-1', isActive: true },
    { id: 'des-ss', code: 'SS', name: 'Sales Supervisor', description: 'Field operations & route management', department: 'SALES', gradeLevel: 'O-2', isActive: true },
    { id: 'des-ob', code: 'OB', name: 'Order Booker / Recovery Officer', description: 'Direct customer visits & recovery', department: 'SALES', gradeLevel: 'O-3', isActive: true },
    { id: 'des-acc', code: 'ACCOUNTS_OFFICER', name: 'Accounts Officer', description: 'Ledger, invoices & verification', department: 'ACCOUNTS', gradeLevel: 'O-1', isActive: true },
    { id: 'des-whm', code: 'WAREHOUSE_MANAGER', name: 'Warehouse Manager', description: 'Inventory stock & transfers', department: 'WAREHOUSE', gradeLevel: 'M-3', isActive: true },
    { id: 'des-fac', code: 'FACTORY_MANAGER', name: 'Factory Operations Manager', description: 'Production & quality control', department: 'FACTORY', gradeLevel: 'M-2', isActive: true },
    { id: 'des-disp', code: 'DISPATCH_OFFICER', name: 'Dispatch Officer', description: 'Bility & transporter operations', department: 'DISPATCH', gradeLevel: 'O-2', isActive: true },
  ];

  const activeDesignations = useMemo(() => {
    const map = new Map<string, Designation>();
    defaultDesignations.forEach((d) => map.set(d.code, d));
    customDesignations.forEach((d) => map.set(d.code, d));
    designations.forEach((d) => map.set(d.code, d));
    return Array.from(map.values());
  }, [designations, customDesignations]);

  // Modals state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isTownModalOpen, setIsTownModalOpen] = useState(false);

  // Employee Form State
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empFatherName, setEmpFatherName] = useState('');
  const [empCnic, setEmpCnic] = useState('');
  const [empMobile, setEmpMobile] = useState('');
  const [empWhatsapp, setEmpWhatsapp] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empDepartment, setEmpDepartment] = useState('SALES');
  const [empDesignationCode, setEmpDesignationCode] = useState('OB');
  const [empJoiningDate, setEmpJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [empStatus, setEmpStatus] = useState<'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED'>('ACTIVE');

  // Salary Form State
  const [salBasic, setSalBasic] = useState<number>(50000);
  const [salHouseRent, setSalHouseRent] = useState<number>(15000);
  const [salMedical, setSalMedical] = useState<number>(5000);
  const [salConveyance, setSalConveyance] = useState<number>(10000);
  const [salMobile, setSalMobile] = useState<number>(3000);
  const [salOther, setSalOther] = useState<number>(0);
  const [salEffectiveFrom, setSalEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));

  // Target Form State
  const [targetType, setTargetType] = useState<'SALES' | 'RECOVERY'>('SALES');
  const [targetPeriodKey, setTargetPeriodKey] = useState('2026-08');
  const [targetValue, setTargetValue] = useState<number>(1000000);
  const [targetTownName, setTargetTownName] = useState('Brandreth Road');

  // Town Assignment Form State
  const [assignTown, setAssignTown] = useState('Brandreth Road');

  // User Account Form State (Linked to Employee)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userSelectedEmployeeId, setUserSelectedEmployeeId] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('MANAGEMENT');
  const [userBranchName, setUserBranchName] = useState('Lahore Head Office');
  const [userPassword, setUserPassword] = useState('National@2026');
  const [userStatus, setUserStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');

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

  const [selectedRole, setSelectedRole] = useState<CustomRoleDef>(rolesList[0]);

  // Employee Handlers
  const handleOpenNewEmployee = () => {
    const nextSeq = employees.length + 1;
    setEmpCode(`EMP-NL-${String(nextSeq).padStart(4, '0')}`);
    setEmpName('');
    setEmpFatherName('');
    setEmpCnic('');
    setEmpMobile('');
    setEmpWhatsapp('');
    setEmpEmail('');
    setEmpDepartment('SALES');
    setEmpDesignationCode('OB');
    setEmpJoiningDate(new Date().toISOString().slice(0, 10));
    setEmpStatus('ACTIVE');
    setSelectedEmployee(null);
    setIsEmployeeModalOpen(true);
  };

  const handleEditEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEmpCode(emp.employeeCode);
    setEmpName(emp.fullName);
    setEmpFatherName(emp.fatherName || '');
    setEmpCnic(emp.cnic || '');
    setEmpMobile(emp.mobile);
    setEmpWhatsapp(emp.whatsapp || '');
    setEmpEmail(emp.email || '');
    setEmpDepartment(emp.department || 'SALES');
    setEmpDesignationCode(emp.designationCode || 'OB');
    setEmpJoiningDate(emp.joiningDate || new Date().toISOString().slice(0, 10));
    setEmpStatus(emp.employmentStatus || 'ACTIVE');
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empMobile.trim()) {
      alert('Full Name and Mobile number are required.');
      return;
    }

    const designationObj = activeDesignations.find((d) => d.code === empDesignationCode);

    const payload: Partial<Employee> = {
      id: selectedEmployee?.id || `emp-${Date.now()}`,
      employeeCode: empCode || `EMP-${Date.now().toString().slice(-4)}`,
      fullName: empName.trim(),
      fatherName: empFatherName.trim() || undefined,
      cnic: empCnic.trim() || undefined,
      mobile: empMobile.trim(),
      whatsapp: empWhatsapp.trim() || empMobile.trim(),
      email: empEmail.trim() || undefined,
      department: empDepartment,
      designationCode: empDesignationCode,
      designationName: designationObj?.name || empDesignationCode,
      joiningDate: empJoiningDate,
      employmentStatus: empStatus,
      createdAt: selectedEmployee?.createdAt || new Date().toISOString(),
    };

    if (onSaveEmployee) {
      onSaveEmployee(payload);
    }
    setIsEmployeeModalOpen(false);
  };

  // Salary Submission
  const handleSaveSalarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const allowances: SalaryAllowance[] = [
      { name: 'House Rent', amount: salHouseRent },
      { name: 'Medical Allowance', amount: salMedical },
      { name: 'Conveyance Allowance', amount: salConveyance },
      { name: 'Mobile / Data', amount: salMobile },
      ...(salOther > 0 ? [{ name: 'Special Allowance', amount: salOther }] : []),
    ];

    const gross = salBasic + salHouseRent + salMedical + salConveyance + salMobile + salOther;

    const salaryPayload: Partial<EmployeeSalary> = {
      id: `sal-${Date.now()}`,
      employeeId: selectedEmployee.id,
      basicSalary: salBasic,
      allowances,
      grossSalary: gross,
      effectiveFrom: salEffectiveFrom,
      salaryStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    if (onSaveSalary) {
      onSaveSalary(salaryPayload);
    }
    setIsSalaryModalOpen(false);
  };

  // Target Submission
  const handleSaveTargetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const targetPayload: Partial<Target> = {
      id: `tgt-${Date.now()}`,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.fullName,
      designationCode: selectedEmployee.designationCode,
      targetType,
      periodType: 'MONTHLY',
      periodKey: targetPeriodKey,
      townName: targetTownName,
      targetValue,
      achievedValue: 0,
      createdAt: new Date().toISOString(),
    };

    if (onSaveTarget) {
      onSaveTarget(targetPayload);
    }
    setIsTargetModalOpen(false);
  };

  // Town Assignment Submission
  const handleSaveTownSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const townPayload: Partial<EmployeeTownAssignment> = {
      id: `eta-${Date.now()}`,
      employeeId: selectedEmployee.id,
      townName: assignTown,
      isActive: true,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };

    if (onSaveTownAssignment) {
      onSaveTownAssignment(townPayload);
    }
    setIsTownModalOpen(false);
  };

  // User Account Handlers
  const handleOpenNewUserForEmployee = (emp?: Employee) => {
    if (emp) {
      setUserSelectedEmployeeId(emp.id);
      setUserFullName(emp.fullName);
      setUserPhone(emp.mobile);
      const cleanName = emp.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.');
      setUserEmail(emp.email || `${cleanName}@nationallights.com`);
      
      // Auto-suggest role based on department / designation
      if (emp.department === 'MANAGEMENT') {
        setUserRole('MANAGEMENT');
      } else if (emp.department === 'ACCOUNTS' || emp.designationCode === 'ACCOUNTS_OFFICER') {
        setUserRole('ACCOUNTS');
      } else if (emp.department === 'WAREHOUSE' || emp.designationCode === 'WAREHOUSE_MANAGER') {
        setUserRole('WAREHOUSE_MANAGER');
      } else if (emp.department === 'FACTORY' || emp.designationCode === 'FACTORY_MANAGER') {
        setUserRole('FACTORY_MANAGER');
      } else if (['NSM', 'RSM', 'ASM'].includes(emp.designationCode || '')) {
        setUserRole('SALES_MANAGER');
      } else if (['TSM', 'SS', 'OB'].includes(emp.designationCode || '')) {
        setUserRole('SALES_RECOVERY');
      } else if (emp.department === 'DISPATCH' || emp.designationCode === 'DISPATCH_OFFICER') {
        setUserRole('DISPATCH_OFFICER');
      } else {
        setUserRole('MANAGEMENT');
      }
    } else {
      setUserSelectedEmployeeId('');
      setUserFullName('');
      setUserEmail('');
      setUserPhone('');
      setUserRole('MANAGEMENT');
    }
    setUserBranchName('Lahore Head Office');
    setUserPassword('National@2026');
    setUserStatus('ACTIVE');
    setIsUserModalOpen(true);
  };

  const handleSelectEmployeeForUser = (empId: string) => {
    setUserSelectedEmployeeId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setUserFullName(emp.fullName);
      setUserPhone(emp.mobile);
      const cleanName = emp.fullName.toLowerCase().replace(/[^a-z0-9]/g, '.');
      setUserEmail(emp.email || `${cleanName}@nationallights.com`);
      
      if (emp.department === 'MANAGEMENT') {
        setUserRole('MANAGEMENT');
      } else if (emp.department === 'ACCOUNTS' || emp.designationCode === 'ACCOUNTS_OFFICER') {
        setUserRole('ACCOUNTS');
      } else if (emp.department === 'WAREHOUSE' || emp.designationCode === 'WAREHOUSE_MANAGER') {
        setUserRole('WAREHOUSE_MANAGER');
      } else if (emp.department === 'FACTORY' || emp.designationCode === 'FACTORY_MANAGER') {
        setUserRole('FACTORY_MANAGER');
      } else if (['NSM', 'RSM', 'ASM'].includes(emp.designationCode || '')) {
        setUserRole('SALES_MANAGER');
      } else if (['TSM', 'SS', 'OB'].includes(emp.designationCode || '')) {
        setUserRole('SALES_RECOVERY');
      } else if (emp.department === 'DISPATCH' || emp.designationCode === 'DISPATCH_OFFICER') {
        setUserRole('DISPATCH_OFFICER');
      } else {
        setUserRole('MANAGEMENT');
      }
    }
  };

  const handleSaveUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFullName.trim() || !userEmail.trim()) {
      alert('Full Name and Email Address are required.');
      return;
    }

    const payload: Partial<User> = {
      id: `usr-${Date.now()}`,
      fullName: userFullName.trim(),
      email: userEmail.trim().toLowerCase(),
      phone: userPhone.trim() || '+92 300 0000000',
      role: userRole,
      branchId: 'BR-01',
      branchName: userBranchName,
      isActive: userStatus === 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    if (_onAddUser) {
      _onAddUser(payload);
    }
    alert(`System Login Account "${userEmail}" created successfully for ${userFullName} with role [${userRole}]!`);
    setIsUserModalOpen(false);
  };

  const handleSaveDesignationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desCode.trim() || !desName.trim()) {
      alert('Designation Code and Title are required.');
      return;
    }

    const newDes: Designation = {
      id: `des-${Date.now()}`,
      code: desCode.trim().toUpperCase(),
      name: desName.trim(),
      description: desDescription.trim() || `${desName} in ${desDept} division`,
      department: desDept,
      gradeLevel: desGrade,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setCustomDesignations((prev) => [...prev, newDes]);
    alert(`Designation "${newDes.code} - ${newDes.name}" registered successfully.`);
    setDesCode('');
    setDesName('');
    setDesDescription('');
    setIsDesignationModalOpen(false);
  };

  // Group permissions
  const permissionGroups = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.group)));

  const handleTogglePermission = (perm: Permission) => {
    if (selectedRole.isSystem && selectedRole.id === 'SUPER_ADMIN') {
      alert('Super Admin permissions are fixed and cannot be modified.');
      return;
    }
    const updatedPerms = selectedRole.permissions.includes(perm)
      ? selectedRole.permissions.filter((p) => p !== perm)
      : [...selectedRole.permissions, perm];

    const updated = { ...selectedRole, permissions: updatedPerms };
    setSelectedRole(updated);
    setRolesList(rolesList.map((r) => (r.id === updated.id ? updated : r)));
    setCustomRolePermissions({ [updated.id]: updatedPerms });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300 border border-emerald-500/30">
                <Briefcase className="h-3.5 w-3.5" />
                ENTERPRISE MASTER ARCHITECTURE
              </span>
              <span className="text-xs text-slate-400 font-mono">HR, PAYROLL & HIERARCHY</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Employee, Designation & Target Master
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Strict separation between HR Master Profiles and System Login Accounts. Dynamic town-based customer scoping,
              immutable salary revision histories, and multi-tier target tracking.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenNewEmployee}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 text-xs font-black shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Register New Employee
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-700/60 pt-4">
          {[
            { key: 'EMPLOYEES', label: 'Employee Master', icon: Users, count: employees.length },
            { key: 'DESIGNATIONS', label: 'Designation Master', icon: Award, count: activeDesignations.length },
            { key: 'SALARIES', label: 'Salary History', icon: DollarSign, count: employeeSalaries.length },
            { key: 'TARGETS', label: 'Sales & Recovery Targets', icon: TargetIcon, count: targets.length },
            { key: 'TOWNS', label: 'Town Assignments', icon: MapPin, count: employeeTownAssignments.length },
            { key: 'ROLES', label: 'RBAC Roles & Matrix', icon: ShieldCheck, count: rolesList.length },
            { key: 'USERS', label: 'Login Accounts', icon: Lock, count: users.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key as any)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md font-black'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                      isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. EMPLOYEES MASTER TAB */}
      {activeSubTab === 'EMPLOYEES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Registered Employee Master Profiles</h2>
              <p className="text-xs text-slate-500">
                Official HR records with controlled designation, CNIC, and dynamic town assignments.
              </p>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-black text-slate-800">No Employees Found in Master Database</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                No dummy records are generated. Click below to register your first real staff profile.
              </p>
              <button
                onClick={handleOpenNewEmployee}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow"
              >
                <Plus className="h-4 w-4" />
                Register First Employee
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">Code & Full Name</th>
                    <th className="px-4 py-3.5">Designation</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Contact (Mobile/WhatsApp)</th>
                    <th className="px-4 py-3.5">Joined Date</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 border border-slate-200">
                            {emp.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{emp.fullName}</p>
                            <p className="text-[10px] font-mono text-slate-400">{emp.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                          {emp.designationCode || emp.designationName || 'OB'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-600">{emp.department || 'SALES'}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">{emp.mobile}</p>
                        {emp.whatsapp && <p className="text-[10px] text-emerald-600">WA: {emp.whatsapp}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono">{emp.joiningDate}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            emp.employmentStatus === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {emp.employmentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setSalBasic(50000);
                              setIsSalaryModalOpen(true);
                            }}
                            className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 transition"
                            title="Salary Revision"
                          >
                            Salary
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setIsTargetModalOpen(true);
                            }}
                            className="rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-200 transition"
                            title="Assign Target"
                          >
                            Target
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setIsTownModalOpen(true);
                            }}
                            className="rounded-lg bg-emerald-50 hover:bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 transition"
                            title="Assign Town"
                          >
                            Towns
                          </button>
                          <button
                            onClick={() => handleOpenNewUserForEmployee(emp)}
                            className="rounded-lg bg-teal-50 hover:bg-teal-100 px-2 py-1 text-[11px] font-bold text-teal-800 border border-teal-200 transition flex items-center gap-1"
                            title="Create / Link System Login Account"
                          >
                            <Key className="h-3 w-3" />
                            <span>+ Login ID</span>
                          </button>
                          <button
                            onClick={() => handleEditEmployee(emp)}
                            className="rounded-lg border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 transition"
                            title="Edit Master"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. DESIGNATIONS MASTER TAB */}
      {activeSubTab === 'DESIGNATIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900">Enterprise Controlled Designations</h2>
              <p className="text-xs text-slate-500">
                Standard organizational designations for Sales Force (NSM, RSM, ASM, TSM, SS, OB) and Corporate Departments.
              </p>
            </div>
            <button
              onClick={() => {
                setDesCode('');
                setDesName('');
                setDesDept('SALES');
                setDesDescription('');
                setDesGrade('M-1');
                setIsDesignationModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow"
            >
              <Plus className="h-4 w-4" />
              <span>Add Designation</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeDesignations.map((des) => (
              <div
                key={des.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-xl bg-slate-900 text-white font-mono font-black text-xs px-2.5 py-1">
                    {des.code}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {des.department} · {des.gradeLevel || 'G-1'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{des.name}</h3>
                <p className="text-xs text-slate-500">{des.description}</p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Status: <strong className="text-emerald-600">ACTIVE</strong></span>
                  <span>System Controlled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SALARY HISTORY TAB */}
      {activeSubTab === 'SALARIES' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Employee Salary Revision Ledger (Immutable History)</h2>
            <p className="text-xs text-slate-500">
              Complete historical payroll revisions with itemized allowances (Basic, House Rent, Medical, Conveyance, Mobile).
            </p>
          </div>

          {employeeSalaries.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
              <DollarSign className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-2 text-sm font-black text-slate-800">No Salary Revisions Recorded Yet</h3>
              <p className="text-xs text-slate-500">
                Salary changes made via the Employee Master table will be preserved here in immutable history.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">Employee ID</th>
                    <th className="px-4 py-3.5">Basic Pay</th>
                    <th className="px-4 py-3.5">Allowances Breakdown</th>
                    <th className="px-4 py-3.5">Gross Pay</th>
                    <th className="px-4 py-3.5">Effective Period</th>
                    <th className="px-4 py-3.5">Revision Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeSalaries.map((sal) => (
                    <tr key={sal.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{sal.employeeId}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        PKR {sal.basicSalary.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {sal.allowances?.map((a, i) => (
                            <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                              {a.name}: PKR {a.amount.toLocaleString()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-black text-emerald-700">
                        PKR {sal.grossSalary.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-500">
                        {sal.effectiveFrom} {sal.effectiveTo ? `to ${sal.effectiveTo}` : '(Current Active)'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            sal.salaryStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {sal.salaryStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. TARGETS TAB */}
      {activeSubTab === 'TARGETS' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Sales & Recovery Targets vs. Actuals</h2>
            <p className="text-xs text-slate-500">
              Live variance calculations: Positive = Overachieved, Negative = Deficit.
            </p>
          </div>

          {targets.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
              <TargetIcon className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-2 text-sm font-black text-slate-800">No Sales Targets Configured</h3>
              <p className="text-xs text-slate-500">
                Assign monthly or quarterly sales and recovery targets to staff from the Employee Master table.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">Staff & Designation</th>
                    <th className="px-4 py-3.5">Period / Town</th>
                    <th className="px-4 py-3.5">Target Type</th>
                    <th className="px-4 py-3.5">Assigned Target</th>
                    <th className="px-4 py-3.5">Actual Realized</th>
                    <th className="px-4 py-3.5">Variance & Achievement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {targets.map((tgt) => {
                    const ach = calculateTargetAchievement(tgt.achievedValue, tgt.targetValue);
                    return (
                      <tr key={tgt.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 font-medium">
                          <p className="font-bold text-slate-900">{tgt.employeeName || tgt.employeeId}</p>
                          <p className="text-[10px] text-slate-400">{tgt.designationCode || 'OB'}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-mono text-slate-900">{tgt.periodKey}</p>
                          <p className="text-[10px] text-slate-500">{tgt.townName || 'All Assigned Towns'}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                              tgt.targetType === 'SALES' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {tgt.targetType}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          PKR {tgt.targetValue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700">
                          PKR {(tgt.achievedValue || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-1">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${
                                ach.achievementPercentage === 'N/A'
                                  ? 'bg-slate-100 text-slate-600'
                                  : (typeof ach.achievementPercentage === 'number' && ach.achievementPercentage >= 100)
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ach.achievementPercentage === 'N/A' ? 'N/A' : `${ach.achievementPercentage}%`}
                            </span>
                            <p className="text-[10px] font-mono text-slate-500">
                              Var: {ach.variance >= 0 ? '+' : ''}PKR {ach.variance.toLocaleString()}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. TOWN ASSIGNMENTS TAB */}
      {activeSubTab === 'TOWNS' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-black text-slate-900">Dynamic Town Assignments</h2>
            <p className="text-xs text-slate-500">
              When an employee is assigned to a town, all active distributors and dealers in that town are dynamically visible to them.
            </p>
          </div>

          {employeeTownAssignments.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
              <MapPin className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-2 text-sm font-black text-slate-800">No Town Assignments Configured</h3>
              <p className="text-xs text-slate-500">
                Assign towns to sales officers to auto-link party accounts dynamically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">Employee ID</th>
                    <th className="px-4 py-3.5">Assigned Town</th>
                    <th className="px-4 py-3.5">Effective Date</th>
                    <th className="px-4 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeTownAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{a.employeeId}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">{a.townName}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-500">{a.effectiveFrom}</td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. ROLES & PERMISSIONS MATRIX */}
      {activeSubTab === 'ROLES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Enterprise Roles</h3>
            <div className="space-y-2">
              {rolesList.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left rounded-2xl border p-4 transition ${
                    selectedRole.id === role.id
                      ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs">{role.name}</p>
                    {role.isSystem && (
                      <span
                        className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          selectedRole.id === role.id
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        System
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1 text-[11px] line-clamp-2 ${
                      selectedRole.id === role.id ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {role.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="font-mono">{role.permissions.length} Permissions</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-base font-black text-slate-900">
                  Granular Permissions: {selectedRole.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedRole.description}</p>
              </div>

              <div className="space-y-6">
                {permissionGroups.map((group) => {
                  const permsInGroup = ALL_PERMISSIONS.filter((p) => p.group === group);
                  return (
                    <div key={group} className="space-y-2.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" />
                        {group}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {permsInGroup.map((perm) => {
                          const isEnabled = selectedRole.permissions.includes(perm.key);
                          return (
                            <button
                              key={perm.key}
                              type="button"
                              onClick={() => handleTogglePermission(perm.key)}
                              className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition ${
                                isEnabled
                                  ? 'border-emerald-200 bg-emerald-50/50 text-slate-900'
                                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              <div
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition ${
                                  isEnabled ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isEnabled && <Check className="h-3 w-3" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold leading-tight">{perm.label}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{perm.key}</p>
                              </div>
                            </button>
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

      {/* 7. USERS / LOGIN ACCOUNTS */}
      {activeSubTab === 'USERS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900">System Login Accounts &amp; Access Control</h2>
              <p className="text-xs text-slate-500">
                Authentication accounts tied to system roles and employee master profiles. Create multiple accounts per employee as needed.
              </p>
            </div>
            <button
              onClick={() => handleOpenNewUserForEmployee()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 transition shadow"
            >
              <Plus className="h-4 w-4" />
              <span>+ Create Login User Account</span>
            </button>
          </div>

          {/* Quick Role Breakdown Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Logins</p>
              <p className="text-lg font-black text-slate-800">{users.length}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-400">Management</p>
              <p className="text-lg font-black text-indigo-700">
                {users.filter((u) => u.role === 'MANAGEMENT' || u.role === 'SUPER_ADMIN').length}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-400">Accounts</p>
              <p className="text-lg font-black text-emerald-700">
                {users.filter((u) => u.role === 'ACCOUNTS').length}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-400">Warehouse</p>
              <p className="text-lg font-black text-amber-700">
                {users.filter((u) => u.role === 'WAREHOUSE_MANAGER' || u.role === 'WAREHOUSE').length}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-400">Factory</p>
              <p className="text-lg font-black text-cyan-700">
                {users.filter((u) => u.role === 'FACTORY_MANAGER' || u.role === 'FACTORY').length}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-400">Sales Force</p>
              <p className="text-lg font-black text-teal-700">
                {users.filter((u) => ['SALES_MANAGER', 'SALES_RECOVERY', 'RSM', 'ASM', 'TSM', 'OB', 'SS'].includes(u.role)).length}
              </p>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
              <Lock className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-2 text-sm font-black text-slate-800">No Login Accounts in Database</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Create user login accounts linked to employees (Management, Accounts, Warehouse, Factory, or Field Force) using the button above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">User Name &amp; Login Email</th>
                    <th className="px-4 py-3.5">System Access Role</th>
                    <th className="px-4 py-3.5">Branch / Territory Hub</th>
                    <th className="px-4 py-3.5">Contact Phone</th>
                    <th className="px-4 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                            {u.fullName ? u.fullName[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.fullName}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            u.role === 'SUPER_ADMIN' || u.role === 'MANAGEMENT'
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                              : u.role === 'ACCOUNTS'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : u.role === 'WAREHOUSE_MANAGER' || u.role === 'WAREHOUSE'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : u.role === 'FACTORY_MANAGER' || u.role === 'FACTORY'
                              ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                              : 'bg-teal-50 text-teal-800 border border-teal-200'
                          }`}
                        >
                          <ShieldAlert className="h-3 w-3" />
                          <span>{u.role}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">{u.branchName || 'Lahore Head Office'}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono">{u.phone}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: REGISTER / EDIT EMPLOYEE MASTER */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {selectedEmployee ? 'Edit Employee Master Profile' : 'Register New Employee Master'}
                </h3>
                <p className="text-xs text-slate-500">Official HR profile separate from user login account.</p>
              </div>
              <button
                onClick={() => setIsEmployeeModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployeeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Employee Code *</label>
                  <input
                    type="text"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-mono focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Tariq Mehmood"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Father Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Muhammad Aslam"
                    value={empFatherName}
                    onChange={(e) => setEmpFatherName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">CNIC Number</label>
                  <input
                    type="text"
                    placeholder="35202-XXXXXXX-X"
                    value={empCnic}
                    onChange={(e) => setEmpCnic(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Mobile Phone *</label>
                  <input
                    type="text"
                    placeholder="+92 300 1234567"
                    value={empMobile}
                    onChange={(e) => setEmpMobile(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">WhatsApp Number</label>
                  <input
                    type="text"
                    placeholder="+92 300 1234567"
                    value={empWhatsapp}
                    onChange={(e) => setEmpWhatsapp(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@nationallights.com"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Department</label>
                  <select
                    value={empDepartment}
                    onChange={(e) => setEmpDepartment(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="SALES">Sales & Distribution</option>
                    <option value="ACCOUNTS">Finance & Accounts</option>
                    <option value="WAREHOUSE">Warehouse & Supply Chain</option>
                    <option value="FACTORY">Factory & Manufacturing</option>
                    <option value="DISPATCH">Dispatch & Logistics</option>
                    <option value="MANAGEMENT">Executive Management</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Controlled Designation *</label>
                  <select
                    value={empDesignationCode}
                    onChange={(e) => setEmpDesignationCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  >
                    {activeDesignations.map((d) => (
                      <option key={d.id} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Joining Date</label>
                  <input
                    type="date"
                    value={empJoiningDate}
                    onChange={(e) => setEmpJoiningDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Employment Status</label>
                  <select
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PROBATION">PROBATION</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                    <option value="RESIGNED">RESIGNED</option>
                    <option value="TERMINATED">TERMINATED</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow"
                >
                  Save Master Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SALARY REVISION */}
      {isSalaryModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Salary Revision & Allowances</h3>
                <p className="text-xs text-slate-500">
                  Staff: {selectedEmployee.fullName} ({selectedEmployee.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setIsSalaryModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSalarySubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Basic Salary (PKR) *</label>
                <input
                  type="number"
                  value={salBasic}
                  onChange={(e) => setSalBasic(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">House Rent (PKR)</label>
                  <input
                    type="number"
                    value={salHouseRent}
                    onChange={(e) => setSalHouseRent(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Medical Allowance (PKR)</label>
                  <input
                    type="number"
                    value={salMedical}
                    onChange={(e) => setSalMedical(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Conveyance Allowance (PKR)</label>
                  <input
                    type="number"
                    value={salConveyance}
                    onChange={(e) => setSalConveyance(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Mobile / Data (PKR)</label>
                  <input
                    type="number"
                    value={salMobile}
                    onChange={(e) => setSalMobile(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">Total Calculated Gross Salary:</span>
                <span className="font-black text-emerald-700 text-sm">
                  PKR {(salBasic + salHouseRent + salMedical + salConveyance + salMobile + salOther).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700">Effective From Date *</label>
                <input
                  type="date"
                  value={salEffectiveFrom}
                  onChange={(e) => setSalEffectiveFrom(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSalaryModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow"
                >
                  Commit Salary Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN TARGET */}
      {isTargetModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Set Monthly Target</h3>
                <p className="text-xs text-slate-500">
                  Staff: {selectedEmployee.fullName} ({selectedEmployee.designationCode})
                </p>
              </div>
              <button
                onClick={() => setIsTargetModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTargetSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Target Type</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="SALES">Sales Target (PKR)</option>
                  <option value="RECOVERY">Recovery Target (PKR)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Period (YYYY-MM)</label>
                <input
                  type="text"
                  placeholder="2026-08"
                  value={targetPeriodKey}
                  onChange={(e) => setTargetPeriodKey(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-mono focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Assigned Town / Market</label>
                <input
                  type="text"
                  placeholder="e.g. Brandreth Road"
                  value={targetTownName}
                  onChange={(e) => setTargetTownName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Target Amount (PKR) *</label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 shadow"
                >
                  Set Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN TOWN */}
      {isTownModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Dynamic Town Assignment</h3>
                <p className="text-xs text-slate-500">
                  Staff: {selectedEmployee.fullName} ({selectedEmployee.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setIsTownModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTownSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Town / Commercial Market Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Brandreth Road"
                  value={assignTown}
                  onChange={(e) => setAssignTown(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                All distributors &amp; dealers in <strong>{assignTown}</strong> will automatically link to this employee for mobile order booking &amp; recovery.
              </p>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTownModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow"
                >
                  Assign Town
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / LINK USER LOGIN ACCOUNT */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Provision System Login Account</h3>
                <p className="text-xs text-slate-500">
                  Authenticate employees with enterprise RBAC roles (Management, Accounts, Warehouse, Factory, Field Force).
                </p>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="space-y-3.5 text-xs">
              {/* Linked Employee Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Link to Employee Profile (Optional)</label>
                <select
                  value={userSelectedEmployeeId}
                  onChange={(e) => handleSelectEmployeeForUser(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:border-teal-600 focus:outline-none"
                >
                  <option value="">-- Standalone User Account or Custom Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode}) · {emp.designationCode || emp.designationName || emp.department}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Selecting an employee auto-populates their credentials and suggests their enterprise role. Multiple login accounts can be created per employee.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">User Full Name *</label>
                  <input
                    type="text"
                    required
                    value={userFullName}
                    onChange={(e) => setUserFullName(e.target.value)}
                    placeholder="e.g. Muhammad Asif"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Login Email / Username *</label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="e.g. asif@nationallights.com"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono font-medium focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Enterprise Role *</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-indigo-700 focus:border-teal-600 focus:outline-none"
                  >
                    <option value="MANAGEMENT">MANAGEMENT (Executive Oversight &amp; Approvals)</option>
                    <option value="ACCOUNTS">ACCOUNTS (Ledger, Invoices, Receipts &amp; Finance)</option>
                    <option value="WAREHOUSE_MANAGER">WAREHOUSE_MANAGER (Stock In/Out, Adjustments)</option>
                    <option value="FACTORY_MANAGER">FACTORY_MANAGER (Production, QA &amp; Transfers)</option>
                    <option value="SALES_MANAGER">SALES_MANAGER (NSM, RSM, ASM Hierarchy)</option>
                    <option value="SALES_RECOVERY">SALES_RECOVERY (TSM, SS, Order Bookers)</option>
                    <option value="DISPATCH_OFFICER">DISPATCH_OFFICER (Bility, Loading &amp; Logistics)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Full Enterprise Master Access)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assigned Branch / Hub *</label>
                  <select
                    value={userBranchName}
                    onChange={(e) => setUserBranchName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:border-teal-600 focus:outline-none"
                  >
                    <option value="Lahore Head Office">National Lights Head Office, Lahore</option>
                    <option value="Karachi Regional Distribution Depot">Karachi Regional Distribution Depot</option>
                    <option value="Rawalpindi / Islamabad Hub">Rawalpindi / Islamabad Hub</option>
                    <option value="Peshawar North Depot">Peshawar North Depot</option>
                    <option value="Central Factory Unit">Central Factory Operations Unit</option>
                    <option value="Central Warehouse">Main Distribution Warehouse</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Temporary Password</label>
                  <input
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="National@2026"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Operating Status</label>
                <select
                  value={userStatus}
                  onChange={(e) => setUserStatus(e.target.value as 'ACTIVE' | 'SUSPENDED')}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-emerald-700 focus:border-teal-600 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Authorized to Sign In)</option>
                  <option value="SUSPENDED">SUSPENDED (Login Access Blocked)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-black text-white hover:bg-teal-800 shadow"
                >
                  Create System Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE DESIGNATION */}
      {isDesignationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Add Controlled Designation</h3>
                <p className="text-xs text-slate-500">
                  Register a standard job role for field force or corporate departments.
                </p>
              </div>
              <button
                onClick={() => setIsDesignationModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDesignationSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Designation Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ZSM"
                    value={desCode}
                    onChange={(e) => setDesCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono font-black uppercase focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Grade Level</label>
                  <select
                    value={desGrade}
                    onChange={(e) => setDesGrade(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold focus:border-slate-900 focus:outline-none"
                  >
                    <option value="M-1">M-1 (Executive / Director)</option>
                    <option value="M-2">M-2 (Senior Management)</option>
                    <option value="M-3">M-3 (Middle Management)</option>
                    <option value="O-1">O-1 (Senior Officer)</option>
                    <option value="O-2">O-2 (Officer / Supervisor)</option>
                    <option value="O-3">O-3 (Field Staff / Booker)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Designation Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zonal Sales Manager"
                  value={desName}
                  onChange={(e) => setDesName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-bold focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Department</label>
                <select
                  value={desDept}
                  onChange={(e) => setDesDept(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-bold focus:border-slate-900 focus:outline-none"
                >
                  <option value="SALES">SALES &amp; MARKETING</option>
                  <option value="ACCOUNTS">ACCOUNTS &amp; FINANCE</option>
                  <option value="WAREHOUSE">WAREHOUSE &amp; LOGISTICS</option>
                  <option value="FACTORY">FACTORY &amp; PRODUCTION</option>
                  <option value="DISPATCH">DISPATCH OPERATIONS</option>
                  <option value="MANAGEMENT">EXECUTIVE MANAGEMENT</option>
                  <option value="HR_ADMIN">HR &amp; ADMINISTRATION</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Role Description</label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe key operational responsibilities..."
                  value={desDescription}
                  onChange={(e) => setDesDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDesignationModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800 shadow"
                >
                  Save Designation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
