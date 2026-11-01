-- Backfill a visibly complete synthetic Daniel worked example into every
-- internally marked sample practice. Additive only: existing therapist changes
-- are preserved and no real client records are touched.

begin;

-- Daniel Care: aims/objectives, shared understanding, active experiments,
-- observed change and learning.
with daniel as (
  select c.id as client_id, c.user_id,
         (
           select s.id
           from public.sessions s
           where s.client_id = c.id and s.user_id = c.user_id
           order by s.occurred_at desc
           limit 1
         ) as session_id
  from public.clients c
  join private.sample_clients sample
    on sample.client_id = c.id and sample.user_id = c.user_id
  where c.reference = 'SAMPLE-003'
    and c.display_name = 'Daniel Reed — Sample'
    and c.email = 'daniel.sample@example.invalid'
), desired(kind, body) as (
  values
    ('current_focus'::text, 'Build confidence in ordinary social situations without making the absence of anxiety the condition for taking part.'::text),
    ('current_focus'::text, 'Reduce early withdrawal from manageable social contact and increase opportunities for corrective experience.'::text),
    ('shared_understanding'::text, 'Daniel often predicts rejection before there is enough evidence, then leaves or avoids the situation; this reduces anxiety briefly but prevents the prediction being tested.'::text),
    ('trying'::text, 'Use a three-step confidence ladder for social situations and record predictions versus outcomes.'::text),
    ('trying'::text, 'Complete one brief coffee with a colleague and remain for the agreed twenty minutes unless there is a genuine reason to leave.'::text),
    ('change_noticed'::text, 'Daniel is beginning to recognise anxious predictions as predictions rather than treating them as established facts.'::text),
    ('learning'::text, 'Leaving early reduces discomfort quickly, but it also removes the chance to discover whether the feared rejection would actually occur.'::text)
)
insert into public.client_care_items (
  therapist_id, client_id, kind, body, status, origin, provenance_session_id
)
select d.user_id, d.client_id, desired.kind, desired.body, 'current', 'clinician', d.session_id
from daniel d
cross join desired
where not exists (
  select 1
  from public.client_care_items existing
  where existing.therapist_id = d.user_id
    and existing.client_id = d.client_id
    and existing.kind = desired.kind
    and existing.body = desired.body
);

-- A linked Daniel transcript that is visible inside the client workspace.
with daniel as (
  select c.id as client_id, c.user_id, s.id as session_id, s.occurred_at
  from public.clients c
  join private.sample_clients sample
    on sample.client_id = c.id and sample.user_id = c.user_id
  join lateral (
    select s.id, s.occurred_at
    from public.sessions s
    where s.client_id = c.id and s.user_id = c.user_id
    order by s.occurred_at desc
    limit 1
  ) s on true
  where c.reference = 'SAMPLE-003'
    and c.display_name = 'Daniel Reed — Sample'
    and c.email = 'daniel.sample@example.invalid'
)
insert into public.zoom_transcripts (
  therapist_user_id,
  client_id,
  session_ref,
  zoom_note_id,
  zoom_meeting_id,
  original_format,
  original_transcript,
  structured_transcript,
  zoom_generated_summary,
  source,
  source_title,
  source_occurred_at,
  status,
  source_retention,
  attention_cleared_at,
  deleted_at,
  updated_at
)
select
  d.user_id,
  d.client_id,
  d.session_id::text,
  'SAMPLE-NOTE-DANIEL-001',
  'sample-daniel-001',
  'JSON',
  '[00:00:00.000] Daniel Reed — Sample: I usually decide they are not interested before anything has really happened.\n[00:00:10.000] Therapist: What do you tend to do once that prediction shows up?\n[00:00:20.000] Daniel Reed — Sample: I make an excuse and leave, or I do not go in the first place.\n[00:00:30.000] Therapist: So the prediction never gets much of a test.\n[00:00:40.000] Daniel Reed — Sample: No. I suppose I only collect evidence that I escaped it.\n[00:00:50.000] Therapist: What would be small enough to test without making this an ordeal?\n[00:01:00.000] Daniel Reed — Sample: A coffee with someone from work. Twenty minutes, maybe.',
  jsonb_build_object(
    'speakers', jsonb_build_array(
      jsonb_build_object('speaker_id','1','display_name','Therapist'),
      jsonb_build_object('speaker_id','2','display_name','Daniel Reed — Sample')
    ),
    'items', jsonb_build_array(
      jsonb_build_object('speaker_id','2','start_time','00:00:00.000','text','I usually decide they are not interested before anything has really happened.'),
      jsonb_build_object('speaker_id','1','start_time','00:00:10.000','text','What do you tend to do once that prediction shows up?'),
      jsonb_build_object('speaker_id','2','start_time','00:00:20.000','text','I make an excuse and leave, or I do not go in the first place.'),
      jsonb_build_object('speaker_id','1','start_time','00:00:30.000','text','So the prediction never gets much of a test.'),
      jsonb_build_object('speaker_id','2','start_time','00:00:40.000','text','No. I suppose I only collect evidence that I escaped it.'),
      jsonb_build_object('speaker_id','1','start_time','00:00:50.000','text','What would be small enough to test without making this an ordeal?'),
      jsonb_build_object('speaker_id','2','start_time','00:01:00.000','text','A coffee with someone from work. Twenty minutes, maybe.')
    )
  ),
  '## Key Outcomes\nDaniel described anticipatory anxiety before social situations and a tendency to leave early when he predicts rejection. The session moved toward a small behavioural experiment rather than trying to remove anxiety first.\n## Decisions & Agreements\n- Have a short coffee with a colleague.\n- Record the prediction beforehand and what actually happens.',
  'sample_zoom_my_notes',
  'Daniel Reed — Sample',
  d.occurred_at,
  'ready',
  'keep_until_review',
  null,
  null,
  now()
