create table public.therapist_subscriptions (
  therapist_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null default 'incomplete',
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.therapist_subscriptions enable row level security;

create policy "Therapists view own subscription"
  on public.therapist_subscriptions for select
  using ((select auth.uid()) = therapist_id);

comment on table public.therapist_subscriptions is
  'Stripe-managed therapist subscription state. Server/webhook writes only; therapists may read their own status.';

notify pgrst, 'reload schema';
