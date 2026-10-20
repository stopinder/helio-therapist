-- Reserve Free-tier AI usage BEFORE a paid provider call.
-- No clinical content is stored. Counts are UTC-calendar-month buckets.
-- Provider failures are intentionally not refunded: billing may still occur.

create table if not exists private.free_ai_monthly_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  used integer not null default 0 check (used between 0 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, period_start)
);
alter table private.free_ai_monthly_usage enable row level security;
revoke all on private.free_ai_monthly_usage from public, anon, authenticated;

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

  if p_feature = 'audio.transcription' then
    raise exception 'FREE_AUDIO_NOT_INCLUDED' using errcode = 'P0001';
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

  return v_used;
end;
$$;

revoke all on function public.reserve_free_ai_action(uuid, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_free_ai_action(uuid, text, integer, integer)
  to service_role;

comment on function public.reserve_free_ai_action(uuid, text, integer, integer)
  is 'Server-only atomic reservation of five bounded Free text AI actions per UTC month; no audio on Free. NULL result means legacy or paid access.';
