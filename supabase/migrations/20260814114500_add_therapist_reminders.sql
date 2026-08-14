create table if not exists public.therapist_reminders (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (
    char_length(trim(body)) > 0
    and char_length(body) <= 2000
  ),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists therapist_reminders_owner_status_idx
  on public.therapist_reminders (therapist_id, completed_at, updated_at desc);

alter table public.therapist_reminders enable row level security;

create policy "Therapists can manage their own reminders"
  on public.therapist_reminders
  for all
  using (therapist_id = auth.uid())
  with check (therapist_id = auth.uid());

create trigger set_therapist_reminders_updated_at
  before update on public.therapist_reminders
  for each row
  execute function public.handle_updated_at();
