-- Therapist-confirmed correction of a single, misassigned imported encounter.
-- This is not the normal (unassigned) transcript assignment path.
-- No private notes, summaries, clinical records or mixed/derived conversations are moved.
-- A single transaction moves the otherwise empty source-ready encounter and its transcript.
BEGIN;

-- Preserve existing action types and add an explicit reassignment audit event.
ALTER TABLE public.transcript_source_review_events
  DROP CONSTRAINT transcript_source_review_events_action_check;
ALTER TABLE public.transcript_source_review_events
  ADD CONSTRAINT transcript_source_review_events_action_check
  CHECK (action IN ('confirm','flag','split','reassign'));

CREATE OR REPLACE FUNCTION public.reassign_reviewed_transcript_source(
  p_user_id uuid,
  p_transcript_id uuid,
  p_expected_version uuid,
  p_target_client_id uuid,
  p_acknowledged boolean,
  p_context text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  original public.zoom_transcripts%rowtype;
  encounter public.sessions%rowtype;
  previous_client_id uuid;
  previous_review jsonb;
  new_review jsonb;
BEGIN
  IF current_user NOT IN ('postgres','service_role') THEN
    RAISE EXCEPTION 'Forbidden' USING errcode='42501';
  END IF;
  IF p_user_id IS NULL OR p_transcript_id IS NULL OR p_expected_version IS NULL
    OR p_target_client_id IS NULL OR p_acknowledged IS DISTINCT FROM true
    OR length(coalesce(p_context,'')) > 3900 THEN
    RAISE EXCEPTION 'Review the source, choose the correct client and explicitly confirm the reassignment.'
      USING errcode='22023';
  END IF;

  SELECT * INTO original FROM public.zoom_transcripts
    WHERE id=p_transcript_id AND therapist_user_id=p_user_id AND deleted_at IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source not found.' USING errcode='P0002'; END IF;
  IF original.source_version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'Source changed. Reload and review before reassigning.' USING errcode='40001';
  END IF;
  IF original.client_id IS NULL OR original.session_ref IS NULL THEN
    RAISE EXCEPTION 'Assign this unlinked source from Transcript Inbox.' USING errcode='23514';
  END IF;
  IF original.client_id=p_target_client_id THEN
    RAISE EXCEPTION 'Choose a different client for this correction.' USING errcode='22023';
  END IF;
  IF original.source_parent_id IS NOT NULL
    OR original.source_review->>'state'='separated'
    OR EXISTS(SELECT 1 FROM public.zoom_transcripts child
      WHERE child.source_parent_id=original.id AND child.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'This source contains reviewed conversation segments. Review the separate encounters instead.'
      USING errcode='23514';
  END IF;
  IF greatest(length(trim(coalesce(original.original_transcript,''))),
              length(trim(coalesce(original.zoom_generated_summary,'')))) < 20 THEN
    RAISE EXCEPTION 'No meaningful original transcript or Zoom note is available to verify.'
      USING errcode='23514';
  END IF;

  PERFORM 1 FROM public.clients
    WHERE id=p_target_client_id AND user_id=p_user_id AND coalesce(archived,false)=false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected active client is unavailable.' USING errcode='P0002';
  END IF;

  SELECT * INTO encounter FROM public.sessions
    WHERE id::text=original.session_ref AND user_id=p_user_id AND client_id=original.client_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The linked encounter does not belong to the assigned client.' USING errcode='42501';
  END IF;

  -- A source-created empty session is safe to correct; an existing clinical
  -- encounter with notes, billing, another source or downstream material is not.
  IF encounter.status <> 'source_ready'
     OR encounter.workflow_status <> 'transcript_received'
     OR encounter.notes_status <> 'draft'
     OR length(trim(coalesce(encounter.notes,''))) > 0
     OR encounter.completed_at IS NOT NULL OR encounter.ended_at IS NOT NULL
     OR encounter.billable_confirmed_at IS NOT NULL
     OR encounter.billable_minutes IS NOT NULL
     OR encounter.zoom_meeting_id IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.zoom_transcripts other
           WHERE other.session_ref=encounter.id::text AND other.id<>original.id AND other.deleted_at IS NULL)
     OR EXISTS (SELECT 1 FROM public.session_capture_drafts x
           WHERE x.session_id=encounter.id OR x.transcript_id=original.id)
     OR EXISTS (SELECT 1 FROM public.session_working_notes x WHERE x.session_id=encounter.id)
     OR EXISTS (SELECT 1 FROM public.session_work_segments x WHERE x.session_id=encounter.id)
     OR EXISTS (SELECT 1 FROM public.session_billable_time_revisions x WHERE x.session_id=encounter.id)
     OR EXISTS (SELECT 1 FROM public.clinical_record_amendments x WHERE x.session_id=encounter.id)
     OR EXISTS (SELECT 1 FROM public.private_reflections x WHERE x.session_ref=encounter.id::text)
     OR EXISTS (SELECT 1 FROM public.cbt_thought_records x WHERE x.session_id=encounter.id)
     OR EXISTS (SELECT 1 FROM public.client_timeline_events x WHERE x.session_id=encounter.id)
     OR EXISTS (SELECT 1 FROM public.client_care_items x WHERE x.provenance_session_id=encounter.id)
     OR EXISTS (SELECT 1 FROM public.client_requests x WHERE x.session_id=encounter.id)
     OR EXISTS (SELECT 1 FROM public.client_request_items x
           WHERE x.session_id=encounter.id OR x.discussed_session_id=encounter.id)
     OR EXISTS (SELECT 1 FROM public.client_resource_assignments x
           WHERE x.session_id=encounter.id OR x.discussed_session_id=encounter.id)
     OR EXISTS (SELECT 1 FROM public.zoom_session_links x WHERE x.session_ref=encounter.id::text)
     OR EXISTS (SELECT 1 FROM public.documents x
           WHERE x.user_id=p_user_id AND (
             x.source_manifest::text LIKE '%'||encounter.id::text||'%'
             OR x.source_manifest::text LIKE '%'||original.id::text||'%'
             OR x.content::text LIKE '%'||original.id::text||'%'))
  THEN
    RAISE EXCEPTION 'This encounter has existing clinical or billing material. Automatic reassignment is blocked; review the linked records first.'
      USING errcode='23514';
  END IF;

  previous_client_id:=original.client_id;
  previous_review:=original.source_review;
  UPDATE public.sessions SET client_id=p_target_client_id,updated_at=now()
    WHERE id=encounter.id;

  -- The existing integrity trigger invalidates old source review and rotates
  -- the source_version on client change; the therapist confirmation is then
  -- recorded as a separate versioned step in the same transaction.
  UPDATE public.zoom_transcripts SET
    client_id=p_target_client_id,
    status='ready',
    review_choices_saved_at=NULL,
    completed_at=NULL,
    attention_cleared_at=now(),
    updated_at=now()
    WHERE id=original.id AND therapist_user_id=p_user_id
    RETURNING * INTO original;

  new_review:=jsonb_build_object(
    'state','confirmed',
    'context','Therapist reviewed this single source and explicitly corrected its assigned client.'
      || CASE WHEN length(trim(coalesce(p_context,'')))>0 THEN ' '||trim(p_context) ELSE '' END,
    'reviewedBy',p_user_id,
    'reviewedAt',now(),
    'assignmentCorrected',true
  );
  UPDATE public.zoom_transcripts SET source_review=new_review,updated_at=now()
    WHERE id=original.id AND therapist_user_id=p_user_id
    RETURNING * INTO original;

  INSERT INTO public.transcript_source_review_events
     (therapist_user_id,transcript_id,source_version,action,review)
  VALUES (p_user_id,original.id,original.source_version,'reassign',
    new_review||jsonb_build_object(
      'previousClientId',previous_client_id,
      'previousReview',previous_review,
      'targetClientId',p_target_client_id,
      'sessionId',encounter.id));

  RETURN jsonb_build_object(
    'id',original.id,'sourceVersion',original.source_version,
    'clientId',original.client_id,'sessionId',encounter.id,
    'previousClientId',previous_client_id,'review',original.source_review);
END;
$function$;

REVOKE ALL ON FUNCTION public.reassign_reviewed_transcript_source(uuid,uuid,uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reassign_reviewed_transcript_source(uuid,uuid,uuid,uuid,boolean,text) TO service_role;

-- Close the older direct authenticated assignment RPC's already-assigned-source
-- path. First assignment from NULL remains permitted; a correction requires
-- the therapist-reviewed service-only RPC above.
CREATE OR REPLACE FUNCTION public.prevent_unreviewed_transcript_reassignment()
RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
AS $guard$
BEGIN
  IF tg_op='UPDATE' AND old.client_id IS NOT NULL
     AND new.client_id IS DISTINCT FROM old.client_id
     AND current_user NOT IN ('postgres','service_role') THEN
    RAISE EXCEPTION 'An assigned source must be reassigned through the reviewed correction flow.'
      USING errcode='42501';
  END IF;
  RETURN new;
END;
$guard$;
DROP TRIGGER IF EXISTS prevent_unreviewed_transcript_reassignment_trigger ON public.zoom_transcripts;
CREATE TRIGGER prevent_unreviewed_transcript_reassignment_trigger
  BEFORE UPDATE OF client_id ON public.zoom_transcripts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unreviewed_transcript_reassignment();
REVOKE ALL ON FUNCTION public.prevent_unreviewed_transcript_reassignment() FROM PUBLIC,anon,authenticated;
COMMIT;
