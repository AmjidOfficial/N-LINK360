/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Enterprise Field Intelligence: Attendance & Team Tracking Tab
 * Pixel-perfect implementation based on Stitch Design System
 */

import React, { useState, useEffect, useMemo } from 'react';
import { NLinkUser, NLINK_TEAM_ROSTER } from '../../data/nlink-users-team';
import { getTownCoordinates, validateTownGeofence } from '../../services/townCoordinates';
import { Customer, SalesOrder, Recovery } from '../../types';

export interface EnterpriseAttendanceTabProps {
  currentUser: NLinkUser;
  isCheckedIn: boolean;
  onToggleCheckIn: () => void;
  selectedTown: string;
  onSelectTown: (town: string) => void;
  checkedInTime: string | null;
  setCheckedInTime: (time: string | null) => void;
  orders?: SalesOrder[];
  recoveries?: Recovery[];
  customers?: Customer[];
}

export const EnterpriseAttendanceTab: React.FC<EnterpriseAttendanceTabProps> = ({
  currentUser,
  isCheckedIn,
  onToggleCheckIn,
  selectedTown,
  onSelectTown,
  checkedInTime,
  setCheckedInTime,
  orders = [],
  recoveries = [],
  customers = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'my_attendance' | 'team_records'>('my_attendance');
  const [currentTime, setCurrentTime] = useState<string>('09:41 AM');
  const [currentDateString, setCurrentDateString] = useState<string>('Thursday, Oct 24 • Field Shift A');
  const [gpsLocation, setGpsLocation] = useState<string>(
    'Sector 4, Commercial Trade Beat #2, Peshawar'
  );
  const [gpsAccuracy, setGpsAccuracy] = useState<string>('High (Within 3m)');
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [isSimulatedOutside, setIsSimulatedOutside] = useState(false);

  const isExecutive =
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'MANAGEMENT' ||
    currentUser.email === 'shahzadullah@nationallights.com' ||
    currentUser.email === 'nationallights2026@gmail.com';

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

  const presentCount = isCheckedIn ? 21 : 20;
  const visitCount = 4;
  const leaveCount = 1;
  const ratio = Math.round((presentCount / 26) * 100) || 0;

  const dailyWorkingHistory = useMemo(() => {
    const map = new Map<string, {
      date: string;
      town: string;
      dealerSet: Set<string>;
      recovery: number;
      order: number;
    }>();

    // Ingest Orders
    orders.forEach((o) => {
      const dStr = (o.orderDate || o.createdAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
      const customer = customers.find((c) => c.id === o.customerId);
      const town = customer?.city || selectedTown || 'Peshawar';

      if (!map.has(dStr)) {
        map.set(dStr, {
          date: dStr,
          town,
          dealerSet: new Set<string>(),
          recovery: 0,
          order: 0,
        });
      }
      const item = map.get(dStr)!;
      if (o.customerId) item.dealerSet.add(o.customerId);
      item.order += o.totalAmount || 0;
    });

    // Ingest Recoveries
    recoveries.forEach((r) => {
      const dStr = (r.collectionDate || r.createdAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
      const customer = customers.find((c) => c.id === r.customerId);
      const town = customer?.city || selectedTown || 'Peshawar';

      if (!map.has(dStr)) {
        map.set(dStr, {
          date: dStr,
          town,
          dealerSet: new Set<string>(),
          recovery: 0,
          order: 0,
        });
      }
      const item = map.get(dStr)!;
      if (r.customerId) item.dealerSet.add(r.customerId);
      item.recovery += r.amount || 0;
    });

    // If currently checked in today, ensure today's row exists
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!map.has(todayStr)) {
      map.set(todayStr, {
        date: todayStr,
        town: selectedTown || 'Peshawar',
        dealerSet: new Set<string>(),
        recovery: 0,
        order: 0,
      });
    }

    return Array.from(map.values())
      .map((entry) => ({
        date: entry.date,
        town: entry.town,
        visitedDealerCount: entry.dealerSet.size,
        recoveryAmount: entry.recovery,
        orderAmount: entry.order,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, recoveries, customers, selectedTown]);

  // Team members attendance records - Strictly filtered for assigned team only
  const filteredTeam = useMemo(() => {
    return NLINK_TEAM_ROSTER.filter((user) => {
      // If executive, they have oversight over all officers
      if (!isExecutive) {
        // Must belong to user's assigned territory, region, or towns
        const assignedTowns = currentUser.assignedTowns || [];
        const matchesTerritory = user.territory === currentUser.territory || user.region === currentUser.region;
        const matchesTown = assignedTowns.some(t => user.assignedTowns?.includes(t) || user.territory.includes(t));
        const isSelf = user.id === currentUser.id;
        if (!matchesTerritory && !matchesTown && !isSelf) {
          return false;
        }
      }

      if (!teamSearchQuery.trim()) return true;
      const q = teamSearchQuery.toLowerCase();
      return (
        user.fullName.toLowerCase().includes(q) ||
        user.territory.toLowerCase().includes(q) ||
        user.roleTitle.toLowerCase().includes(q)
      );
    });
  }, [currentUser, isExecutive, teamSearchQuery]);

  return (
    <div className="flex flex-col w-full gap-4 pb-12 animate-fadeIn" id="enterprise-attendance-view">
      {/* 1. Sub-Tab Switcher (My Attendance vs Team Records & Tracking) */}
      <div className="flex p-1.5 bg-slate-100 dark:bg-slate-950/60 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl gap-1.5 shadow-3xs">
        <button
          onClick={() => setActiveSubTab('my_attendance')}
          className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'my_attendance'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/40 dark:border-slate-800/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-[#006b5f] dark:text-[#76f4e0]">
            event_available
          </span>
          <span>My Field Punch</span>
        </button>

        <button
          onClick={() => setActiveSubTab('team_records')}
          className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'team_records'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/40 dark:border-slate-800/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
            <div className="flex flex-col bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 relative overflow-hidden animate-fadeIn">
              <div className="flex items-center justify-between mb-4 z-10">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase">
                    Live Field Status
                  </span>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full ${
                    isCheckedIn
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {isCheckedIn ? 'Checked In' : 'Checked Out'}
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-4 z-10 flex-wrap gap-2">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                    {currentTime}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {currentDateString}
                  </p>
                  {isCheckedIn && checkedInTime && (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#006b5f] dark:text-[#76f4e0] bg-[#006b5f]/10 dark:bg-[#76f4e0]/10 px-2.5 py-0.5 rounded-md">
                      <span className="material-symbols-outlined text-[13px]">schedule</span>
                      Checked in at {checkedInTime}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold uppercase tracking-wider">
                    Shift Duration
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-[#006b5f] dark:text-[#76f4e0] font-mono">
                    {isCheckedIn ? '04h 12m' : '00h 00m'}
                  </span>
                </div>
              </div>

              {/* A. Town Selection as per Assigned */}
              <div className="mb-4 z-10">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Assigned Town Beat Location
                </label>
                <div className="relative">
                  <select
                    value={selectedTown}
                    onChange={(e) => onSelectTown(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl outline-none border border-slate-200/90 dark:border-slate-700 text-xs sm:text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-[#006b5f]"
                  >
                    {availableTowns.map((town) => (
                      <option key={town} value={town}>
                        {town}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none text-[20px]">
                    expand_more
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Only dealers registered under this selected town will load in your booking form.
                </p>
              </div>

              {/* B & C. Check Location & Geofence Indicator */}
              <div className="flex flex-col gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-4 z-10 border border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#006b5f] dark:text-[#76f4e0] text-[20px] shrink-0 mt-0.5">
                    location_on
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {selectedTown} Center • Lat: {townCoords.lat.toFixed(4)}, Lng: {townCoords.lng.toFixed(4)}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Live Device GPS: Lat: {userLat.toFixed(4)}, Lng: {userLng.toFixed(4)}
                    </p>
                    <p className="text-[11px] font-bold mt-1 text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">radar</span>
                      Calculated Distance: <span className="font-mono text-[#006b5f] dark:text-[#76f4e0] font-black">{Math.round(geofenceResult.distanceMeters)} meters</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsSimulatedOutside(!isSimulatedOutside);
                    }}
                    className="text-[10px] text-slate-500 dark:text-slate-400 font-bold hover:underline shrink-0 px-2.5 py-1 bg-white dark:bg-slate-700 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-600 cursor-pointer"
                    title="Tap to toggle out-of-range simulation"
                  >
                    {isSimulatedOutside ? '✓ Reset Inside' : 'Simulate Away'}
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

              {/* Action Button */}
              <button
                onClick={() => {
                  if (!isCheckedIn) {
                    const now = new Date();
                    setCheckedInTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
                  } else {
                    setCheckedInTime(null);
                  }
                  onToggleCheckIn();
                }}
                className={`w-full h-12 sm:h-13 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] z-10 min-touch-target cursor-pointer ${
                  isCheckedIn
                    ? 'bg-slate-800 hover:bg-slate-900 text-white'
                    : 'bg-[#006b5f] hover:bg-[#005047] text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {isCheckedIn ? 'logout' : 'login'}
                </span>
                <span>{isCheckedIn ? 'Check Out of Field' : 'Check In to Field'}</span>
              </button>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 text-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white block font-mono">
                  {presentCount}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5 block">
                  Present Days
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 text-center">
                <span className="text-2xl font-black text-[#006b5f] dark:text-[#76f4e0] block font-mono">
                  {visitCount}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5 block">
                  Client Visits
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 text-center">
                <span className="text-2xl font-black text-slate-400 dark:text-slate-500 block font-mono">
                  {leaveCount}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5 block">
                  On Leave
                </span>
              </div>
            </div>

            {/* Daily Visit / Working History Table */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#006b5f] text-[18px]">history</span>
                  <span>Daily Visit / Working History</span>
                </h4>
                <span className="text-[10px] text-[#006b5f] dark:text-[#76f4e0] font-extrabold bg-[#76f4e0]/20 dark:bg-[#76f4e0]/10 px-2 py-0.5 rounded-full font-mono">
                  {dailyWorkingHistory.length} Days Logged
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-slate-50 dark:bg-slate-800/50">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Town</th>
                      <th className="py-2.5 px-3 text-center"># of Dealer/Distributor Visit</th>
                      <th className="py-2.5 px-3 text-right">Rs Recovery</th>
                      <th className="py-2.5 px-3 text-right">Rs Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                    {dailyWorkingHistory.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-mono text-slate-900 dark:text-white font-bold">{row.date}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">{row.town}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">{row.visitedDealerCount}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Rs. {row.recoveryAmount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#006b5f] dark:text-[#76f4e0]">
                          Rs. {row.orderAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {dailyWorkingHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No working history records available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      )}

      {/* ================= SUB-TAB 2: TEAM ATTENDANCE RECORDS & TRACKING ================= */}
      {activeSubTab === 'team_records' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Team Search & Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-3.5 py-2.5 border border-slate-200/80 dark:border-slate-700">
              <span className="material-symbols-outlined text-slate-400 mr-2 text-[20px]">search</span>
              <input
                type="text"
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                placeholder="Search team member, territory, or role..."
                className="bg-transparent w-full text-xs sm:text-sm text-slate-900 dark:text-white outline-none font-medium placeholder:text-slate-400"
              />
            </div>
            <span className="text-xs font-bold text-[#006b5f] dark:text-[#76f4e0] bg-[#006b5f]/10 dark:bg-[#76f4e0]/10 px-3 py-2 rounded-xl whitespace-nowrap">
              {filteredTeam.length} Officers Live
            </span>
          </div>

          {/* Team Members List */}
          <div className="flex flex-col gap-3">
            {filteredTeam.map((member) => (
              <div
                key={member.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#006b5f]/10 dark:bg-[#76f4e0]/10 text-[#006b5f] dark:text-[#76f4e0] flex items-center justify-center font-black text-sm shrink-0 font-mono">
                    {member.avatarInitials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {member.fullName}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">({member.employeeCode})</span>
                    </div>
                    <span className="text-[11px] text-[#006b5f] dark:text-[#76f4e0] font-bold truncate">
                      {member.roleTitle || member.role}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      Assigned Beat: {member.assignedTowns?.join(', ') || 'Peshawar Region'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Active
                  </span>
                  <a
                    href={`tel:${member.phone}`}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#006b5f] transition-all"
                    title={`Call ${member.fullName}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
