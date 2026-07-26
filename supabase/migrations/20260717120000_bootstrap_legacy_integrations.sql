-- Capture the integrations table that pre-dated the checked-in migration history.
--
-- This migration is intentionally ordered immediately before the first tracked
-- integrations migration. It is idempotent so existing environments keep their
-- current table and fresh Supabase branches can reproduce the schema from zero.

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  provider text not null unique,
  provider_user_id text,
  provider_email text,
  access_token text,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
