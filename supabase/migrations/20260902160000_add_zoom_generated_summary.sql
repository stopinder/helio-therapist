-- Preserve Zoom My Notes generated summaries alongside their source transcripts.

alter table public.zoom_transcripts
  add column if not exists zoom_generated_summary text;

notify pgrst, 'reload schema';
