-- Enforce database-level immutability for approved clinical records.
-- Approved records (status = 'completed') cannot have their core clinical data modified.
-- Technical metadata (like workflow_status, version, and zoom fields) remain mutable.

create or replace function public.enforce_session_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'completed' then
    if new.notes is distinct from old.notes or
       new.status is distinct from old.status or
       new.occurred_at is distinct from old.occurred_at or
       new.completed_at is distinct from old.completed_at or
       new.user_id is distinct from old.user_id or
       new.client_id is distinct from old.client_id or
       new.ended_at is distinct from old.ended_at or
       new.legacy_ref is distinct from old.legacy_ref
    then
      raise exception 'Approved clinical records are immutable. Corrections must be added through an amendment.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_session_immutability_trigger on public.sessions;
create trigger enforce_session_immutability_trigger
  before update on public.sessions
  for each row
  execute function public.enforce_session_immutability();
