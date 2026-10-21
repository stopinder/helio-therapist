-- Behavioural tests for dictation fair-use protection.
DO $$
DECLARE
  u_sec uuid := '00000000-0000-4000-8000-000000000201'; -- Security
  u_basic uuid := '00000000-0000-4000-8000-000000000202'; -- Basic
  u_daily uuid := '00000000-0000-4000-8000-000000000203'; -- Daily limit
  u_rate uuid := '00000000-0000-4000-8000-000000000204'; -- Rate limit
  u_roll uuid := '00000000-0000-4000-8000-000000000205'; -- Rolling window
  u_iso1 uuid := '00000000-0000-4000-8000-000000000206'; -- Isolation 1
  u_iso2 uuid := '00000000-0000-4000-8000-000000000207'; -- Isolation 2
  value integer;
  err text;
  n integer;
BEGIN
  -- 1. Security check
  if has_function_privilege('authenticated', 'private.check_dictation_fair_use(uuid,integer)', 'EXECUTE') then
    raise exception 'Authenticated roles can call service-only dictation RPC';
  end if;
  if not has_function_privilege('service_role', 'private.check_dictation_fair_use(uuid,integer)', 'EXECUTE') then
    raise exception 'service_role cannot call dictation RPC';
  end if;

  -- 2. Basic success
  perform private.check_dictation_fair_use(u_basic, 10);
  perform private.check_dictation_fair_use(u_basic, 110);
  
  select daily_seconds_used into value from private.dictation_usage where user_id = u_basic;
  if value <> 120 then raise exception 'Expected 120s daily used, got %', value; end if;

  -- 3. Daily limit (1800s)
  -- 15 * 120s = 1800s
  for n in 1..15 loop
    perform private.check_dictation_fair_use(u_daily, 120);
  end loop;

  BEGIN
    perform private.check_dictation_fair_use(u_daily, 1);
    raise exception 'Daily limit breach unexpectedly allowed';
  EXCEPTION WHEN raise_exception THEN
    get stacked diagnostics err = MESSAGE_TEXT;
    if err <> 'DICTATION_DAILY_LIMIT_EXCEEDED' then raise; end if;
  END;

  -- 4. Rate limit (10 requests / 10m)
  for n in 1..10 loop
    perform private.check_dictation_fair_use(u_rate, 10);
  end loop;

  BEGIN
    perform private.check_dictation_fair_use(u_rate, 10);
    raise exception 'Rate limit breach unexpectedly allowed';
  EXCEPTION WHEN raise_exception THEN
    get stacked diagnostics err = MESSAGE_TEXT;
    if err <> 'DICTATION_RATE_LIMIT_EXCEEDED' then raise; end if;
  END;

  -- 5. Rolling window verification
  for n in 1..10 loop
    perform private.check_dictation_fair_use(u_roll, 10);
  end loop;
  
  -- Verify rate limit is active
  BEGIN
    perform private.check_dictation_fair_use(u_roll, 10);
    raise exception 'Rate limit breach unexpectedly allowed (rolling test)';
  EXCEPTION WHEN raise_exception THEN
    get stacked diagnostics err = MESSAGE_TEXT;
    if err <> 'DICTATION_RATE_LIMIT_EXCEEDED' then raise; end if;
  END;

  -- Simulate time passing by manually updating timestamps
  update private.dictation_requests 
  set created_at = now() - interval '11 minutes'
  where user_id = u_roll;

  -- Now u_roll should be able to make requests again
  perform private.check_dictation_fair_use(u_roll, 1);
  
  -- 6. User isolation
  perform private.check_dictation_fair_use(u_iso1, 10);
  perform private.check_dictation_fair_use(u_iso2, 20);
  
  select daily_seconds_used into value from private.dictation_usage where user_id = u_iso1;
  if value <> 10 then raise exception 'User 1 usage affected by User 2'; end if;
  
  select daily_seconds_used into value from private.dictation_usage where user_id = u_iso2;
  if value <> 20 then raise exception 'User 2 usage affected by User 1'; end if;

END
$$;
select 'DICTATION_FAIR_USE_BEHAVIOUR_OK' as result;
