-- Allow truthful non-Zoom session sources to use the existing session-source table.
-- Existing Zoom rows remain valid through recording-file or My Notes identifiers.

alter table public.zoom_transcripts
  drop constraint if exists zoom_transcript_identity_check;

alter table public.zoom_transcripts
  add constraint zoom_transcript_identity_check
  check (
    source in (
      'uploaded_transcript',
      'pasted_transcript',
      'therapist_written_recollection',
      'therapist_dictated_recollection'
    )
    or zoom_recording_file_id is not null
    or zoom_note_id is not null
  );

notify pgrst, 'reload schema';
