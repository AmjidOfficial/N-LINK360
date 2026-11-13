/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Mobile Attendance & GPS Check-In
 * Strictly handles real GPS permissions without fabricating coordinates when denied.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeAttendance, TownNode } from '../../types';
import { NLinkUser } from '../../data/nlink-users-team';
import { GeofencePerimeterMap } from './GeofencePerimeterMap';
import { triggerHaptic } from '../../utils/haptics';
import {
  Clock,
  MapPin,
  CheckCircle2,
  LogOut,
  LogIn,
  Radio,
  Navigation,
  ShieldCheck,
  History,
  AlertCircle,
} from 'lucide-react';

export interface MobileAttendanceGpsScreenProps {
  currentUser: NLinkUser;
  isCheckedIn: boolean;
  checkedInTime: string | null;
  checkedOutTime?: string | null;
  selectedTown: string;
  onSelectTown: (town: string) => void;
  availableTowns: string[];
  currentTownRoutes: string[];
  selectedRoute: string;
  onSelectRoute: (route: string) => void;
  onCheckIn: (town: string) => void;
  onCheckOut: (town: string) => void;
  attendanceRecords?: EmployeeAttendance[];
  townNodes?: TownNode[];
  onUpdateGeofenceRadius?: (townName: string, newRadiusMeters: number) => void;
}

type GpsStatus = 'IDLE' | 'LOCATING' | 'GRANTED' | 'DENIED' | 'UNAVAILABLE';

