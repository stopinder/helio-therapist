begin;

-- Imported transcript material represents an encounter awaiting therapist review,
-- not a currently active clinical session. Keep active-session exclusivity intact
-- while allowing transcript-backed encounters to exist alongside it.
alter table public.sessions
  drop constraint if exists sessions_status_check;

alter table public.sessions
  add constraint sessions_status_check
  check (status in ('in_progress', 'source_ready', 'completed'));

alter table public.zoom_transcripts
  add column if not exists source_occurred_at timestamptz;

update public.zoom_transcripts
set source_occurred_at = received_at
where source_occurred_at is null;

create or replace function public.reject_direct_completed_session_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if new.status = 'completed' or new.completed_at is not null then
    raise exception
      'Completed sessions must be approved through the authorised complete_session RPC.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.save_session_draft(
  p_session_id uuid,
  p_notes text,
  p_expected_version integer,
  p_zoom_state text default null,
  p_zoom_meeting_id text default null,
  p_zoom_error text default null
)
returns public.sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  saved_session public.sessions%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  update public.sessions
  set
    notes = left(coalesce(p_notes, ''), 50000),
    notes_status = 'saved',
    zoom_state = coalesce(p_zoom_state, zoom_state),
    zoom_meeting_id = coalesce(p_zoom_meeting_id, zoom_meeting_id),
    zoom_error = coalesce(p_zoom_error, zoom_error),
    updated_at = now(),
    version = version + 1
  where id = p_session_id
    and user_id = current_user_id
    and status in ('in_progress', 'source_ready')
    and version = p_expected_version
  returning * into saved_session;

  if found then
    return saved_session;
  end if;

  if exists (
    select 1
    from public.sessions
    where id = p_session_id
      and user_id = current_user_id
  ) then
    raise exception 'Session was updated in another tab' using errcode = '40001';
  end if;

  raise exception 'Session not found' using errcode = 'P0002';
end;
$$;

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

  update public.sessions
  set
    notes = left(coalesce(p_notes, ''), 50000),
    notes_status = 'saved',
    status = 'completed',
    workflow_status = case
      when current_session.status = 'source_ready' then 'approved'
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

create or replace function public.assign_transcript_to_client(
  p_transcript_id uuid,
  p_client_id uuid,
  p_expected_updated_at timestamptz
)
returns public.zoom_transcripts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_transcript public.zoom_transcripts%rowtype;
  assigned_transcript public.zoom_transcripts%rowtype;
  created_session public.sessions%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into current_transcript
  from public.zoom_transcripts
  where id = p_transcript_id
    and therapist_user_id = current_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Transcript not found' using errcode = 'P0002';
  end if;

  if p_expected_updated_at is null
     or current_transcript.updated_at is distinct from p_expected_updated_at then
    raise exception 'Transcript changed in another tab'
      using errcode = '40001';
  end if;

  perform 1
  from public.clients
  where id = p_client_id
    and user_id = current_user_id
    and coalesce(archived, false) = false;

  if not found then
    raise exception 'Client not found or archived' using errcode = 'P0002';
  end if;

  -- Idempotent assignment: retain a verified existing encounter.
  if current_transcript.client_id = p_client_id
     and current_transcript.session_ref is not null then
    perform 1
    from public.sessions
    where id::text = current_transcript.session_ref
      and client_id = p_client_id
      and user_id = current_user_id;

    if found then
      update public.zoom_transcripts
      set
        status = 'ready',
        attention_cleared_at = coalesce(attention_cleared_at, now()),
        updated_at = now()
      where id = current_transcript.id
        and therapist_user_id = current_user_id
      returning * into assigned_transcript;

      return assigned_transcript;
    end if;
  end if;

  insert into public.sessions (
    user_id,
    client_id,
    occurred_at,
    status,
    notes,
    notes_status,
    workflow_status,
    zoom_meeting_id
  )
  values (
    current_user_id,
    p_client_id,
    coalesce(current_transcript.source_occurred_at, current_transcript.received_at, now()),
    'source_ready',
    '',
    'draft',
    'transcript_received',
    current_transcript.zoom_meeting_id
  )
  returning * into created_session;

  update public.zoom_transcripts
  set
    client_id = p_client_id,
    session_ref = created_session.id::text,
    status = 'ready',
    review_choices_saved_at = null,
    completed_at = null,
    attention_cleared_at = now(),
    updated_at = now()
  where id = current_transcript.id
    and therapist_user_id = current_user_id
  returning * into assigned_transcript;

  return assigned_transcript;
end;
$$;

revoke all on function public.assign_transcript_to_client(uuid, uuid, timestamptz)
  from public, anon;
grant execute on function public.assign_transcript_to_client(uuid, uuid, timestamptz)
  to authenticated;

-- Repair transcripts assigned under the older two-step workflow so they become
-- immediately available as their own Clinical Workspace encounter.
do $$
declare
  transcript_row record;
  created_session_id uuid;
begin
  for transcript_row in
    select id, therapist_user_id, client_id, zoom_meeting_id,
           coalesce(source_occurred_at, received_at, now()) as occurred_at
    from public.zoom_transcripts
    where client_id is not null
      and session_ref is null
      and deleted_at is null
  loop
    insert into public.sessions (
      user_id,
      client_id,
      occurred_at,
      status,
      notes,
      notes_status,
      workflow_status,
      zoom_meeting_id
    )
    values (
      transcript_row.therapist_user_id,
      transcript_row.client_id,
      transcript_row.occurred_at,
      'source_ready',
      '',
      'draft',
      'transcript_received',
      transcript_row.zoom_meeting_id
    )
    returning id into created_session_id;

    update public.zoom_transcripts
    set
      session_ref = created_session_id::text,
      status = 'ready',
      updated_at = now()
    where id = transcript_row.id;
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
