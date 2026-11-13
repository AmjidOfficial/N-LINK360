-- N-LINK 360 production performance baseline.
-- Every public foreign key receives a covering index for joins, deletes and RLS checks.
do $$
declare
  r record;
  cols text;
  idx text;
begin
  for r in
    select c.oid,
           n.nspname as schema_name,
           t.relname as table_name,
           array_agg(a.attname order by k.ord) as column_names
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join lateral unnest(c.conkey) with ordinality as k(attnum, ord) on true
    join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
    where c.contype = 'f' and n.nspname = 'public'
    group by c.oid, n.nspname, t.relname
  loop
    select string_agg(format('%I', x), ', ') into cols from unnest(r.column_names) as u(x);
    idx := 'idx_fk_' || r.oid::text;
    execute format('create index if not exists %I on %I.%I (%s)', idx, r.schema_name, r.table_name, cols);
  end loop;
end $$;
