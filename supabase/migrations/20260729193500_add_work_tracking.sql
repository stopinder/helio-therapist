-- Additive migration for therapist work-time tracking and billing confirmation

-- 1. Create session_work_segments table
create table if not exists public.session_work_segments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint ended_after_started check (ended_at is null or ended_at > started_at)
);

create index if not exists session_work_segments_session_started_idx on public.session_work_segments(session_id, started_at);
create index if not exists session_work_segments_user_idx on public.session_work_segments(user_id);

-- Only one open segment per session
create unique index if not exists session_work_segments_one_open_per_session
  on public.session_work_segments(session_id)
  where (ended_at is null);

-- RLS for session_work_segments
alter table public.session_work_segments enable row level security;

create policy "Therapists manage own work segments"
  on public.session_work_segments
  for all
  using (
    auth.uid() = user_id and 
    exists (select 1 from public.sessions where id = session_id and user_id = auth.uid())
  )
  with check (
    auth.uid() = user_id and 
    exists (select 1 from public.sessions where id = session_id and user_id = auth.uid())
  );

-- Immutability for segments
create or replace function public.enforce_work_segment_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (tg_op = 'UPDATE') then
    if old.started_at is distinct from new.started_at then
      raise exception 'Segment started_at is immutable' using errcode = '42501';
    end if;
    if old.ended_at is not null and (new.ended_at is distinct from old.ended_at) then
      raise exception 'Ended segments are immutable' using errcode = '42501';
    end if;
  end if;
  if (tg_op = 'DELETE') then
    raise exception 'Work segments cannot be deleted' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger enforce_work_segment_immutability_trigger
  before update or delete on public.session_work_segments
  for each row
  execute function public.enforce_work_segment_immutability();

-- 2. Add billing confirmation fields to sessions
alter table public.sessions
  add column if not exists billable_minutes integer null check (billable_minutes is null or (billable_minutes >= 0 and billable_minutes <= 1440)),
  add column if not exists billable_confirmed_at timestamptz null,
  add column if not exists billable_confirmed_by uuid null references auth.users(id),
  add column if not exists billable_adjustment_reason text null check (billable_adjustment_reason is null or char_length(billable_adjustment_reason) <= 2000);

-- Update session immutability trigger to allow billing fields
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

-- 3. Create session_billable_time_revisions table
create table if not exists public.session_billable_time_revisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_minutes integer not null,
  previous_billable_minutes integer null,
  new_billable_minutes integer not null,
  adjustment_reason text null,
  created_at timestamptz not null default now()
);

alter table public.session_billable_time_revisions enable row level security;

create policy "Therapists read own billing revisions"
  on public.session_billable_time_revisions
  for select
  using (auth.uid() = user_id);

-- Append-only revisions
create or replace function public.enforce_billing_revision_append_only()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Billing revisions are append-only' using errcode = '42501';
end;
$$;

create trigger enforce_billing_revision_append_only_trigger
  before update or delete on public.session_billable_time_revisions
  for each row
  execute function public.enforce_billing_revision_append_only();

-- 4. RPCs

-- start_session_work
create or replace function public.start_session_work(p_session_id uuid)
returns public.session_work_segments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  existing_segment public.session_work_segments%rowtype;
  new_segment public.session_work_segments%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  -- Verify ownership and status
  if not exists (
    select 1 from public.sessions 
    where id = p_session_id and user_id = current_user_id and status = 'in_progress'
  ) then
    raise exception 'Session not found or not in progress' using errcode = 'P0002';
  end if;

  -- Check for existing open segment
  select * into existing_segment
  from public.session_work_segments
  where session_id = p_session_id and ended_at is null
  limit 1;

  if found then
    return existing_segment;
  end if;

  -- Create new segment
  insert into public.session_work_segments (session_id, user_id, started_at)
  values (p_session_id, current_user_id, now())
  returning * into new_segment;

  return new_segment;
end;
$$;

-- pause_session_work
create or replace function public.pause_session_work(p_session_id uuid)
returns public.session_work_segments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  updated_segment public.session_work_segments%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  update public.session_work_segments
  set ended_at = now()
  where session_id = p_session_id 
    and user_id = current_user_id 
    and ended_at is null
  returning * into updated_segment;

  return updated_segment;
end;
$$;

