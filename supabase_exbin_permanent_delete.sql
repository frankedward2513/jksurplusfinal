create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid
    from cron.job
    where jobname in ('archive-expired-exbin-trash', 'purge-expired-exbin-trash')
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

drop function if exists public.archive_expired_exbin_trash();

create or replace function public.purge_expired_exbin_trash()
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  deleted_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('purge_expired_exbin_trash'));

  delete from public.exbin_trash
  where expires_at <= now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_exbin_trash() from public, anon, authenticated;

do $$
begin
  perform cron.schedule(
    'purge-expired-exbin-trash',
    '0 * * * *',
    'select public.purge_expired_exbin_trash();'
  );
end;
$$;
