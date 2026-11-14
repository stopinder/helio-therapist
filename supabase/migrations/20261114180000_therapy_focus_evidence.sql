-- Preserve the evidence attached to accepted Therapy Focus suggestions.
-- Existing rows remain unchanged; NULL explicitly means coverage is unknown.
alter table public.client_care_items add column if not exists evidence jsonb;

create or replace function public.save_reviewed_care_item(
  p_client_id uuid, p_kind text, p_body text, p_prompt_version text,
  p_evidence jsonb default null, p_provenance_session_id uuid default null,
  p_replaces_id uuid default null
) returns setof public.client_care_items
language plpgsql security invoker set search_path = public as $$
declare source_id text;
begin
  if auth.uid() is null or not exists (select 1 from public.clients where id=p_client_id and user_id=auth.uid()) then
    raise exception 'Client not found';
  end if;
  if length(trim(p_body))=0 then raise exception 'A Therapy Focus entry is required'; end if;
  if p_evidence is not null then
    if jsonb_typeof(p_evidence)<>'object' or jsonb_typeof(p_evidence->'sources') is distinct from 'array' then
      raise exception 'Invalid evidence';
    end if;
    for source_id in
      select value->>'sessionId' from jsonb_array_elements(p_evidence->'sources')
      union select value from jsonb_array_elements_text(coalesce(p_evidence->'coverage'->'selectedSessionIds','[]'::jsonb))
    loop
      if source_id is null or not exists (select 1 from public.sessions where id::text=source_id and client_id=p_client_id and user_id=auth.uid()) then
        raise exception 'Evidence must belong to this client';
      end if;
    end loop;
  end if;
  if p_replaces_id is not null then
    perform 1 from public.client_care_items where id=p_replaces_id and client_id=p_client_id and therapist_id=auth.uid() and status<>'historical' for update;
    if not found then raise exception 'The original Therapy Focus item has changed; refresh before saving'; end if;
    update public.client_care_items set status='historical' where id=p_replaces_id;
  end if;
  return query insert into public.client_care_items(therapist_id,client_id,kind,body,origin,ai_prompt_version,evidence,provenance_session_id)
    values(auth.uid(),p_client_id,p_kind,trim(p_body),'ai_assisted',p_prompt_version,p_evidence,p_provenance_session_id) returning *;
end $$;
revoke all on function public.save_reviewed_care_item(uuid,text,text,text,jsonb,uuid,uuid) from public;
grant execute on function public.save_reviewed_care_item(uuid,text,text,text,jsonb,uuid,uuid) to authenticated;
notify pgrst, 'reload schema';
