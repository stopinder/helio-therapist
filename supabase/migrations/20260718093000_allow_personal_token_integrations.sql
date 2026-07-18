-- Personal access tokens do not have OAuth refresh or expiry values.
-- Google OAuth continues to store both values when available.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'integrations'
      and column_name = 'refresh_token'
  ) then
    alter table public.integrations alter column refresh_token drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'integrations'
      and column_name = 'expires_at'
  ) then
    alter table public.integrations alter column expires_at drop not null;
  end if;
end
$$;

notify pgrst, 'reload schema';
