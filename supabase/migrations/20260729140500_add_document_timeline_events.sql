begin;

-- Documents become part of the clinical narrative only when they are complete.
-- Draft and review-stage files remain working material and do not appear in the
-- client timeline.
alter table public.client_timeline_events
  drop constraint if exists client_timeline_events_subject_type_check;

alter table public.client_timeline_events
  add constraint client_timeline_events_subject_type_check
    check (subject_type in ('session', 'assignment', 'response', 'measure_result', 'document'));

create or replace function public.add_completed_document_timeline_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  resolved_client_id uuid;
  mapped_event_type text;
  mapped_summary_prefix text;
  normalized_document_type text;
begin
  if new.status <> 'completed' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new;
  end if;

  select client.id
  into resolved_client_id
  from public.clients client
  where client.user_id = new.user_id
    and (
      client.reference = new.client_ref
      or client.id::text = new.client_ref
    )
  order by
    case when client.id::text = new.client_ref then 0 else 1 end,
    client.created_at
  limit 1;

  -- Legacy document references are text values. If one cannot be matched to an
  -- owned client, preserve the document write without creating a wrong link.
  if resolved_client_id is null then
    return new;
  end if;

  normalized_document_type := lower(trim(new.document_type));

  case normalized_document_type
    when 'treatment_plan' then
      mapped_event_type := 'treatment_plan_updated';
      mapped_summary_prefix := 'Treatment plan completed: ';
    when 'treatment-plan' then
      mapped_event_type := 'treatment_plan_updated';
      mapped_summary_prefix := 'Treatment plan completed: ';
    when 'treatment plan' then
      mapped_event_type := 'treatment_plan_updated';
      mapped_summary_prefix := 'Treatment plan completed: ';
    when 'risk_assessment' then
      mapped_event_type := 'risk_assessment_recorded';
      mapped_summary_prefix := 'Risk assessment completed: ';
    when 'risk-assessment' then
      mapped_event_type := 'risk_assessment_recorded';
      mapped_summary_prefix := 'Risk assessment completed: ';
    when 'risk assessment' then
      mapped_event_type := 'risk_assessment_recorded';
      mapped_summary_prefix := 'Risk assessment completed: ';
    when 'referral' then
      mapped_event_type := 'referral_recorded';
      mapped_summary_prefix := 'Referral completed: ';
    else
      mapped_event_type := 'clinical_milestone';
      mapped_summary_prefix := 'Clinical document completed: ';
  end case;

  insert into public.client_timeline_events (
    user_id,
    client_id,
    session_id,
    event_type,
    subject_type,
    subject_id,
    occurred_at,
    summary
  )
  values (
    new.user_id,
    resolved_client_id,
    null,
    mapped_event_type,
    'document',
    new.id,
    coalesce(new.report_date::timestamp at time zone 'UTC', new.created_at),
    mapped_summary_prefix || new.title
  )
  on conflict (subject_type, subject_id, event_type) do nothing;

  return new;
end;
$$;

revoke execute on function public.add_completed_document_timeline_event()
  from public, anon, authenticated;

drop trigger if exists documents_add_completed_timeline_event on public.documents;
create trigger documents_add_completed_timeline_event
after insert or update of status on public.documents
for each row
execute function public.add_completed_document_timeline_event();

commit;
