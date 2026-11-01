-- Sample Practice 2.0: mark server-created synthetic clients internally so they
-- do not consume the Free active-client allowance. The marker is private and
-- cannot be forged through the authenticated Data API.

begin;

create table if not exists private.sample_clients (
  client_id uuid primary key references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on table private.sample_clients from public, anon, authenticated;
grant all on table private.sample_clients to service_role;

create index if not exists sample_clients_user_idx
  on private.sample_clients (user_id);

-- Preserve existing sample workspaces created before this migration. Match the
-- exact synthetic identities rather than trusting any SAMPLE-* reference.
insert into private.sample_clients (client_id, user_id)
select c.id, c.user_id
from public.clients as c
where
  (c.reference = 'SAMPLE-001' and c.display_name = 'Alex Morgan — Sample' and c.email = 'alex.sample@example.invalid')
  or (c.reference = 'SAMPLE-002' and c.display_name = 'Priya Shah — Sample' and c.email = 'priya.sample@example.invalid')
  or (c.reference = 'SAMPLE-003' and c.display_name = 'Daniel Reed — Sample' and c.email = 'daniel.sample@example.invalid')
  or (c.reference = 'SAMPLE-004' and c.display_name = 'Maya Chen — Sample' and c.email = 'maya.sample@example.invalid')
on conflict (client_id) do update set user_id = excluded.user_id;

create or replace function public.mark_sample_workspace_clients(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  marked_count integer;
begin
  if current_user <> 'service_role'
     and current_setting('role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  insert into private.sample_clients (client_id, user_id)
  select c.id, c.user_id
  from public.clients as c
  where c.user_id = p_user_id
    and (
      (c.reference = 'SAMPLE-001' and c.display_name = 'Alex Morgan — Sample' and c.email = 'alex.sample@example.invalid')
      or (c.reference = 'SAMPLE-002' and c.display_name = 'Priya Shah — Sample' and c.email = 'priya.sample@example.invalid')
      or (c.reference = 'SAMPLE-003' and c.display_name = 'Daniel Reed — Sample' and c.email = 'daniel.sample@example.invalid')
      or (c.reference = 'SAMPLE-004' and c.display_name = 'Maya Chen — Sample' and c.email = 'maya.sample@example.invalid')
    )
  on conflict (client_id) do update set user_id = excluded.user_id;

  select count(*) into marked_count
  from private.sample_clients
  where user_id = p_user_id;

  return marked_count;
end;
$$;

revoke all on function public.mark_sample_workspace_clients(uuid)
  from public, anon, authenticated;
grant execute on function public.mark_sample_workspace_clients(uuid)
  to service_role;

create or replace function public.is_sample_client(p_user_id uuid, p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.sample_clients as sample
    where sample.user_id = p_user_id
      and sample.client_id = p_client_id
  );
$$;

revoke all on function public.is_sample_client(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.is_sample_client(uuid, uuid)
  to service_role;

create or replace function public.is_sample_workspace(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from private.sample_clients as sample where sample.user_id = p_user_id) >= 4
    and not exists (
      select 1
      from public.clients as client
      where client.user_id = p_user_id
        and not exists (
          select 1
          from private.sample_clients as sample
          where sample.client_id = client.id
            and sample.user_id = client.user_id
        )
    );
$$;

revoke all on function public.is_sample_workspace(uuid)
  from public, anon, authenticated;
grant execute on function public.is_sample_workspace(uuid)
  to service_role;

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

  -- Internally marked synthetic clients never consume the commercial quota.
  if exists (
    select 1
    from private.sample_clients as sample
    where sample.client_id = new.id
      and sample.user_id = new.user_id
  ) then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.archived = false and old.user_id = new.user_id then
      return new;
    end if;
  end if;

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
     where c.user_id = new.user_id
       and c.archived = false
       and c.id <> old.id
       and not exists (
         select 1 from private.sample_clients as sample
         where sample.client_id = c.id and sample.user_id = c.user_id
       );
  else
    select count(*) into active_client_count
      from public.clients as c
     where c.user_id = new.user_id
       and c.archived = false
       and not exists (
         select 1 from private.sample_clients as sample
         where sample.client_id = c.id and sample.user_id = c.user_id
       );
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

comment on function private.enforce_free_active_client_limit() is
  'Transactional five-active-real-client limit for Free therapists. Internally marked synthetic sample clients, legacy accounts and active/trialing subscriptions are exempt.';

notify pgrst, 'reload schema';

commit;
