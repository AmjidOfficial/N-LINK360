-- Remove the broad FK index sweep when an existing covering index already exists.
-- The production schema keeps deliberate, workload-specific indexes rather than duplicate indexes.
do $$
declare r record;
begin
  for r in select schemaname, indexname from pg_indexes where schemaname='public' and indexname like 'idx_fk_%' loop
    execute format('drop index if exists %I.%I', r.schemaname, r.indexname);
  end loop;
end $$;
