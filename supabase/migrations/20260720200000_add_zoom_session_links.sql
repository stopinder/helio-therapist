-- A small, durable link between Helio's client/session context and the Zoom
-- meeting Helio creates. Session records themselves stay client-side for now,
-- so session_ref intentionally stores that stable local reference.

create table if not exists public.zoom_session_links (
  id uuid primary key default gen_random_uuid(),
  therapist_user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  session_ref text not null,
  zoom_meeting_id text not null,
  zoom_meeting_uuid text,
  status text not null default 'started'
    check (status in ('started', 'transcript_received', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (therapist_user_id, session_ref),
  unique (therapist_user_id, zoom_meeting_id)
);

create index if not exists zoom_session_links_lookup_idx
  on public.zoom_session_links (therapist_user_id, zoom_meeting_id);

alter table public.zoom_session_links enable row level security;

notify pgrst, 'reload schema';
