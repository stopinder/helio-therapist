-- Completed sessions are approved clinical records.
-- They may be corrected only through the existing amendment workflow, not deleted.
-- Unfinished session drafts retain their existing deletion behaviour.

create or replace function public.prevent_completed_session_deletion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'completed' then
    raise exception 'Approved clinical records cannot be deleted. Corrections must be added through an amendment.'
      using errcode = '42501';
  end if;

  return old;
end;
$$;

drop trigger if exists prevent_completed_session_deletion_trigger on public.sessions;
create trigger prevent_completed_session_deletion_trigger
  before delete on public.sessions
  for each row
  execute function public.prevent_completed_session_deletion();