from daniel d
where not exists (
  select 1
  from public.zoom_transcripts z
  where z.therapist_user_id = d.user_id
    and z.zoom_note_id = 'SAMPLE-NOTE-DANIEL-001'
);

-- A reviewed Session Capture grounded in the synthetic Daniel transcript.
with source as (
  select
    z.id as transcript_id,
    z.therapist_user_id as user_id,
    z.client_id,
    z.session_ref::uuid as session_id
  from public.zoom_transcripts z
  where z.source = 'sample_zoom_my_notes'
    and z.zoom_note_id = 'SAMPLE-NOTE-DANIEL-001'
    and z.client_id is not null
    and z.session_ref is not null
)
insert into public.session_capture_drafts (
  session_id,
  user_id,
  client_id,
  transcript_id,
  speaker_identities,
  generated_content,
  content,
  evidence,
  therapist_guidance,
  dismissed_fields,
  previous_versions,
  status,
  version,
  reviewed_at,
  updated_at
)
select
  source.session_id,
  source.user_id,
  source.client_id,
  source.transcript_id,
  '{"Therapist":"Therapist","Daniel Reed — Sample":"Client"}'::jsonb,
  jsonb_build_object(
    'presentingConcerns','Daniel described anxiety and self-consciousness before social situations, with a tendency to predict rejection and leave interactions early when discomfort rises.',
    'sessionThemes','The conversation focused on noticing predictions before social contact, distinguishing anxiety from evidence, and choosing a manageable next step rather than avoiding the situation entirely.',
    'interventionsUsed','The therapist used collaborative questioning, normalisation and a graded behavioural-experiment frame to help Daniel identify one achievable social step.',
    'clientResponse','Daniel recognised that leaving early reduces anxiety in the moment but prevents him learning whether the feared outcome would actually occur. He identified a brief coffee with a colleague as a realistic next experiment.',
    'riskSafeguarding','',
    'progressGoals','Continue building confidence through small, observable social experiments and compare predictions with what actually happens.',
    'planNextSession','Review the coffee experiment, what Daniel predicted beforehand, what happened, and what he noticed about the urge to leave.'
  ),
  jsonb_build_object(
    'presentingConcerns','Daniel described anxiety and self-consciousness before social situations, with a tendency to predict rejection and leave interactions early when discomfort rises.',
    'sessionThemes','The conversation focused on noticing predictions before social contact, distinguishing anxiety from evidence, and choosing a manageable next step rather than avoiding the situation entirely.',
    'interventionsUsed','The therapist used collaborative questioning, normalisation and a graded behavioural-experiment frame to help Daniel identify one achievable social step.',
    'clientResponse','Daniel recognised that leaving early reduces anxiety in the moment but prevents him learning whether the feared outcome would actually occur. He identified a brief coffee with a colleague as a realistic next experiment.',
    'riskSafeguarding','',
    'progressGoals','Continue building confidence through small, observable social experiments and compare predictions with what actually happens.',
    'planNextSession','Review the coffee experiment, what Daniel predicted beforehand, what happened, and what he noticed about the urge to leave.'
  ),
  '{"sample":true,"source":"sample_practice_visible_story"}'::jsonb,
  '',
  '{}'::text[],
  '[]'::jsonb,
  'reviewed',
  1,
  now(),
  now()
