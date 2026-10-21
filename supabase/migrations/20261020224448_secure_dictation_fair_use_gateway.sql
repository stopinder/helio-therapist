-- Secure public gateway for dictation fair-use checks.
-- Only accessible by service_role (from the API).

-- 1. Update private function to enforce individual recording limits
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
  v_max_individual_seconds integer := 120;
  v_daily_limit integer := 1800; -- 30 minutes
  v_rate_limit_window interval := interval '10 minutes';
  v_rate_limit_count integer := 10;
  v_now timestamptz := now();
  v_today date := (v_now at time zone 'UTC')::date;
  v_daily_used integer;
  v_recent_requests integer;
begin
  -- Validation
  if p_duration_seconds is null or p_duration_seconds <= 0 then
    raise exception 'INVALID_DICTATION_DURATION' using errcode = 'P0001';
  end if;

  if p_duration_seconds > v_max_individual_seconds then
    raise exception 'DICTATION_DURATION_EXCEEDED' using errcode = 'P0001';
  end if;

  -- 1. Validate user identity
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'DICTATION_ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- 2. Clean up old requests
  delete from private.dictation_requests
  where user_id = p_user_id
    and created_at < v_now - v_rate_limit_window;

  -- 3. Lock daily usage record
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

-- 2. Create public gateway function
create or replace function public.check_dictation_fair_use(
  p_user_id uuid,
  p_duration_seconds integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Security: Only service_role can call this. 
  -- We check this because public functions are exposed via PostgREST.
  -- Even if RLS on underlying tables is safe, we don't want users calling this RPC directly.
  if current_setting('role') <> 'service_role' then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  perform private.check_dictation_fair_use(p_user_id, p_duration_seconds);
end;
$$;

-- 3. Revoke and Grant permissions
grant usage on schema private to service_role;
revoke all on function public.check_dictation_fair_use(uuid, integer) from public, anon, authenticated;
grant execute on function public.check_dictation_fair_use(uuid, integer) to service_role;
