create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  consented_at timestamptz not null default now(),
  source text not null default 'landing',
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_leads_email_normalized check (email = lower(trim(email))),
  constraint marketing_leads_email_length check (char_length(email) between 3 and 320),
  constraint marketing_leads_source_length check (char_length(source) between 1 and 80)
);

create unique index if not exists marketing_leads_email_key
  on public.marketing_leads (email);

alter table public.marketing_leads enable row level security;

comment on table public.marketing_leads is
  'Explicit public-site marketing opt-ins only. No clinical or client data belongs here.';

comment on column public.marketing_leads.consented_at is
  'Timestamp of the visitor marketing consent represented by this row.';

comment on column public.marketing_leads.source is
  'Stable public acquisition source such as landing.';