export const MobileAttendanceGpsScreen: React.FC<MobileAttendanceGpsScreenProps> = ({
  currentUser,
  isCheckedIn,
  checkedInTime,
  selectedTown,
  onSelectTown,
  availableTowns,
  selectedRoute,
  onCheckIn,
  onCheckOut,
  attendanceRecords = [],
  townNodes,
  onUpdateGeofenceRadius,
}) => {
  const [elapsedString, setElapsedString] = useState('00h 00m');
  const [showPerimeterMap, setShowPerimeterMap] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('IDLE');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const requestDeviceGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('UNAVAILABLE');
      setGpsCoordinates(null);
      setGpsErrorMessage('GPS geolocation is not supported by this browser.');
      return;
    }

    setIsDetectingGps(true);
    setGpsStatus('LOCATING');
    setGpsErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoordinates({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy || 10),
        });
        setGpsStatus('GRANTED');
        setGpsErrorMessage(null);
        setIsDetectingGps(false);
      },
      (err) => {
        setGpsCoordinates(null);
        setGpsStatus(err.code === err.PERMISSION_DENIED ? 'DENIED' : 'UNAVAILABLE');
        setGpsErrorMessage(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enable GPS access in browser settings to record verified coordinates.'
            : 'Unable to acquire GPS signal. Please retry outdoors or check device location services.'
        );
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    requestDeviceGps();
  }, []);

  // Elapsed Time Counter
  useEffect(() => {
    if (!isCheckedIn || !checkedInTime) {
      setElapsedString('00h 00m');
      return;
    }

    const updateTimer = () => {
      try {
        const now = new Date();
        let start = new Date();
        if (checkedInTime.includes(':')) {
          const [timePart, modifier] = checkedInTime.split(' ');
          let [hours, minutes] = timePart.split(':').map(Number);
          if (modifier?.toUpperCase() === 'PM' && hours < 12) hours += 12;
          if (modifier?.toUpperCase() === 'AM' && hours === 12) hours = 0;
          start.setHours(hours, minutes, 0, 0);
        } else {
          start = new Date(checkedInTime);
        }

        const diffMs = Math.max(0, now.getTime() - start.getTime());
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setElapsedString(`${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`);
      } catch {
        setElapsedString('00h 00m');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [isCheckedIn, checkedInTime]);

  const recentRecords = useMemo(() => {
    return attendanceRecords
      .filter((r) => r.employeeId === currentUser?.id || r.employeeName === currentUser?.fullName)
      .slice(0, 5);
  }, [attendanceRecords, currentUser]);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* 1. SHIFT STATUS CARD */}
      <div className="rounded-xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Field Shift Status
          </span>
          <span
            className={`text-xs font-semibold ${
              isCheckedIn
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {isCheckedIn ? 'On Duty' : 'Shift Pending'}
          </span>
        </div>

        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">
              Working Hours Elapsed
            </span>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {isCheckedIn ? elapsedString : '00h 00m'}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              {isCheckedIn
                ? `Started at ${checkedInTime || 'Active'}`
                : 'Check-in to start field shift'}
            </span>
          </div>

          <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
            <Clock className="w-7 h-7 text-[#0052FF] dark:text-blue-400" />
          </div>
        </div>

        {isCheckedIn ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onCheckOut(selectedTown);
            }}
            className="w-full min-h-[44px] py-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Check-Out &amp; End Shift ({selectedTown})</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onCheckIn(selectedTown);
            }}
            className="w-full min-h-[44px] py-3 rounded-lg bg-[#0052FF] hover:bg-[#003ECC] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <LogIn className="w-4 h-4" />
            <span>Check-In &amp; Start Shift ({selectedTown})</span>
          </button>
        )}
      </div>

      {/* 2. REAL GPS & TERRITORY WIDGET */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
            <Navigation className="w-4 h-4 text-[#0052FF] dark:text-blue-400" />
            <span>Device GPS &amp; Territory</span>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              requestDeviceGps();
            }}
            disabled={isDetectingGps}
            className="text-xs font-semibold text-[#0052FF] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
            <span>{isDetectingGps ? 'Locating...' : 'Refresh GPS'}</span>
          </button>
        </div>

        {gpsErrorMessage ? (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{gpsErrorMessage}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Coordinates</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white text-[11px] block mt-0.5">
                {gpsCoordinates
                  ? `${gpsCoordinates.lat.toFixed(4)}° N, ${gpsCoordinates.lng.toFixed(4)}° E`
                  : gpsStatus === 'LOCATING'
                  ? 'Acquiring...'
                  : 'Unavailable'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">GPS Accuracy</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-[11px] block mt-0.5">
                {gpsCoordinates ? `±${gpsCoordinates.accuracy}m Verified` : 'Waiting for fix'}
              </span>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pt-1">
          <MapPin className="w-3.5 h-3.5 text-[#0052FF] dark:text-blue-400 shrink-0" />
          <span className="truncate font-medium">
            <strong>{selectedTown}</strong> &middot; {selectedRoute || 'Commercial Route Beat'}
          </span>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <select
            value={selectedTown}
            onChange={(e) => onSelectTown(e.target.value)}
            className="flex-1 p-2 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-[#0052FF] cursor-pointer"
          >
            {availableTowns.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowPerimeterMap(!showPerimeterMap)}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            {showPerimeterMap ? 'Hide Map' : 'Perimeter'}
          </button>
        </div>

        {showPerimeterMap && (
          <div className="pt-2">
            <GeofencePerimeterMap
              selectedTown={selectedTown}
              townNodes={townNodes}
              isAdmin={currentUser.role === 'SUPER_ADMIN'}
              onUpdateGeofenceRadius={onUpdateGeofenceRadius}
              compact={true}
            />
          </div>
        )}
      </div>

      {/* 3. RECENT ATTENDANCE LEDGER */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
            <History className="w-4 h-4 text-[#0052FF] dark:text-blue-400" />
            <span>Recent Attendance History</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono font-semibold">
            {recentRecords.length} Records
          </span>
        </div>

        {recentRecords.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs space-y-1">
            <ShieldCheck className="w-6 h-6 mx-auto opacity-40" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No Attendance Logs Yet</p>
            <p className="text-[11px]">Check-in above to record your first verified attendance shift.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {recentRecords.map((rec) => (
              <div key={rec.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    {rec.date} &middot; {rec.checkInLocation || selectedTown}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    In: {rec.checkInTime} &middot; Out: {rec.checkOutTime || 'Active'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
