create or replace function public.owns_linked_session_transcript(
  p_transcript_id uuid,
  p_client_id uuid,
  p_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.zoom_transcripts transcript
    where transcript.id = p_transcript_id
      and transcript.therapist_user_id = (select auth.uid())
      and transcript.client_id = p_client_id
      and transcript.session_ref = p_session_id::text
  );
$$;

revoke all on function public.owns_linked_session_transcript(uuid, uuid, uuid) from public, anon;
grant execute on function public.owns_linked_session_transcript(uuid, uuid, uuid) to authenticated;

drop policy if exists "Therapists create own session captures"
on public.session_capture_drafts;

create policy "Therapists create own session captures"
on public.session_capture_drafts for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.sessions session
    where session.id = session_capture_drafts.session_id
      and session.user_id = (select auth.uid())
      and session.client_id = session_capture_drafts.client_id
      and session.status <> 'completed'
  )
  and public.owns_linked_session_transcript(
    transcript_id,
    client_id,
    session_id
  )
);
