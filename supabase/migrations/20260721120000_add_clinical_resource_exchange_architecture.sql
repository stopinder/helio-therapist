-- Reserve the clinical-exchange model before building its UI or client portal.
-- These records are deliberately distinct from therapist-owned documents:
-- resource -> immutable version -> client assignment -> response -> therapist review.

create table if not exists public.resource_library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  resource_kind text not null check (resource_kind in ('worksheet','thought_record','behavioural_experiment','sleep_diary','psychoeducation','diagnostic_tool','outcome_measure','therapist_resource','document')),
  description text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_versions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resource_library_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  completion_mode text not null check (completion_mode in ('structured','upload','either','read_only')),
  client_title text not null check (char_length(trim(client_title)) between 1 and 160),
  client_description text not null default '',
  form_definition jsonb not null default '{}'::jsonb,
  scoring_definition jsonb not null default '{}'::jsonb,
  source_storage_path text,
  source_filename text,
  source_mime_type text,
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  unique (resource_id, version_number)
);

create table if not exists public.client_resource_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  resource_version_id uuid not null references public.resource_versions(id) on delete restrict,
  session_id uuid references public.sessions(id) on delete set null,
  -- This snapshot protects the original sent material even when its library item changes.
  sent_snapshot jsonb not null default '{}'::jsonb,
  therapist_instruction text not null default '',
  due_at timestamptz,
  status text not null default 'sent' check (status in ('sent','opened','in_progress','completed','awaiting_review','reviewed','cancelled')),
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  completed_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text not null default '',
  discussed_session_id uuid references public.sessions(id) on delete set null,
  discussed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_resource_responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.client_resource_assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response_kind text not null check (response_kind in ('structured','upload','mixed')),
  structured_answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_response_files (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.client_resource_responses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

create table if not exists public.outcome_measure_results (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.client_resource_assignments(id) on delete cascade,
  response_id uuid not null unique references public.client_resource_responses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  resource_id uuid not null references public.resource_library_items(id) on delete restrict,
  resource_version_id uuid not null references public.resource_versions(id) on delete restrict,
  calculation_version text not null,
  scores jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Timeline is history, not an audit log. Delivery mechanics do not belong here.
create table if not exists public.client_timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  event_type text not null check (event_type in ('resource_sent','resource_completed','resource_returned','resource_reviewed','resource_discussed')),
  subject_type text not null check (subject_type in ('assignment','response','measure_result')),
  subject_id uuid not null,
  occurred_at timestamptz not null default now(),
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists resource_library_items_user_active_idx
  on public.resource_library_items(user_id, archived, updated_at desc);
create index if not exists client_resource_assignments_client_status_idx
  on public.client_resource_assignments(client_id, status, sent_at desc);
create index if not exists client_resource_assignments_user_review_idx
  on public.client_resource_assignments(user_id, status, completed_at desc)
  where status in ('completed', 'awaiting_review');
create index if not exists outcome_measure_results_client_resource_idx
  on public.outcome_measure_results(client_id, resource_id, completed_at desc);
create index if not exists client_timeline_events_client_time_idx
  on public.client_timeline_events(client_id, occurred_at desc);

alter table public.resource_library_items enable row level security;
alter table public.resource_versions enable row level security;
alter table public.client_resource_assignments enable row level security;
alter table public.client_resource_responses enable row level security;
alter table public.client_response_files enable row level security;
alter table public.outcome_measure_results enable row level security;
alter table public.client_timeline_events enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'resource_library_items', 'resource_versions', 'client_resource_assignments',
    'client_resource_responses', 'client_response_files', 'outcome_measure_results',
    'client_timeline_events'
  ] loop
    execute format('drop policy if exists "Users manage own %s" on public.%I', table_name, table_name);
    execute format('create policy "Users manage own %s" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name, table_name);
  end loop;
end $$;

-- Keep client returns private. No client-facing policy is intentionally created here.
insert into storage.buckets (id, name, public, file_size_limit)
values ('client-resource-responses', 'client-resource-responses', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

notify pgrst, 'reload schema';
