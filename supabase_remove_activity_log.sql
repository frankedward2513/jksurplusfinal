do $$
declare
  target_trigger record;
begin
  for target_trigger in
    select
      trigger_namespace.nspname as schema_name,
      target_table.relname as table_name,
      trigger_row.tgname as trigger_name
    from pg_trigger as trigger_row
    join pg_class as target_table on target_table.oid = trigger_row.tgrelid
    join pg_namespace as trigger_namespace on trigger_namespace.oid = target_table.relnamespace
    join pg_proc as trigger_function on trigger_function.oid = trigger_row.tgfoid
    join pg_namespace as function_namespace on function_namespace.oid = trigger_function.pronamespace
    where function_namespace.nspname = 'public'
      and trigger_function.proname in ('capture_audit_log', 'capture_status_log')
      and not trigger_row.tgisinternal
  loop
    execute format(
      'drop trigger if exists %I on %I.%I',
      target_trigger.trigger_name,
      target_trigger.schema_name,
      target_trigger.table_name
    );
  end loop;
end;
$$;

drop function if exists public.capture_audit_log();
drop function if exists public.capture_status_log();
drop table if exists public.audit_logs;
