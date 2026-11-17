-- Add Clinical without rewriting saved documents or legacy preferences.
begin;
alter table public.clients drop constraint if exists clients_preferred_summary_lens_check;
alter table public.clients add constraint clients_preferred_summary_lens_check
  check (preferred_summary_lens in ('clinical', 'general', 'integrative', 'gentle_cbt', 'internal_family_systems', 'transactional_analysis'));
commit;
notify pgrst, 'reload schema';
