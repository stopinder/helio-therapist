-- Ensure the reflection_supervision_summaries table exists.
-- This is a non-destructive migration that re-asserts the table structure
-- if it was missing from the schema cache or failed to deploy.

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

-- Ensure index exists
create index if not exists reflection_supervision_summaries_reflection_created_idx
  on public.reflection_supervision_summaries(reflection_id, created_at desc);

-- Ensure RLS is enabled
alter table public.reflection_supervision_summaries enable row level security;

-- Drop policy if it exists and recreate to ensure it is correct
drop policy if exists "Users manage own reflection supervision summaries" on public.reflection_supervision_summaries;
create policy "Users manage own reflection supervision summaries"
  on public.reflection_supervision_summaries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ensure proper grants
grant select, insert, update on public.reflection_supervision_summaries to authenticated;
grant usage on schema public to authenticated;

-- Comment for clarity
comment on table public.reflection_supervision_summaries is
  'Optional, versioned therapist-only drafts derived from one private reflection. Never a client record.';

-- Force PostgREST to reload schema cache
notify pgrst, 'reload schema';
