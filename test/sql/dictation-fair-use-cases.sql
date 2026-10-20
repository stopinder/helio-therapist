-- Behavioural tests for dictation fair-use protection.
DO $$
DECLARE
  u1 uuid := '00000000-0000-4000-8000-000000000201';
  u2 uuid := '00000000-0000-4000-8000-000000000202';
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
  perform private.check_dictation_fair_use(u1, 10);
  perform private.check_dictation_fair_use(u1, 110);
  
  select daily_seconds_used into value from private.dictation_usage where user_id = u1;
  if value <> 120 then raise exception 'Expected 120s daily used, got %', value; end if;

  -- 3. Daily limit (1800s)
  perform private.check_dictation_fair_use(u1, 1600); -- Total 1720
  BEGIN
    perform private.check_dictation_fair_use(u1, 81); -- Total 1801
    raise exception 'Daily limit breach unexpectedly allowed';
  EXCEPTION WHEN raise_exception THEN
    get stacked diagnostics err = MESSAGE_TEXT;
    if err <> 'DICTATION_DAILY_LIMIT_EXCEEDED' then raise; end if;
  END;

  -- 4. Rate limit (10 requests / 10m)
  -- u1 already has 3 requests (10s, 110s, 1600s)
  for n in 4..10 loop
    perform private.check_dictation_fair_use(u1, 1);
  end loop;

  BEGIN
    perform private.check_dictation_fair_use(u1, 1);
    raise exception 'Rate limit breach unexpectedly allowed';
  EXCEPTION WHEN raise_exception THEN
    get stacked diagnostics err = MESSAGE_TEXT;
    if err <> 'DICTATION_RATE_LIMIT_EXCEEDED' then raise; end if;
  END;

  -- 5. Rolling window verification
  -- Simulate time passing by manually updating timestamps
  update private.dictation_requests 
  set created_at = now() - interval '11 minutes'
  where user_id = u1;

  -- Now u1 should be able to make requests again
  perform private.check_dictation_fair_use(u1, 1);
  
  -- 6. User isolation
  perform private.check_dictation_fair_use(u2, 10);
  select daily_seconds_used into value from private.dictation_usage where user_id = u2;
  if value <> 10 then raise exception 'User 2 usage affected by User 1'; end if;

END
$$;
select 'DICTATION_FAIR_USE_BEHAVIOUR_OK' as result;
