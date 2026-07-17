-- User-scope Google integrations and use short-lived, single-use OAuth state.

delete from public.integrations
where user_id = '00000000-0000-0000-0000-000000000000'::uuid;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'integrations'
      and con.contype = 'u'
      and (
        select array_agg(att.attname::text order by key_position.ordinality)
        from unnest(con.conkey) with ordinality as key_position(attnum, ordinality)
        join pg_attribute att
          on att.attrelid = rel.oid
         and att.attnum = key_position.attnum
      ) = array['provider']::text[]
  loop
    execute format('alter table public.integrations drop constraint %I', constraint_name);
  end loop;
end
$$;

alter table public.integrations
  alter column user_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.integrations'::regclass
      and conname = 'integrations_user_id_fkey'
  ) then
    alter table public.integrations
      add constraint integrations_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.integrations'::regclass
      and conname = 'integrations_user_provider_key'
  ) then
    alter table public.integrations
      add constraint integrations_user_provider_key unique (user_id, provider);
  end if;
end
$$;

alter table public.integrations enable row level security;

create table if not exists public.oauth_states (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  pending_credentials jsonb,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.oauth_states enable row level security;

create index if not exists oauth_states_expiry_idx
  on public.oauth_states (expires_at);

-- No client-facing policies are created. Server-side service credentials own
-- all integration and OAuth-state access.
