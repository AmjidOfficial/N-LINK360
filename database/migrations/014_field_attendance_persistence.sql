-- N-LINK 360 field-force attendance persistence.
-- Browser localStorage is only a temporary UI/cache layer; this table is authoritative.
create table if not exists public.field_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  attendance_date date not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  town text not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  gps_accuracy_m numeric(10,2),
  location_method text not null default 'GPS_VERIFIED',
  status text not null default 'CHECKED_IN' check (status in ('CHECKED_IN','CHECKED_OUT')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, attendance_date)
);

create index if not exists idx_field_attendance_employee_date on public.field_attendance(employee_id, attendance_date desc);
create index if not exists idx_field_attendance_town_date on public.field_attendance(town, attendance_date desc);

alter table public.field_attendance enable row level security;

drop policy if exists field_attendance_select on public.field_attendance;
create policy field_attendance_select on public.field_attendance for select to authenticated using (
  employee_id = public.nlink_current_employee_id() or public.nlink_is_privileged()
);

drop policy if exists field_attendance_insert on public.field_attendance;
create policy field_attendance_insert on public.field_attendance for insert to authenticated with check (
  employee_id = public.nlink_current_employee_id()
);

drop policy if exists field_attendance_update on public.field_attendance;
create policy field_attendance_update on public.field_attendance for update to authenticated using (
  employee_id = public.nlink_current_employee_id() or public.nlink_is_privileged()
) with check (
  employee_id = public.nlink_current_employee_id() or public.nlink_is_privileged()
);

revoke all on public.field_attendance from anon;
grant select, insert, update on public.field_attendance to authenticated;
