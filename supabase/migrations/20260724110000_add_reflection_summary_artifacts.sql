-- Generated supervision summaries are derived, versioned therapist-only artefacts.
-- The private_reflections.body column remains the immutable source material.
create table if not exists public.reflection_supervision_summaries (
  id uuid primary key default gen_random_uuid(),
  reflection_id uuid not null references public.private_reflections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  generated_content text not null default '',
  edited_content text not null default '',
  generation_status text not null check (generation_status in ('generated', 'saved', 'failed', 'superseded')),
  generation_error text,
  model text,
  prompt_version text,
  generated_at timestamptz,
  saved_at timestamptz,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reflection_supervision_summaries_reflection_created_idx
  on public.reflection_supervision_summaries(reflection_id, created_at desc);

alter table public.reflection_supervision_summaries enable row level security;
create policy "Users manage own reflection supervision summaries"
  on public.reflection_supervision_summaries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.reflection_supervision_summaries is
  'Optional, versioned therapist-only drafts derived from one private reflection. Never a client record.';

notify pgrst, 'reload schema';
