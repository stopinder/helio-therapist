-- The timeline is a clinical narrative, not an activity log. Keep the schema
-- open only to event categories that describe clinical information or change.
alter table public.client_timeline_events
  drop constraint if exists client_timeline_events_event_type_check;

alter table public.client_timeline_events
  add constraint client_timeline_events_event_type_check check (event_type in (
    'outcome_measure_recorded',
    'risk_assessment_recorded',
    'diagnosis_updated',
    'treatment_plan_updated',
    'goal_updated',
    'referral_recorded',
    'medication_changed',
    'client_life_event',
    'clinical_milestone'
  )) not valid;

comment on table public.client_timeline_events is
  'A concise clinical narrative. Workflow, delivery, review, audit and system activity do not belong here.';