from source
where not exists (
  select 1
  from public.session_capture_drafts existing
  where existing.session_id = source.session_id
);

-- Daniel therapist-facing session summary document.
with source as (
  select
    c.id as client_id,
    c.user_id,
    c.reference,
    c.display_name,
    z.id as transcript_id,
    z.session_ref::uuid as session_id,
    z.source_occurred_at
  from public.clients c
  join private.sample_clients sample
    on sample.client_id = c.id and sample.user_id = c.user_id
  join public.zoom_transcripts z
    on z.client_id = c.id
   and z.therapist_user_id = c.user_id
   and z.zoom_note_id = 'SAMPLE-NOTE-DANIEL-001'
  where c.reference = 'SAMPLE-003'
    and c.display_name = 'Daniel Reed — Sample'
    and c.email = 'daniel.sample@example.invalid'
)
insert into public.documents (
  user_id,
  client_id,
  client_ref,
  client_name,
  title,
  document_type,
  status,
  purpose,
  recipient,
  content,
  source_manifest
)
select
  source.user_id,
  source.client_id,
  source.reference,
  source.display_name,
  'Sample session summary — Daniel',
  'session_summary',
  'draft',
  'Worked sample of a transcript-backed session summary.',
  'Therapist review',
  jsonb_build_object(
    'body','Daniel described anticipatory anxiety and self-consciousness before social situations, with a pattern of predicting rejection and leaving or avoiding contact early. The session focused on separating prediction from evidence and agreeing a manageable behavioural experiment: a brief coffee with a colleague, remaining for the agreed twenty minutes and recording the prediction versus what actually happened. Daniel recognised that leaving early reduces anxiety in the moment but prevents new learning. No risk or safeguarding concern is included in this synthetic example.',
    'sample',true,
    'sample_kind','session_summary'
  ),
  jsonb_build_array(
    jsonb_build_object(
      'kind','zoom_transcript',
      'id',source.transcript_id,
      'sessionId',source.session_id,
      'occurredAt',source.source_occurred_at,
      'sample',true
    )
  )
from source
where not exists (
  select 1
  from public.documents d
  where d.user_id = source.user_id
    and d.client_id = source.client_id
    and d.title = 'Sample session summary — Daniel'
);

