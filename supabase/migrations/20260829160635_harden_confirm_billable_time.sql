-- Harden confirm_session_billable_time by defensively scoping the recorded-minutes query.

create or replace function public.confirm_session_billable_time(p_session_id uuid, p_billable_minutes integer, p_expected_version integer, p_adjustment_reason text default null)
returns public.sessions language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  v_session public.sessions%rowtype;
  v_recorded_minutes integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into v_session
  from public.sessions
  where id = p_session_id
    and user_id = current_user_id
  for update;

  if not found then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;

  if v_session.status <> 'completed' then
    raise exception 'Session must be completed before confirming billable time' using errcode = '42809';
  end if;

  if v_session.version <> p_expected_version then
    raise exception 'Session was updated in another tab' using errcode = '40001';
  end if;

  -- DEFENSIVE: Even though this is SECURITY DEFINER, we scope by user_id to prevent cross-tenant segment leaking.
  select round(coalesce(sum(extract(epoch from (ended_at - started_at))), 0) / 60.0)::integer
  into v_recorded_minutes
  from public.session_work_segments
  where session_id = p_session_id
    and user_id = current_user_id;

  if p_billable_minutes <> v_recorded_minutes and (p_adjustment_reason is null or trim(p_adjustment_reason) = '') then
    raise exception 'Adjustment reason is required when billable minutes differ from recorded minutes' using errcode = '23502';
  end if;

  insert into public.session_billable_time_revisions(
    session_id,
    user_id,
    recorded_minutes,
    previous_billable_minutes,
    new_billable_minutes,
    adjustment_reason
  )
  values (
    p_session_id,
    current_user_id,
    v_recorded_minutes,
    v_session.billable_minutes,
    p_billable_minutes,
    p_adjustment_reason
  );

  update public.sessions
  set billable_minutes = p_billable_minutes,
      billable_confirmed_at = now(),
      billable_confirmed_by = current_user_id,
      billable_adjustment_reason = p_adjustment_reason,
      version = version + 1
  where id = p_session_id
  returning * into v_session;

  return v_session;
end; $$;
