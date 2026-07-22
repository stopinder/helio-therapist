-- Separate content classification, eligibility and completion behaviour.
alter table public.resource_library_items
  add column if not exists content_type text,
  add column if not exists category text,
  add column if not exists audience text not null default 'client';

update public.resource_library_items
set content_type = coalesce(content_type, case
  when resource_kind in ('worksheet', 'thought_record', 'behavioural_experiment', 'sleep_diary') then 'worksheet'
  when resource_kind = 'psychoeducation' then 'psychoeducation'
  when resource_kind = 'document' then 'document'
  else 'form' end),
  category = coalesce(category, case
    when resource_kind = 'thought_record' then 'thought_record'
    when resource_kind = 'behavioural_experiment' then 'behavioural_experiment'
    when resource_kind = 'sleep_diary' then 'sleep_diary'
    when resource_kind in ('diagnostic_tool', 'outcome_measure') then 'diagnostic_tool'
    else 'general' end),
  audience = case when resource_kind = 'therapist_resource' then 'therapist' else audience end;

alter table public.resource_library_items
  alter column content_type set not null,
  add constraint resource_library_items_audience_check check (audience in ('client', 'therapist', 'both'));

do $$
declare constraint_name text;
begin
  select conname into constraint_name from pg_constraint
  where conrelid = 'public.resource_versions'::regclass
    and contype = 'c' and pg_get_constraintdef(oid) like '%completion_mode%';
  if constraint_name is not null then execute format('alter table public.resource_versions drop constraint %I', constraint_name); end if;
end $$;

update public.resource_versions
set completion_mode = case completion_mode
  when 'structured' then 'complete_in_helio'
  when 'either' then 'complete_or_upload'
  else completion_mode end;

alter table public.resource_versions
  add constraint resource_versions_completion_mode_check
  check (completion_mode in ('complete_in_helio', 'upload', 'complete_or_upload', 'read_only'));

alter table public.client_requests add column if not exists idempotency_key text;
create unique index if not exists client_requests_user_idempotency_key_idx
  on public.client_requests(user_id, idempotency_key) where idempotency_key is not null;

create index if not exists resource_library_items_user_audience_active_idx
  on public.resource_library_items(user_id, audience, archived, updated_at desc);

notify pgrst, 'reload schema';
