-- Extend the existing Zoom transcript inbox so Zoom My Notes can use the same review workflow.
-- Production application is intentionally separate from this repository migration.

alter table public.zoom_transcripts
  alter column zoom_meeting_id drop not null,
  alter column zoom_recording_file_id drop not null;

alter table public.zoom_transcripts
  add column if not exists zoom_note_id text,
  add column if not exists structured_transcript jsonb;

alter table public.zoom_transcripts
  drop constraint if exists zoom_transcript_identity_check;

alter table public.zoom_transcripts
  add constraint zoom_transcript_identity_check
  check (zoom_recording_file_id is not null or zoom_note_id is not null);

create unique index if not exists zoom_transcripts_note_idx
  on public.zoom_transcripts (therapist_user_id, zoom_note_id)
  where zoom_note_id is not null;

comment on column public.zoom_transcripts.zoom_note_id is 'Zoom My Notes note identifier.';
comment on column public.zoom_transcripts.structured_transcript is 'Structured source transcript returned by Zoom My Notes.';

notify pgrst, 'reload schema';
