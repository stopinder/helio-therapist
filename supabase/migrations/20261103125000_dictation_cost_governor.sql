-- Plan-aware dictation quotas and global Free transcription cost governor.
-- Free: 60 minutes/month. Professional: 1,000 minutes/month.
-- Global Free pool: £25 base + 15% of a conservative 80% proxy for prior-month GBP paid revenue.
-- Cost guard deliberately assumes £0.01/minute, well above current provider pricing, to prevent loss even if pricing rises.

create table if not exists private.dictation_budget_config (
  id smallint primary key check (id = 1),
  free_monthly_seconds integer not null default 3600 check (free_monthly_seconds > 0),
  professional_monthly_seconds integer not null default 60000 check (professional_monthly_seconds > 0),
  base_free_budget_gbp_pence integer not null default 2500 check (base_free_budget_gbp_pence >= 0),
  previous_month_revenue_share numeric(6,5) not null default 0.15000 check (previous_month_revenue_share >= 0 and previous_month_revenue_share <= 1),
  previous_month_net_factor numeric(6,5) not null default 0.80000 check (previous_month_net_factor >= 0 and previous_month_net_factor <= 1),
  guard_cost_gbp_per_minute numeric(10,5) not null default 0.01000 check (guard_cost_gbp_per_minute > 0),
  max_recording_seconds integer not null default 120 check (max_recording_seconds > 0),
  rate_limit_count integer not null default 10 check (rate_limit_count > 0),
  rate_limit_window_seconds integer not null default 600 check (rate_limit_window_seconds > 0),
  updated_at timestamptz not null default now()
);

insert into private.dictation_budget_config (id)
values (1)
on conflict (id) do nothing;

create table if not exists private.dictation_monthly_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  seconds_used integer not null default 0 check (seconds_used >= 0),
  last_plan text not null default 'free' check (last_plan in ('free','professional')),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

