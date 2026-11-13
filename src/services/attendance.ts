import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface FieldAttendanceRecord {
  id?: string;
  employee_id?: string;
  employee_name?: string;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  town: string;
  latitude: number;
  longitude: number;
  gps_accuracy_m: number | null;
  location_method: string;
  status: 'CHECKED_IN' | 'CHECKED_OUT';
  created_at?: string;
  updated_at?: string;
  duration_text?: string;
}

const ATTENDANCE_CACHE_KEY = 'nlink_sales_attendance_today';

export function calculateDutyDuration(checkInIso: string | null, checkOutIso: string | null): string {
  if (!checkInIso) return 'Duty In Progress';
  const start = new Date(checkInIso).getTime();
  const end = checkOutIso ? new Date(checkOutIso).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end < start) return 'Duty In Progress';

  const diffMin = Math.floor((end - start) / (1000 * 60));
  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hrs} hrs ${mins} mins`;
}

export function formatTimeFromIso(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '--:--';
  }
}

/**
 * Parses user-facing or standard time/date inputs into ISO string reliably.
 */
export function buildIsoTimestamp(dateStr: string, timeStr?: string): string {
  if (!timeStr) {
    const now = new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    now.setFullYear(y, (m || 1) - 1, d || 1);
    return now.toISOString();
  }

  const match = timeStr.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    const ampm = match[4]?.toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, (month || 1) - 1, day || 1, hours, minutes, seconds);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString();
    }
  }

  const fallback = new Date(`${dateStr} ${timeStr}`);
  return !isNaN(fallback.getTime()) ? fallback.toISOString() : new Date().toISOString();
}

/**
 * Persists check-in / check-out into the authoritative Supabase field_attendance table
 * and updates localStorage cache for offline resiliency.
 */
export async function persistAttendanceRecord(params: {
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  town: string;
  lat: number;
  lng: number;
  accuracy?: number;
  status: 'Checked In' | 'Checked Out' | 'CHECKED_IN' | 'CHECKED_OUT';
  userName?: string;
}): Promise<{ success: boolean; error?: string; record?: FieldAttendanceRecord }> {
  const isCheckOut = params.status === 'Checked Out' || params.status === 'CHECKED_OUT' || Boolean(params.checkOutTime);
  const dbStatus: 'CHECKED_IN' | 'CHECKED_OUT' = isCheckOut ? 'CHECKED_OUT' : 'CHECKED_IN';

  const checkInAt = params.checkInTime ? buildIsoTimestamp(params.date, params.checkInTime) : new Date().toISOString();
  const checkOutAt = params.checkOutTime ? buildIsoTimestamp(params.date, params.checkOutTime) : isCheckOut ? new Date().toISOString() : null;

  // 1. Update local cache
  const localRec = {
    date: params.date,
    checkInTime: params.checkInTime || (checkInAt ? formatTimeFromIso(checkInAt) : '09:00 AM'),
    checkOutTime: params.checkOutTime || (checkOutAt ? formatTimeFromIso(checkOutAt) : undefined),
    time: params.checkInTime || formatTimeFromIso(checkInAt),
    town: params.town,
    userName: params.userName || 'Field Officer',
    lat: params.lat,
    lng: params.lng,
    accuracy: params.accuracy || 15,
    locationName: `${params.town} Territory`,
    status: isCheckOut ? 'Checked Out' : 'Checked In',
    duration: isCheckOut ? calculateDutyDuration(checkInAt, checkOutAt) : 'Active On Duty',
  };
  try {
    localStorage.setItem(ATTENDANCE_CACHE_KEY, JSON.stringify(localRec));
  } catch {
    // ignore
  }

  // 2. Persist to Supabase if available
  if (!isSupabaseConfigured || !supabase) {
    return { success: true };
  }

  try {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user) {
      return { success: true }; // offline or unauthed preview
    }

    const { data: employeeId, error: empErr } = await supabase.rpc('nlink_current_employee_id');
    if (empErr || !employeeId) {
      console.warn('[Attendance] Current employee ID lookup deferred:', empErr?.message);
      return { success: true };
    }

    const payload: any = {
      employee_id: employeeId,
      attendance_date: params.date,
      check_in_at: checkInAt,
      check_out_at: checkOutAt,
      town: params.town,
      latitude: Number(params.lat.toFixed(6)),
      longitude: Number(params.lng.toFixed(6)),
      gps_accuracy_m: params.accuracy ? Number(params.accuracy.toFixed(2)) : null,
      location_method: 'GPS_VERIFIED',
      status: dbStatus,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from('field_attendance')
      .upsert(payload, { onConflict: 'employee_id,attendance_date' });

    if (upsertErr) {
      console.error('[Attendance] Persistence error:', upsertErr.message);
      return { success: false, error: upsertErr.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Attendance] Exception during persistence:', err);
    return { success: false, error: err?.message || 'Failed to save attendance' };
  }
}

/**
 * Loads today's attendance record from Supabase.
 */
export async function fetchTodayAttendance(todayDateStr: string): Promise<FieldAttendanceRecord | null> {
  if (!isSupabaseConfigured || !supabase) {
    try {
      const cached = localStorage.getItem(ATTENDANCE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === todayDateStr) {
          return {
            attendance_date: parsed.date,
            check_in_at: parsed.checkInTime ? buildIsoTimestamp(parsed.date, parsed.checkInTime) : null,
            check_out_at: parsed.checkOutTime ? buildIsoTimestamp(parsed.date, parsed.checkOutTime) : null,
            town: parsed.town,
            latitude: parsed.lat,
            longitude: parsed.lng,
            gps_accuracy_m: parsed.accuracy,
            location_method: 'GPS_VERIFIED',
            status: parsed.status === 'Checked Out' ? 'CHECKED_OUT' : 'CHECKED_IN',
            duration_text: parsed.duration,
          };
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return null;

    const { data, error } = await supabase
      .from('field_attendance')
      .select('*')
      .eq('attendance_date', todayDateStr)
      .maybeSingle();

    if (error || !data) return null;

    const record: FieldAttendanceRecord = {
      id: data.id,
      employee_id: data.employee_id,
      attendance_date: data.attendance_date,
      check_in_at: data.check_in_at,
      check_out_at: data.check_out_at,
      town: data.town,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      gps_accuracy_m: data.gps_accuracy_m ? Number(data.gps_accuracy_m) : null,
      location_method: data.location_method || 'GPS_VERIFIED',
      status: data.status as 'CHECKED_IN' | 'CHECKED_OUT',
      duration_text: calculateDutyDuration(data.check_in_at, data.check_out_at),
    };

    // Keep localStorage in sync with the database record
    try {
      const localRec = {
        date: data.attendance_date,
        checkInTime: formatTimeFromIso(data.check_in_at),
        checkOutTime: data.check_out_at ? formatTimeFromIso(data.check_out_at) : undefined,
        time: formatTimeFromIso(data.check_in_at),
        town: data.town,
        lat: Number(data.latitude),
        lng: Number(data.longitude),
        accuracy: data.gps_accuracy_m || 15,
        locationName: `${data.town} Territory`,
        status: data.status === 'CHECKED_OUT' ? 'Checked Out' : 'Checked In',
        duration: record.duration_text,
      };
      localStorage.setItem(ATTENDANCE_CACHE_KEY, JSON.stringify(localRec));
    } catch {
      // ignore
    }

    return record;
  } catch (err) {
    console.warn('[Attendance] Error fetching today attendance:', err);
    return null;
  }
}

/**
 * Fetches recent attendance history logs for the current user or office view.
 */
export async function fetchAttendanceHistory(limit = 30): Promise<FieldAttendanceRecord[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('field_attendance')
      .select(`
        id,
        employee_id,
        attendance_date,
        check_in_at,
        check_out_at,
        town,
        latitude,
        longitude,
        gps_accuracy_m,
        location_method,
        status,
        created_at,
        employees (
          full_name,
          employee_code
        )
      `)
      .order('attendance_date', { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.warn('[Attendance] History query error:', error?.message);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      employee_id: item.employee_id,
      employee_name: item.employees?.full_name || 'Field Officer',
      attendance_date: item.attendance_date,
      check_in_at: item.check_in_at,
      check_out_at: item.check_out_at,
      town: item.town,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      gps_accuracy_m: item.gps_accuracy_m ? Number(item.gps_accuracy_m) : null,
      location_method: item.location_method || 'GPS_VERIFIED',
      status: item.status as 'CHECKED_IN' | 'CHECKED_OUT',
      created_at: item.created_at,
      duration_text: calculateDutyDuration(item.check_in_at, item.check_out_at),
    }));
  } catch (err) {
    console.warn('[Attendance] Failed to load attendance history:', err);
    return [];
  }
}