-- get_session_work_summary
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
language plpgsql
security invoker
set search_path = ''
as $$
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

  select * into v_session
  from public.sessions
  where id = p_session_id and user_id = current_user_id;

  if not found then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;

  -- Sum ended segments
  select coalesce(sum(extract(epoch from (ended_at - started_at)))::integer, 0)
  into v_recorded_seconds
  from public.session_work_segments
  where session_id = p_session_id and ended_at is not null;

  -- Check for open segment
  select started_at into v_current_segment_started_at
  from public.session_work_segments
  where session_id = p_session_id and ended_at is null
  limit 1;

  -- Check if any segments exist at all
  if not exists (select 1 from public.session_work_segments where session_id = p_session_id) then
    v_tracking_state := 'not_tracked';
    return query select 
      v_tracking_state,
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

  return query select 
    v_tracking_state,
    v_recorded_seconds,
    round(v_recorded_seconds / 60.0)::integer,
    v_current_segment_started_at,
    v_session.billable_minutes,
    v_session.billable_confirmed_at,
    v_session.billable_adjustment_reason;
end;
$$;

-- confirm_session_billable_time
create or replace function public.confirm_session_billable_time(
  p_session_id uuid,
  p_billable_minutes integer,
  p_expected_version integer,
  p_adjustment_reason text default null
)
returns public.sessions
language plpgsql
security invoker
set search_path = ''
as $$
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
  where id = p_session_id and user_id = current_user_id
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

  -- Calculate recorded minutes
  select round(coalesce(sum(extract(epoch from (ended_at - started_at))), 0) / 60.0)::integer
  into v_recorded_minutes
  from public.session_work_segments
  where session_id = p_session_id;

  if p_billable_minutes <> v_recorded_minutes and (p_adjustment_reason is null or trim(p_adjustment_reason) = '') then
    raise exception 'Adjustment reason is required when billable minutes differ from recorded minutes' using errcode = '23502';
  end if;

  -- Insert revision
  insert into public.session_billable_time_revisions (
    session_id, user_id, recorded_minutes, previous_billable_minutes, new_billable_minutes, adjustment_reason
  ) values (
    p_session_id, current_user_id, v_recorded_minutes, v_session.billable_minutes, p_billable_minutes, p_adjustment_reason
  );

  -- Update session
  update public.sessions
  set 
    billable_minutes = p_billable_minutes,
    billable_confirmed_at = now(),
    billable_confirmed_by = current_user_id,
    billable_adjustment_reason = p_adjustment_reason,
    version = version + 1
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

-- Update complete_session to close open work segment
create or replace function public.complete_session(
  p_session_id uuid,
  p_notes text,
  p_expected_version integer
)
returns public.sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_session public.sessions%rowtype;
  completed_session public.sessions%rowtype;
  completion_time timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into current_session
  from public.sessions
  where id = p_session_id
    and user_id = current_user_id
  for update;

  if not found then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;

  if current_session.status = 'completed' then
    return current_session;
  end if;

  if current_session.version <> p_expected_version then
    raise exception 'Session was updated in another tab'
      using errcode = '40001';
  end if;

  -- Close any open work segment
  update public.session_work_segments
  set ended_at = completion_time
  where session_id = p_session_id 
    and user_id = current_user_id 
    and ended_at is null;

  update public.sessions
  set
    notes = left(coalesce(p_notes, ''), 50000),
    notes_status = 'saved',
    status = 'completed',
    workflow_status = case
      when zoom_meeting_id is null then 'no_further_action'
      else 'awaiting_transcript'
    end,
    completed_at = completion_time,
    ended_at = completion_time,
    updated_at = completion_time,
    version = version + 1
  where id = p_session_id
    and user_id = current_user_id
  returning * into completed_session;

  insert into public.client_timeline_events (
    user_id,
    client_id,
    session_id,
    event_type,
    subject_type,
    subject_id,
    occurred_at,
    summary
  )
  values (
    completed_session.user_id,
    completed_session.client_id,
    completed_session.id,
    'session_completed',
    'session',
    completed_session.id,
    completion_time,
    'Session completed'
  )
  on conflict (session_id) where event_type = 'session_completed'
  do nothing;

  return completed_session;
end;
$$;

notify pgrst, 'reload schema';
