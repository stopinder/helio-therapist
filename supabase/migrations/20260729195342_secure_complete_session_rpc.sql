-- complete_session performs ownership checks internally and must be able to close
-- immutable work segments after direct table writes are revoked from clients.
alter function public.complete_session(uuid, text, integer) security definer;

revoke execute on function public.complete_session(uuid, text, integer) from public, anon;
grant execute on function public.complete_session(uuid, text, integer) to authenticated, service_role;