-- Daniel care-plan document.
with daniel as (
  select
    c.id as client_id,
    c.user_id,
    c.reference,
    c.display_name,
    (
      select s.id
      from public.sessions s
      where s.client_id = c.id and s.user_id = c.user_id
      order by s.occurred_at desc
      limit 1
    ) as session_id
  from public.clients c
  join private.sample_clients sample
    on sample.client_id = c.id and sample.user_id = c.user_id
  where c.reference = 'SAMPLE-003'
    and c.display_name = 'Daniel Reed — Sample'
    and c.email = 'daniel.sample@example.invalid'
)
insert into public.documents (
  user_id,
  client_id,
  client_ref,
  client_name,
  title,
  document_type,
  status,
  purpose,
  recipient,
  content,
  source_manifest
)
select
  d.user_id,
  d.client_id,
  d.reference,
  d.display_name,
  'Sample care plan — Daniel',
  'treatment_plan',
  'draft',
  'Show how aims, formulation and agreed next steps can be held together.',
  'Clinical record',
  jsonb_build_object(
    'body','Aims and objectives\n• Build confidence in manageable social situations.\n• Reduce early withdrawal driven by anxious prediction.\n\nShared understanding\nDaniel often predicts rejection before enough evidence is available. Leaving early reduces discomfort quickly but also prevents the prediction being tested.\n\nCurrent plan\nUse a graded confidence ladder, complete one short coffee with a colleague, and record the prediction, outcome and urge to leave. Review the result collaboratively at the next session.',
    'goals',jsonb_build_array(
      'Build confidence in manageable social situations',
      'Reduce early withdrawal driven by anxious prediction',
      'Increase opportunities for corrective learning'
    ),
    'sample',true,
    'sample_kind','care_plan'
  ),
  jsonb_build_array(jsonb_build_object('kind','session','id',d.session_id,'sample',true))
from daniel d
where not exists (
  select 1
  from public.documents existing
  where existing.user_id = d.user_id
    and existing.client_id = d.client_id
    and existing.title = 'Sample care plan — Daniel'
);

-- Keep a separate unassigned import in Transcript Inbox so triage can be
-- practised without making Daniel's worked example incomplete.
with alex as (
  select c.id, c.user_id
  from public.clients c
  join private.sample_clients sample
    on sample.client_id = c.id and sample.user_id = c.user_id
  where c.reference = 'SAMPLE-001'
    and c.display_name = 'Alex Morgan — Sample'
    and c.email = 'alex.sample@example.invalid'
)
insert into public.zoom_transcripts (
  therapist_user_id,
  client_id,
  session_ref,
  zoom_note_id,
  zoom_meeting_id,
  original_format,
  original_transcript,
  structured_transcript,
  zoom_generated_summary,
  source,
  source_title,
  source_occurred_at,
  status,
  source_retention,
  attention_cleared_at,
  deleted_at,
  updated_at
)
select
  alex.user_id,
  null,
  null,
  'SAMPLE-NOTE-ALEX-INBOX-004',
  'sample-alex-inbox-004',
  'JSON',
  '[00:00:00.000] Alex Morgan — Sample: I noticed the checking urge again after a late email, but I did not act on it straight away.\n[00:00:10.000] Therapist: What helped you create that gap this time?\n[00:00:20.000] Alex Morgan — Sample: I remembered that the last time I waited, the urgency dropped by itself.\n[00:00:30.000] Therapist: That gives us another example to compare with the earlier sessions.',
  jsonb_build_object(
    'speakers', jsonb_build_array(
      jsonb_build_object('speaker_id','1','display_name','Therapist'),
      jsonb_build_object('speaker_id','2','display_name','Alex Morgan — Sample')
    ),
    'items', jsonb_build_array(
      jsonb_build_object('speaker_id','2','start_time','00:00:00.000','text','I noticed the checking urge again after a late email, but I did not act on it straight away.'),
      jsonb_build_object('speaker_id','1','start_time','00:00:10.000','text','What helped you create that gap this time?'),
      jsonb_build_object('speaker_id','2','start_time','00:00:20.000','text','I remembered that the last time I waited, the urgency dropped by itself.'),
      jsonb_build_object('speaker_id','1','start_time','00:00:30.000','text','That gives us another example to compare with the earlier sessions.')
    )
  ),
  '## Key Outcomes\nA new synthetic Zoom note is waiting to be matched to the existing Alex Morgan — Sample client.\n## Decisions & Agreements\n- Review the client clues and encounter date.\n- Assign the import from Transcript Inbox.',
  'sample_zoom_my_notes',
  'Alex Morgan — Sample',
  date_trunc('day', now()) + interval '9 hours',
  'unassigned',
  'keep_until_review',
  null,
  null,
  now()
from alex
where not exists (
  select 1
  from public.zoom_transcripts z
  where z.therapist_user_id = alex.user_id
    and z.zoom_note_id = 'SAMPLE-NOTE-ALEX-INBOX-004'
);

notify pgrst, 'reload schema';

commit;
