-- Freemium client quota. Existing pre-billing and subscribed practitioners are exempt.
-- No existing clinical records are changed or made inaccessible.

create index if not exists clients_active_count_by_owner_idx
  on public.clients (user_id) where archived = false;

create or replace function private.enforce_free_active_client_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_created_at timestamptz;
  active_client_count integer;
begin
  if new.archived then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.archived = false and old.user_id = new.user_id then
    return new;
  end if;

  -- Serialize quota-increasing writes for one therapist.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 20261020)
  );

  select u.created_at into account_created_at
    from auth.users as u where u.id = new.user_id;
  if account_created_at is null then
    raise exception 'The client owner does not exist.' using errcode = '23503';
  end if;

  if account_created_at < timestamptz '2026-09-25T00:00:00Z' then
    return new;
  end if;

  if exists (
    select 1 from public.therapist_subscriptions as sub
     where sub.therapist_id = new.user_id
       and sub.status in ('active', 'trialing')
  ) then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select count(*) into active_client_count
      from public.clients as c
     where c.user_id = new.user_id and c.archived = false
       and c.id <> old.id;
  else
    select count(*) into active_client_count
      from public.clients as c
     where c.user_id = new.user_id and c.archived = false;
  end if;

  if active_client_count >= 5 then
    raise exception 'Your Free plan includes up to 5 active clients. Archive an active client or upgrade to add another.'
      using errcode = '23514', constraint = 'free_active_client_limit';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_free_active_client_limit()
  from public, anon, authenticated;

drop trigger if exists enforce_free_active_client_limit_trigger on public.clients;
create trigger enforce_free_active_client_limit_trigger
  before insert or update of archived, user_id on public.clients
  for each row execute function private.enforce_free_active_client_limit();

comment on function private.enforce_free_active_client_limit() is
  'Transactional five-active-client limit for Free therapists; legacy and active/trialing subscriptions are exempt.';
