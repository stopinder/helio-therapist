revoke all on table public.session_work_segments from anon;
revoke all on table public.session_billable_time_revisions from anon;

grant select, insert, update on table public.session_work_segments to authenticated;
grant select on table public.session_billable_time_revisions to authenticated;

drop policy if exists "Therapists manage own work segments" on public.session_work_segments;
create policy "Therapists manage own work segments"
on public.session_work_segments
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.sessions
    where sessions.id = session_work_segments.session_id
      and sessions.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.sessions
    where sessions.id = session_work_segments.session_id
      and sessions.user_id = (select auth.uid())
  )
);

drop policy if exists "Therapists read own billing revisions" on public.session_billable_time_revisions;
create policy "Therapists read own billing revisions"
on public.session_billable_time_revisions
for select
to authenticated
using (user_id = (select auth.uid()));

revoke execute on function public.start_session_work(uuid) from public;
revoke execute on function public.start_session_work(uuid) from anon;
revoke execute on function public.pause_session_work(uuid) from public;
revoke execute on function public.pause_session_work(uuid) from anon;
revoke execute on function public.get_session_work_summary(uuid) from public;
revoke execute on function public.get_session_work_summary(uuid) from anon;
revoke execute on function public.confirm_session_billable_time(uuid, integer, integer, text) from public;
revoke execute on function public.confirm_session_billable_time(uuid, integer, integer, text) from anon;

grant execute on function public.start_session_work(uuid) to authenticated, service_role;
grant execute on function public.pause_session_work(uuid) to authenticated, service_role;
grant execute on function public.get_session_work_summary(uuid) to authenticated, service_role;
grant execute on function public.confirm_session_billable_time(uuid, integer, integer, text) to authenticated, service_role;
