begin;

-- Archive is independent of assignment and clinical source-review state.
alter table public.zoom_transcripts add column if not exists inbox_archived_at timestamptz;
alter table public.transcript_source_review_events drop constraint transcript_source_review_events_action_check;
alter table public.transcript_source_review_events add constraint transcript_source_review_events_action_check
  check(action in ('confirm','flag','split','reassign','correction','undo'));

-- Never return clinical text in an impact preview. Only owner-scoped references.
create or replace function public.transcript_assignment_impact(p_user_id uuid, p_transcript_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  t public.zoom_transcripts%rowtype; s public.sessions%rowtype;
  items jsonb:='[]'::jsonb; item jsonb; table_name text; n bigint;
begin
  if current_user not in ('postgres','service_role') then raise exception 'Forbidden' using errcode='42501'; end if;
  select * into t from public.zoom_transcripts where id=p_transcript_id and therapist_user_id=p_user_id and deleted_at is null;
  if not found then raise exception 'Transcript not found.' using errcode='P0002'; end if;
  if t.source_parent_id is not null or t.source_review->>'state'='separated'
    or exists(select 1 from public.zoom_transcripts where source_parent_id=t.id and deleted_at is null) then
    items:=items||jsonb_build_array(jsonb_build_object('kind','segments','label','Reviewed conversation segments','count',1));
  end if;
  if t.session_ref is not null then
    select * into s from public.sessions where id::text=t.session_ref and user_id=p_user_id and client_id=t.client_id;
    if not found then raise exception 'The encounter link could not be verified. Nothing changed.' using errcode='23514'; end if;
    if s.status is distinct from 'source_ready' or s.notes_status is distinct from 'draft'
      or length(trim(coalesce(s.notes,'')))>0 or s.completed_at is not null or s.ended_at is not null then
      items:=items||jsonb_build_array(jsonb_build_object('kind','session','label','Existing encounter or clinical record','sessionId',s.id,'count',1));
    end if;
    if s.billable_confirmed_at is not null or s.billable_minutes is not null then
      items:=items||jsonb_build_array(jsonb_build_object('kind','billing','label','Confirmed or recorded billable time','sessionId',s.id,'count',1));
    end if;
    select count(*) into n from public.zoom_transcripts where session_ref=t.session_ref and id<>t.id and deleted_at is null;
    if n>0 then items:=items||jsonb_build_array(jsonb_build_object('kind','sources','label','Other transcripts linked to this encounter','count',n)); end if;
  end if;
  -- These are deliberately conservative checks: no clinical, private or billing work moves.
  foreach table_name in array array['session_capture_drafts','session_working_notes','session_work_segments',
    'session_billable_time_revisions','clinical_record_amendments','private_reflections','cbt_thought_records',
    'client_timeline_events','client_care_items','client_requests','client_request_items','client_resource_assignments','zoom_session_links'] loop
    execute format('select count(*) from public.%I x where
      ($1 is not null and ($1 in (to_jsonb(x)->>''session_id'',to_jsonb(x)->>''session_ref'',to_jsonb(x)->>''provenance_session_id'',to_jsonb(x)->>''discussed_session_id'')))
      or to_jsonb(x)->>''transcript_id''=$2',table_name) into n using t.session_ref,t.id::text;
    if n>0 then items:=items||jsonb_build_array(jsonb_build_object('kind',table_name,'label',replace(table_name,'_',' '),'count',n,'sessionId',t.session_ref)); end if;
  end loop;
  for item in select jsonb_build_object('kind','document','id',d.id,'label',d.title,'status',d.status,'count',1)
    from public.documents d where d.user_id=p_user_id and (
      position(t.id::text in coalesce(d.source_manifest::text,'')||coalesce(d.content::text,''))>0 or
      (t.session_ref is not null and position(t.session_ref in coalesce(d.source_manifest::text,'')||coalesce(d.content::text,''))>0)) loop
    items:=items||jsonb_build_array(item);
  end loop;
  return items;
end; $$;
revoke all on function public.transcript_assignment_impact(uuid,uuid) from public,anon,authenticated;
grant execute on function public.transcript_assignment_impact(uuid,uuid) to service_role;

create or replace function public.correct_transcript_assignment(
  p_user_id uuid,p_transcript_id uuid,p_action text,p_expected_version uuid default null,
  p_expected_updated_at timestamptz default null,p_target_client_id uuid default null,
  p_target_session_id uuid default null,p_event_id uuid default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  t public.zoom_transcripts%rowtype; before_row public.zoom_transcripts%rowtype;
  s public.sessions%rowtype; target public.sessions%rowtype;
  impact jsonb; snapshot jsonb; event public.transcript_source_review_events%rowtype;
  event_id uuid:=gen_random_uuid(); result_action text:=p_action; prior jsonb;
begin
  if current_user not in ('postgres','service_role') then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_user_id is null or p_action not in ('inspect','reassign','detach','detach_archive','detach_delete','flag','undo') then
    raise exception 'Invalid correction.' using errcode='22023'; end if;
  select * into t from public.zoom_transcripts where id=p_transcript_id and therapist_user_id=p_user_id and deleted_at is null for update;
  if not found then raise exception 'Transcript not found.' using errcode='P0002'; end if;
  if p_action<>'inspect' and (p_expected_version is null or p_expected_updated_at is null
    or t.source_version is distinct from p_expected_version or t.updated_at is distinct from p_expected_updated_at) then
    raise exception 'This transcript changed. Reload and review the current assignment before retrying. Nothing changed.' using errcode='40001'; end if;
  if t.session_ref is not null then
    select * into s from public.sessions where id::text=t.session_ref and user_id=p_user_id and client_id=t.client_id for update;
    if not found then raise exception 'The encounter link could not be verified. Nothing changed.' using errcode='23514'; end if;
  end if;
  impact:=public.transcript_assignment_impact(p_user_id,p_transcript_id);
  if p_action='inspect' then
    return jsonb_build_object('id',t.id,'clientId',t.client_id,'sessionId',t.session_ref,'sourceVersion',t.source_version,
      'updatedAt',t.updated_at,'occurredAt',t.source_occurred_at,'text',t.original_transcript,'zoomNote',t.zoom_generated_summary,
      'affected',impact,'blocked',jsonb_array_length(impact)>0);
  end if;
  -- Flagging is an explicit separate outcome. A blocked move never silently changes records.
  if p_action='flag' then
    if t.source_review->>'state'='separated' then raise exception 'Review the separate conversation segments.' using errcode='23514'; end if;
    update public.zoom_transcripts set source_review=jsonb_build_object('state','needs_review',
      'context','Therapist reported an incorrect client assignment. Review linked clinical and billing work before correcting it.',
      'assignmentDisputed',true,'reviewedBy',p_user_id,'reviewedAt',clock_timestamp()),
      attention_cleared_at=null,inbox_archived_at=null,updated_at=clock_timestamp()
      where id=t.id returning * into t;
    insert into public.transcript_source_review_events(therapist_user_id,transcript_id,source_version,action,review)
      values(p_user_id,t.id,t.source_version,'flag',t.source_review||jsonb_build_object('affected',impact));
    return jsonb_build_object('id',t.id,'action','flag','sourceVersion',t.source_version,'updatedAt',t.updated_at,'affected',impact);
  end if;
  if jsonb_array_length(impact)>0 then raise exception 'Related work needs review before this correction. Nothing was moved or deleted.' using errcode='23514'; end if;
  before_row:=t;
  snapshot:=jsonb_build_object('clientId',t.client_id,'sessionId',t.session_ref,'status',t.status,
    'attentionClearedAt',t.attention_cleared_at,'inboxArchivedAt',t.inbox_archived_at,
    'reviewChoicesSavedAt',t.review_choices_saved_at,'completedAt',t.completed_at,'requestedLens',t.requested_lens,'review',t.source_review);
  if p_action='undo' then
    select * into event from public.transcript_source_review_events where id=p_event_id and therapist_user_id=p_user_id
      and transcript_id=t.id and action='correction' and source_version=t.source_version for update;
    if not found or event.review->>'operation'='detach_delete' then raise exception 'This correction can no longer be undone. Nothing changed.' using errcode='40001'; end if;
    prior:=event.review->'before';
    if prior->>'clientId' is not null then
      perform 1 from public.clients where id::text=prior->>'clientId' and user_id=p_user_id and coalesce(archived,false)=false for share;
      if not found then raise exception 'The previous client is unavailable. Nothing changed.' using errcode='23514'; end if;
    end if;
    if prior->>'sessionId' is not null then
      select * into target from public.sessions where id::text=prior->>'sessionId' and user_id=p_user_id and client_id::text=prior->>'clientId' for update;
      if not found or (to_jsonb(target)-'notes') is distinct from event.review->'previousEncounter' then
        raise exception 'The previous encounter changed. Review it before restoring the link. Nothing changed.' using errcode='40001'; end if;
    end if;
    update public.zoom_transcripts set client_id=(prior->>'clientId')::uuid,session_ref=prior->>'sessionId',status=prior->>'status',
      attention_cleared_at=(prior->>'attentionClearedAt')::timestamptz,inbox_archived_at=(prior->>'inboxArchivedAt')::timestamptz,
      review_choices_saved_at=(prior->>'reviewChoicesSavedAt')::timestamptz,completed_at=(prior->>'completedAt')::timestamptz,
      requested_lens=prior->>'requestedLens',updated_at=clock_timestamp() where id=t.id returning * into t;
    update public.zoom_transcripts set source_review=prior->'review',updated_at=clock_timestamp() where id=t.id returning * into t;
  elsif p_action='reassign' then
    if p_target_client_id is null or p_target_client_id is not distinct from t.client_id then
      raise exception 'Choose a different active client.' using errcode='23514'; end if;
    perform 1 from public.clients where id=p_target_client_id and user_id=p_user_id and coalesce(archived,false)=false for share;
    if not found then raise exception 'The selected active client was not found.' using errcode='P0002'; end if;
    if p_target_session_id is not null then
      select * into target from public.sessions where id=p_target_session_id and user_id=p_user_id and client_id=p_target_client_id for update;
      if not found then raise exception 'The selected encounter was not found for this client.' using errcode='P0002'; end if;
      if target.status not in ('source_ready','in_progress') then raise exception 'Choose an open or imported encounter. Approved records require explicit correction.' using errcode='23514'; end if;
      if exists(select 1 from public.zoom_transcripts where session_ref=target.id::text and deleted_at is null) then
        raise exception 'The target encounter already has a transcript. Choose a new imported encounter.' using errcode='23514'; end if;
    else
      insert into public.sessions(user_id,client_id,occurred_at,status,notes,notes_status,workflow_status,zoom_meeting_id)
        values(p_user_id,p_target_client_id,coalesce(t.source_occurred_at,t.received_at,now()),'source_ready','','draft','transcript_received',t.zoom_meeting_id) returning * into target;
    end if;
    update public.zoom_transcripts set client_id=p_target_client_id,session_ref=target.id::text,status='ready',
      review_choices_saved_at=null,completed_at=null,attention_cleared_at=clock_timestamp(),inbox_archived_at=null,
      requested_lens=null,updated_at=clock_timestamp() where id=t.id returning * into t;
    update public.zoom_transcripts set source_review=jsonb_build_object('state','confirmed','assignmentCorrected',true,
      'context','Therapist reviewed the original source and confirmed its corrected client and encounter.',
      'reviewedBy',p_user_id,'reviewedAt',clock_timestamp()),updated_at=clock_timestamp() where id=t.id returning * into t;
  else
    if t.client_id is null and t.session_ref is null then raise exception 'This transcript is already detached. Nothing changed.' using errcode='23514'; end if;
    update public.zoom_transcripts set client_id=null,session_ref=null,status='unassigned',review_choices_saved_at=null,completed_at=null,
      requested_lens=null,attention_cleared_at=case when p_action='detach_archive' then clock_timestamp() else null end,
      inbox_archived_at=case when p_action='detach_archive' then clock_timestamp() else null end,
      updated_at=clock_timestamp() where id=t.id returning * into t;
    -- A tombstone suppresses re-import. No transcript text is copied into the audit log.
    if p_action='detach_delete' then
      update public.zoom_transcripts set deleted_at=clock_timestamp(),original_transcript='',structured_transcript=null,
        zoom_generated_summary=null,source_title=null,updated_at=clock_timestamp() where id=t.id returning * into t;
    end if;
  end if;
  insert into public.transcript_source_review_events(id,therapist_user_id,transcript_id,source_version,action,review)
    values(event_id,p_user_id,t.id,t.source_version,case when p_action='undo' then 'undo' else 'correction' end,
      jsonb_build_object('operation',p_action,'before',snapshot,'previousEncounter',case when s.id is null then null else to_jsonb(s)-'notes' end,
        'targetClientId',t.client_id,'targetSessionId',t.session_ref,'undoes',p_event_id));
  return jsonb_build_object('id',t.id,'action',result_action,'clientId',t.client_id,'sessionId',t.session_ref,
    'sourceVersion',t.source_version,'updatedAt',t.updated_at,'eventId',event_id,
    'canUndo',p_action not in ('detach_delete','undo'),'deleted',p_action='detach_delete');
end; $$;
revoke all on function public.correct_transcript_assignment(uuid,uuid,text,uuid,timestamptz,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.correct_transcript_assignment(uuid,uuid,text,uuid,timestamptz,uuid,uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
