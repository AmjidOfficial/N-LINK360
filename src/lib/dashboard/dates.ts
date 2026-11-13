/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK-360 - Pakistan Standard Time (Asia/Karachi, UTC+5) Date Filter Engine
 */

import type { DashboardDatePreset, KarachiDateRange } from './types';

export const PAKISTAN_TIMEZONE = 'Asia/Karachi';

const karachiDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: PAKISTAN_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Formats any Date or ISO timestamp into YYYY-MM-DD in Asia/Karachi timezone.
 * Preserves bare YYYY-MM-DD dates directly without shifting across timezone offsets.
 */
export function toKarachiDateIso(input?: Date | string | null): string {
  if (!input) {
    return karachiDateFormatter.format(new Date());
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      const candidate = trimmed.slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : karachiDateFormatter.format(new Date());
    }
    return karachiDateFormatter.format(parsed);
  }
  if (Number.isNaN(input.getTime())) {
    return karachiDateFormatter.format(new Date());
  }
  return karachiDateFormatter.format(input);
}

/**
 * Adds or subtracts whole calendar days from a YYYY-MM-DD date string cleanly without local TZ drift.
 */
export function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map((n) => parseInt(n, 10));
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function daysBetweenInclusive(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  return Math.max(1, Math.round((endUtc - startUtc) / 86400000) + 1);
}

function getDayOfWeekMonStart(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon..6=Sun
}

/**
 * Computes consistent start/end and comparison previous period boundaries in Asia/Karachi.
 */
export function getKarachiDateRange(
  preset: DashboardDatePreset,
  customStart?: string,
  customEnd?: string,
  referenceDate: Date = new Date()
): KarachiDateRange {
  const todayStr = toKarachiDateIso(referenceDate);
  const [year, month] = todayStr.split('-').map(Number);

  let start = todayStr;
  let end = todayStr;
  let label = 'Today';

  switch (preset) {
    case 'TODAY': {
      start = todayStr;
      end = todayStr;
      label = 'Today';
      break;
    }
    case 'YESTERDAY': {
      const y = shiftIsoDate(todayStr, -1);
      start = y;
      end = y;
      label = 'Yesterday';
      break;
    }
    case 'THIS_WEEK': {
      const offset = getDayOfWeekMonStart(todayStr);
      start = shiftIsoDate(todayStr, -offset);
      end = todayStr;
      label = 'This Week';
      break;
    }
    case 'LAST_WEEK': {
      const offset = getDayOfWeekMonStart(todayStr);
      const thisMon = shiftIsoDate(todayStr, -offset);
      start = shiftIsoDate(thisMon, -7);
      end = shiftIsoDate(thisMon, -1);
      label = 'Last Week';
      break;
    }
    case 'THIS_MONTH': {
      start = `${year}-${String(month).padStart(2, '0')}-01`;
      end = todayStr;
      label = 'This Month';
      break;
    }
    case 'LAST_MONTH': {
      const prevMonthEndUtc = new Date(Date.UTC(year, month - 1, 0));
      const py = prevMonthEndUtc.getUTCFullYear();
      const pm = prevMonthEndUtc.getUTCMonth() + 1;
      const pd = prevMonthEndUtc.getUTCDate();
      start = `${py}-${String(pm).padStart(2, '0')}-01`;
      end = `${py}-${String(pm).padStart(2, '0')}-${String(pd).padStart(2, '0')}`;
      label = 'Last Month';
      break;
    }
    case 'THIS_QUARTER': {
      const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
      start = `${year}-${String(quarterStartMonth).padStart(2, '0')}-01`;
      end = todayStr;
      label = `Q${Math.floor((month - 1) / 3) + 1} ${year}`;
      break;
    }
    case 'THIS_YEAR': {
      start = `${year}-01-01`;
      end = todayStr;
      label = `FY ${year}`;
      break;
    }
    case 'CUSTOM': {
      const s = customStart ? toKarachiDateIso(customStart) : todayStr;
      const e = customEnd ? toKarachiDateIso(customEnd) : todayStr;
      start = s <= e ? s : e;
      end = s <= e ? e : s;
      label = `${start} to ${end}`;
      break;
    }
  }

  const spanDays = daysBetweenInclusive(start, end);
  const previousEnd = shiftIsoDate(start, -1);
  const previousStart = shiftIsoDate(previousEnd, -(spanDays - 1));

  return {
    preset,
    start,
    end,
    label,
    previousStart,
    previousEnd,
  };
}

export function isDateInKarachiRange(
  dateInput: Date | string | null | undefined,
  startIso: string,
  endIso: string
): boolean {
  if (!dateInput) return false;
  const normalized = toKarachiDateIso(dateInput);
  return normalized >= startIso && normalized <= endIso;
}

export const DASHBOARD_DATE_PRESETS: Array<{ id: DashboardDatePreset; label: string }> = [
  { id: 'TODAY', label: 'Today' },
  { id: 'YESTERDAY', label: 'Yesterday' },
  { id: 'THIS_WEEK', label: 'This Week' },
  { id: 'LAST_WEEK', label: 'Last Week' },
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'LAST_MONTH', label: 'Last Month' },
  { id: 'THIS_QUARTER', label: 'This Quarter' },
  { id: 'THIS_YEAR', label: 'This Year' },
  { id: 'CUSTOM', label: 'Custom Range' },
];
