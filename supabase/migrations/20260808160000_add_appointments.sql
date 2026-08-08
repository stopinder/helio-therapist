-- Operational scheduling records. These are not clinical records.
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  status text not null default 'booking_link_created'
    check (status in ('booking_link_created', 'scheduled', 'rescheduled', 'cancelled')),
  correlation_token text not null unique,
  zoom_schedule_id text,
  zoom_event_id text unique,
  zoom_meeting_id text,
  google_event_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((starts_at is null and ends_at is null) or (starts_at is not null and ends_at is not null and ends_at > starts_at))
);

create index if not exists appointments_user_status_idx
  on public.appointments(user_id, status);

create index if not exists appointments_client_idx
  on public.appointments(client_id);

alter table public.appointments enable row level security;

drop policy if exists "Users manage own appointments" on public.appointments;
create policy "Users manage own appointments"
  on public.appointments
  for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.clients c
      where c.id = appointments.client_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.clients c
      where c.id = appointments.client_id
        and c.user_id = auth.uid()
    )
  );

comment on table public.appointments is
  'Therapist-owned operational appointment records. Not a clinical record.';
comment on column public.appointments.correlation_token is
  'Opaque random token used to correlate a Zoom Scheduler booking back to the correct Helios client without exposing the client UUID.';

notify pgrst, 'reload schema';
