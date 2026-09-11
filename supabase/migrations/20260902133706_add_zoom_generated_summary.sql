-- Add Zoom-generated summary column to transcripts for improved AI context.
alter table public.zoom_transcripts
  add column if not exists zoom_generated_summary text;
