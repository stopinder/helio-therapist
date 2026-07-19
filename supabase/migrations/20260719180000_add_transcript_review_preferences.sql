-- Record therapist-directed transcript processing choices without initiating AI analysis.
-- Raw transcript deletion remains a future explicit workflow; this stores intent only.

alter table public.zoom_transcripts
  add column if not exists requested_lens text,
  add column if not exists source_retention text not null default 'keep_until_review';

alter table public.zoom_transcripts
  drop constraint if exists zoom_transcripts_requested_lens_check;

alter table public.zoom_transcripts
  add constraint zoom_transcripts_requested_lens_check
  check (requested_lens is null or requested_lens in (
    'clinical_summary',
    'draft_note',
    'cbt',
    'ifs',
    'supervision_reflection'
  ));

alter table public.zoom_transcripts
  drop constraint if exists zoom_transcripts_source_retention_check;

alter table public.zoom_transcripts
  add constraint zoom_transcripts_source_retention_check
  check (source_retention in (
    'keep_until_review',
    'delete_after_approved_output'
  ));
