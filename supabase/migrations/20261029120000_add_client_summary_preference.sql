alter table public.clients
  add column if not exists preferred_summary_lens text not null default 'integrative';

alter table public.clients
  drop constraint if exists clients_preferred_summary_lens_check;

alter table public.clients
  add constraint clients_preferred_summary_lens_check
  check (preferred_summary_lens in ('general', 'integrative', 'gentle_cbt', 'transactional_analysis'));

notify pgrst, 'reload schema';
