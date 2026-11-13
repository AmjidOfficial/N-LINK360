/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Department 9: HR & Administration Management
 * National Lights (Pvt.) Ltd. - Peshawar Head Office
 */

import React, { useState, useMemo } from 'react';
import { NLinkUser, getStoredUsers } from '../../data/nlink-users-team';
import { EmployeeAttendance, LeaveRequest } from '../../types';
import { Calendar, FileText, Search, Plus, CheckCircle2, XCircle, Trash2, Edit3, Users2 } from 'lucide-react';
import { isAuthorizedApproverEmail } from '../../services/production-users';

interface HrAdminModuleProps {
  currentUser: NLinkUser;
  attendanceRecords: EmployeeAttendance[];
  leaveRequests?: LeaveRequest[];
  onSaveAttendanceEdit?: (recordId: string, updates: Partial<EmployeeAttendance>) => void;
  onDeleteAttendance?: (recordId: string, reason?: string) => void;
  onSubmitLeaveRequest?: (req: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>) => void;
  onReviewLeaveRequest?: (requestId: string, decision: 'APPROVED' | 'REJECTED', notes?: string) => void;
}

export const HrAdminModule: React.FC<HrAdminModuleProps> = ({
  currentUser,
  attendanceRecords = [],
  leaveRequests = [],
  onSaveAttendanceEdit,
  onDeleteAttendance,
  onSubmitLeaveRequest,
  onReviewLeaveRequest,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'LEAVE_REQUESTS' | 'HIERARCHY'>('ATTENDANCE');

  // Leave request form state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveRequest['leaveType']>('CASUAL');
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaveReason, setLeaveReason] = useState('');

  // Attendance edit modal
  const [editingAtt, setEditingAtt] = useState<EmployeeAttendance | null>(null);
  const [editStatus, setEditStatus] = useState<EmployeeAttendance['status']>('PRESENT');
  const [editRemarks, setEditRemarks] = useState('');

  const roster = useMemo(() => getStoredUsers(), []);
  const isApprover = isAuthorizedApproverEmail(currentUser.email, currentUser);

  const filteredRecords = useMemo(() => {
    const q = filterQuery.toLowerCase();
    return attendanceRecords.filter(
      (r) =>
        (r.employeeName || '').toLowerCase().includes(q) ||
        (r.date || '').includes(q) ||
        (r.checkInLocation || '').toLowerCase().includes(q)
    );
  }, [attendanceRecords, filterQuery]);

  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitLeaveRequest || !leaveReason.trim()) return;
    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);
    const diffDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    onSubmitLeaveRequest({
      employeeId: currentUser.id,
      employeeCode: currentUser.employeeCode,
      employeeName: currentUser.fullName,
      department: currentUser.department,
      leaveType,
      fromDate,
      toDate,
      daysCount: diffDays,
      reason: leaveReason.trim(),
    });
    setLeaveReason('');
    setIsLeaveModalOpen(false);
  };

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAtt || !onSaveAttendanceEdit) return;
    onSaveAttendanceEdit(editingAtt.id, {
      status: editStatus,
      remarks: editRemarks.trim() || undefined,
    });
    setEditingAtt(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Department 9 &middot; HR &amp; Administration
          </p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
            Attendance, Leave Management &amp; Reporting Hierarchy
          </h2>
        </div>

        {onSubmitLeaveRequest && (
          <button
            type="button"
            onClick={() => setIsLeaveModalOpen(true)}
            className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Apply Leave</span>
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {(
          [
            { id: 'ATTENDANCE', label: `Attendance Monitoring (${attendanceRecords.length})` },
            { id: 'LEAVE_REQUESTS', label: `Leave Management (${leaveRequests.length})` },
            { id: 'HIERARCHY', label: `Org Hierarchy (${roster.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-semibold text-xs border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ATTENDANCE MONITORING */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee, date or town..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-bold">
                <tr>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Location / Beat</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Check-in</th>
                  <th className="py-3 px-3">Check-out</th>
                  {(onSaveAttendanceEdit || onDeleteAttendance) && <th className="py-3 px-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No attendance records logged yet.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        <div>{r.employeeName}</div>
                        <div className="text-[10px] text-slate-500">{r.designation}</div>
                      </td>
                      <td className="py-3 px-3 font-mono">{r.date}</td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{r.checkInLocation || r.location || '-'}</td>
                      <td className="py-3 px-3">
                        <span className={`font-mono font-bold text-[11px] ${r.status === 'PRESENT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono">{r.checkInTime || '-'}</td>
                      <td className="py-3 px-3 font-mono">{r.checkOutTime || '-'}</td>
                      {(onSaveAttendanceEdit || onDeleteAttendance) && (
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onSaveAttendanceEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAtt(r);
                                  setEditStatus(r.status);
                                  setEditRemarks(r.remarks || '');
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="Edit Attendance"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteAttendance && (
                              <button
                                type="button"
                                onClick={() => onDeleteAttendance(r.id, 'Removed by HR Admin')}
                                className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                title="Delete Attendance Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEAVE MANAGEMENT */}
      {activeTab === 'LEAVE_REQUESTS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {leaveRequests.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <Calendar className="w-9 h-9 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">No leave applications submitted yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaveRequests.map((req) => (
                <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {req.employeeName} <span className="font-mono text-slate-500">({req.employeeCode})</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                      {req.leaveType} &middot; {req.fromDate} to {req.toDate} ({req.daysCount} day{req.daysCount > 1 ? 's' : ''})
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{req.reason}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold text-[11px] ${
                      req.status === 'APPROVED' ? 'text-emerald-600' : req.status === 'REJECTED' ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                      {req.status}
                    </span>
                    {req.status === 'PENDING' && isApprover && onReviewLeaveRequest && (
                      <>
                        <button
                          type="button"
                          onClick={() => onReviewLeaveRequest(req.id, 'APPROVED', 'Approved by HR / Executive')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onReviewLeaveRequest(req.id, 'REJECTED', 'Declined by HR / Executive')}
                          className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORG HIERARCHY & TERRITORY MAPPING */}
      {activeTab === 'HIERARCHY' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Designation &amp; Department</th>
                  <th className="py-3 px-4">Reporting Manager</th>
                  <th className="py-3 px-4">Region / Zone / Towns</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {roster.map((emp) => (
                  <tr key={emp.id}>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>{emp.fullName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{emp.employeeCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{emp.roleTitle}</div>
                      <div className="text-[10px] text-slate-500">{emp.department.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="py-3 px-4 font-medium">{emp.reportingTo || 'Shahzad Ullah'}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {emp.region} / {emp.territory} &middot; {emp.assignedTowns?.join(', ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {emp.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Application Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Submit Leave Application</h3>
            <form onSubmit={handleCreateLeave} className="space-y-3">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveRequest['leaveType'])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Edit Modal */}
      {editingAtt && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Update Attendance &middot; {editingAtt.employeeName}
            </h3>
            <form onSubmit={handleSaveAttendance} className="space-y-3">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as EmployeeAttendance['status'])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                  <option value="HALF_DAY">HALF DAY</option>
                  <option value="ON_LEAVE">ON LEAVE</option>
                  <option value="ABSENT">ABSENT</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Remarks</label>
                <input
                  type="text"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingAtt(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2 rounded-xl font-bold cursor-pointer">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
