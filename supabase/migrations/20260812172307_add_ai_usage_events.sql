-- Durable, content-free accounting for server-side AI execution.
-- Never store prompts, reflection text, transcript text, or generated clinical content here.
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  provider text not null,
  model text not null,
  prompt_version text,
  pricing_version text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  cached_input_tokens integer not null default 0 check (cached_input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  estimated_cost_usd numeric(14, 8),
  status text not null check (status in ('succeeded', 'failed')),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events(user_id, created_at desc);
create index if not exists ai_usage_events_feature_created_idx
  on public.ai_usage_events(feature, created_at desc);

alter table public.ai_usage_events enable row level security;

create policy "Users view own AI usage events"
  on public.ai_usage_events for select
  using ((select auth.uid()) = user_id);

comment on table public.ai_usage_events is
  'Content-free AI usage and estimated-cost telemetry. Server writes only; users may read their own events.';
comment on column public.ai_usage_events.feature is
  'Stable application feature identifier, not user or clinical content.';
comment on column public.ai_usage_events.error_code is
  'Provider/application error code only. Never store error messages that may contain request content.';

notify pgrst, 'reload schema';
