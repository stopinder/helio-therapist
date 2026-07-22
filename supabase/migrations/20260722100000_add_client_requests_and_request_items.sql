-- A client request is one clinician send action. Each selected resource becomes
-- its own request item so it can be completed and reviewed independently.
create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  therapist_instruction text not null default '',
  due_at timestamptz,
  delivery_channel text not null default 'copy_link' check (delivery_channel in ('copy_link', 'email', 'portal')),
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rename the old assignment table instead of duplicating clinical records.
-- All existing foreign keys follow the renamed table automatically.
do $$
begin
  if to_regclass('public.client_resource_assignments') is not null
     and to_regclass('public.client_request_items') is null then
    alter table public.client_resource_assignments rename to client_request_items;
  end if;
end $$;

alter table public.client_request_items
  add column if not exists client_request_id uuid references public.client_requests(id) on delete cascade;

-- Existing one-resource sends become one request with one item. This preserves
-- all links, responses, scores and timeline history while giving every item a parent.
insert into public.client_requests (id, user_id, client_id, session_id, therapist_instruction, due_at, sent_at, created_at, updated_at)
select id, user_id, client_id, session_id, therapist_instruction, due_at, sent_at, created_at, updated_at
from public.client_request_items
where client_request_id is null
on conflict (id) do nothing;

update public.client_request_items
set client_request_id = id
where client_request_id is null;

alter table public.client_request_items
  alter column client_request_id set not null;

comment on table public.client_request_items is
  'Individual assignments within one clinician client request. Each item owns its lifecycle.';
comment on column public.client_request_items.client_request_id is
  'The shared clinician send action that supplied instruction, due date and delivery metadata.';

alter table public.client_timeline_events
  add column if not exists client_request_id uuid references public.client_requests(id) on delete set null,
  add column if not exists client_request_item_id uuid references public.client_request_items(id) on delete set null;

update public.client_timeline_events event
set client_request_item_id = item.id,
    client_request_id = item.client_request_id
from public.client_request_items item
where event.client_request_item_id is null
  and event.subject_type in ('assignment', 'response', 'measure_result')
  and (
    event.subject_id = item.id
    or exists (select 1 from public.client_resource_responses response where response.id = event.subject_id and response.assignment_id = item.id)
    or exists (select 1 from public.outcome_measure_results result where result.id = event.subject_id and result.assignment_id = item.id)
  );

create index if not exists client_requests_client_sent_idx
  on public.client_requests(client_id, sent_at desc);
create index if not exists client_request_items_request_idx
  on public.client_request_items(client_request_id);
create index if not exists client_timeline_events_request_item_idx
  on public.client_timeline_events(client_request_item_id, occurred_at desc);

alter table public.client_requests enable row level security;
drop policy if exists "Users manage own client requests" on public.client_requests;
create policy "Users manage own client requests" on public.client_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Temporary read compatibility for older clients during the incremental rollout.
-- New server code uses client_request_items exclusively.
create or replace view public.client_resource_assignments
with (security_invoker = true) as
select * from public.client_request_items;

notify pgrst, 'reload schema';
