-- A client completion link is specific to one assignment. Store only a digest so
-- a database export cannot be used to open a client's form.
alter table public.client_resource_assignments
  add column if not exists client_access_token_hash text unique,
  add column if not exists client_access_expires_at timestamptz;

create index if not exists client_resource_assignments_access_token_idx
  on public.client_resource_assignments(client_access_token_hash)
  where client_access_token_hash is not null;

notify pgrst, 'reload schema';
