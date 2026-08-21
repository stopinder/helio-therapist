-- Add support for Zoom My Notes transcripts to the zoom_transcripts table.
-- Allows My Notes to be stored alongside Cloud Recordings.

ALTER TABLE public.zoom_transcripts 
  ALTER COLUMN zoom_meeting_id DROP NOT NULL,
  ALTER COLUMN zoom_recording_file_id DROP NOT NULL;

ALTER TABLE public.zoom_transcripts
  ADD COLUMN IF NOT EXISTS zoom_note_id text,
  ADD COLUMN IF NOT EXISTS structured_transcript jsonb;

-- Ensure a transcript record identifies as either a recording file or a My Note.
ALTER TABLE public.zoom_transcripts
  ADD CONSTRAINT zoom_transcript_identity_check 
  CHECK (zoom_recording_file_id IS NOT NULL OR zoom_note_id IS NOT NULL);

-- Unique index for My Notes to prevent duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS zoom_transcripts_note_idx 
  ON public.zoom_transcripts (therapist_user_id, zoom_note_id)
  WHERE zoom_note_id IS NOT NULL;

COMMENT ON COLUMN public.zoom_transcripts.zoom_note_id IS 'Zoom My Notes ID for note-generated transcripts';
COMMENT ON COLUMN public.zoom_transcripts.structured_transcript IS 'Original JSON transcript structure from Zoom (My Notes)';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
