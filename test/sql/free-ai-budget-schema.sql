-- Disposable PostgreSQL fixture only. Never apply to Platform.
create schema auth;
create schema private;
create role anon;
create role authenticated;
create role service_role;

create table auth.users (
  id uuid primary key,
  created_at timestamptz not null
);
create table public.therapist_subscriptions (
  therapist_id uuid primary key references auth.users(id),
  status text not null
);
insert into auth.users(id, created_at) values
('00000000-0000-4000-8000-000000000101', '2026-10-20T10:00:00Z'), -- Free
('00000000-0000-4000-8000-000000000102', '2026-09-24T10:00:00Z'), -- Legacy
('00000000-0000-4000-8000-000000000103', '2026-10-20T10:00:00Z'), -- Paid
('00000000-0000-4000-8000-000000000104', '2026-10-20T10:00:00Z'), -- Trial
('00000000-0000-4000-8000-000000000105', '2026-10-20T10:00:00Z'), -- Race
('00000000-0000-4000-8000-000000000106', '2026-10-20T10:00:00Z'); -- Downgrade
insert into public.therapist_subscriptions(therapist_id,status) values
('00000000-0000-4000-8000-000000000103','active'),
('00000000-0000-4000-8000-000000000104','trialing'),
('00000000-0000-4000-8000-000000000106','active');
