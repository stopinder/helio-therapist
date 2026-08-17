create table if not exists public.client_care_items (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  kind text not null check (kind in ('current_focus','shared_understanding','trying','change_noticed','learning')),
  body text not null check (char_length(trim(body)) > 0),
  status text not null default 'current' check (status in ('current','less_relevant','paused','historical')),
  origin text not null default 'clinician' check (origin in ('clinician','ai_assisted')),
  provenance_session_id uuid references public.sessions(id) on delete set null,
  ai_prompt_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_care_items_client_idx on public.client_care_items(client_id, status, updated_at desc);

alter table public.client_care_items enable row level security;

create policy "therapists manage own client care"
on public.client_care_items for all
to authenticated
using (therapist_id = auth.uid())
with check (therapist_id = auth.uid());

create or replace function public.set_client_care_item_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists client_care_items_updated_at on public.client_care_items;
create trigger client_care_items_updated_at before update on public.client_care_items
for each row execute function public.set_client_care_item_updated_at();
