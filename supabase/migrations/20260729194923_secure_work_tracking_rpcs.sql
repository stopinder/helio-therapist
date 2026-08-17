-- Route all work-tracking writes through ownership-checking RPCs.

alter function public.start_session_work(uuid) security definer;
alter function public.pause_session_work(uuid) security definer;
alter function public.get_session_work_summary(uuid) security definer;
alter function public.confirm_session_billable_time(uuid, integer, integer, text) security definer;

revoke insert, update, delete, truncate, references, trigger
on table public.session_work_segments
from authenticated;

revoke insert, update, delete, truncate, references, trigger
on table public.session_billable_time_revisions
from authenticated;

grant select on table public.session_work_segments to authenticated;
grant select on table public.session_billable_time_revisions to authenticated;

revoke execute on function public.start_session_work(uuid) from public, anon;
revoke execute on function public.pause_session_work(uuid) from public, anon;
revoke execute on function public.get_session_work_summary(uuid) from public, anon;
revoke execute on function public.confirm_session_billable_time(uuid, integer, integer, text) from public, anon;

grant execute on function public.start_session_work(uuid) to authenticated, service_role;
grant execute on function public.pause_session_work(uuid) to authenticated, service_role;
grant execute on function public.get_session_work_summary(uuid) to authenticated, service_role;
grant execute on function public.confirm_session_billable_time(uuid, integer, integer, text) to authenticated, service_role;
