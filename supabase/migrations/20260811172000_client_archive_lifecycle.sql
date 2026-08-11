alter table public.clients
  add column if not exists archived_at timestamptz;

update public.clients
set archived_at = coalesce(archived_at, updated_at, now())
where archived = true
  and archived_at is null;

comment on column public.clients.archived_at is
  'When the therapist archived the client from the active caseload. Archiving retains the client record; it is not a deletion or retention-expiry timestamp.';