create table if not exists private.dictation_global_monthly_usage (
  period_start date primary key,
  free_seconds_used integer not null default 0 check (free_seconds_used >= 0),
  free_seconds_limit integer not null check (free_seconds_limit >= 0),
  budget_gbp_pence integer not null check (budget_gbp_pence >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists private.billing_revenue_events (
  stripe_invoice_id text primary key,
  stripe_event_id text not null unique,
  stripe_subscription_id text,
  currency text not null check (currency ~ '^[a-z]{3}$'),
  amount_paid_minor bigint not null check (amount_paid_minor >= 0),
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists billing_revenue_events_paid_at_idx
  on private.billing_revenue_events (paid_at);

alter table private.dictation_budget_config enable row level security;
alter table private.dictation_monthly_usage enable row level security;
alter table private.dictation_global_monthly_usage enable row level security;
alter table private.billing_revenue_events enable row level security;

revoke all on private.dictation_budget_config from public, anon, authenticated;
revoke all on private.dictation_monthly_usage from public, anon, authenticated;
revoke all on private.dictation_global_monthly_usage from public, anon, authenticated;
revoke all on private.billing_revenue_events from public, anon, authenticated;

create or replace function private.record_billing_revenue_event(
  p_stripe_event_id text,
  p_stripe_invoice_id text,
  p_stripe_subscription_id text,
  p_currency text,
  p_amount_paid_minor bigint,
  p_paid_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(trim(p_stripe_event_id),'') = ''
     or coalesce(trim(p_stripe_invoice_id),'') = ''
     or coalesce(trim(p_currency),'') = ''
     or p_amount_paid_minor is null
     or p_amount_paid_minor < 0
     or p_paid_at is null then
    raise exception 'INVALID_BILLING_REVENUE_EVENT' using errcode = '22023';
  end if;

  insert into private.billing_revenue_events (
    stripe_event_id,
    stripe_invoice_id,
    stripe_subscription_id,
    currency,
    amount_paid_minor,
    paid_at
  )
  values (
    p_stripe_event_id,
    p_stripe_invoice_id,
    nullif(trim(p_stripe_subscription_id),''),
    lower(trim(p_currency)),
    p_amount_paid_minor,
    p_paid_at
  )
  on conflict (stripe_invoice_id)
  do update set
    stripe_event_id = excluded.stripe_event_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    currency = excluded.currency,
    amount_paid_minor = excluded.amount_paid_minor,
    paid_at = excluded.paid_at;
end;
$$;

create or replace function public.record_billing_revenue_event(
  p_stripe_event_id text,
  p_stripe_invoice_id text,
  p_stripe_subscription_id text,
  p_currency text,
  p_amount_paid_minor bigint,
  p_paid_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_setting('role') <> 'service_role' then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  perform private.record_billing_revenue_event(
    p_stripe_event_id,
    p_stripe_invoice_id,
    p_stripe_subscription_id,
    p_currency,
    p_amount_paid_minor,
    p_paid_at
  );
end;
$$;

create or replace function private.reserve_dictation_usage(
  p_user_id uuid,
  p_duration_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg private.dictation_budget_config%rowtype;
  v_now timestamptz := now();
  v_period_start date := date_trunc('month', v_now at time zone 'UTC')::date;
  v_previous_period_start date := (date_trunc('month', v_now at time zone 'UTC') - interval '1 month')::date;
  v_is_professional boolean := false;
  v_plan text;
  v_user_limit integer;
  v_user_used integer;
  v_recent_requests integer;
  v_previous_gross_pence bigint := 0;
  v_previous_net_pence bigint := 0;
  v_budget_pence integer := 0;
  v_global_limit integer := 0;
  v_global_used integer := null;
  v_window interval;
begin
  select * into v_cfg
  from private.dictation_budget_config
  where id = 1;

  if not found then
    raise exception 'DICTATION_BUDGET_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if p_user_id is null or p_duration_seconds is null or p_duration_seconds <= 0 then
    raise exception 'INVALID_DICTATION_DURATION' using errcode = '22023';
  end if;

  if p_duration_seconds > v_cfg.max_recording_seconds then
    raise exception 'DICTATION_DURATION_EXCEEDED' using errcode = 'P0001';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'DICTATION_ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select exists (
    select 1
    from public.therapist_subscriptions s
    where s.therapist_id = p_user_id
      and s.status in ('active','trialing')
  ) into v_is_professional;

  v_plan := case when v_is_professional then 'professional' else 'free' end;
  v_user_limit := case when v_is_professional
    then v_cfg.professional_monthly_seconds
    else v_cfg.free_monthly_seconds
  end;

  v_window := make_interval(secs => v_cfg.rate_limit_window_seconds);

  delete from private.dictation_requests
  where user_id = p_user_id
    and created_at < v_now - v_window;

  select count(*) into v_recent_requests
  from private.dictation_requests
  where user_id = p_user_id
    and created_at >= v_now - v_window;

  if v_recent_requests >= v_cfg.rate_limit_count then
    raise exception 'DICTATION_RATE_LIMIT_EXCEEDED' using errcode = 'P0001';
  end if;

  insert into private.dictation_monthly_usage as u (
    user_id, period_start, seconds_used, last_plan, updated_at
  )
  values (p_user_id, v_period_start, p_duration_seconds, v_plan, v_now)
  on conflict (user_id, period_start)
  do update set
    seconds_used = u.seconds_used + excluded.seconds_used,
    last_plan = excluded.last_plan,
    updated_at = excluded.updated_at
  where u.seconds_used + excluded.seconds_used <= v_user_limit
  returning seconds_used into v_user_used;

  if v_user_used is null then
    if v_is_professional then
      raise exception 'DICTATION_PROFESSIONAL_MONTHLY_LIMIT_EXCEEDED' using errcode = 'P0001';
    end if;
    raise exception 'DICTATION_FREE_MONTHLY_LIMIT_EXCEEDED' using errcode = 'P0001';
  end if;

  if not v_is_professional then
    select coalesce(sum(amount_paid_minor),0)::bigint
      into v_previous_gross_pence
    from private.billing_revenue_events
    where currency = 'gbp'
      and paid_at >= v_previous_period_start::timestamptz
      and paid_at < v_period_start::timestamptz;

    v_previous_net_pence := floor(v_previous_gross_pence * v_cfg.previous_month_net_factor)::bigint;
    v_budget_pence := v_cfg.base_free_budget_gbp_pence
      + floor(v_previous_net_pence * v_cfg.previous_month_revenue_share)::integer;

    v_global_limit := floor(
      ((v_budget_pence::numeric / 100) / v_cfg.guard_cost_gbp_per_minute) * 60
    )::integer;

    if v_global_limit < p_duration_seconds then
      raise exception 'DICTATION_FREE_GLOBAL_LIMIT' using errcode = 'P0001';
    end if;

    insert into private.dictation_global_monthly_usage as g (
      period_start,
      free_seconds_used,
      free_seconds_limit,
      budget_gbp_pence,
      updated_at
    )
    values (
      v_period_start,
      p_duration_seconds,
      v_global_limit,
      v_budget_pence,
      v_now
    )
    on conflict (period_start)
    do update set
      free_seconds_used = g.free_seconds_used + excluded.free_seconds_used,
      free_seconds_limit = excluded.free_seconds_limit,
      budget_gbp_pence = excluded.budget_gbp_pence,
      updated_at = excluded.updated_at
    where g.free_seconds_used + excluded.free_seconds_used <= excluded.free_seconds_limit
    returning free_seconds_used into v_global_used;

    if v_global_used is null then
      raise exception 'DICTATION_FREE_GLOBAL_LIMIT' using errcode = 'P0001';
    end if;
  end if;

  insert into private.dictation_requests (user_id, created_at)
  values (p_user_id, v_now);

  return jsonb_build_object(
    'plan', v_plan,
    'periodStart', v_period_start,
    'secondsUsed', v_user_used,
    'secondsLimit', v_user_limit,
    'secondsRemaining', greatest(0, v_user_limit - v_user_used),
    'freePoolSecondsUsed', v_global_used,
    'freePoolSecondsLimit', case when v_is_professional then null else v_global_limit end,
    'freePoolBudgetGbpPence', case when v_is_professional then null else v_budget_pence end
  );
end;
$$;

create or replace function public.reserve_dictation_usage(
  p_user_id uuid,
  p_duration_seconds integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_setting('role') <> 'service_role' then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  return private.reserve_dictation_usage(p_user_id, p_duration_seconds);
end;
$$;

grant usage on schema private to service_role;

revoke all on function private.record_billing_revenue_event(text,text,text,text,bigint,timestamptz)
  from public, anon, authenticated;
grant execute on function private.record_billing_revenue_event(text,text,text,text,bigint,timestamptz)
  to service_role;

revoke all on function public.record_billing_revenue_event(text,text,text,text,bigint,timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_billing_revenue_event(text,text,text,text,bigint,timestamptz)
  to service_role;

revoke all on function private.reserve_dictation_usage(uuid,integer)
  from public, anon, authenticated;
grant execute on function private.reserve_dictation_usage(uuid,integer)
  to service_role;

revoke all on function public.reserve_dictation_usage(uuid,integer)
  from public, anon, authenticated;
grant execute on function public.reserve_dictation_usage(uuid,integer)
  to service_role;

insert into private.dictation_monthly_usage (user_id, period_start, seconds_used, last_plan, updated_at)
select
  d.user_id,
  date_trunc('month', d.usage_date::timestamp)::date as period_start,
  sum(d.daily_seconds_used)::integer,
  case when exists (
    select 1 from public.therapist_subscriptions s
    where s.therapist_id = d.user_id and s.status in ('active','trialing')
  ) then 'professional' else 'free' end,
  now()
from private.dictation_usage d
where d.usage_date >= date_trunc('month', now() at time zone 'UTC')::date
group by d.user_id, date_trunc('month', d.usage_date::timestamp)::date
on conflict (user_id, period_start)
do update set
  seconds_used = greatest(private.dictation_monthly_usage.seconds_used, excluded.seconds_used),
  last_plan = excluded.last_plan,
  updated_at = excluded.updated_at;

comment on table private.dictation_monthly_usage is
  'Plan-aware monthly dictation reservations. Free/non-paying accounts are capped at 60 minutes; Professional at 1,000 minutes.';
comment on table private.dictation_global_monthly_usage is
  'Global non-paying dictation circuit breaker. Provider calls are blocked before spend can exceed the authorised monthly Free pool.';
comment on table private.billing_revenue_events is
  'Idempotent Stripe invoice.paid ledger used only to derive the next month Free dictation acquisition budget.';
comment on table private.dictation_budget_config is
  'Server-only dictation cost governor. £25 base acquisition budget plus 15% of a conservative 80% prior-month GBP receipt proxy; provider cost guard is £0.01/minute.';
