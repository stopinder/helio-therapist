create table if not exists public.client_follow_ups (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  body text not null check (
    char_length(trim(body)) > 0
    and char_length(body) <= 2000
  ),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for: client, incomplete items first, recent creation/update ordering
create index if not exists client_follow_ups_client_id_completed_at_idx on public.client_follow_ups (client_id, (completed_at is null) desc, updated_at desc);

-- Enable RLS
alter table public.client_follow_ups enable row level security;

-- Policies
create policy "Therapists can manage their own follow-ups"
  on public.client_follow_ups
  for all
  using (
    auth.uid() = therapist_id
    and exists (
      select 1 from public.clients
      where id = client_follow_ups.client_id
      and user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = therapist_id
    and exists (
      select 1 from public.clients
      where id = client_follow_ups.client_id
      and user_id = auth.uid()
    )
  );

-- updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_client_follow_ups_updated_at
  before update on public.client_follow_ups
  for each row
  execute function public.handle_updated_at();
