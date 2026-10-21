-- Behavioural tests against synthetic PostgreSQL tables only.
DO $$
DECLARE
  free_user uuid := '00000000-0000-4000-8000-000000000101';
  legacy_user uuid := '00000000-0000-4000-8000-000000000102';
  paid_user uuid := '00000000-0000-4000-8000-000000000103';
  trial_user uuid := '00000000-0000-4000-8000-000000000104';
  racing_user uuid := '00000000-0000-4000-8000-000000000105';
  downgraded uuid := '00000000-0000-4000-8000-000000000106';
  value integer;
  err text;
  n integer;
  current_month date := date_trunc('month', now() at time zone 'UTC')::date;
BEGIN
  if has_function_privilege('authenticated', 'public.reserve_free_ai_action(uuid,text,integer,integer)', 'EXECUTE') then
    raise exception 'Authenticated roles can call service-only budget RPC';
  end if;
  if has_function_privilege('anon', 'public.reserve_free_ai_action(uuid,text,integer,integer)', 'EXECUTE') then
    raise exception 'Anonymous roles can call service-only budget RPC';
  end if;
  if not has_function_privilege('service_role', 'public.reserve_free_ai_action(uuid,text,integer,integer)', 'EXECUTE') then
    raise exception 'service_role cannot call budget RPC';
  end if;

  -- An invalid request must never spend a credit.
  BEGIN
    perform public.reserve_free_ai_action(free_user,'reflection.analysis',12001,300);
    raise exception 'oversized request unexpectedly accepted';
  EXCEPTION WHEN raise_exception THEN
    get stacked diagnostics err = MESSAGE_TEXT;
    if err <> 'FREE_AI_INPUT_TOO_LARGE' then raise; end if;
  END;
  BEGIN
    perform public.reserve_free_ai_action(free_user,'reflection.analysis',200,1001);
    raise exception 'oversized output unexpectedly accepted';
  EXCEPTION WHEN raise_exception THEN
    get stacked diagnostics err = MESSAGE_TEXT;
    if err <> 'FREE_AI_INPUT_TOO_LARGE' then raise; end if;
  END;
  BEGIN
    select public.reserve_free_ai_action(free_user,'audio.transcription',0,0) into value;
    if value is not null then
      raise exception 'Free audio transcription unexpectedly consumed a credit';
    end if;
  END;
  if exists(select 1 from private.free_ai_monthly_usage where user_id=free_user and period_start=current_month) then
    raise exception 'A free request consumed an AI credit';
  end if;

  for n in 1..5 loop
    select public.reserve_free_ai_action(free_user,'reflection.analysis',200,800) into value;
    if value <> n then raise exception 'Expected reserved credit %, got %', n, value; end if;
  end loop;
  BEGIN
    perform public.reserve_free_ai_action(free_user,'care.suggestions',200,800);
    raise exception 'sixth AI credit unexpectedly permitted';
  EXCEPTION WHEN raise_exception THEN
    get stacked diagnostics err = MESSAGE_TEXT;
    if err <> 'FREE_AI_MONTHLY_LIMIT' then raise; end if;
  END;

  -- Existing paid and grandfathered users retain unrestricted use.
  select public.reserve_free_ai_action(legacy_user,'audio.transcription',0,0) into value;
  if value is not null then raise exception 'Legacy account received a Free quota'; end if;
  select public.reserve_free_ai_action(paid_user,'reflection.analysis',100000,5000) into value;
  if value is not null then raise exception 'Professional account received a Free quota'; end if;
  select public.reserve_free_ai_action(trial_user,'audio.transcription',0,0) into value;
  if value is not null then raise exception 'Existing trial received a Free quota'; end if;

  -- Paid accounts downgraded to Free cannot bypass the allowance.
  update public.therapist_subscriptions set status='canceled' where therapist_id=downgraded;
  select public.reserve_free_ai_action(downgraded,'reflection.analysis',1000,1000) into value;
  if value <> 1 then raise exception 'Downgraded user did not start a Free allowance'; end if;

  -- The next UTC calendar month is a fresh quota bucket.
  update private.free_ai_monthly_usage
  set period_start=(current_month - interval '1 month')::date
  where user_id=free_user and period_start=current_month;
  select public.reserve_free_ai_action(free_user,'reflection.analysis',200,800) into value;
  if value <> 1 then raise exception 'Free allowance did not reset with UTC month'; end if;

  -- Prepare one remaining slot for the two-client race test.
  for n in 1..4 loop
    select public.reserve_free_ai_action(racing_user,'reflection.analysis',200,800) into value;
  end loop;
END
$$;
select 'FREE_AI_BUDGET_BEHAVIOUR_OK' as result;
