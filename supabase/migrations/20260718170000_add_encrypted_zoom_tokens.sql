-- Zoom OAuth credentials are stored application-encrypted, never as plaintext.
alter table public.integrations
  add column if not exists encrypted_access_token text,
  add column if not exists encrypted_refresh_token text;

alter table public.integrations
  alter column access_token drop not null;

notify pgrst, 'reload schema';
