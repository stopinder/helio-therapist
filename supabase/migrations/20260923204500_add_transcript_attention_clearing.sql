-- Add attention_cleared_at to zoom_transcripts for persistent inbox clearing
ALTER TABLE public.zoom_transcripts
ADD COLUMN attention_cleared_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.zoom_transcripts.attention_cleared_at IS 'When the therapist cleared this transcript from their Needs attention queue without completing triage.';
