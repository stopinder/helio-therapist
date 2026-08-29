-- Harden get_session_work_summary to strictly scope all work segment queries by current_user_id.
-- This prevents SECURITY DEFINER from leaking segments between therapists on the same session.

create or replace function public.get_session_work_summary(p_session_id uuid)
returns table (
  tracking_state text,
  recorded_seconds integer,
  recorded_minutes integer,
  current_segment_started_at timestamptz,
  billable_minutes integer,
  billable_confirmed_at timestamptz,
  billable_adjustment_reason text
)
language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  v_session public.sessions%rowtype;
  v_recorded_seconds integer := 0;
  v_tracking_state text;
  v_current_segment_started_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  -- Verify session exists and belongs to the current user
  select * into v_session
  from public.sessions
  where id = p_session_id and user_id = current_user_id;

  if not found then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;

  -- 1. Sum ended segments for this therapist only
  select coalesce(sum(extract(epoch from (ended_at - started_at)))::integer, 0)
  into v_recorded_seconds
  from public.session_work_segments
  where session_id = p_session_id
    and user_id = current_user_id
    and ended_at is not null;

  -- 2. Find open segment for this therapist only
  select started_at
  into v_current_segment_started_at
  from public.session_work_segments
  where session_id = p_session_id
    and user_id = current_user_id
    and ended_at is null
  limit 1;

  -- 3. Check if any segments exist for this therapist only
  if not exists(
    select 1
    from public.session_work_segments
    where session_id = p_session_id
      and user_id = current_user_id
  ) then
    return query
    select
      'not_tracked'::text,
      null::integer,
      null::integer,
      null::timestamptz,
      v_session.billable_minutes,
      v_session.billable_confirmed_at,
      v_session.billable_adjustment_reason;
    return;
  end if;

  if v_session.status = 'completed' then
    v_tracking_state := 'completed';
  elsif v_current_segment_started_at is not null then
    v_tracking_state := 'running';
    v_recorded_seconds := v_recorded_seconds + extract(epoch from (now() - v_current_segment_started_at))::integer;
  elsif v_recorded_seconds > 0 then
    v_tracking_state := 'paused';
  else
    v_tracking_state := 'not_started';
  end if;

  return query
  select
    v_tracking_state,
    v_recorded_seconds,
    round(v_recorded_seconds / 60.0)::integer,
    v_current_segment_started_at,
    v_session.billable_minutes,
    v_session.billable_confirmed_at,
    v_session.billable_adjustment_reason;
end; $$;

revoke execute on function public.get_session_work_summary(uuid) from public, anon;
grant execute on function public.get_session_work_summary(uuid) to authenticated, service_role;
