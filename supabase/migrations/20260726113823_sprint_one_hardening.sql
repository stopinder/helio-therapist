begin;

-- Re-assert the canonical summary table because the live schema was created
-- ahead of its recorded migration history. The versioned table is the only
-- summary source of truth after this migration.
create table if not exists public.reflection_supervision_summaries (
  id uuid primary key default gen_random_uuid(),
  reflection_id uuid not null references public.private_reflections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  generated_content text not null default '',
  edited_content text not null default '',
  generation_status text not null
    check (generation_status in ('generated', 'saved', 'failed', 'superseded')),
  generation_error text,
  model text,
  prompt_version text,
  generated_at timestamptz,
  saved_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reflection_supervision_summaries_reflection_created_idx
  on public.reflection_supervision_summaries(reflection_id, created_at desc);

alter table public.reflection_supervision_summaries enable row level security;

alter table public.private_reflections
  drop constraint if exists private_reflections_body_check;
alter table public.private_reflections
  add constraint private_reflections_body_check
  check (char_length(body) <= 20000);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'private_reflections'
      and column_name = 'supervision_summary'
  ) then
    execute $backfill$
      insert into public.reflection_supervision_summaries (
        reflection_id,
        user_id,
        generated_content,
        edited_content,
        generation_status,
        generated_at,
        saved_at
      )
      select
        reflection.id,
        reflection.user_id,
        reflection.supervision_summary,
        reflection.supervision_summary,
        'saved',
        reflection.updated_at,
        reflection.updated_at
      from public.private_reflections reflection
      where trim(reflection.supervision_summary) <> ''
        and not exists (
          select 1
          from public.reflection_supervision_summaries summary
          where summary.reflection_id = reflection.id
            and summary.generation_status = 'saved'
        )
    $backfill$;

    -- Keep the legacy column for one compatibility window so an application
    -- rollback does not fail. Sprint One code stops reading and writing it; a
    -- later forward migration may remove it after production observation.
    execute $comment$
      comment on column public.private_reflections.supervision_summary is
      'Deprecated compatibility column. reflection_supervision_summaries is canonical.'
    $comment$;
  end if;
end
$$;

-- Durable session state. Legacy browser identifiers are retained only as a
-- migration reference; all new sessions use their database UUID.
alter table public.sessions
  add column if not exists completed_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists workflow_status text not null default 'no_further_action',
  add column if not exists notes_status text not null default 'draft',
  add column if not exists version integer not null default 1,
  add column if not exists legacy_ref text,
  add column if not exists zoom_state text,
  add column if not exists zoom_meeting_id text,
  add column if not exists zoom_error text not null default '';

update public.sessions
set status = 'in_progress'
where status = 'draft';

alter table public.sessions
  alter column status set default 'in_progress',
  drop constraint if exists sessions_status_check,
  drop constraint if exists sessions_workflow_status_check,
  drop constraint if exists sessions_notes_status_check,
  drop constraint if exists sessions_version_check,
  drop constraint if exists sessions_notes_length_check,
  drop constraint if exists sessions_zoom_state_check;

alter table public.sessions
  add constraint sessions_status_check
    check (status in ('in_progress', 'completed')),
  add constraint sessions_workflow_status_check
    check (workflow_status in (
      'awaiting_transcript',
      'transcript_received',
      'needs_review',
      'review_choices_saved',
      'drafts_awaiting_review',
      'approved',
      'no_further_action'
    )),
  add constraint sessions_notes_status_check
    check (notes_status in ('draft', 'saved')),
  add constraint sessions_version_check
    check (version > 0),
  add constraint sessions_notes_length_check
    check (char_length(notes) <= 50000),
  add constraint sessions_zoom_state_check
    check (zoom_state is null or zoom_state in ('preparing', 'ready', 'unavailable'));

create unique index if not exists sessions_user_legacy_ref_unique
  on public.sessions(user_id, legacy_ref)
  where legacy_ref is not null;

