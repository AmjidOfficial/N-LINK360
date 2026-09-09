/**
 * N-LINK 360 — Daily Midnight (11:59 PM) Security Cutoff & Next-Day Readiness Engine
 *
 * Attendance in localStorage is a temporary field-device cache only. When a signed-in
 * employee has an attendance record, this module mirrors it to Supabase so attendance
 * survives reloads/devices and is available to the office portal.
 */

import { isSupabaseConfigured, supabase } from '../lib/supabase';

const SESSION_DATE_KEY = 'nlink_session_date';
const SESSION_LOGIN_TIME_KEY = 'nlink_session_login_time';
const CUTOFF_NOTIFIED_KEY = 'nlink_midnight_cutoff_notified';
const ATTENDANCE_CACHE_KEY = 'nlink_sales_attendance_today';
let lastAttendanceFingerprint = '';
let attendanceSyncInFlight: Promise<void> | null = null;

export interface MidnightCutoffStatus {
  isCutoffTime: boolean;
  timeUntilCutoff: string;
  minutesRemaining: number;
  sessionDate: string;
  currentDate: string;
  isExpired: boolean;
}

function parseLocalAttendanceTimestamp(date: string, time?: string): string | null {
  if (!date || !time) return null;
  const parsed = new Date(`${date} ${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Persist the current device attendance cache into the authoritative Supabase table. */
export function syncCachedAttendanceToSupabase(): Promise<void> {
  if (typeof window === 'undefined' || !isSupabaseConfigured || !supabase) return Promise.resolve();
  if (attendanceSyncInFlight) return attendanceSyncInFlight;

  attendanceSyncInFlight = (async () => {
    try {
      const raw = localStorage.getItem(ATTENDANCE_CACHE_KEY);
      if (!raw) return;

      let record: any;
      try {
        record = JSON.parse(raw);
      } catch {
        return;
      }
      if (!record?.date || !record?.town || !Number.isFinite(Number(record.lat)) || !Number.isFinite(Number(record.lng))) return;

      const fingerprint = raw;
      if (fingerprint === lastAttendanceFingerprint) return;

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) return;

      const { data: employeeId, error: employeeError } = await supabase.rpc('nlink_current_employee_id');
      if (employeeError || !employeeId) return;

      const checkInAt = parseLocalAttendanceTimestamp(record.date, record.checkInTime || record.time);
      const checkOutAt = parseLocalAttendanceTimestamp(record.date, record.checkOutTime);
      const status = record.checkOutTime || record.status === 'Checked Out' ? 'CHECKED_OUT' : 'CHECKED_IN';

      const { error: upsertError } = await supabase
        .from('field_attendance')
        .upsert({
          employee_id: employeeId,
          attendance_date: record.date,
          check_in_at: checkInAt,
          check_out_at: checkOutAt,
          town: String(record.town),
          latitude: Number(record.lat),
          longitude: Number(record.lng),
          gps_accuracy_m: Number.isFinite(Number(record.accuracy)) ? Number(record.accuracy) : null,
          location_method: String(record.status || 'GPS_VERIFIED'),
          status,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'employee_id,attendance_date' });

      if (!upsertError) lastAttendanceFingerprint = fingerprint;
      else console.warn('[N-LINK] Attendance persistence deferred:', upsertError.message);
    } catch (error) {
      console.warn('[N-LINK] Attendance persistence unavailable:', error);
    } finally {
      attendanceSyncInFlight = null;
    }
  })();

  return attendanceSyncInFlight;
}

export function recordSessionStart(): void {
  const todayStr = new Date().toISOString().split('T')[0];
  localStorage.setItem(SESSION_DATE_KEY, todayStr);
  localStorage.setItem(SESSION_LOGIN_TIME_KEY, new Date().toISOString());
  localStorage.removeItem(CUTOFF_NOTIFIED_KEY);
  void syncCachedAttendanceToSupabase();
}

export function checkMidnightCutoff(): MidnightCutoffStatus {
  void syncCachedAttendanceToSupabase();

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentDate = now.toISOString().split('T')[0];
  const sessionDate = localStorage.getItem(SESSION_DATE_KEY) || currentDate;
  const isCutoffTime = hours === 23 && minutes >= 59;
  const isDayRolledOver = sessionDate !== currentDate;
  const isExpired = isCutoffTime || isDayRolledOver;

  const cutoffTonight = new Date(now);
  cutoffTonight.setHours(23, 59, 0, 0);
  const diffMs = cutoffTonight.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeUntilCutoff = diffMs <= 0 ? '0m (Cutoff reached)' : `${hrs}h ${mins}m`;

  return { isCutoffTime, timeUntilCutoff, minutesRemaining: totalMinutes, sessionDate, currentDate, isExpired };
}

export function prepareDataForNextDay(): void {
  const todayStr = new Date().toISOString().split('T')[0];
  void syncCachedAttendanceToSupabase();

  const savedAttendance = localStorage.getItem(ATTENDANCE_CACHE_KEY);
  if (savedAttendance) {
    try {
      const parsed = JSON.parse(savedAttendance);
      if (parsed.date !== todayStr) localStorage.removeItem(ATTENDANCE_CACHE_KEY);
    } catch {
      localStorage.removeItem(ATTENDANCE_CACHE_KEY);
    }
  }

  localStorage.setItem(SESSION_DATE_KEY, todayStr);
  localStorage.removeItem(CUTOFF_NOTIFIED_KEY);
}

export function simulateMidnightCutoff(): void {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  localStorage.setItem(SESSION_DATE_KEY, yesterday);
}
