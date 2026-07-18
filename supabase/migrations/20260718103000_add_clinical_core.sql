-- The clinical core is deliberately small: therapist-owned clients, sessions,
-- structured CBT entries, and clinician-approved investigation drafts.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 160),
  reference text,
  current_focus text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists clients_user_reference_unique
  on public.clients(user_id, reference) where reference is not null;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft','completed')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cbt_thought_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  situation text not null default '',
  automatic_thought text not null default '',
  emotion text not null default '',
  emotion_intensity integer check (emotion_intensity between 0 and 100),
  alternative_perspective text not null default '',
  outcome text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investigations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  question text not null,
  source_selection jsonb not null default '[]'::jsonb,
  draft_findings jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','approved','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;
alter table public.sessions enable row level security;
alter table public.cbt_thought_records enable row level security;
alter table public.investigations enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['clients','sessions','cbt_thought_records','investigations'] loop
    execute format('drop policy if exists "Users manage own %s" on public.%I', table_name, table_name);
    execute format('create policy "Users manage own %s" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name, table_name);
  end loop;
end $$;

notify pgrst, 'reload schema';
