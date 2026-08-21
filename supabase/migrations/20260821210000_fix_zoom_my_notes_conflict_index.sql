-- Allow the API's ON CONFLICT (therapist_user_id, zoom_note_id) upsert
-- to target a normal unique index. PostgreSQL permits multiple NULL
-- zoom_note_id values, so cloud/manual transcript rows remain unaffected.
drop index if exists public.zoom_transcripts_note_idx;

create unique index zoom_transcripts_note_idx
  on public.zoom_transcripts (therapist_user_id, zoom_note_id);

notify pgrst, 'reload schema';
