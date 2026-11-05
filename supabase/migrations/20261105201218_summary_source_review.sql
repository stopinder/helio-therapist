begin;

alter table public.zoom_transcripts
  add column if not exists source_version uuid not null default gen_random_uuid(),
  add column if not exists source_review jsonb not null default '{}'::jsonb,
  add column if not exists source_parent_id uuid references public.zoom_transcripts(id) on delete restrict,
  add column if not exists source_parent_version uuid,
  add column if not exists source_start_line integer,
  add column if not exists source_end_line integer;

create or replace function public.protect_transcript_source_review()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare changed boolean;
begin
  if tg_op='INSERT' then
    if current_user not in ('postgres','service_role') then
      new.source_review:='{}'::jsonb; new.source_version:=gen_random_uuid();
      new.source_parent_id:=null; new.source_parent_version:=null;
      new.source_start_line:=null; new.source_end_line:=null;
    end if;
    return new;
  end if;
  if current_user not in ('postgres','service_role') and
    (new.source_review is distinct from old.source_review or new.source_version is distinct from old.source_version
     or new.source_parent_id is distinct from old.source_parent_id or new.source_parent_version is distinct from old.source_parent_version
     or new.source_start_line is distinct from old.source_start_line or new.source_end_line is distinct from old.source_end_line) then
    raise exception 'Source review must use the authorised review endpoint.' using errcode='42501';
  end if;
  changed:=row(new.original_transcript,new.zoom_generated_summary,new.structured_transcript,new.client_id,new.session_ref,new.source_occurred_at,new.deleted_at)
    is distinct from row(old.original_transcript,old.zoom_generated_summary,old.structured_transcript,old.client_id,old.session_ref,old.source_occurred_at,old.deleted_at);
  if old.source_review->>'state'='separated' and changed then
    raise exception 'A separated original is retained unchanged; work with its reviewed segments.' using errcode='42501';
  end if;
  if changed then
    new.source_review:='{}'::jsonb; new.source_version:=gen_random_uuid();
  elsif new.source_review is distinct from old.source_review then
    new.source_version:=gen_random_uuid();
  end if;
  return new;
end; $$;
drop trigger if exists protect_transcript_source_review on public.zoom_transcripts;
create trigger protect_transcript_source_review before insert or update on public.zoom_transcripts
for each row execute function public.protect_transcript_source_review();
revoke all on function public.protect_transcript_source_review() from public,anon,authenticated;

create table if not exists public.transcript_source_review_events (
  id uuid primary key default gen_random_uuid(),
  therapist_user_id uuid not null references auth.users(id) on delete cascade,
  transcript_id uuid not null references public.zoom_transcripts(id) on delete cascade,
  source_version uuid not null,
  action text not null check(action in ('confirm','flag','split')),
  review jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.transcript_source_review_events enable row level security;
revoke all on public.transcript_source_review_events from public,anon,authenticated;
grant select on public.transcript_source_review_events to authenticated;
grant all on public.transcript_source_review_events to service_role;
create policy source_review_events_owner_read on public.transcript_source_review_events for select to authenticated
using((select auth.uid())=therapist_user_id);

-- Service-role-only entry point. The API authenticates and supplies the owner;
-- SECURITY INVOKER does not create a publicly callable RLS bypass.
create or replace function public.resolve_transcript_source_review(
  p_user_id uuid,p_transcript_id uuid,p_expected_version uuid,p_action text,
  p_context text default '',p_evidence jsonb default '[]'::jsonb,p_segments jsonb default '[]'::jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
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
      if original.client_id is null or original.session_ref is null or length(trim(coalesce(p_context,'')))<10 then
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
end; $$;
revoke all on function public.resolve_transcript_source_review(uuid,uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.resolve_transcript_source_review(uuid,uuid,uuid,text,text,jsonb,jsonb) to service_role;

create or replace function public.enforce_summary_source_boundary()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare evidence_source jsonb; transcript public.zoom_transcripts%rowtype;
begin
  if new.document_type<>'session_summary' then return new; end if;
  if coalesce(new.content->'summaryGeneration'->>'outcome',new.content->'clinicalIntelligence'->'generation'->>'outcome','ready')<>'ready' then
    raise exception 'A source review notice is not a clinical summary.' using errcode='23514';
  end if;
  for evidence_source in select value from jsonb_array_elements(coalesce(new.source_manifest,'[]'::jsonb)) loop
    if evidence_source->>'kind'='zoom_transcript' and evidence_source->>'transcriptId' is not null then
      select * into transcript from public.zoom_transcripts where id::text=evidence_source->>'transcriptId'
        and therapist_user_id=new.user_id and client_id=new.client_id and deleted_at is null for share;
      if not found or transcript.session_ref is distinct from evidence_source->>'sessionId'
        or coalesce(transcript.source_review->>'state','') in ('needs_review','separated')
        or (evidence_source->>'sourceVersion' is not null and transcript.source_version::text<>evidence_source->>'sourceVersion') then
        raise exception 'Summary source requires review or changed. Keep the previous draft and regenerate from the reviewed source.' using errcode='23514';
      end if;
    end if;
  end loop;
  return new;
end; $$;
drop trigger if exists enforce_summary_source_boundary on public.documents;
create trigger enforce_summary_source_boundary before insert or update on public.documents
for each row execute function public.enforce_summary_source_boundary();
revoke all on function public.enforce_summary_source_boundary() from public,anon,authenticated;

notify pgrst,'reload schema';
commit;
