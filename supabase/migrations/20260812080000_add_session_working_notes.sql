create table public.session_working_notes (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.session_working_notes enable row level security;

create policy "Therapists manage own session working notes"
on public.session_working_notes
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.sessions session
    where session.id = session_working_notes.session_id
      and session.user_id = (select auth.uid())
      and session.client_id = session_working_notes.client_id
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.sessions session
    where session.id = session_working_notes.session_id
      and session.user_id = (select auth.uid())
      and session.client_id = session_working_notes.client_id
  )
);

create index session_working_notes_user_id_idx
  on public.session_working_notes(user_id);

create index session_working_notes_client_id_idx
  on public.session_working_notes(client_id);
