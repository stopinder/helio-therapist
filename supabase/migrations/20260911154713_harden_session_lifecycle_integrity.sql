-- Protect session lifecycle and billing from direct bypass.
-- Only allowing updates to non-sensitive fields.
-- Sensitive fields (status, billable_minutes, etc.) must be changed via RPCs.

create or replace function public.enforce_session_lifecycle_protection()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- If not an update, we don't care (INSERT/DELETE handled by other policies/triggers)
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  -- Allow service_role or postgres to do anything (for RPCs or admin tasks)
  if current_user = 'postgres' or current_user = 'service_role' or current_setting('role', true) = 'service_role' then
    return new;
  end if;

  -- Block direct transition to completed
  if old.status <> 'completed' and new.status = 'completed' then
    raise exception 'Sessions must be completed via the complete_session RPC to ensure data integrity.'
      using errcode = '42501';
  end if;

  -- Block direct modification of billing fields
  if (old.billable_minutes is distinct from new.billable_minutes or
      old.billable_confirmed_at is distinct from new.billable_confirmed_at or
      old.billable_confirmed_by is distinct from new.billable_confirmed_by or
      old.billable_adjustment_reason is distinct from new.billable_adjustment_reason) then
    raise exception 'Billing fields must be modified via the authorized RPCs.'
      using errcode = '42501';
  end if;

  -- Block direct modification of completion time
  if old.completed_at is distinct from new.completed_at then
     raise exception 'completed_at is managed by the system and cannot be modified directly.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_session_lifecycle_protection_trigger on public.sessions;
create trigger enforce_session_lifecycle_protection_trigger
  before update on public.sessions
  for each row
  execute function public.enforce_session_lifecycle_protection();
