-- Keep the integrations schema aligned with Google OAuth token responses.
alter table public.integrations
  add column if not exists token_type text,
  add column if not exists scope text;

-- Make the new columns immediately visible to the Supabase REST API.
notify pgrst, 'reload schema';
