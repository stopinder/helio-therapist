-- Add soft-delete support to zoom_transcripts to prevent re-import of deleted sources.
alter table public.zoom_transcripts
  add column if not exists deleted_at timestamptz null;

-- Database-level protection to ensure tombstoned records cannot be revived or repopulated.
create or replace function public.protect_zoom_transcript_tombstone()
returns trigger as $$
begin
  if old.deleted_at is not null then
    -- Prevent clearing deleted_at or repopulating content fields
    new.deleted_at := old.deleted_at;
    new.original_transcript := old.original_transcript;
    new.structured_transcript := old.structured_transcript;
    new.zoom_generated_summary := old.zoom_generated_summary;
    new.source_title := old.source_title;
    new.requested_lens := old.requested_lens;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger protect_zoom_transcript_tombstone_trigger
  before update on public.zoom_transcripts
  for each row
  execute function public.protect_zoom_transcript_tombstone();

notify pgrst, 'reload schema';
