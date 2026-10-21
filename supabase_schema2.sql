-- exBIN recycle bin schema.
-- Run after supabase_schema.sql in the Supabase SQL Editor.

create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.exbin_trash (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  record_data jsonb not null,
  deleted_by uuid not null references auth.users(id),
  deleted_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint exbin_trash_table_name_check check (
    table_name in (
      'bales',
      'categories',
      'products',
      'suppliers',
      'expense_accounts',
      'expenses',
      'orders',
      'transactions',
      'item_logs'
    )
  )
);

create index if not exists idx_exbin_trash_expiration
  on public.exbin_trash (expires_at);
create index if not exists idx_exbin_trash_deleted_by_expiration
  on public.exbin_trash (deleted_by, expires_at);

alter table public.exbin_trash enable row level security;

revoke all on public.exbin_trash from anon, authenticated;
grant select on public.exbin_trash to authenticated;

drop policy if exists "Owner read exBIN" on public.exbin_trash;
create policy "Owner read exBIN"
  on public.exbin_trash for select to authenticated
  using (public.exins_current_role() = 'owner');

create or replace function public.exins_trash_records(p_records jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record jsonb;
  v_table_name text;
  v_record_id text;
  v_record_data jsonb;
begin
  if public.exins_current_role() not in ('owner', 'staff') then
    raise exception 'Only store staff can move records to exBIN.';
  end if;
  if jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records) = 0 then
    raise exception 'At least one record is required.';
  end if;

  for v_record in select value from jsonb_array_elements(p_records)
  loop
    v_table_name := v_record ->> 'table_name';
    v_record_id := v_record ->> 'record_id';
    if v_table_name is null or v_table_name not in (
      'bales', 'categories', 'products', 'suppliers', 'expense_accounts',
      'expenses', 'orders', 'transactions', 'item_logs'
    ) or v_record_id is null then
      raise exception 'Unsupported exBIN record.';
    end if;
    if public.exins_current_role() = 'staff'
      and v_table_name not in ('bales', 'categories', 'products', 'suppliers', 'item_logs') then
      raise exception 'Staff cannot move this record type to exBIN.';
    end if;

    execute format(
      'select to_jsonb(source) from public.%I as source where source.id::text = $1 for update',
      v_table_name
    ) into v_record_data using v_record_id;
    if v_record_data is null then
      raise exception 'Record % in % was not found.', v_record_id, v_table_name;
    end if;

    insert into public.exbin_trash (table_name, record_id, record_data, deleted_by)
    values (v_table_name, v_record_id, v_record_data, auth.uid());
    execute format('delete from public.%I where id::text = $1', v_table_name)
      using v_record_id;
  end loop;
end;
$$;

create or replace function public.exins_restore_trash(p_trash_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trash public.exbin_trash%rowtype;
  v_requested_count integer;
  v_restored_count integer := 0;
begin
  if public.exins_current_role() <> 'owner' then
    raise exception 'Only the owner can restore records from exBIN.';
  end if;
  if coalesce(array_length(p_trash_ids, 1), 0) = 0 then
    raise exception 'Select at least one exBIN item to restore.';
  end if;
  select count(distinct requested_id)
  into v_requested_count
  from unnest(p_trash_ids) as requested(requested_id);

  for v_trash in
    select *
    from public.exbin_trash
    where id = any(p_trash_ids)
    order by deleted_at
    for update
  loop
    if v_trash.expires_at <= now() then
      raise exception 'This exBIN item has expired and can no longer be restored.';
    end if;

    execute format(
      'insert into public.%I select (jsonb_populate_record(null::public.%I, $1)).*',
      v_trash.table_name,
      v_trash.table_name
    ) using v_trash.record_data;
    delete from public.exbin_trash where id = v_trash.id;
    v_restored_count := v_restored_count + 1;
  end loop;

  if v_restored_count <> v_requested_count then
    raise exception 'One or more selected exBIN items could not be restored.';
  end if;
end;
$$;

revoke all on function public.exins_trash_records(jsonb) from public, anon;
revoke all on function public.exins_restore_trash(uuid[]) from public, anon;
grant execute on function public.exins_trash_records(jsonb) to authenticated;
grant execute on function public.exins_restore_trash(uuid[]) to authenticated;

create or replace function public.exins_purge_expired_trash()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.exbin_trash where expires_at <= now();
$$;

revoke all on function public.exins_purge_expired_trash() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'exbin-purge-expired') then
    perform cron.schedule(
      'exbin-purge-expired',
      '* * * * *',
      'select public.exins_purge_expired_trash();'
    );
  end if;
end;
$$;
