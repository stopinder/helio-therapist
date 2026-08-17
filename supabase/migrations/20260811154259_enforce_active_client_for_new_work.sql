-- Applied to production via the Supabase connector as migration
-- enforce_active_client_for_new_work. This protects the lifecycle boundary at
-- the database layer while leaving historical records readable and unchanged.
create or replace function public.reject_archived_client_new_work()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.clients c
    where c.id = new.client_id
      and c.archived = true
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Archived clients cannot receive new sessions or appointments.';
  end if;
  return new;
end;
$$;

drop trigger if exists sessions_reject_archived_client_insert on public.sessions;
create trigger sessions_reject_archived_client_insert
before insert on public.sessions
for each row execute function public.reject_archived_client_new_work();

drop trigger if exists appointments_reject_archived_client_insert on public.appointments;
create trigger appointments_reject_archived_client_insert
before insert on public.appointments
for each row execute function public.reject_archived_client_new_work();

comment on function public.reject_archived_client_new_work() is
  'Prevents new session or appointment rows for archived clients while preserving all existing historical records.';
