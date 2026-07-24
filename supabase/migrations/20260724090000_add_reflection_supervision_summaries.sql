-- A supervision summary is an optional therapist-authored attachment to a
-- private reflection. It never replaces the original reflection or enters a
-- client record.
alter table public.private_reflections
  add column if not exists supervision_summary text not null default '';

comment on column public.private_reflections.supervision_summary is
  'Optional editable preparation for supervision, attached to a private reflection. The original body remains unchanged.';

notify pgrst, 'reload schema';
