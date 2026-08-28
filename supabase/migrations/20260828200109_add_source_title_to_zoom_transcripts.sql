-- Add display title metadata to Zoom transcripts.
-- Used to preserve user-renamed Zoom My Notes titles.

alter table public.zoom_transcripts
  add column if not exists source_title text;

comment on column public.zoom_transcripts.source_title is 'Display title from the source (e.g. Zoom note_name or file_name).';

notify pgrst, 'reload schema';
