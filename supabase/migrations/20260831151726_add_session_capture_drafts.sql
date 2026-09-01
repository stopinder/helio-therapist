create table public.session_capture_drafts (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  transcript_id uuid not null references public.zoom_transcripts(id) on delete restrict,
  speaker_identities jsonb not null default '{}'::jsonb,
  generated_content jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  therapist_guidance text not null default '',
  dismissed_fields text[] not null default '{}'::text[],
  previous_versions jsonb not null default '[]'::jsonb,
  status text not null default 'working'
    check (status in ('working', 'reviewed')),
  version integer not null default 1,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.session_capture_drafts enable row level security;
revoke all on table public.session_capture_drafts from anon, authenticated;
grant select, insert, update on table public.session_capture_drafts to authenticated;

create policy "Therapists read own session captures"
on public.session_capture_drafts for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.sessions session
    where session.id = session_capture_drafts.session_id
      and session.user_id = (select auth.uid())
      and session.client_id = session_capture_drafts.client_id
  )
);

create policy "Therapists create own session captures"
on public.session_capture_drafts for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.sessions session
    where session.id = session_capture_drafts.session_id
      and session.user_id = (select auth.uid())
      and session.client_id = session_capture_drafts.client_id
      and session.status <> 'completed'
  )
  and exists (
    select 1 from public.zoom_transcripts transcript
    where transcript.id = session_capture_drafts.transcript_id
      and transcript.therapist_user_id = (select auth.uid())
      and transcript.client_id = session_capture_drafts.client_id
      and transcript.session_ref = session_capture_drafts.session_id::text
  )
);

create policy "Therapists update own working session captures"
on public.session_capture_drafts for update
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.sessions session
    where session.id = session_capture_drafts.session_id
      and session.user_id = (select auth.uid())
      and session.client_id = session_capture_drafts.client_id
      and session.status <> 'completed'
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.sessions session
    where session.id = session_capture_drafts.session_id
      and session.user_id = (select auth.uid())
      and session.client_id = session_capture_drafts.client_id
      and session.status <> 'completed'
  )
);

create index session_capture_drafts_user_id_idx on public.session_capture_drafts(user_id);
create index session_capture_drafts_client_id_idx on public.session_capture_drafts(client_id);
create index session_capture_drafts_transcript_id_idx on public.session_capture_drafts(transcript_id);

comment on table public.session_capture_drafts is
  'Editable AI-assisted working material. Separate from working notes, private reflections, and approved Clinical Records.';
