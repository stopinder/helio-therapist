-- Prevent authenticated users from bypassing complete_session() with a one-step INSERT.
-- Existing UPDATE lifecycle protection and privileged data-recovery paths are retained.
begin;

create or replace function public.reject_direct_completed_session_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Trusted service and migration roles retain the ability to restore historical records.
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if new.status = 'completed' or new.completed_at is not null then
    raise exception
      'Sessions must begin in progress and be completed through the authorised complete_session RPC.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists reject_direct_completed_session_insert_trigger on public.sessions;
create trigger reject_direct_completed_session_insert_trigger
  before insert on public.sessions
  for each row
  execute function public.reject_direct_completed_session_insert();

commit;
