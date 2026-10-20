-- Fair-use limits for Whisper-powered dictation.
-- Tracks daily cumulative duration and rolling request timestamps.

-- Table for tracking daily cumulative duration (fair-use)
create table if not exists private.dictation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (now() at time zone 'UTC')::date,
  daily_seconds_used integer not null default 0 check (daily_seconds_used >= 0),
  primary key (user_id, usage_date)
);

-- Table for tracking individual requests for rolling rate limit
create table if not exists private.dictation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists dictation_requests_user_id_created_at_idx on private.dictation_requests (user_id, created_at);

alter table private.dictation_usage enable row level security;
alter table private.dictation_requests enable row level security;

revoke all on private.dictation_usage from public, anon, authenticated;
revoke all on private.dictation_requests from public, anon, authenticated;

-- Atomic check and reservation for dictation fair-use.
-- Enforces:
-- 1. Daily limit (1800s / 30m)
-- 2. Rolling rate limit (10 requests / 10m)
create or replace function private.check_dictation_fair_use(
  p_user_id uuid,
  p_duration_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_daily_limit integer := 1800; -- 30 minutes
  v_rate_limit_window interval := interval '10 minutes';
  v_rate_limit_count integer := 10;
  v_now timestamptz := now();
  v_today date := (v_now at time zone 'UTC')::date;
  v_daily_used integer;
  v_recent_requests integer;
begin
  -- 1. Validate user identity (security definer can see auth.users)
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'DICTATION_ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- 2. Clean up old requests for this user to keep index efficient
  delete from private.dictation_requests
  where user_id = p_user_id
    and created_at < v_now - v_rate_limit_window;

  -- 3. Lock daily usage record for concurrency protection
  insert into private.dictation_usage (user_id, usage_date, daily_seconds_used)
  values (p_user_id, v_today, 0)
  on conflict (user_id, usage_date) do nothing;

  select daily_seconds_used into v_daily_used
  from private.dictation_usage
  where user_id = p_user_id and usage_date = v_today
  for update;

  -- 4. Check daily limit
  if v_daily_used + p_duration_seconds > v_daily_limit then
    raise exception 'DICTATION_DAILY_LIMIT_EXCEEDED' using errcode = 'P0001';
  end if;

  -- 5. Check rolling rate limit
  select count(*) into v_recent_requests
  from private.dictation_requests
  where user_id = p_user_id
    and created_at >= v_now - v_rate_limit_window;

  if v_recent_requests >= v_rate_limit_count then
    raise exception 'DICTATION_RATE_LIMIT_EXCEEDED' using errcode = 'P0001';
  end if;

  -- 6. Record usage
  update private.dictation_usage
  set daily_seconds_used = daily_seconds_used + p_duration_seconds
  where user_id = p_user_id and usage_date = v_today;

  insert into private.dictation_requests (user_id, created_at)
  values (p_user_id, v_now);
end;
$$;

revoke all on function private.check_dictation_fair_use(uuid, integer) from public, anon, authenticated;
grant execute on function private.check_dictation_fair_use(uuid, integer) to service_role;