create unique index if not exists sessions_one_open_per_client_unique
  on public.sessions(user_id, client_id)
  where status = 'in_progress';

create index if not exists sessions_user_occurred_idx
  on public.sessions(user_id, occurred_at desc);

create index if not exists sessions_client_occurred_idx
  on public.sessions(client_id, occurred_at desc);

-- A completed session becomes one canonical Timeline event. The partial unique
-- index makes completion retry-safe.
alter table public.client_timeline_events
  drop constraint if exists client_timeline_events_event_type_check,
  drop constraint if exists client_timeline_events_subject_type_check;

alter table public.client_timeline_events
  add constraint client_timeline_events_event_type_check
    check (event_type in (
      'session_completed',
      'outcome_measure_recorded',
      'risk_assessment_recorded',
      'diagnosis_updated',
      'treatment_plan_updated',
      'goal_updated',
      'referral_recorded',
      'medication_changed',
      'client_life_event',
      'clinical_milestone'
    )) not valid,
  add constraint client_timeline_events_subject_type_check
    check (subject_type in ('session', 'assignment', 'response', 'measure_result'));

create unique index if not exists client_timeline_events_session_completion_unique
  on public.client_timeline_events(session_id)
  where event_type = 'session_completed';

create unique index if not exists client_timeline_events_subject_event_unique
  on public.client_timeline_events(subject_type, subject_id, event_type);

create index if not exists client_timeline_events_user_occurred_idx
  on public.client_timeline_events(user_id, occurred_at desc);

create index if not exists client_timeline_events_client_occurred_idx
  on public.client_timeline_events(client_id, occurred_at desc);

create index if not exists client_timeline_events_session_idx
  on public.client_timeline_events(session_id)
  where session_id is not null;

-- Signed Zoom retries share one fingerprint and cannot be processed twice.
alter table public.zoom_webhook_events
  add column if not exists delivery_key text;

create unique index if not exists zoom_webhook_events_delivery_key_unique
  on public.zoom_webhook_events(delivery_key)
  where delivery_key is not null;

-- The Auth trigger must remain callable by the trigger owner only, never as a
-- public Data API RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Explicit authenticated policies avoid public-role ambiguity and cache
-- auth.uid() once per statement.
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users manage own clients" on public.clients;
create policy "Users manage own clients"
  on public.clients for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own sessions" on public.sessions;
create policy "Users manage own sessions"
  on public.sessions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.clients client
      where client.id = sessions.client_id
        and client.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own client_timeline_events" on public.client_timeline_events;
create policy "Users manage own client_timeline_events"
  on public.client_timeline_events for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.clients client
      where client.id = client_timeline_events.client_id
        and client.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own private reflections" on public.private_reflections;
