-- Explicit therapist source confirmation may use a Zoom note when no original transcript was imported.
-- Owner, session, source version, audit log, context and explicit reviewed checks remain.
begin;
CREATE OR REPLACE FUNCTION public.resolve_transcript_source_review(p_user_id uuid, p_transcript_id uuid, p_expected_version uuid, p_action text, p_context text DEFAULT ''::text, p_evidence jsonb DEFAULT '[]'::jsonb, p_segments jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  original public.zoom_transcripts%rowtype;
  child public.zoom_transcripts%rowtype;
  linked_session uuid;
  segment jsonb;
  lines text[];
  first_line integer;
  last_line integer;
  previous_end integer:=0;
  target_client uuid;
  encounter_time timestamptz;
  children jsonb:='[]'::jsonb;
  review_state text;
begin
  if current_user not in ('postgres','service_role') then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_user_id is null or p_expected_version is null or coalesce(p_action,'') not in ('confirm','flag','split') then
    raise exception 'Owner, source version and valid action are required.' using errcode='22023';
  end if;
  select * into original from public.zoom_transcripts
    where id=p_transcript_id and therapist_user_id=p_user_id and deleted_at is null for update;
  if not found then raise exception 'Source not found' using errcode='P0002'; end if;
  if original.source_version<>p_expected_version then raise exception 'Source changed. Review the current version.' using errcode='40001'; end if;
  if original.source_review->>'state'='separated' then raise exception 'This source was already separated.' using errcode='40001'; end if;
  if length(coalesce(p_context,''))>4000 or jsonb_typeof(p_evidence) is distinct from 'array' then
    raise exception 'Invalid review' using errcode='22023';
  end if;
  if jsonb_array_length(p_evidence)>6 then raise exception 'Too many review passages' using errcode='22023'; end if;
  if p_action in ('confirm','flag') then
    if p_action='confirm' then
      if original.client_id is null or original.session_ref is null or length(trim(coalesce(p_context,'')))<10 or greatest(length(trim(coalesce(original.original_transcript,''))),length(trim(coalesce(original.zoom_generated_summary,''))))<20 then
        raise exception 'Confirm the assigned encounter and describe its participants/context.' using errcode='22023';
      end if;
      perform 1 from public.sessions where id::text=original.session_ref and user_id=p_user_id and client_id=original.client_id;
      if not found then raise exception 'Assigned encounter not found' using errcode='42501'; end if;
    end if;
    review_state:=case when p_action='confirm' then 'confirmed' else 'needs_review' end;
    update public.zoom_transcripts set source_review=jsonb_build_object('state',review_state,'context',p_context,'evidence',p_evidence,'reviewedBy',p_user_id,'reviewedAt',now()),updated_at=now()
      where id=original.id returning * into original;
    insert into public.transcript_source_review_events(therapist_user_id,transcript_id,source_version,action,review)
      values(p_user_id,original.id,original.source_version,p_action,original.source_review);
    return jsonb_build_object('id',original.id,'sourceVersion',original.source_version,'review',original.source_review);
  end if;
  if original.source_parent_id is not null or jsonb_typeof(p_segments) is distinct from 'array' then
    raise exception 'Choose reviewed conversation segments from the original source.' using errcode='22023';
  end if;
  if jsonb_array_length(p_segments) not between 2 and 10 then raise exception 'Choose 2 to 10 conversations.' using errcode='22023'; end if;
  lines:=string_to_array(replace(replace(original.original_transcript,E'\r\n',E'\n'),E'\r',E'\n'),E'\n');
  -- Validate all selections before creating anything. A failure rolls back the transaction.
  for segment in select value from jsonb_array_elements(p_segments) loop
    first_line:=(segment->>'startLine')::integer; last_line:=(segment->>'endLine')::integer;
    target_client:=(segment->>'clientId')::uuid; encounter_time:=(segment->>'occurredAt')::timestamptz;
    if coalesce(segment->>'reviewed','false')<>'true' or first_line is null or last_line is null or first_line<=previous_end or last_line<first_line
      or last_line>coalesce(array_length(lines,1),0) or encounter_time is null or not isfinite(encounter_time)
      or length(trim(coalesce(array_to_string(lines[first_line:last_line],E'\n'),'')))<20 then
      raise exception 'Invalid, overlapping or empty source range.' using errcode='22023';
    end if;
    perform 1 from public.clients where id=target_client and user_id=p_user_id and coalesce(archived,false)=false;
    if not found then raise exception 'Client not found or archived' using errcode='42501'; end if;
    previous_end:=last_line;
  end loop;
  update public.zoom_transcripts set source_review=jsonb_build_object('state','separated','reviewedBy',p_user_id,'reviewedAt',now()),
    attention_cleared_at=coalesce(attention_cleared_at,now()),updated_at=now() where id=original.id returning * into original;
  for segment in select value from jsonb_array_elements(p_segments) loop
    first_line:=(segment->>'startLine')::integer; last_line:=(segment->>'endLine')::integer;
    target_client:=(segment->>'clientId')::uuid; encounter_time:=(segment->>'occurredAt')::timestamptz;
    insert into public.sessions(user_id,client_id,occurred_at,status,notes,notes_status,workflow_status)
      values(p_user_id,target_client,encounter_time,'source_ready','','draft','transcript_received') returning id into linked_session;
    -- Never copy the whole-recording Zoom note or speaker map into a child conversation.
    insert into public.zoom_transcripts(therapist_user_id,client_id,session_ref,zoom_meeting_id,zoom_recording_file_id,
      original_format,original_transcript,source,source_title,status,source_occurred_at,attention_cleared_at,
      source_parent_id,source_parent_version,source_start_line,source_end_line,source_review)
    values(p_user_id,target_client,linked_session::text,original.zoom_meeting_id,'reviewed-segment:'||gen_random_uuid()::text,
      'TXT',array_to_string(lines[first_line:last_line],E'\n'),'zoom_reviewed_segment','Reviewed conversation segment','ready',encounter_time,now(),
      original.id,original.source_version,first_line,last_line,jsonb_build_object('state','confirmed','context','Therapist reviewed and assigned this conversation segment.','reviewedBy',p_user_id,'reviewedAt',now())) returning * into child;
    children:=children||jsonb_build_array(jsonb_build_object('id',child.id,'clientId',child.client_id,'sessionId',linked_session,'sourceVersion',child.source_version,'startLine',first_line,'endLine',last_line));
  end loop;
  insert into public.transcript_source_review_events(therapist_user_id,transcript_id,source_version,action,review)
    values(p_user_id,original.id,original.source_version,'split',jsonb_build_object('state','separated','segments',children));
  return jsonb_build_object('id',original.id,'sourceVersion',original.source_version,'review',original.source_review,'segments',children);
end; $function$
;
revoke all on function public.resolve_transcript_source_review(uuid,uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.resolve_transcript_source_review(uuid,uuid,uuid,text,text,jsonb,jsonb) to service_role;
commit;
