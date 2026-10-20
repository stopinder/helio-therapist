-- Synthetic stand-in for the relevant Supabase tables, for isolated PostgreSQL CI only.
create schema if not exists auth;
create schema if not exists private;
create role anon;
create role authenticated;

create table auth.users (
  id uuid primary key,
  created_at timestamptz not null
);
create table public.therapist_subscriptions (
  therapist_id uuid primary key references auth.users(id),
  status text not null
);
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  display_name text not null,
  archived boolean not null default false
);

create function auth.uid() returns uuid language sql stable set search_path = ''
as $$ select nullif(pg_catalog.current_setting('request.jwt.claim.sub', true),'')::uuid $$;
alter table public.clients enable row level security;
create policy "Users manage own clients" on public.clients
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant usage on schema public, auth to authenticated;
grant select, insert, update, delete on public.clients to authenticated;

insert into auth.users (id, created_at) values
('00000000-0000-4000-8000-000000000001', '2026-10-20T12:00:00Z'),
('00000000-0000-4000-8000-000000000002', '2026-09-24T12:00:00Z'),
('00000000-0000-4000-8000-000000000003', '2026-10-20T12:00:00Z'),
('00000000-0000-4000-8000-000000000004', '2026-10-20T12:00:00Z'),
('00000000-0000-4000-8000-000000000005', '2026-10-20T12:00:00Z');
insert into public.therapist_subscriptions (therapist_id,status)
values ('00000000-0000-4000-8000-000000000003','active');
