alter table public.clients
  drop constraint if exists clients_preferred_summary_lens_check;

alter table public.clients
  add constraint clients_preferred_summary_lens_check
  check (preferred_summary_lens in ('general', 'integrative', 'gentle_cbt', 'internal_family_systems', 'transactional_analysis'));

notify pgrst, 'reload schema';
