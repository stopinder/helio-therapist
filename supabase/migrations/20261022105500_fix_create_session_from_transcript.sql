-- Fix public.create_session_from_transcript to comply with clinical integrity triggers.
-- New sessions must start in_progress.
-- If an open session already exists for the client, it throws an exception to prevent silent reuse.

begin;

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

  -- Block creation if an in-progress session already exists for this client.
  -- This respects the database constraint and requires the therapist to make a choice.
  perform 1
  from public.sessions
  where client_id = p_client_id
    and user_id = current_user_id
    and status = 'in_progress';

  if found then
    -- Using a custom error message that can be caught by the frontend.
    raise exception 'An in-progress session already exists for this client. Please complete or discard it before creating a new one.' using errcode = 'P0003';
  end if;

  insert into public.sessions (
    user_id,
    client_id,
    occurred_at,
    status,
    notes,
    notes_status,
    workflow_status
  )
  values (
    current_user_id,
    p_client_id,
    session_time,
    'in_progress',
    '',
    'draft',
    'no_further_action'
  )
  returning * into created_session;

  return created_session;
end;
$$;

commit;