create policy "Users manage own private reflections"
  on public.private_reflections for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    and (
      client_id is null
      or exists (
        select 1
        from public.clients client
        where client.id = private_reflections.client_id
          and client.user_id = (select auth.uid())
      )
    )
  )
  with check (
    (select auth.uid()) = user_id
    and (
      client_id is null
      or exists (
        select 1
        from public.clients client
        where client.id = private_reflections.client_id
          and client.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users manage own reflection supervision summaries"
  on public.reflection_supervision_summaries;
create policy "Users manage own reflection supervision summaries"
  on public.reflection_supervision_summaries for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.private_reflections reflection
      where reflection.id = reflection_supervision_summaries.reflection_id
        and reflection.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own cbt_thought_records"
  on public.cbt_thought_records;
create policy "Users manage own cbt_thought_records"
  on public.cbt_thought_records for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.clients client
      where client.id = cbt_thought_records.client_id
        and client.user_id = (select auth.uid())
    )
    and (
      session_id is null
      or exists (
        select 1 from public.sessions session
        where session.id = cbt_thought_records.session_id
          and session.client_id = cbt_thought_records.client_id
          and session.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users manage own investigations" on public.investigations;
create policy "Users manage own investigations"
  on public.investigations for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.clients client
      where client.id = investigations.client_id
        and client.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own resource_library_items"
  on public.resource_library_items;
create policy "Users manage own resource_library_items"
  on public.resource_library_items for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own resource_versions"
  on public.resource_versions;
create policy "Users manage own resource_versions"
  on public.resource_versions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.resource_library_items resource
      where resource.id = resource_versions.resource_id
        and resource.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own client requests" on public.client_requests;
create policy "Users manage own client requests"
  on public.client_requests for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.clients client
      where client.id = client_requests.client_id
        and client.user_id = (select auth.uid())
    )
    and (
      session_id is null
      or exists (
        select 1 from public.sessions session
        where session.id = client_requests.session_id
          and session.client_id = client_requests.client_id
          and session.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users manage own client_resource_assignments"
  on public.client_request_items;
create policy "Users manage own client_resource_assignments"
  on public.client_request_items for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.clients client
      where client.id = client_request_items.client_id
        and client.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.client_requests request
      where request.id = client_request_items.client_request_id
        and request.client_id = client_request_items.client_id
        and request.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.resource_versions version
      where version.id = client_request_items.resource_version_id
        and version.user_id = (select auth.uid())
    )
    and (
      session_id is null
      or exists (
        select 1 from public.sessions session
        where session.id = client_request_items.session_id
          and session.client_id = client_request_items.client_id
          and session.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users manage own client_resource_responses"
  on public.client_resource_responses;
create policy "Users manage own client_resource_responses"
  on public.client_resource_responses for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.client_request_items assignment
      where assignment.id = client_resource_responses.assignment_id
        and assignment.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own client_response_files"
  on public.client_response_files;
create policy "Users manage own client_response_files"
  on public.client_response_files for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.client_resource_responses response
      where response.id = client_response_files.response_id
        and response.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own outcome_measure_results"
  on public.outcome_measure_results;
create policy "Users manage own outcome_measure_results"
  on public.outcome_measure_results for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.client_request_items assignment
      join public.client_resource_responses response
        on response.id = outcome_measure_results.response_id
        and response.assignment_id = assignment.id
      join public.resource_versions version
        on version.id = outcome_measure_results.resource_version_id
      where assignment.id = outcome_measure_results.assignment_id
        and assignment.client_id = outcome_measure_results.client_id
        and assignment.resource_version_id = version.id
        and assignment.user_id = (select auth.uid())
        and response.user_id = (select auth.uid())
        and version.resource_id = outcome_measure_results.resource_id
        and version.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can view own documents" on public.documents;
create policy "Users can view own documents"
  on public.documents for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own documents" on public.documents;
create policy "Users can insert own documents"
  on public.documents for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own documents" on public.documents;
create policy "Users can update own documents"
  on public.documents for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own documents" on public.documents;
create policy "Users can delete own documents"
  on public.documents for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Cover foreign keys used by the current clinical workflows.
create index if not exists cbt_thought_records_client_idx on public.cbt_thought_records(client_id);
create index if not exists cbt_thought_records_session_idx on public.cbt_thought_records(session_id);
create index if not exists cbt_thought_records_user_idx on public.cbt_thought_records(user_id);
create index if not exists client_request_items_discussed_session_idx on public.client_request_items(discussed_session_id);
create index if not exists client_request_items_resource_version_idx on public.client_request_items(resource_version_id);
create index if not exists client_request_items_reviewed_by_idx on public.client_request_items(reviewed_by);
create index if not exists client_request_items_session_idx on public.client_request_items(session_id);
create index if not exists client_requests_session_idx on public.client_requests(session_id);
create index if not exists client_resource_responses_assignment_idx on public.client_resource_responses(assignment_id);
create index if not exists client_resource_responses_user_idx on public.client_resource_responses(user_id);
create index if not exists client_response_files_response_idx on public.client_response_files(response_id);
create index if not exists client_response_files_user_idx on public.client_response_files(user_id);
create index if not exists client_timeline_events_request_idx on public.client_timeline_events(client_request_id);
create index if not exists documents_user_idx on public.documents(user_id);
create index if not exists investigations_client_idx on public.investigations(client_id);
create index if not exists investigations_user_idx on public.investigations(user_id);
create index if not exists oauth_states_user_idx on public.oauth_states(user_id);
create index if not exists outcome_measure_results_resource_idx on public.outcome_measure_results(resource_id);
create index if not exists outcome_measure_results_resource_version_idx on public.outcome_measure_results(resource_version_id);
create index if not exists outcome_measure_results_user_idx on public.outcome_measure_results(user_id);
create index if not exists reflection_supervision_summaries_user_idx on public.reflection_supervision_summaries(user_id);
create index if not exists resource_versions_user_idx on public.resource_versions(user_id);
create index if not exists zoom_session_links_client_idx on public.zoom_session_links(client_id);

-- Keep one user/provider uniqueness constraint. The provider-only index blocked
-- a second therapist from connecting the same provider.
alter table public.integrations
  drop constraint if exists integrations_user_provider_unique;
drop index if exists public.integrations_user_id_provider_idx;
drop index if exists public.integrations_provider_key;

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

revoke all on function public.complete_session(uuid, text, integer) from public, anon;
grant execute on function public.complete_session(uuid, text, integer) to authenticated;

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
    and status = 'in_progress'
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

revoke all on function public.save_session_draft(uuid, text, integer, text, text, text)
  from public, anon;
grant execute on function public.save_session_draft(uuid, text, integer, text, text, text)
  to authenticated;

create or replace function public.create_session_from_transcript(
  p_client_id uuid,
  p_occurred_at timestamptz
)
returns public.sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_session public.sessions%rowtype;
  session_time timestamptz := coalesce(p_occurred_at, now());
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  perform 1
  from public.clients
  where id = p_client_id
    and user_id = current_user_id;
  if not found then
    raise exception 'Client not found' using errcode = 'P0002';
  end if;

  insert into public.sessions (
    user_id,
    client_id,
    occurred_at,
    status,
    notes,
    notes_status,
    workflow_status,
    completed_at,
    ended_at
  )
  values (
    current_user_id,
    p_client_id,
    session_time,
    'completed',
    '',
    'saved',
    'needs_review',
    session_time,
    session_time
  )
  returning * into created_session;

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
    current_user_id,
    p_client_id,
    created_session.id,
    'session_completed',
    'session',
    created_session.id,
    session_time,
    'Session completed'
  )
  on conflict (session_id) where event_type = 'session_completed'
  do nothing;

  return created_session;
end;
$$;

revoke all on function public.create_session_from_transcript(uuid, timestamptz)
  from public, anon;
grant execute on function public.create_session_from_transcript(uuid, timestamptz)
  to authenticated;

create or replace function public.import_legacy_sessions(p_sessions jsonb)
returns setof public.sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  legacy jsonb;
  imported_session public.sessions%rowtype;
  imported_status text;
  imported_started_at timestamptz;
  imported_completed_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if jsonb_typeof(p_sessions) <> 'array' then
    raise exception 'Legacy sessions must be an array' using errcode = '22023';
  end if;

  for legacy in select value from jsonb_array_elements(p_sessions)
  loop
    if coalesce(legacy ->> 'id', '') = ''
      or coalesce(legacy ->> 'clientId', '') = '' then
      raise exception 'Legacy session is missing its identity' using errcode = '22023';
    end if;

    perform 1
    from public.clients
    where id = (legacy ->> 'clientId')::uuid
      and user_id = current_user_id;
    if not found then
      raise exception 'Legacy session client is unavailable' using errcode = 'P0002';
    end if;

    imported_status := case
      when legacy ->> 'status' in ('completed', 'closed') then 'completed'
      else 'in_progress'
    end;
    imported_started_at := coalesce(
      nullif(legacy ->> 'startedAt', '')::timestamptz,
      nullif(legacy ->> 'createdAt', '')::timestamptz,
      now()
    );
    imported_completed_at := case
      when imported_status = 'completed' then coalesce(
        nullif(legacy ->> 'closedAt', '')::timestamptz,
        nullif(legacy ->> 'completedAt', '')::timestamptz,
        nullif(legacy ->> 'endedAt', '')::timestamptz,
        imported_started_at
      )
      else null
    end;

    insert into public.sessions (
      user_id,
      client_id,
      occurred_at,
      status,
      notes,
      notes_status,
      workflow_status,
      completed_at,
      ended_at,
      legacy_ref,
      zoom_state,
      zoom_meeting_id,
      zoom_error
    )
    values (
      current_user_id,
      (legacy ->> 'clientId')::uuid,
      imported_started_at,
      imported_status,
      left(coalesce(legacy ->> 'notes', ''), 50000),
      case when coalesce(legacy ->> 'notes', '') = '' then 'draft' else 'saved' end,
      case
        when legacy ->> 'workflowStatus' in (
          'awaiting_transcript',
          'transcript_received',
          'needs_review',
          'review_choices_saved',
          'drafts_awaiting_review',
          'approved',
          'no_further_action'
        ) then legacy ->> 'workflowStatus'
        else 'no_further_action'
      end,
      imported_completed_at,
      imported_completed_at,
      legacy ->> 'id',
      case
        when legacy ->> 'zoomState' in ('preparing', 'ready', 'unavailable')
          then legacy ->> 'zoomState'
        else null
      end,
      nullif(legacy ->> 'zoomMeetingId', ''),
      left(coalesce(legacy ->> 'zoomError', ''), 2000)
    )
    on conflict (user_id, legacy_ref) where legacy_ref is not null
    do update set
      notes = excluded.notes,
      notes_status = excluded.notes_status,
      workflow_status = excluded.workflow_status,
      zoom_state = excluded.zoom_state,
      zoom_meeting_id = excluded.zoom_meeting_id,
      zoom_error = excluded.zoom_error,
      updated_at = now()
    returning * into imported_session;

    if imported_session.status = 'completed' then
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
        imported_session.user_id,
        imported_session.client_id,
        imported_session.id,
        'session_completed',
        'session',
        imported_session.id,
        coalesce(imported_session.completed_at, imported_session.occurred_at),
        'Session completed'
      )
      on conflict (session_id) where event_type = 'session_completed'
      do nothing;
    end if;
  end loop;

  return query
  select *
  from public.sessions
  where user_id = current_user_id
  order by occurred_at desc;
end;
$$;

revoke all on function public.import_legacy_sessions(jsonb) from public, anon;
grant execute on function public.import_legacy_sessions(jsonb) to authenticated;

create or replace function public.save_reflection_supervision_summary(
  p_reflection_id uuid,
  p_generated_content text,
  p_edited_content text,
  p_model text default null,
  p_prompt_version text default null,
  p_generated_at timestamptz default now()
)
returns public.reflection_supervision_summaries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  saved_summary public.reflection_supervision_summaries%rowtype;
  saved_time timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  perform 1
  from public.private_reflections
  where id = p_reflection_id
    and user_id = current_user_id
  for update;

  if not found then
    raise exception 'Reflection not found' using errcode = 'P0002';
  end if;

  update public.reflection_supervision_summaries
  set
    generation_status = 'superseded',
    superseded_at = saved_time,
    updated_at = saved_time
  where reflection_id = p_reflection_id
    and user_id = current_user_id
    and generation_status = 'saved';

  insert into public.reflection_supervision_summaries (
    reflection_id,
    user_id,
    generated_content,
    edited_content,
    generation_status,
    model,
    prompt_version,
    generated_at,
    saved_at
  )
  values (
    p_reflection_id,
    current_user_id,
    left(coalesce(p_generated_content, ''), 20000),
    left(coalesce(p_edited_content, ''), 20000),
    'saved',
    nullif(p_model, ''),
    nullif(p_prompt_version, ''),
    p_generated_at,
    saved_time
  )
  returning * into saved_summary;

  return saved_summary;
end;
$$;

revoke all on function public.save_reflection_supervision_summary(uuid, text, text, text, text, timestamptz)
  from public, anon;
grant execute on function public.save_reflection_supervision_summary(uuid, text, text, text, text, timestamptz)
  to authenticated;

create or replace function public.create_resource_with_version(
  p_user_id uuid,
  p_title text,
  p_resource_kind text,
  p_content_type text,
  p_category text,
  p_audience text,
  p_description text,
  p_completion_mode text,
  p_form_definition jsonb,
  p_scoring_definition jsonb,
  p_published_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_resource public.resource_library_items%rowtype;
  created_version public.resource_versions%rowtype;
begin
  insert into public.resource_library_items (
    user_id,
    title,
    resource_kind,
    content_type,
    category,
    audience,
    description
  )
  values (
    p_user_id,
    p_title,
    p_resource_kind,
    p_content_type,
    p_category,
    p_audience,
    p_description
  )
  returning * into created_resource;

  insert into public.resource_versions (
    resource_id,
    user_id,
    version_number,
    completion_mode,
    client_title,
    client_description,
    form_definition,
    scoring_definition,
    published_at
  )
  values (
    created_resource.id,
    p_user_id,
    1,
    p_completion_mode,
    p_title,
    p_description,
    coalesce(p_form_definition, '{}'::jsonb),
    coalesce(p_scoring_definition, '{}'::jsonb),
    p_published_at
  )
  returning * into created_version;

  return jsonb_build_object(
    'resource', to_jsonb(created_resource),
    'version', to_jsonb(created_version)
  );
end;
$$;

revoke all on function public.create_resource_with_version(
  uuid, text, text, text, text, text, text, text, jsonb, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_resource_with_version(
  uuid, text, text, text, text, text, text, text, jsonb, jsonb, timestamptz
) to service_role;

create or replace function public.create_client_request_with_items(
  p_user_id uuid,
  p_client_id uuid,
  p_resource_version_ids uuid[],
  p_token_hashes text[],
  p_instruction text,
  p_due_at timestamptz,
  p_idempotency_key text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_request public.client_requests%rowtype;
  existing_request public.client_requests%rowtype;
  assignment_json jsonb;
  eligible_count integer;
begin
  if cardinality(p_resource_version_ids) = 0
    or cardinality(p_resource_version_ids) <> cardinality(p_token_hashes) then
    raise exception 'A matching resource and token list is required' using errcode = '22023';
  end if;

  perform 1
  from public.clients
  where id = p_client_id
    and user_id = p_user_id;
  if not found then
    raise exception 'Client not found' using errcode = 'P0002';
  end if;

  if nullif(p_idempotency_key, '') is not null then
    select *
    into existing_request
    from public.client_requests
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key;

    if found then
      select coalesce(
        jsonb_agg(to_jsonb(item) order by array_position(p_resource_version_ids, item.resource_version_id)),
        '[]'::jsonb
      )
      into assignment_json
      from public.client_request_items item
      where item.client_request_id = existing_request.id;

      return jsonb_build_object(
        'request', to_jsonb(existing_request),
        'assignments', assignment_json,
        'duplicate', true
      );
    end if;
  end if;

  select count(*)
  into eligible_count
  from public.resource_versions version
  join public.resource_library_items resource on resource.id = version.resource_id
  where version.id = any(p_resource_version_ids)
    and version.user_id = p_user_id
    and resource.user_id = p_user_id
    and resource.audience <> 'therapist';

  if eligible_count <> cardinality(p_resource_version_ids) then
    raise exception 'One or more resources could not be sent' using errcode = '22023';
  end if;

  insert into public.client_requests (
    user_id,
    client_id,
    therapist_instruction,
    due_at,
    delivery_channel,
    idempotency_key
  )
  values (
    p_user_id,
    p_client_id,
    coalesce(p_instruction, ''),
    p_due_at,
    'copy_link',
    nullif(p_idempotency_key, '')
  )
  returning * into created_request;

  insert into public.client_request_items (
    user_id,
    client_id,
    client_request_id,
    resource_version_id,
    sent_snapshot,
    client_access_token_hash,
    client_access_expires_at
  )
  select
    p_user_id,
    p_client_id,
    created_request.id,
    version.id,
    jsonb_build_object(
      'title', version.client_title,
      'description', version.client_description,
      'completionMode', version.completion_mode,
      'resourceVersionId', version.id
    ),
    input.token_hash,
    p_expires_at
  from unnest(p_resource_version_ids, p_token_hashes)
    with ordinality as input(version_id, token_hash, ordinal)
  join public.resource_versions version on version.id = input.version_id
  order by input.ordinal;

  select coalesce(
    jsonb_agg(to_jsonb(item) order by array_position(p_resource_version_ids, item.resource_version_id)),
    '[]'::jsonb
  )
  into assignment_json
  from public.client_request_items item
  where item.client_request_id = created_request.id;

  return jsonb_build_object(
    'request', to_jsonb(created_request),
    'assignments', assignment_json,
    'duplicate', false
  );
end;
$$;

revoke all on function public.create_client_request_with_items(
  uuid, uuid, uuid[], text[], text, timestamptz, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_client_request_with_items(
  uuid, uuid, uuid[], text[], text, timestamptz, text, timestamptz
) to service_role;

create or replace function public.submit_client_completion(
  p_assignment_id uuid,
  p_answers jsonb,
  p_scores jsonb,
  p_calculation_version text,
  p_submitted_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  assignment public.client_request_items%rowtype;
  version public.resource_versions%rowtype;
  response public.client_resource_responses%rowtype;
  measure_result public.outcome_measure_results%rowtype;
begin
  select *
  into assignment
  from public.client_request_items
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'Assignment not found' using errcode = 'P0002';
  end if;

  if assignment.status in ('completed', 'awaiting_review', 'reviewed', 'cancelled') then
    raise exception 'This item has already been submitted' using errcode = '23505';
  end if;

  select *
  into version
  from public.resource_versions
  where id = assignment.resource_version_id;

  insert into public.client_resource_responses (
    assignment_id,
    user_id,
    response_kind,
    structured_answers,
    submitted_at
  )
  values (
    assignment.id,
    assignment.user_id,
    'structured',
    coalesce(p_answers, '{}'::jsonb),
    p_submitted_at
  )
  returning * into response;

  update public.client_request_items
  set
    status = 'awaiting_review',
    completed_at = p_submitted_at,
    updated_at = p_submitted_at
  where id = assignment.id;

  insert into public.outcome_measure_results (
    assignment_id,
    response_id,
    user_id,
    client_id,
    resource_id,
    resource_version_id,
    calculation_version,
    scores,
    completed_at
  )
  values (
    assignment.id,
    response.id,
    assignment.user_id,
    assignment.client_id,
    version.resource_id,
    assignment.resource_version_id,
    p_calculation_version,
    coalesce(p_scores, '{}'::jsonb),
    p_submitted_at
  )
  returning * into measure_result;

  insert into public.client_timeline_events (
    user_id,
    client_id,
    client_request_id,
    client_request_item_id,
    event_type,
    subject_type,
    subject_id,
    occurred_at,
    summary
  )
  values (
    assignment.user_id,
    assignment.client_id,
    assignment.client_request_id,
    assignment.id,
    'outcome_measure_recorded',
    'measure_result',
    measure_result.id,
    p_submitted_at,
    coalesce(assignment.sent_snapshot ->> 'title', version.client_title, 'Outcome measure')
      || ' score: '
      || coalesce(p_scores ->> 'total', '')
  )
  on conflict (subject_type, subject_id, event_type)
  do nothing;

  return jsonb_build_object(
    'responseId', response.id,
    'resultId', measure_result.id,
    'submitted', true
  );
end;
$$;

revoke all on function public.submit_client_completion(uuid, jsonb, jsonb, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.submit_client_completion(uuid, jsonb, jsonb, text, timestamptz)
  to service_role;

notify pgrst, 'reload schema';

commit;
