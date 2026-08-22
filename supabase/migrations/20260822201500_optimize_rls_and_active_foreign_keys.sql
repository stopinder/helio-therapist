-- Sprint 3 audit remediation: planner-safe RLS auth checks and focused FK indexes.
-- Policy semantics are intentionally unchanged: only auth.uid() evaluation is wrapped
-- in a scalar SELECT so PostgreSQL can use an init plan rather than re-evaluating per row.
-- Unused indexes and intentional server-only/security-definer advisor notices are untouched.

alter policy "Users manage own appointments" on public.appointments
  using (
    ((select auth.uid()) = user_id)
    and exists (
      select 1 from public.clients c
      where c.id = appointments.client_id
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    ((select auth.uid()) = user_id)
    and exists (
      select 1 from public.clients c
      where c.id = appointments.client_id
        and c.user_id = (select auth.uid())
    )
  );

alter policy "Users can view own documents" on public.documents
  using (
    ((select auth.uid()) = user_id)
    and (
      client_id is null
      or exists (
        select 1 from public.clients c
        where c.id = documents.client_id
          and c.user_id = (select auth.uid())
      )
    )
  );

alter policy "Users can insert own documents" on public.documents
  with check (
    ((select auth.uid()) = user_id)
    and (
      client_id is null
      or exists (
        select 1 from public.clients c
        where c.id = documents.client_id
          and c.user_id = (select auth.uid())
      )
    )
  );

alter policy "Users can update own documents" on public.documents
  using ((select auth.uid()) = user_id)
  with check (
    ((select auth.uid()) = user_id)
    and (
      client_id is null
      or exists (
        select 1 from public.clients c
        where c.id = documents.client_id
          and c.user_id = (select auth.uid())
      )
    )
  );

alter policy "Users can delete own working documents" on public.documents
  using (
    ((select auth.uid()) = user_id)
    and status in ('draft', 'review')
  );

alter policy "therapists read own care revisions" on public.client_care_item_revisions
  using (therapist_id = (select auth.uid()));

alter policy "Therapists can manage their own follow-ups" on public.client_follow_ups
  using (
    ((select auth.uid()) = therapist_id)
    and exists (
      select 1 from public.clients
      where clients.id = client_follow_ups.client_id
        and clients.user_id = (select auth.uid())
    )
  )
  with check (
    ((select auth.uid()) = therapist_id)
    and exists (
      select 1 from public.clients
      where clients.id = client_follow_ups.client_id
        and clients.user_id = (select auth.uid())
    )
  );

alter policy "Therapists can manage their own reminders" on public.therapist_reminders
  using (therapist_id = (select auth.uid()))
  with check (therapist_id = (select auth.uid()));

-- Focused indexes for active FK paths reported by the live advisor.
-- Existing composite indexes already cover documents.client_id when user_id is also present,
-- so no duplicate standalone documents index is added here.
create index if not exists client_care_item_revisions_therapist_idx
  on public.client_care_item_revisions (therapist_id);

create index if not exists client_care_items_provenance_session_idx
  on public.client_care_items (provenance_session_id)
  where provenance_session_id is not null;

create index if not exists client_care_items_therapist_idx
  on public.client_care_items (therapist_id);

create index if not exists client_follow_ups_therapist_idx
  on public.client_follow_ups (therapist_id);

create index if not exists clinical_record_amendments_approved_by_idx
  on public.clinical_record_amendments (approved_by);
