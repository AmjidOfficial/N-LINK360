/**
 * N-LINK 360 — Daily Midnight (11:59 PM) Security Cutoff & Next-Day Readiness Engine
 *
 * Requirements:
 * 1. Automatic logout of all logged-in accounts when the clock reaches 11:59 PM (23:59:00).
 * 2. Automatic logout if an active session was initiated on a previous calendar date (crossing midnight).
 * 3. Prepares and readies all registers, attendance records, and daily KPI counters for next-day operations.
 */

const SESSION_DATE_KEY = 'nlink_session_date';
const SESSION_LOGIN_TIME_KEY = 'nlink_session_login_time';
const CUTOFF_NOTIFIED_KEY = 'nlink_midnight_cutoff_notified';

export interface MidnightCutoffStatus {
  isCutoffTime: boolean;
  timeUntilCutoff: string; // e.g. "3h 24m"
  minutesRemaining: number;
  sessionDate: string;
  currentDate: string;
  isExpired: boolean;
}

/**
 * Record session start date for midnight rollover verification
 */
export function recordSessionStart(): void {
  const todayStr = new Date().toISOString().split('T')[0];
  localStorage.setItem(SESSION_DATE_KEY, todayStr);
  localStorage.setItem(SESSION_LOGIN_TIME_KEY, new Date().toISOString());
  localStorage.removeItem(CUTOFF_NOTIFIED_KEY);
}

/**
 * Check if the current time is 23:59 (11:59 PM) or past midnight relative to session start
 */
export function checkMidnightCutoff(): MidnightCutoffStatus {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentDate = now.toISOString().split('T')[0];
  const sessionDate = localStorage.getItem(SESSION_DATE_KEY) || currentDate;

  // 11:59 PM is hour 23, minute 59
  const isCutoffTime = hours === 23 && minutes >= 59;
  // If the session was started on a prior day and we are in a new day
  const isDayRolledOver = sessionDate !== currentDate;

  const isExpired = isCutoffTime || isDayRolledOver;

  // Calculate time remaining until 23:59 tonight
  const cutoffTonight = new Date(now);
  cutoffTonight.setHours(23, 59, 0, 0);

  const diffMs = cutoffTonight.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const timeUntilCutoff = diffMs <= 0 ? '0m (Cutoff reached)' : `${hrs}h ${mins}m`;

  return {
    isCutoffTime,
    timeUntilCutoff,
    minutesRemaining: totalMinutes,
    sessionDate,
    currentDate,
    isExpired,
  };
}

/**
 * Clear daily scratchpads and ready registers for the next day
 */
export function prepareDataForNextDay(): void {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Verify and reset previous day's temporary attendance so morning punch-in is fresh
  const savedAttendance = localStorage.getItem('nlink_sales_attendance_today');
  if (savedAttendance) {
    try {
      const parsed = JSON.parse(savedAttendance);
      if (parsed.date !== todayStr) {
        localStorage.removeItem('nlink_sales_attendance_today');
      }
    } catch {
      localStorage.removeItem('nlink_sales_attendance_today');
    }
  }

  // 2. Mark session date as fresh for next day
  localStorage.setItem(SESSION_DATE_KEY, todayStr);
  localStorage.removeItem(CUTOFF_NOTIFIED_KEY);
}

/**
 * Force trigger midnight rollover for testing / auditing
 */
export function simulateMidnightCutoff(): void {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  localStorage.setItem(SESSION_DATE_KEY, yesterday);
}
