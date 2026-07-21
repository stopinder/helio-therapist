-- Records the most recent successful Google Calendar sync for workspace status.
-- This is deliberately additive so existing Google connections remain intact.
alter table public.integrations
  add column if not exists last_synced_at timestamptz;
