-- Ensure therapist-owned Care rows can only reference that therapist's own
-- client and, when present, a session belonging to the same therapist/client.
-- This is an additive policy hardening only; no rows or columns are changed.

drop policy if exists "therapists manage own client care" on public.client_care_items;

create policy "therapists manage own client care"
on public.client_care_items
for all
to authenticated
using (
  therapist_id = (select auth.uid())
  and exists (
    select 1
    from public.clients
    where clients.id = client_care_items.client_id
      and clients.user_id = (select auth.uid())
  )
)
with check (
  therapist_id = (select auth.uid())
  and exists (
    select 1
    from public.clients
    where clients.id = client_care_items.client_id
      and clients.user_id = (select auth.uid())
  )
  and (
    provenance_session_id is null
    or exists (
      select 1
      from public.sessions
      where sessions.id = client_care_items.provenance_session_id
        and sessions.user_id = (select auth.uid())
        and sessions.client_id = client_care_items.client_id
    )
  )
);

notify pgrst, 'reload schema';
