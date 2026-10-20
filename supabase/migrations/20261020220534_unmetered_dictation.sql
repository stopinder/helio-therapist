-- Remove audio transcription from the metered AI allowance.
-- Dictation is now free for all plans and does not consume the monthly AI budget.

create or replace function public.reserve_free_ai_action(
  p_user_id uuid,
  p_feature text,
  p_request_chars integer default 0,
  p_max_output_tokens integer default 0
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_created_at timestamptz;
  v_used integer;
  v_global_used integer;
  v_period_start date := date_trunc('month', now() at time zone 'UTC')::date;
begin
  if p_user_id is null or p_feature is null or
     p_feature not in (
       'reflection.analysis',
       'reflection.rephrase',
       'reflection.growth_longitudinal_summary',
       'reflection.therapeutic_stance_report',
       'reflection.supervision_summary',
       'transcript.clinical_summary',
       'transcript.draft_clinical_note',
       'transcript.cbt_care_suggestions',
       'care.suggestions',
       'client.session_summary',
       'audio.transcription'
     ) then
    raise exception 'AI_FEATURE_NOT_ALLOWED' using errcode = '22023';
  end if;

  -- Dictation is now free and unmetered for all users.
  if p_feature = 'audio.transcription' then
    return null;
  end if;

  select created_at into v_created_at from auth.users where id = p_user_id;
  if v_created_at is null then
    raise exception 'AI_ACCOUNT_NOT_FOUND' using errcode = '23503';
  end if;

  -- Existing accounts, active subscribers and historical trials retain access.
  if v_created_at < timestamptz '2026-09-25T00:00:00Z'
     or exists (
       select 1 from public.therapist_subscriptions s
       where s.therapist_id = p_user_id
         and s.status in ('active', 'trialing')
     ) then
    return null;
  end if;

  -- Fail before reserving: bound prompt and response sizes for low-cost Free AI.
  if p_request_chars is null or p_max_output_tokens is null
     or p_request_chars < 1 or p_request_chars > 12000
     or p_max_output_tokens < 1 or p_max_output_tokens > 1000 then
    raise exception 'FREE_AI_INPUT_TOO_LARGE' using errcode = 'P0001';
  end if;

  -- One atomic upsert serializes competing requests for the same account/month.
  insert into private.free_ai_monthly_usage (user_id, period_start, used)
  values (p_user_id, v_period_start, 1)
  on conflict (user_id, period_start)
  do update set used = private.free_ai_monthly_usage.used + 1
  where private.free_ai_monthly_usage.used < 5
  returning used into v_used;

  if v_used is null then
    raise exception 'FREE_AI_MONTHLY_LIMIT' using errcode = 'P0001';
  end if;

  -- Global cap: the same transaction rolls back the user's reservation
  -- if the whole Free pool reaches the configured circuit-breaker.
  insert into private.free_ai_global_monthly_usage (period_start, used)
  values (v_period_start, 1)
  on conflict (period_start)
  do update set used = private.free_ai_global_monthly_usage.used + 1
  where private.free_ai_global_monthly_usage.used < 500
  returning used into v_global_used;
  if v_global_used is null then
    raise exception 'FREE_AI_GLOBAL_LIMIT' using errcode = 'P0001';
  end if;

  return v_used;
end;
$$;

comment on function public.reserve_free_ai_action(uuid, text, integer, integer)
  is 'Server-only atomic reservation of five bounded Free text AI actions per UTC month. Audio transcription is unmetered. NULL result means legacy, paid, or unmetered access.';

revoke all on function public.reserve_free_ai_action(uuid, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_free_ai_action(uuid, text, integer, integer)
  to service_role;
