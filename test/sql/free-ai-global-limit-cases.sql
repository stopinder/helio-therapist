-- Execute only AFTER the concurrent fifth-credit test has passed.
-- Global exhaustion must roll back the user's reservation, with no provider charge.
DO $$
DECLARE
  downgraded uuid := '00000000-0000-4000-8000-000000000106';
  current_month date := date_trunc('month', now() at time zone 'UTC')::date;
  before_count integer;
  after_count integer;
  err text;
BEGIN
  select used into before_count
    from private.free_ai_monthly_usage
    where user_id = downgraded and period_start = current_month;
  if before_count <> 1 then raise exception 'expected prior test to consume one Free credit'; end if;

  update private.free_ai_global_monthly_usage
  set used = 500 where period_start = current_month;
  if not found then raise exception 'global circuit-breaker missing'; end if;

  BEGIN
    perform public.reserve_free_ai_action(downgraded,'reflection.analysis',1000,400);
    raise exception 'global circuit-breaker bypassed';
  EXCEPTION WHEN raise_exception THEN
    get stacked diagnostics err = MESSAGE_TEXT;
    if err <> 'FREE_AI_GLOBAL_LIMIT' then raise; end if;
  END;

  select used into after_count
    from private.free_ai_monthly_usage
    where user_id = downgraded and period_start = current_month;
  if before_count <> after_count then raise exception 'global denial still consumed a user credit'; end if;

  if (select used from private.free_ai_global_monthly_usage where period_start=current_month) <> 500 then
    raise exception 'global cap exceeded 500';
  end if;
END
$$;
select 'FREE_AI_GLOBAL_CIRCUIT_BREAKER_OK' as result;
