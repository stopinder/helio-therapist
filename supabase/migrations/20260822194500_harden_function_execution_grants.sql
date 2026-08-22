-- Sprint 1 audit hardening: narrow callable-function execution and pin the remaining mutable search_path.
-- This migration intentionally does not change table grants, RLS policies, clinical record semantics,
-- server-only integration tables, or the authenticated SECURITY DEFINER workflow RPCs.

-- Sample workspace helpers are authenticated product actions, never anonymous actions.
revoke execute on function public.create_sample_workspace() from public;
revoke execute on function public.create_sample_workspace() from anon;
grant execute on function public.create_sample_workspace() to authenticated, service_role;

revoke execute on function public.delete_sample_client(uuid) from public;
revoke execute on function public.delete_sample_client(uuid) from anon;
grant execute on function public.delete_sample_client(uuid) to authenticated, service_role;

-- Therapist-owned browser RPCs should be callable only by authenticated therapists (and trusted backend code).
revoke execute on function public.revise_client_care_item(uuid, text, text, text, text) from public;
revoke execute on function public.revise_client_care_item(uuid, text, text, text, text) from anon;
grant execute on function public.revise_client_care_item(uuid, text, text, text, text) to authenticated, service_role;

revoke execute on function public.save_session_working_notes(uuid, uuid, jsonb, integer) from public;
revoke execute on function public.save_session_working_notes(uuid, uuid, jsonb, integer) from anon;
grant execute on function public.save_session_working_notes(uuid, uuid, jsonb, integer) to authenticated, service_role;

-- Trigger helpers do not need direct browser execution. Existing triggers remain unchanged.
revoke execute on function public.enforce_billing_revision_append_only() from public, anon, authenticated;
revoke execute on function public.enforce_session_immutability() from public, anon, authenticated;
revoke execute on function public.enforce_work_segment_immutability() from public, anon, authenticated;
revoke execute on function public.handle_updated_at() from public, anon, authenticated;
revoke execute on function public.prevent_clinical_record_amendment_changes() from public, anon, authenticated;
revoke execute on function public.prevent_completed_session_deletion() from public, anon, authenticated;
revoke execute on function public.reject_archived_client_new_work() from public, anon, authenticated;
revoke execute on function public.set_client_care_item_updated_at() from public, anon, authenticated;

-- Supabase advisor finding: pin this generic trigger helper to a safe search path.
alter function public.handle_updated_at() set search_path = '';
