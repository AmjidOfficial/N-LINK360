/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Comprehensive Visit Log & Monthly Calendar Module
 * Enterprise-grade scheduling, past visit audits, and pending visit reminder engine.
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShoppingBag,
  DollarSign,
  Phone,
  Eye,
  X,
  FileText,
  CalendarDays,
  List,
  Sparkles,
  RefreshCw,
  Building,
  ArrowRight,
  TrendingUp,
  Image as ImageIcon,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Customer, CustomerVisit, User as UserType, VisitReminder } from '../types';

interface VisitLogCalendarViewProps {
  currentUser?: UserType;
  visits: CustomerVisit[];
  customers: Customer[];
  onLogVisitClick?: (customerId?: string, defaultNotes?: string) => void;
  onScheduleVisit?: (reminder: Partial<VisitReminder>) => void;
  isMobileCompact?: boolean;
}

export const VisitLogCalendarView: React.FC<VisitLogCalendarViewProps> = ({
  currentUser,
  visits = [],
  customers = [],
  onLogVisitClick,
  onScheduleVisit,
  isMobileCompact = false,
}) => {
  // Calendar Navigation State (defaults to current date e.g. August 2026)
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 7, 27)); // August 2026 baseline
  const [viewMode, setViewMode] = useState<'MONTH' | 'AGENDA' | 'COVERAGE'>('MONTH');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('ALL');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'OVERDUE' | 'HIGH_PRIORITY'>('ALL');

  // Interactive Inspection States
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [inspectingVisit, setInspectingVisit] = useState<CustomerVisit | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [prefilledDateForModal, setPrefilledDateForModal] = useState<string>('');

  // Schedule Reminder Form State
  const [formCustId, setFormCustId] = useState<string>(customers[0]?.id || '');
  const [formDate, setFormDate] = useState<string>('2026-08-28');
  const [formTime, setFormTime] = useState<string>('11:00');
  const [formPurpose, setFormPurpose] = useState<string>('Routine Sales & Order Booking');
  const [formPriority, setFormPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [formReason, setFormReason] = useState<VisitReminder['reason']>('ROUTINE_CYCLE');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formOfficerName, setFormOfficerName] = useState<string>(currentUser?.fullName || 'Tariq Mehmood (OB)');

  // Local state for user-added / updated reminders
  const [customReminders, setCustomReminders] = useState<VisitReminder[]>([
    {
      id: 'rem-1',
      customerId: 'c-1',
      customerName: 'Al-Madina Electric Store',
      customerCode: 'CUST-001',
      phone: '+92 300 4567890',
      city: 'Lahore',
      address: 'Shop 14, Brandreth Road',
      assignedEmployeeName: 'Tariq Mehmood (OB)',
      scheduledDate: '2026-08-28',
      scheduledTime: '10:30',
      priority: 'HIGH',
      purpose: 'Payment Recovery for Overdue Invoice #INV-2026-089',
      reason: 'OVERDUE_RECOVERY',
      status: 'PENDING',
      notes: 'Customer promised cheque collection on Friday morning.',
      currentBalance: 450000,
      creditLimit: 1000000,
    },
    {
      id: 'rem-2',
      customerId: 'c-2',
      customerName: 'Bright Spark Lighting',
      customerCode: 'CUST-002',
      phone: '+92 321 9876543',
      city: 'Lahore',
      address: 'Plot 45, Hall Road',
      assignedEmployeeName: 'Tariq Mehmood (OB)',
      scheduledDate: '2026-08-29',
      scheduledTime: '14:00',
      priority: 'MEDIUM',
      purpose: 'New LED Floodlight Catalogue Pitch & Re-order',
      reason: 'SCHEDULED_FOLLOWUP',
      status: 'PENDING',
      notes: 'Introduce 150W IP66 Floodlight new batch with carton discounts.',
      currentBalance: 125000,
      creditLimit: 500000,
    },
    {
      id: 'rem-3',
      customerId: 'c-3',
      customerName: 'Peshawar Electrical Trading',
      customerCode: 'CUST-003',
      phone: '+92 333 1122334',
      city: 'Peshawar',
      address: 'Karkhano Market, Khyber Link',
      assignedEmployeeName: 'Hamza Khan (TSM)',
      scheduledDate: '2026-08-31',
      scheduledTime: '12:00',
      priority: 'HIGH',
      purpose: 'Monthly Account Settlement & Ledger Balance Reconciliation',
      reason: 'OVERDUE_RECOVERY',
      status: 'PENDING',
      notes: 'Reconcile return credit notes and collect partial bank draft.',
      currentBalance: 980000,
      creditLimit: 1500000,
    },
    {
      id: 'rem-4',
      customerId: 'c-4',
      customerName: 'Karachi Central Depot',
      customerCode: 'CUST-004',
      phone: '+92 312 3344556',
      city: 'Karachi',
      address: 'Main M.A. Jinnah Road',
      assignedEmployeeName: 'Bilal Farooq (SS)',
      scheduledDate: '2026-08-24', // Past reminder (Overdue)
      scheduledTime: '15:30',
      priority: 'HIGH',
      purpose: 'Quarterly Stock Audit & Outstanding Recovery',
      reason: 'OVERDUE_RECOVERY',
      status: 'OVERDUE',
      notes: 'Follow-up missed on Monday. Urgent check required.',
      currentBalance: 650000,
      creditLimit: 800000,
    }
  ]);

  // Merge explicitly recorded visits' followup dates into reminders list
  const allReminders = useMemo<VisitReminder[]>(() => {
    const list = [...customReminders];
    
    // Check if any visit has a nextFollowupDate that isn't already in list
    visits.forEach((v) => {
      if (v.nextFollowupDate) {
        const dateStr = v.nextFollowupDate.slice(0, 10);
        const existing = list.find((r) => r.customerId === v.customerId && r.scheduledDate === dateStr);
        if (!existing) {
          const cust = customers.find((c) => c.id === v.customerId);
          list.push({
            id: `visit-followup-${v.id}`,
            customerId: v.customerId,
            customerName: v.customerName || cust?.companyName || 'Assigned Customer',
            customerCode: cust?.customerCode,
            phone: cust?.phone,
            city: cust?.city,
            address: cust?.address,
            assignedEmployeeName: v.salesUserName || 'Sales Officer',
            scheduledDate: dateStr,
            scheduledTime: '11:00',
            priority: 'MEDIUM',
            purpose: `Follow-up from Visit (${v.purpose || 'Routine'})`,
            reason: 'SCHEDULED_FOLLOWUP',
            status: new Date(dateStr) < new Date(2026, 7, 27) ? 'OVERDUE' : 'PENDING',
            notes: v.notes || 'Scheduled follow-up from prior visit.',
            currentBalance: cust?.currentBalance,
            creditLimit: cust?.creditLimit,
          });
        }
      }
    });

    return list;
  }, [customReminders, visits, customers]);

  // Extract distinct field officers for filter dropdown
  const fieldOfficers = useMemo(() => {
    const set = new Set<string>();
    visits.forEach((v) => { if (v.salesUserName) set.add(v.salesUserName); });
    allReminders.forEach((r) => { if (r.assignedEmployeeName) set.add(r.assignedEmployeeName); });
    customers.forEach((c) => { if (c.assignedEmployee) set.add(c.assignedEmployee); });
    if (currentUser?.fullName) set.add(currentUser.fullName);
    return Array.from(set).filter(Boolean);
  }, [visits, allReminders, customers, currentUser]);

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Helper date formatter
  const formatDateKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayKey = '2026-08-27'; // Fixed baseline current date for consistent enterprise view

  // Map visits by Date Key (YYYY-MM-DD)
  const visitsByDate = useMemo(() => {
    const map = new Map<string, CustomerVisit[]>();
    visits.forEach((v) => {
      if (!v.checkinTime) return;
      const dateKey = v.checkinTime.slice(0, 10);
      
      // Apply filters
      if (selectedOfficer !== 'ALL' && v.salesUserName !== selectedOfficer) return;
      if (selectedCustomerFilter !== 'ALL' && v.customerId !== selectedCustomerFilter) return;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = v.customerName?.toLowerCase().includes(query);
        const matchNotes = v.notes?.toLowerCase().includes(query);
        const matchPurpose = v.purpose?.toLowerCase().includes(query);
        if (!matchName && !matchNotes && !matchPurpose) return;
      }

      const existing = map.get(dateKey) || [];
      existing.push(v);
      map.set(dateKey, existing);
    });
    return map;
  }, [visits, selectedOfficer, selectedCustomerFilter, searchTerm]);

  // Map reminders by Date Key (YYYY-MM-DD)
  const remindersByDate = useMemo(() => {
    const map = new Map<string, VisitReminder[]>();
    allReminders.forEach((r) => {
      if (!r.scheduledDate) return;
      const dateKey = r.scheduledDate;

      // Apply filters
      if (selectedOfficer !== 'ALL' && r.assignedEmployeeName !== selectedOfficer) return;
      if (selectedCustomerFilter !== 'ALL' && r.customerId !== selectedCustomerFilter) return;
      if (statusFilter === 'COMPLETED') return; // Reminders don't match completed filter
      if (statusFilter === 'OVERDUE' && r.status !== 'OVERDUE') return;
      if (statusFilter === 'HIGH_PRIORITY' && r.priority !== 'HIGH') return;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = r.customerName.toLowerCase().includes(query);
        const matchNotes = r.notes?.toLowerCase().includes(query);
        const matchPurpose = r.purpose.toLowerCase().includes(query);
        if (!matchName && !matchNotes && !matchPurpose) return;
      }

      const existing = map.get(dateKey) || [];
      existing.push(r);
      map.set(dateKey, existing);
    });
    return map;
  }, [allReminders, selectedOfficer, selectedCustomerFilter, statusFilter, searchTerm]);

  // Monthly Metrics Calculation
  const monthMetrics = useMemo(() => {
    let completedCount = 0;
    let productiveOrderCount = 0;
    let recoveryCollectedCount = 0;
    let pendingRemindersCount = 0;
    let overdueRemindersCount = 0;
    let highPriorityCount = 0;

    // Filter within current month
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    visits.forEach((v) => {
      if (v.checkinTime && v.checkinTime.startsWith(prefix)) {
        completedCount++;
        if (v.orderPlaced) productiveOrderCount++;
        if (v.recoveryCollected) recoveryCollectedCount++;
      }
    });

    allReminders.forEach((r) => {
      if (r.scheduledDate && r.scheduledDate.startsWith(prefix)) {
        if (r.status === 'OVERDUE') overdueRemindersCount++;
        else if (r.status === 'PENDING') pendingRemindersCount++;
        if (r.priority === 'HIGH') highPriorityCount++;
      }
    });

    // Visited customer IDs this month
    const visitedCustIds = new Set(
      visits
        .filter((v) => v.checkinTime && v.checkinTime.startsWith(prefix))
        .map((v) => v.customerId)
    );
    const coveragePercent = customers.length > 0
      ? Math.min(100, Math.round((visitedCustIds.size / customers.length) * 100))
      : 0;

    return {
      completedCount,
      productiveOrderCount,
      recoveryCollectedCount,
      pendingRemindersCount,
      overdueRemindersCount,
      highPriorityCount,
      coveragePercent,
      totalAssignedCustomers: customers.length,
      visitedCount: visitedCustIds.size,
    };
  }, [visits, allReminders, customers, year, month]);

  // Calendar Day Cells Construction
  const calendarCells = useMemo(() => {
    const cells: Array<{
      date: Date;
      dateKey: string;
      isCurrentMonth: boolean;
      dayNumber: number;
      isToday: boolean;
      isPast: boolean;
      dayVisits: CustomerVisit[];
      dayReminders: VisitReminder[];
    }> = [];

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      const key = formatDateKey(d);
      cells.push({
        date: d,
        dateKey: key,
        isCurrentMonth: false,
        dayNumber: prevMonthDays - i,
        isToday: key === todayKey,
        isPast: key < todayKey,
        dayVisits: statusFilter === 'PENDING' || statusFilter === 'OVERDUE' ? [] : (visitsByDate.get(key) || []),
        dayReminders: remindersByDate.get(key) || [],
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = formatDateKey(d);
      cells.push({
        date: d,
        dateKey: key,
        isCurrentMonth: true,
        dayNumber: day,
        isToday: key === todayKey,
        isPast: key < todayKey,
        dayVisits: statusFilter === 'PENDING' || statusFilter === 'OVERDUE' ? [] : (visitsByDate.get(key) || []),
        dayReminders: remindersByDate.get(key) || [],
      });
    }

    // 3. Next month leading days (to complete 35 or 42 grid slots)
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      const key = formatDateKey(d);
      cells.push({
        date: d,
        dateKey: key,
        isCurrentMonth: false,
        dayNumber: day,
        isToday: key === todayKey,
        isPast: key < todayKey,
        dayVisits: statusFilter === 'PENDING' || statusFilter === 'OVERDUE' ? [] : (visitsByDate.get(key) || []),
        dayReminders: remindersByDate.get(key) || [],
      });
    }

    return cells;
  }, [year, month, daysInMonth, firstDayIndex, prevMonthDays, visitsByDate, remindersByDate, statusFilter]);

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const handleTodayJump = () => {
    setCurrentDate(new Date(2026, 7, 27));
  };

  // Schedule Reminder Form Submission
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === formCustId);
    if (!cust) {
      alert('Please select an assigned customer.');
      return;
    }

    const newReminder: VisitReminder = {
      id: `rem-custom-${Date.now()}`,
      customerId: cust.id,
      customerName: cust.companyName,
      customerCode: cust.customerCode,
      phone: cust.phone,
      city: cust.city,
      address: cust.address,
      assignedEmployeeName: formOfficerName || 'Sales Representative',
      scheduledDate: formDate,
      scheduledTime: formTime,
      priority: formPriority,
      purpose: formPurpose,
      reason: formReason,
      status: formDate < todayKey ? 'OVERDUE' : 'PENDING',
      notes: formNotes,
      currentBalance: cust.currentBalance,
      creditLimit: cust.creditLimit,
      createdAt: new Date().toISOString(),
    };

    setCustomReminders((prev) => [newReminder, ...prev]);

    if (onScheduleVisit) {
      onScheduleVisit(newReminder);
    }

    alert(`Visit reminder scheduled for ${cust.companyName} on ${formDate} at ${formTime}!`);
    setShowScheduleModal(false);
    setFormNotes('');
  };

  // Mark reminder as completed
  const handleCompleteReminder = (reminderId: string) => {
    setCustomReminders((prev) =>
      prev.map((r) => (r.id === reminderId ? { ...r, status: 'COMPLETED' } : r))
    );
    alert('Visit reminder marked as Completed!');
  };

  // Open schedule modal for a specific day
  const openScheduleForDate = (dateKey: string) => {
    setFormDate(dateKey);
    setShowScheduleModal(true);
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      
      {/* ========================================================================= */}
      {/* 1. HEADER & KPI METRICS RIBBON */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        
        {/* Top Title & Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-deep-teal/10 text-deep-teal rounded-xl">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Visit Log & Monthly Coverage Calendar
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-wider">
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Real-time audit of in-person field check-ins, storefront geotag verifications, and automated visit reminder scheduling for assigned dealer networks.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Switches */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('MONTH')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'MONTH'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Monthly Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('AGENDA')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'AGENDA'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Agenda Feed</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('COVERAGE')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'COVERAGE'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Coverage Health</span>
              </button>
            </div>

            {/* Schedule Reminder Button */}
            <button
              type="button"
              onClick={() => {
                setFormDate(todayKey);
                setShowScheduleModal(true);
              }}
              className="px-3.5 py-2 bg-deep-teal hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Visit Reminder</span>
            </button>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Completed Visits (MTD)
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-xl font-bold text-slate-900 font-mono">
                {monthMetrics.completedCount}
              </strong>
              <span className="text-[10px] font-semibold text-emerald-600">
                {monthMetrics.productiveOrderCount} productive orders
              </span>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{monthMetrics.recoveryCollectedCount} recoveries collected</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Upcoming Scheduled Reminders
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-xl font-bold text-sky-700 font-mono">
                {monthMetrics.pendingRemindersCount}
              </strong>
              <span className="text-[10px] font-semibold text-sky-600">
                {monthMetrics.highPriorityCount} high priority
              </span>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
              <Clock className="w-3 h-3 text-sky-600" />
              <span>Auto-reminder alerts active</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Overdue Follow-ups
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-xl font-bold text-rose-600 font-mono">
                {monthMetrics.overdueRemindersCount}
              </strong>
              <span className="text-[10px] font-semibold text-rose-500">
                Action required
              </span>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>Prioritize for field sales cadence</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Dealer Network Coverage
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-xl font-bold text-emerald-700 font-mono">
                {monthMetrics.coveragePercent}%
              </strong>
              <span className="text-[10px] font-semibold text-slate-600">
                ({monthMetrics.visitedCount}/{monthMetrics.totalAssignedCustomers} Dealers)
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${monthMetrics.coveragePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by dealer name, city, purpose, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-deep-teal focus:bg-white"
            />
          </div>

          {/* Officer filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium text-[11px] whitespace-nowrap">Officer:</span>
            <select
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none text-xs font-medium"
            >
              <option value="ALL">All Representatives ({fieldOfficers.length})</option>
              {fieldOfficers.map((off) => (
                <option key={off} value={off}>
                  {off}
                </option>
              ))}
            </select>
          </div>

          {/* Customer filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium text-[11px] whitespace-nowrap">Dealer:</span>
            <select
              value={selectedCustomerFilter}
              onChange={(e) => setSelectedCustomerFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none text-xs font-medium max-w-[180px]"
            >
              <option value="ALL">All Assigned Dealers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customerCode} - {c.companyName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Quick Filter Pill */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Items
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Logged Visits
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-sky-700 text-white'
                  : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('OVERDUE')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                statusFilter === 'OVERDUE'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Overdue
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN VIEW SWITCHER */}
      {/* ========================================================================= */}

      {/* VIEW A: MONTHLY CALENDAR GRID */}
      {viewMode === 'MONTH' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* Calendar Month Header Bar */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200/80 shadow-xs transition-all"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h3 className="text-base font-bold text-slate-900 font-sans tracking-tight min-w-[160px] text-center">
                {monthNames[month]} {year}
              </h3>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200/80 shadow-xs transition-all"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTodayJump}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200/80 text-[11px] shadow-xs ml-2"
              >
                Today
              </button>
            </div>

            {/* Legend Indicators */}
            <div className="hidden lg:flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 font-medium text-[11px]">Past Logged Visit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                <span className="text-slate-600 font-medium text-[11px]">Pending Reminder</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="text-slate-600 font-medium text-[11px]">Overdue Follow-up</span>
              </div>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-bold text-slate-500 bg-slate-100/50 py-2.5">
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          {/* 7-column Calendar Matrix */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-50/20">
            {calendarCells.map((cell) => {
              const totalItems = cell.dayVisits.length + cell.dayReminders.length;
              const hasCompleted = cell.dayVisits.length > 0;
              const hasPending = cell.dayReminders.some((r) => r.status === 'PENDING');
              const hasOverdue = cell.dayReminders.some((r) => r.status === 'OVERDUE') || (cell.isPast && hasPending);

              return (
                <div
                  key={cell.dateKey}
                  onClick={() => setSelectedDay(cell.date)}
                  className={`min-h-[110px] md:min-h-[135px] p-2 flex flex-col justify-between transition-colors cursor-pointer group hover:bg-slate-50/80 ${
                    !cell.isCurrentMonth ? 'bg-slate-50/40 text-slate-300' : 'bg-white text-slate-800'
                  } ${cell.isToday ? 'ring-2 ring-inset ring-deep-teal bg-emerald-50/10' : ''}`}
                >
                  {/* Top Day Number Row */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        cell.isToday
                          ? 'bg-deep-teal text-white shadow-xs'
                          : cell.isCurrentMonth
                          ? 'text-slate-700 group-hover:text-deep-teal'
                          : 'text-slate-300'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Quick indicator badges */}
                    <div className="flex items-center gap-1">
                      {hasOverdue && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Overdue visit reminders" />
                      )}
                      {totalItems > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                          {totalItems}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day Content Event Pills */}
                  <div className="space-y-1 my-1 overflow-hidden max-h-[85px]">
                    {/* Logged Past Visits */}
                    {cell.dayVisits.slice(0, 2).map((vis) => (
                      <div
                        key={vis.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingVisit(vis);
                        }}
                        className="px-1.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/70 text-[10px] font-semibold flex items-center justify-between gap-1 shadow-2xs truncate transition-all"
                        title={`Logged Visit: ${vis.customerName} by ${vis.salesUserName}`}
                      >
                        <span className="truncate flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{vis.customerName || 'Customer'}</span>
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {vis.orderPlaced && <ShoppingBag className="w-2.5 h-2.5 text-emerald-700" title="Order Booked" />}
                          {vis.recoveryCollected && <DollarSign className="w-2.5 h-2.5 text-emerald-700" title="Recovery Collected" />}
                        </div>
                      </div>
                    ))}

                    {/* Pending Visit Reminders */}
                    {cell.dayReminders.slice(0, 2).map((rem) => (
                      <div
                        key={rem.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDay(cell.date);
                        }}
                        className={`px-1.5 py-1 rounded text-[10px] font-semibold flex items-center justify-between gap-1 shadow-2xs truncate transition-all ${
                          rem.status === 'OVERDUE' || (cell.isPast && rem.status === 'PENDING')
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200/80'
                            : rem.priority === 'HIGH'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80'
                            : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200/80'
                        }`}
                        title={`Pending Reminder: ${rem.customerName} - ${rem.purpose}`}
                      >
                        <span className="truncate flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          <span className="truncate">{rem.customerName}</span>
                        </span>
                        <span className="text-[9px] font-mono opacity-80 shrink-0">
                          {rem.scheduledTime || 'AM'}
                        </span>
                      </div>
                    ))}

                    {totalItems > 4 && (
                      <span className="text-[9px] text-slate-400 font-semibold block text-center">
                        +{totalItems - 4} more
                      </span>
                    )}
                  </div>

                  {/* Bottom Hover Action: Quick Add */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openScheduleForDate(cell.dateKey);
                      }}
                      className="p-1 hover:bg-slate-100 text-slate-500 rounded text-[9px] font-bold flex items-center gap-0.5"
                      title="Schedule visit for this day"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* VIEW B: AGENDA / TIMELINE FEED */}
      {viewMode === 'AGENDA' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <List className="w-4 h-4 text-deep-teal" />
                Chronological Visit & Reminder Timeline
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Month of {monthNames[month]} {year}
              </span>
            </div>

            {/* List Grouped by Date */}
            <div className="divide-y divide-slate-100">
              {Array.from<string>(
                new Set<string>([...visitsByDate.keys(), ...remindersByDate.keys()])
              )
                .sort((a, b) => b.localeCompare(a))
                .map((dateKey: string) => {
                  const dateVisits = visitsByDate.get(dateKey) || [];
                  const dateReminders = remindersByDate.get(dateKey) || [];
                  const isDatePast = dateKey < todayKey;
                  const isDateToday = dateKey === todayKey;

                  return (
                    <div key={dateKey} className="py-4 space-y-3">
                      {/* Date Heading */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                              isDateToday
                                ? 'bg-deep-teal text-white shadow-xs'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {dateKey}
                          </span>
                          <span className="text-xs font-semibold text-slate-600">
                            {new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {isDateToday && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Today
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => openScheduleForDate(dateKey)}
                          className="text-xs font-bold text-deep-teal hover:text-emerald-700 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Schedule Reminder
                        </button>
                      </div>

                      {/* Day Items Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 border-l-2 border-slate-200">
                        {/* Completed Visits */}
                        {dateVisits.map((vis) => (
                          <div
                            key={vis.id}
                            onClick={() => setInspectingVisit(vis)}
                            className="p-3 bg-emerald-50/40 hover:bg-emerald-50/80 border border-emerald-200/80 rounded-xl space-y-2 cursor-pointer transition-all shadow-2xs"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold uppercase tracking-wider">
                                  ✓ Logged Check-in
                                </span>
                                <h4 className="font-bold text-slate-900 text-xs mt-1">
                                  {vis.customerName}
                                </h4>
                                <span className="text-[11px] text-slate-500 block">
                                  Officer: {vis.salesUserName}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">
                                {new Date(vis.checkinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 line-clamp-2 italic bg-white/60 p-2 rounded border border-emerald-100">
                              "{vis.notes || vis.purpose || 'Routine dealer visit'}"
                            </p>

                            <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                              <span className="text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                GPS Recorded
                              </span>
                              <div className="flex items-center gap-2">
                                {vis.orderPlaced && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                    📦 Order
                                  </span>
                                )}
                                {vis.recoveryCollected && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                    💵 Recovery
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Pending / Scheduled Reminders */}
                        {dateReminders.map((rem) => (
                          <div
                            key={rem.id}
                            className={`p-3 rounded-xl border space-y-2 transition-all shadow-2xs ${
                              rem.status === 'OVERDUE' || (isDatePast && rem.status === 'PENDING')
                                ? 'bg-rose-50/40 border-rose-200/80'
                                : 'bg-sky-50/40 border-sky-200/80'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                    rem.status === 'OVERDUE' || (isDatePast && rem.status === 'PENDING')
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-sky-100 text-sky-800'
                                  }`}
                                >
                                  {rem.status === 'OVERDUE' || (isDatePast && rem.status === 'PENDING')
                                    ? '⏰ Overdue Reminder'
                                    : '📅 Scheduled Visit'}
                                </span>
                                <h4 className="font-bold text-slate-900 text-xs mt-1">
                                  {rem.customerName}
                                </h4>
                                <span className="text-[11px] text-slate-500 block">
                                  Assigned to: {rem.assignedEmployeeName}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 font-bold">
                                {rem.scheduledTime || '11:00'}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-700 bg-white/80 p-2 rounded border border-slate-200/60 font-medium">
                              {rem.purpose}
                            </p>

                            {rem.notes && (
                              <p className="text-[10px] text-slate-500 italic">
                                Note: {rem.notes}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                              <span className="text-[10px] text-slate-500">
                                Priority: <strong className={rem.priority === 'HIGH' ? 'text-rose-600' : 'text-slate-700'}>{rem.priority}</strong>
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCompleteReminder(rem.id)}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                                >
                                  <Check className="w-3 h-3" /> Mark Done
                                </button>
                                {onLogVisitClick && (
                                  <button
                                    type="button"
                                    onClick={() => onLogVisitClick(rem.customerId, rem.purpose)}
                                    className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold"
                                  >
                                    Check-In
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW C: DEALER COVERAGE HEALTH MATRIX */}
      {viewMode === 'COVERAGE' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-deep-teal" />
                Assigned Dealer Visit Frequency & Health Audit
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor cadence compliance for all dealers across regions. Flags accounts requiring immediate in-person attention.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total: {customers.length} Network Accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-3">Dealer / Company</th>
                  <th className="p-3">Assigned Officer</th>
                  <th className="p-3">Last Visited</th>
                  <th className="p-3">Days Elapsed</th>
                  <th className="p-3">Outstanding Balance</th>
                  <th className="p-3">Cadence Status</th>
                  <th className="p-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((cust) => {
                  // Find latest visit for this customer
                  const custVisits = visits.filter((v) => v.customerId === cust.id);
                  custVisits.sort((a, b) => (b.checkinTime || '').localeCompare(a.checkinTime || ''));
                  const lastVisit = custVisits[0];

                  let daysSince = 999;
                  if (lastVisit?.checkinTime) {
                    const diffTime = Math.abs(new Date(2026, 7, 27).getTime() - new Date(lastVisit.checkinTime).getTime());
                    daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  }

                  const isHealthy = daysSince <= 7;
                  const isWarning = daysSince > 7 && daysSince <= 14;
                  const isCritical = daysSince > 14;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{cust.companyName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{cust.customerCode} &bull; {cust.city}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-700 font-medium">{cust.assignedEmployee || 'Tariq Mehmood (OB)'}</span>
                        <span className="text-[10px] text-slate-400 block">{cust.region}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {lastVisit?.checkinTime ? lastVisit.checkinTime.slice(0, 10) : 'Never Logged'}
                      </td>
                      <td className="p-3 font-mono font-bold">
                        {daysSince === 999 ? (
                          <span className="text-rose-600">No Record</span>
                        ) : (
                          <span className={isHealthy ? 'text-emerald-700' : isWarning ? 'text-amber-600' : 'text-rose-600'}>
                            {daysSince} days ago
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono">
                        <strong className="text-slate-800">PKR {cust.currentBalance?.toLocaleString()}</strong>
                        <span className="text-[10px] text-slate-400 block">Limit: {cust.creditLimit?.toLocaleString()}</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isHealthy
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isWarning
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isHealthy ? 'Healthy Cadence' : isWarning ? 'Due For Visit' : 'Overdue Visit'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setFormCustId(cust.id);
                            setFormDate('2026-08-28');
                            setFormPurpose(`Scheduled Cadence Visit for ${cust.companyName}`);
                            setShowScheduleModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] transition-all"
                        >
                          + Set Reminder
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DAY DETAILS DRAWER / MODAL */}
      {/* ========================================================================= */}
      {selectedDay && (() => {
        const dateKey = formatDateKey(selectedDay);
        const dayVisits = visitsByDate.get(dateKey) || [];
        const dayReminders = remindersByDate.get(dateKey) || [];

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
              
              {/* Modal Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-deep-teal text-white rounded-xl">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {selectedDay.toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      {dayVisits.length} Logged Visits &bull; {dayReminders.length} Pending Reminders
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 text-sm font-bold"
                >
                  &times;
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-5">
                
                {/* 1. Logged Visits on this Day */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Completed Field Check-Ins ({dayVisits.length})
                    </h4>
                  </div>

                  {dayVisits.length === 0 ? (
                    <p className="text-slate-400 text-xs italic py-2">
                      No visits recorded on this date.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dayVisits.map((vis) => (
                        <div
                          key={vis.id}
                          className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-bold text-slate-900 text-sm">{vis.customerName}</span>
                              <span className="text-xs text-slate-500 block mt-0.5">
                                Logged by: <strong className="text-slate-700">{vis.salesUserName}</strong>
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                              {new Date(vis.checkinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="p-2.5 bg-white rounded-lg border border-slate-100 text-xs space-y-1">
                            <span className="text-slate-500 font-medium">Discussion & Purpose:</span>
                            <p className="text-slate-700 italic">"{vis.notes || vis.purpose}"</p>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                vis.orderPlaced ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                              }`}>
                                Order Booked: {vis.orderPlaced ? 'YES' : 'NO'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                vis.recoveryCollected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                              }`}>
                                Recovery Collected: {vis.recoveryCollected ? 'YES' : 'NO'}
                              </span>
                            </div>

                            {vis.photoUrl && (
                              <button
                                type="button"
                                onClick={() => setInspectingVisit(vis)}
                                className="text-xs text-deep-teal hover:underline font-bold flex items-center gap-1"
                              >
                                <ImageIcon className="w-3.5 h-3.5" /> View Photo
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Pending Reminders for this Day */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-sky-600" />
                      Pending Visit Reminders ({dayReminders.length})
                    </h4>
                  </div>

                  {dayReminders.length === 0 ? (
                    <p className="text-slate-400 text-xs italic py-2">
                      No reminders scheduled for this date.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dayReminders.map((rem) => (
                        <div
                          key={rem.id}
                          className="p-4 rounded-xl bg-sky-50/40 border border-sky-200/80 space-y-2.5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-bold text-slate-900 text-sm">{rem.customerName}</span>
                              <span className="text-xs text-slate-500 block">
                                Assigned to: {rem.assignedEmployeeName} &bull; Time: {rem.scheduledTime}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                rem.priority === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {rem.priority} Priority
                            </span>
                          </div>

                          <div className="p-2.5 bg-white rounded-lg border border-sky-100 text-xs space-y-1">
                            <span className="text-slate-600 font-semibold">{rem.purpose}</span>
                            {rem.notes && <p className="text-slate-500 text-[11px] italic">"{rem.notes}"</p>}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] font-mono text-slate-500">
                              Balance: PKR {rem.currentBalance?.toLocaleString() || '0'}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCompleteReminder(rem.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                              >
                                Mark Completed
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => openScheduleForDate(dateKey)}
                  className="px-4 py-2 bg-deep-teal hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Reminder for this Date
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4. SCHEDULE VISIT REMINDER MODAL */}
      {/* ========================================================================= */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-fade-in">
            <form onSubmit={handleScheduleSubmit}>
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-deep-teal text-white rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Schedule Customer Visit Reminder</h3>
                    <p className="text-[11px] text-slate-500">Plan and assign upcoming dealer visits with priority tags.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Customer Selector */}
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold block">Select Assigned Customer / Dealer*</label>
                  <select
                    value={formCustId}
                    onChange={(e) => setFormCustId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-deep-teal focus:bg-white"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customerCode} - {c.companyName} ({c.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-bold block">Scheduled Date*</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-700 font-bold block">Target Time</label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono"
                    />
                  </div>
                </div>

                {/* Purpose */}
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold block">Purpose of Visit*</label>
                  <input
                    type="text"
                    placeholder="e.g. Overdue payment recovery, new product booking, stock audit..."
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    required
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>

                {/* Priority & Reason */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-bold block">Priority Level</label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as any)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                    >
                      <option value="HIGH">HIGH (Urgent)</option>
                      <option value="MEDIUM">MEDIUM (Standard)</option>
                      <option value="LOW">LOW (Informational)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-700 font-bold block">Visit Reason Category</label>
                    <select
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value as any)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                    >
                      <option value="ROUTINE_CYCLE">Routine Cadence</option>
                      <option value="OVERDUE_RECOVERY">Payment Recovery</option>
                      <option value="SCHEDULED_FOLLOWUP">Order Booking Follow-up</option>
                      <option value="INACTIVE_ACCOUNT">Re-activation Call</option>
                    </select>
                  </div>
                </div>

                {/* Assigned Officer */}
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold block">Assigned Field Representative</label>
                  <select
                    value={formOfficerName}
                    onChange={(e) => setFormOfficerName(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                  >
                    {fieldOfficers.map((off) => (
                      <option key={off} value={off}>
                        {off}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold block">Special Instructions / Agenda Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Provide specific notes or discussion targets for the field officer..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-deep-teal hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  Save & Schedule Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VISIT INSPECTION POPUP MODAL (PHOTO & GPS AUDIT) */}
      {/* ========================================================================= */}
      {inspectingVisit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Field Visit Audit Details</h3>
                  <span className="text-[10px] font-mono text-slate-500">ID: {inspectingVisit.id.toUpperCase()}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingVisit(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Dealer / Customer</span>
                  <strong className="text-slate-900 text-sm">{inspectingVisit.customerName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Logged Representative</span>
                  <strong className="text-slate-800">{inspectingVisit.salesUserName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Check-In Timestamp</span>
                  <span className="font-mono text-slate-700">
                    {new Date(inspectingVisit.checkinTime).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">GPS Verification</span>
                  <span className="font-mono text-emerald-700 font-semibold flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {inspectingVisit.latitude?.toFixed(4)}, {inspectingVisit.longitude?.toFixed(4)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Discussion & Assessment Notes</span>
                <p className="text-slate-800 italic leading-relaxed">
                  "{inspectingVisit.notes || inspectingVisit.purpose || 'Routine customer visit completed.'}"
                </p>
              </div>

              {/* Photo Display */}
              {inspectingVisit.photoUrl ? (
                <div className="space-y-1.5">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Attached Storefront / Receipt Photo</span>
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-h-56 bg-slate-100 flex items-center justify-center">
                    <img
                      src={inspectingVisit.photoUrl}
                      alt="Storefront Capture"
                      className="w-full h-full object-contain max-h-56"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center bg-slate-50 border border-dashed rounded-xl text-slate-400 text-xs italic">
                  No storefront photo was captured for this check-in.
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingVisit(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
