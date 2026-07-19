-- Durable Zoom transcript inbox and original-source storage.
-- Transcript records begin unassigned; a later Start Session flow will attach them to clients.

alter table public.integrations
  add column if not exists provider_account_id text;

create index if not exists integrations_zoom_account_idx
  on public.integrations (provider, provider_account_id)
  where provider_account_id is not null;

create table if not exists public.zoom_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  zoom_meeting_id text,
  zoom_host_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processing_status text not null default 'received'
    check (processing_status in ('received', 'stored', 'unmatched', 'failed')),
  processing_error text
);

create index if not exists zoom_webhook_events_meeting_idx
  on public.zoom_webhook_events (zoom_meeting_id, received_at desc);

create table if not exists public.zoom_transcripts (
  id uuid primary key default gen_random_uuid(),
  therapist_user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid,
  zoom_meeting_id text not null,
  zoom_meeting_uuid text,
  zoom_recording_file_id text not null,
  original_format text not null default 'VTT',
  original_transcript text not null,
  source text not null default 'zoom_cloud',
  status text not null default 'unassigned'
    check (status in ('unassigned', 'ready', 'processing', 'failed')),
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (therapist_user_id, zoom_recording_file_id)
);

create index if not exists zoom_transcripts_therapist_idx
  on public.zoom_transcripts (therapist_user_id, received_at desc);

create index if not exists zoom_transcripts_unassigned_idx
  on public.zoom_transcripts (therapist_user_id, status)
  where status = 'unassigned';

alter table public.zoom_webhook_events enable row level security;
alter table public.zoom_transcripts enable row level security;

-- The service-role backend owns intake. No browser policies exist until the
-- therapist-facing transcript screen is built.
notify pgrst, 'reload schema';
