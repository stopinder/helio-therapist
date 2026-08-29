-- Harden start_session_work to strictly scope existing open segment lookup by current_user_id.
-- This prevents SECURITY DEFINER from returning an open segment belonging to a different therapist.

create or replace function public.start_session_work(p_session_id uuid)
returns public.session_work_segments language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  existing_segment public.session_work_segments%rowtype;
  new_segment public.session_work_segments%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  -- Verify session exists, belongs to the current user, and is in progress
  if not exists (
    select 1
    from public.sessions
    where id = p_session_id
      and user_id = current_user_id
      and status = 'in_progress'
  ) then
    raise exception 'Session not found or not in progress' using errcode = 'P0002';
  end if;

  -- Scope the existing-open-segment lookup by therapist
  select * into existing_segment
  from public.session_work_segments
  where session_id = p_session_id
    and user_id = current_user_id
    and ended_at is null
  limit 1;

  if found then
    return existing_segment;
  end if;

  -- Insert new segment for this therapist
  insert into public.session_work_segments (session_id, user_id, started_at)
  values (p_session_id, current_user_id, now())
  returning * into new_segment;

  return new_segment;
end; $$;

revoke execute on function public.start_session_work(uuid) from public, anon;
grant execute on function public.start_session_work(uuid) to authenticated, service_role;
