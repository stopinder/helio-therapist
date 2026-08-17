create index if not exists session_billable_time_revisions_session_idx
  on public.session_billable_time_revisions (session_id);

create index if not exists session_billable_time_revisions_user_idx
  on public.session_billable_time_revisions (user_id);

create index if not exists sessions_billable_confirmed_by_idx
  on public.sessions (billable_confirmed_by)
  where billable_confirmed_by is not null;

drop policy if exists "Therapists manage own work segments"
  on public.session_work_segments;
