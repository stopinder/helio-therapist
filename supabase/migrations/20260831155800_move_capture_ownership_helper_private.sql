create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

alter function public.owns_linked_session_transcript(uuid, uuid, uuid)
  set schema private;

revoke all on function private.owns_linked_session_transcript(uuid, uuid, uuid)
  from public, anon;
grant execute on function private.owns_linked_session_transcript(uuid, uuid, uuid)
  to authenticated;
