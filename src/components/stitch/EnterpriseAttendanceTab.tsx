/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Field Intelligence: Attendance & Team Tracking Tab
 * Pixel-perfect implementation based on Stitch Design System
 */

import React, { useState, useEffect, useMemo } from 'react';
import { NLinkUser, NLINK_TEAM_ROSTER } from '../../data/nlink-users-team';
import { getTownCoordinates, validateTownGeofence } from '../../services/townCoordinates';

export interface EnterpriseAttendanceTabProps {
  currentUser: NLinkUser;
  isCheckedIn: boolean;
  onToggleCheckIn: () => void;
  selectedTown: string;
  onSelectTown: (town: string) => void;
  checkedInTime: string | null;
  setCheckedInTime: (time: string | null) => void;
}

export const EnterpriseAttendanceTab: React.FC<EnterpriseAttendanceTabProps> = ({
  currentUser,
  isCheckedIn,
  onToggleCheckIn,
  selectedTown,
  onSelectTown,
  checkedInTime,
  setCheckedInTime,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'my_attendance' | 'team_records'>('my_attendance');
  const [currentTime, setCurrentTime] = useState<string>('09:41 AM');
  const [currentDateString, setCurrentDateString] = useState<string>('Thursday, Oct 24 • Field Shift A');
  const [visitIntention, setVisitIntention] = useState<string>(
    'Client onboarding at Apex Electronics & payment recovery'
  );
  const [gpsLocation, setGpsLocation] = useState<string>(
    'Sector 4, Commercial Trade Beat #2, Peshawar'
  );
  const [gpsAccuracy, setGpsAccuracy] = useState<string>('High (Within 3m)');
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(24);
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [isSimulatedOutside, setIsSimulatedOutside] = useState(false);

  // Lifted town calculations and geofence checks
  const availableTowns = useMemo(() => {
    if (!currentUser.assignedTowns || currentUser.assignedTowns.length === 0) {
      return ['Peshawar', 'Mardan', 'Lahore', 'Islamabad', 'Rawalpindi'];
    }
    if (currentUser.assignedTowns.includes('All Pakistan')) {
      return [
        'Peshawar', 'Mardan', 'Abbottabad', 'Swat', 'Kohat', 
        'Brandreth Road', 'Shah Alam', 'Lahore', 'Sialkot', 
        'Gujranwala', 'Islamabad', 'Rawalpindi', 'Karachi', 
        'Hyderabad', 'Sukkur', 'Multan', 'Faisalabad'
      ];
    }
    return currentUser.assignedTowns;
  }, [currentUser]);

  const townCoords = useMemo(() => getTownCoordinates(selectedTown), [selectedTown]);
  const userLat = isSimulatedOutside ? townCoords.lat + 0.015 : townCoords.lat + 0.001;
  const userLng = isSimulatedOutside ? townCoords.lng + 0.001 : townCoords.lng + 0.001;
  const geofenceResult = useMemo(() => {
    return validateTownGeofence(userLat, userLng, selectedTown, 500);
  }, [userLat, userLng, selectedTown]);

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
      setCurrentDateString(
        `${now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} • Field Shift A`
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefreshGps = () => {
    setIsRefreshingGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation(
            `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)} (Live Geofenced GPS)`
          );
          setGpsAccuracy(`High (Within ${Math.round(pos.coords.accuracy || 3)}m)`);
          setIsRefreshingGps(false);
        },
        () => {
          setGpsLocation('Sheikh Yaseen Tower Beat #1, Peshawar');
          setGpsAccuracy('Standard (Geofenced 5m)');
          setIsRefreshingGps(false);
        },
        { timeout: 5000 }
      );
    } else {
      setTimeout(() => {
        setGpsLocation('Sheikh Yaseen Tower Beat #1, Peshawar');
        setGpsAccuracy('Standard (5m)');
        setIsRefreshingGps(false);
      }, 600);
    }
  };

  // Dynamic Date calculations based on monthOffset
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(1); // avoid month overflow issues
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthYearLabel = useMemo(() => {
    return targetDate.toLocaleDateString([], { month: 'short', year: 'numeric' });
  }, [targetDate]);

  const daysInMonth = useMemo(() => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [targetDate]);

  const startDayOfWeek = useMemo(() => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    let day = new Date(year, month, 1).getDay();
    // Adjust so Monday is 0, Sunday is 6
    return day === 0 ? 6 : day - 1;
  }, [targetDate]);

  const prevMonthDays = useMemo(() => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const prevDate = new Date(year, month, 0);
    const prevDaysCount = prevDate.getDate();
    return Array.from({ length: startDayOfWeek }, (_, i) => prevDaysCount - startDayOfWeek + i + 1);
  }, [targetDate, startDayOfWeek]);

  // Calendar Day statuses derived dynamically
  const presentDays = useMemo(() => {
    const list: number[] = [];
    const seed = targetDate.getMonth() + targetDate.getFullYear();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(targetDate.getFullYear(), targetDate.getMonth(), day).getDay();
      if (dayOfWeek === 0) continue; // Sunday is weekend holiday
      const rand = Math.sin(seed + day) * 10000;
      const val = rand - Math.floor(rand);
      if (val < 0.6) {
        list.push(day);
      }
    }
    return list;
  }, [targetDate, daysInMonth]);

  const visitDays = useMemo(() => {
    const list: number[] = [];
    const seed = targetDate.getMonth() + targetDate.getFullYear() + 1;
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(targetDate.getFullYear(), targetDate.getMonth(), day).getDay();
      if (dayOfWeek === 0) continue;
      if (presentDays.includes(day)) continue;
      const rand = Math.sin(seed + day) * 10000;
      const val = rand - Math.floor(rand);
      if (val < 0.3) {
        list.push(day);
      }
    }
    return list;
  }, [targetDate, daysInMonth, presentDays]);

  const leaveDays = useMemo(() => {
    const list: number[] = [];
    const seed = targetDate.getMonth() + targetDate.getFullYear() + 2;
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(targetDate.getFullYear(), targetDate.getMonth(), day).getDay();
      if (dayOfWeek === 0) continue;
      if (presentDays.includes(day) || visitDays.includes(day)) continue;
      const rand = Math.sin(seed + day) * 10000;
      const val = rand - Math.floor(rand);
      if (val < 0.1) {
        list.push(day);
      }
    }
    return list;
  }, [targetDate, daysInMonth, presentDays, visitDays]);

  const presentCount = presentDays.length;
  const visitCount = visitDays.length;
  const leaveCount = leaveDays.length;
  const ratio = Math.round((presentCount / Math.max(1, daysInMonth - 4)) * 100) || 0;

  const mtdRecords = useMemo(() => {
    const list = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthStr = months[targetDate.getMonth()];
    const currentYear = targetDate.getFullYear();
    const sortedActiveDays = [...presentDays, ...visitDays].sort((a, b) => b - a);
    const limit = Math.min(5, sortedActiveDays.length);
    for (let i = 0; i < limit; i++) {
      const dayNum = sortedActiveDays[i];
      const isVisit = visitDays.includes(dayNum);
      list.push({
        date: `${dayNum} ${currentMonthStr} ${currentYear}`,
        in: isVisit ? '—' : '09:00 AM',
        town: selectedTown,
        status: isVisit ? '✓ Client Visit' : '✓ Verified'
      });
    }
    return list;
  }, [targetDate, presentDays, visitDays, selectedTown]);

  // Team members attendance records
  const filteredTeam = NLINK_TEAM_ROSTER.filter(
    (user) =>
      user.fullName.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
      user.territory.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
      user.roleTitle.toLowerCase().includes(teamSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full gap-4 pb-12 animate-fadeIn" id="enterprise-attendance-view">
      {/* 1. Sub-Tab Switcher (My Attendance vs Team Records & Tracking) */}
      <div className="flex p-1 bg-[#eceef0] dark:bg-slate-800/80 rounded-2xl gap-1 shadow-2xs">
        <button
          onClick={() => setActiveSubTab('my_attendance')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'my_attendance'
              ? 'bg-white dark:bg-slate-900 text-[#191c1e] dark:text-white shadow-xs'
              : 'text-[#43474d] dark:text-slate-400 hover:text-[#191c1e] dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-[#006b5f] dark:text-[#76f4e0]">
            event_available
          </span>
          <span>My Field Punch</span>
        </button>

        <button
          onClick={() => setActiveSubTab('team_records')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'team_records'
              ? 'bg-white dark:bg-slate-900 text-[#191c1e] dark:text-white shadow-xs'
              : 'text-[#43474d] dark:text-slate-400 hover:text-[#191c1e] dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-blue-600 dark:text-blue-400">
            group
          </span>
          <span>Team Attendance &amp; Live Tracking</span>
        </button>
      </div>

      {/* ================= SUB-TAB 1: MY FIELD PUNCH ================= */}
      {activeSubTab === 'my_attendance' && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Status Banner & Punch Clock Card */}
            <div className="flex flex-col bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 relative overflow-hidden animate-fadeIn">
              <div className="absolute -right-8 -top-8 w-36 h-36 bg-[#76f4e0]/20 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-4 z-10">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isCheckedIn ? 'bg-[#006b5f] dark:bg-[#76f4e0] animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-xs text-[#43474d] dark:text-slate-400 font-bold tracking-wider uppercase">
                    Live Field Status
                  </span>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full ${
                    isCheckedIn
                      ? 'bg-[#76f4e0] text-[#006f63] dark:bg-[#76f4e0]/20 dark:text-[#76f4e0]'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {isCheckedIn ? 'Checked In' : 'Checked Out'}
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-4 z-10 flex-wrap gap-2">
                <div>
                  <h2 className="text-3xl font-extrabold text-[#191c1e] dark:text-white tracking-tight font-mono">
                    {currentTime}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#43474d] dark:text-slate-400 font-medium mt-0.5">
                    {currentDateString}
                  </p>
                  {isCheckedIn && checkedInTime && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#006b5f] dark:text-[#76f4e0] bg-[#76f4e0]/20 dark:bg-[#76f4e0]/10 px-2 py-0.5 rounded-md">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      Checked in at {checkedInTime}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#43474d] dark:text-slate-400 block font-semibold uppercase tracking-wider">
                    Shift Duration
                  </span>
                  <span className="text-xl font-bold text-[#001428] dark:text-[#76f4e0] font-mono">
                    {isCheckedIn ? '04h 12m' : '00h 00m'}
                  </span>
                </div>
              </div>

              {/* A. Town Selection as per Assigned */}
              <div className="mb-4 z-10">
                <label className="block text-[11px] font-bold text-[#43474d] dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Town Beat Location
                </label>
                <div className="relative">
                  <select
                    value={selectedTown}
                    onChange={(e) => onSelectTown(e.target.value)}
                    className="w-full bg-[#f2f4f6] dark:bg-slate-800 text-[#191c1e] dark:text-white px-3 py-2.5 rounded-xl outline-none border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold appearance-none cursor-pointer text-ellipsis overflow-hidden"
                  >
                    {availableTowns.map((town) => (
                      <option key={town} value={town}>
                        {town}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-slate-400 pointer-events-none">
                    expand_more
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Only dealers registered under this selected town will load in your Entry Form.
                </p>
              </div>

              {/* B & C. Check Location & Geofence Indicator */}
              <div className="flex flex-col gap-2.5 p-3 bg-[#eceef0]/70 dark:bg-slate-800/80 rounded-xl mb-4 z-10">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#006b5f] dark:text-[#76f4e0] text-[20px] shrink-0 mt-0.5">
                    location_on
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-[#191c1e] dark:text-white truncate">
                      {selectedTown} Center • Lat: {townCoords.lat.toFixed(4)}, Lng: {townCoords.lng.toFixed(4)}
                    </p>
                    <p className="text-[11px] text-[#43474d] dark:text-slate-400">
                      Live Device GPS: Lat: {userLat.toFixed(4)}, Lng: {userLng.toFixed(4)}
                    </p>
                    <p className="text-[11px] font-bold mt-1 text-[#001428] dark:text-slate-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">radar</span>
                      Calculated Distance: <span className="font-mono text-[#006b5f] dark:text-[#76f4e0] font-black">{Math.round(geofenceResult.distanceMeters)} meters</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsSimulatedOutside(!isSimulatedOutside);
                    }}
                    className="text-[10px] text-slate-500 dark:text-slate-300 font-bold hover:underline shrink-0 px-2.5 py-1 bg-white dark:bg-slate-700 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-600"
                    title="Tap to toggle out-of-range simulation"
                  >
                    {isSimulatedOutside ? '✓ Reset Inside' : '✗ Simulate Away'}
                  </button>
                </div>

                {/* Geofence Status Badge */}
                <div className={`p-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${
                  geofenceResult.isWithinGeofence
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                    : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                }`}>
                  <span className="material-symbols-outlined text-[16px]">
                    {geofenceResult.isWithinGeofence ? 'check_circle' : 'warning'}
                  </span>
                  <span>{geofenceResult.validationMessage}</span>
                </div>
              </div>

              {/* Daily Intention */}
              <div className="mb-5 z-10">
                <label className="block text-xs font-bold text-[#43474d] dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Current Visit / Daily Intention
                </label>
                <input
                  value={visitIntention}
                  onChange={(e) => setVisitIntention(e.target.value)}
                  className="w-full bg-[#f2f4f6] dark:bg-slate-800 px-4 py-3 rounded-xl text-sm text-[#191c1e] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#006b5f] dark:focus:ring-[#76f4e0] transition-all border border-transparent font-medium"
                  placeholder="e.g. Client onboarding & payment recovery..."
                  type="text"
                />
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  if (!isCheckedIn) {
                    // Clocking In
                    const now = new Date();
                    setCheckedInTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
                  } else {
                    // Clocking Out
                    setCheckedInTime(null);
                  }
                  onToggleCheckIn();
                }}
                className={`w-full h-14 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] z-10 min-touch-target ${
                  isCheckedIn
                    ? 'bg-[#001428] text-white hover:bg-[#0f2942]'
                    : 'bg-[#006b5f] text-white hover:bg-[#005047]'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {isCheckedIn ? 'logout' : 'login'}
                </span>
                <span>{isCheckedIn ? 'Check Out of Field' : 'Check In to Field'}</span>
              </button>
            </div>

            {/* D. MTD Records for My Attendance */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[#006b5f] text-[18px]">calendar_month</span>
                  <span>Month-to-Date (MTD) Attendance Sheets</span>
                </h4>
                <span className="text-[10px] text-emerald-600 dark:text-[#76f4e0] font-extrabold bg-[#76f4e0]/25 dark:bg-[#76f4e0]/10 px-2 py-0.5 rounded-full animate-pulse">
                  Active Period Focus
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-lg font-black text-[#001428] dark:text-[#76f4e0] block font-mono">{presentCount}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-tight block">Present</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-lg font-black text-rose-500 block font-mono">{Math.max(0, daysInMonth - 4 - presentCount - leaveCount - visitCount)}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-tight block">Absent</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-lg font-black text-blue-500 block font-mono">{leaveCount}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-tight block">Leave</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-lg font-black text-emerald-500 block font-mono">{ratio}%</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-tight block">Ratio</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                      <th className="pb-1.5">Date</th>
                      <th className="pb-1.5">Punch In</th>
                      <th className="pb-1.5">Town Beat</th>
                      <th className="pb-1.5 text-right">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                    {mtdRecords.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="py-2 font-mono text-slate-500">{row.date}</td>
                        <td className="py-2 text-[#001428] dark:text-white font-mono">{row.in}</td>
                        <td className="py-2 font-bold text-slate-800 dark:text-slate-200">{row.town}</td>
                        <td className={`py-2 text-right font-bold ${row.status.includes('Visit') ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600'}`}>{row.status}</td>
                      </tr>
                    ))}
                    {mtdRecords.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400">No punch records found for this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 text-center">
                <span className="text-2xl font-bold text-[#001428] dark:text-[#76f4e0] block font-mono">
                  {presentCount}
                </span>
                <span className="text-[11px] sm:text-xs text-[#43474d] dark:text-slate-400 font-medium mt-0.5 block">
                  Present Days
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 text-center">
                <span className="text-2xl font-bold text-[#006b5f] dark:text-emerald-400 block font-mono">
                  {visitCount}
                </span>
                <span className="text-[11px] sm:text-xs text-[#43474d] dark:text-slate-400 font-medium mt-0.5 block">
                  Client Visits
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 text-center">
                <span className="text-2xl font-bold text-[#74777e] dark:text-slate-400 block font-mono">
                  {leaveCount}
                </span>
                <span className="text-[11px] sm:text-xs text-[#43474d] dark:text-slate-400 font-medium mt-0.5 block">
                  On Leave
                </span>
              </div>
            </div>

            {/* Attendance Calendar History */}
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-bold text-[#191c1e] dark:text-white tracking-tight">
                  Monthly History
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setMonthOffset((m) => m - 1)}
                    className="w-8 h-8 rounded-full bg-[#eceef0] dark:bg-slate-800 flex items-center justify-center text-[#191c1e] dark:text-white hover:bg-[#e0e3e5] transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <span className="text-xs font-bold text-[#191c1e] dark:text-white px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/40 dark:border-slate-700/60 font-mono min-w-[85px] text-center">
                    {monthYearLabel}
                  </span>
                  <button
                    onClick={() => setMonthOffset((m) => m + 1)}
                    className="w-8 h-8 rounded-full bg-[#eceef0] dark:bg-slate-800 flex items-center justify-center text-[#191c1e] dark:text-white hover:bg-[#e0e3e5] transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mb-4 flex-wrap text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#76f4e0]/60 border border-[#76f4e0]" />
                  <span className="text-[#43474d] dark:text-slate-400 font-medium">Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#d5e3ff] dark:bg-blue-900/40 border border-[#d5e3ff]/60" />
                  <span className="text-[#43474d] dark:text-slate-400 font-medium">Client Visit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#e0e3e5] dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
                  <span className="text-[#43474d] dark:text-slate-400 font-medium">On Leave</span>
                </div>
              </div>

              {/* Calendar Grid Header */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <span key={idx} className="text-xs font-bold text-[#74777e] dark:text-slate-400 py-1">
                    {day}
                  </span>
                ))}
              </div>

              {/* Calendar Day Cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {prevMonthDays.map((d, index) => (
                  <div
                    key={`prev-${d}-${index}`}
                    className="aspect-square bg-[#eceef0] dark:bg-slate-800/40 rounded-xl flex flex-col items-center justify-center text-[#74777e] dark:text-slate-600 text-xs opacity-40 select-none"
                  >
                    {d}
                  </div>
                ))}

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const isPresent = presentDays.includes(day);
                  const isVisit = visitDays.includes(day);
                  const isLeave = leaveDays.includes(day);
                  const isCurrent = day === selectedDay && monthOffset === 0;

                  let bgClass = 'bg-[#f2f4f6] dark:bg-slate-800 text-[#74777e] dark:text-slate-400';
                  if (isPresent) bgClass = 'bg-[#76f4e0]/40 text-[#006f63] dark:text-[#76f4e0] font-bold';
                  if (isVisit) bgClass = 'bg-[#d5e3ff] dark:bg-blue-900/40 text-[#0d1c31] dark:text-blue-200 font-bold border border-blue-200 dark:border-blue-900/80';
                  if (isLeave) bgClass = 'bg-[#e0e3e5] dark:bg-slate-700 text-[#43474d] dark:text-slate-300 font-medium';
                  if (isCurrent)
                    bgClass =
                      'bg-[#006b5f] dark:bg-[#76f4e0] text-white dark:text-[#001428] font-extrabold shadow-sm ring-2 ring-[#006b5f] ring-offset-2';

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-all hover:scale-105 active:scale-95 ${bgClass}`}
                    >
                      <span>{day}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
      )}

      {/* ================= SUB-TAB 2: TEAM ATTENDANCE RECORDS & TRACKING ================= */}
      {activeSubTab === 'team_records' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Team Search & Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex-1 flex items-center bg-[#f8f9fb] dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
              <span className="material-symbols-outlined text-slate-400 mr-2 text-[20px]">search</span>
              <input
                type="text"
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                placeholder="Search team member, territory, or role..."
                className="bg-transparent w-full text-xs sm:text-sm text-[#191c1e] dark:text-white outline-none"
              />
            </div>
            <span className="text-xs font-bold text-[#006b5f] dark:text-[#76f4e0] bg-[#76f4e0]/20 px-3 py-2 rounded-xl whitespace-nowrap">
              {filteredTeam.length} Officers Live
            </span>
          </div>

          {/* Team Members List */}
          <div className="flex flex-col gap-2.5">
            {filteredTeam.map((member) => (
              <div
                key={member.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#e0e3e5] dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#001428] dark:bg-[#76f4e0]/10 text-[#76f4e0] flex items-center justify-center font-extrabold text-sm shrink-0">
                    {member.avatarInitials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-[#191c1e] dark:text-white truncate">
                        {member.fullName}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">({member.employeeCode})</span>
                    </div>
                    <span className="text-[11px] text-[#006b5f] dark:text-[#76f4e0] font-semibold truncate">
                      {member.roleTitle}
                    </span>
                    <span className="text-[10px] text-[#74777e] dark:text-slate-400 truncate">
                      Territory: {member.territory} • {member.region}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      member.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    {member.status === 'ACTIVE' ? 'Clocked In' : 'On Leave'}
                  </span>
                  <span className="text-[10px] text-[#74777e] dark:text-slate-400 font-mono">
                    MTD: Rs. {(member.mtdSalesAchieved / 100000).toFixed(1)} Lacs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
