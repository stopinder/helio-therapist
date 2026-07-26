-- Cover the client and session foreign keys with leading indexes. The
-- therapist-first indexes in the base migration serve inbox reads but do not
-- protect parent deletes or session/client joins at larger scale.

create index transcript_clinical_outputs_client_idx
  on public.transcript_clinical_outputs (client_id, created_at desc);

create index transcript_clinical_outputs_session_fk_idx
  on public.transcript_clinical_outputs (session_id, created_at desc);
