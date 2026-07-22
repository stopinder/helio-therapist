-- Therapist-only thinking is a separate record class. These rows must never be
-- joined into client timelines, clinical notes, client output, or routine exports.
create table if not exists public.private_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  session_ref text,
  body text not null check (char_length(trim(body)) between 1 and 20000),
  supervision_question text not null default '',
  theme text not null default '',
  urgency text not null default 'normal' check (urgency in ('normal', 'soon', 'urgent')),
  preferred_supervision_date date,
  included_in_supervision boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists private_reflections_user_created_idx
  on public.private_reflections(user_id, created_at desc);
create index if not exists private_reflections_client_created_idx
  on public.private_reflections(client_id, created_at desc);
create index if not exists private_reflections_supervision_idx
  on public.private_reflections(user_id, included_in_supervision, created_at desc)
  where included_in_supervision;

alter table public.private_reflections enable row level security;

drop policy if exists "Users manage own private reflections" on public.private_reflections;
create policy "Users manage own private reflections"
  on public.private_reflections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.private_reflections is
  'Therapist-only professional reflection. Never a clinical note, timeline event, client-facing document, or routine export.';

notify pgrst, 'reload schema';
