-- Explicit therapist-facing transcript review states.
-- Session records remain client-side in this MVP, so session_ref deliberately stores
-- the stable local session identifier rather than creating a false database relationship.

alter table public.zoom_transcripts
  add column if not exists session_ref text,
  add column if not exists review_choices_saved_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists zoom_transcripts_session_ref_idx
  on public.zoom_transcripts (therapist_user_id, client_id, session_ref)
  where session_ref is not null;

notify pgrst, 'reload schema';
