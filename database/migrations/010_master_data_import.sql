-- N-LINK 360 controlled master-data import layer
-- Excel/CSV uploads should land here first. Production tables are never overwritten blindly.

create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code varchar(40) not null unique,
  source_name varchar(255) not null,
  source_type varchar(30) not null default 'EXCEL',
  entity_type varchar(50) not null,
  uploaded_by uuid references users(id),
  status varchar(30) not null default 'UPLOADED',
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  error_rows integer not null default 0,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz
);

create table if not exists import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  row_number integer not null,
  row_data jsonb not null,
  normalized_data jsonb,
  status varchar(20) not null default 'PENDING',
  error_messages jsonb,
  target_id uuid,
  created_at timestamptz not null default now(),
  unique(batch_id, row_number)
);

create table if not exists master_data_change_log (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references import_batches(id),
  entity_type varchar(50) not null,
  entity_id uuid,
  action varchar(20) not null,
  before_data jsonb,
  after_data jsonb,
  changed_by uuid references users(id),
  changed_at timestamptz not null default now()
);

create index if not exists idx_import_rows_batch_status on import_rows(batch_id, status);
create index if not exists idx_import_batches_entity on import_batches(entity_type, created_at);

alter table import_batches enable row level security;
alter table import_rows enable row level security;
alter table master_data_change_log enable row level security;

create policy import_batches_admin on import_batches for all to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT')
) with check (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT')
);

create policy import_rows_admin on import_rows for all to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT')
) with check (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT')
);

create policy master_data_change_log_admin on master_data_change_log for select to authenticated using (
  public.nlink_has_role('SUPER_ADMIN') or public.nlink_has_role('MANAGEMENT')
);

-- Safe inspection helper for the Admin import screen.
create or replace view v_import_batch_summary as
select b.id, b.batch_code, b.source_name, b.entity_type, b.status,
       b.total_rows, b.valid_rows, b.error_rows,
       count(r.id) as staged_rows,
       count(r.id) filter (where r.status='ERROR') as staged_errors,
       b.created_at, b.approved_at
from import_batches b
left join import_rows r on r.batch_id=b.id
group by b.id;
