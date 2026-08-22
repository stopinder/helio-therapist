-- Sprint 6 final audit remediation.
-- The live Supabase advisor still reports documents.client_id as an unindexed
-- foreign key because the existing (user_id, client_id, created_at) index cannot
-- support lookups beginning with client_id alone.
-- This is additive only; no existing index or document policy is changed.

create index if not exists documents_client_id_idx
  on public.documents (client_id);
