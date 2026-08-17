begin;

create table if not exists public.clinical_record_amendments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  approved_by uuid not null references auth.users(id) on delete restrict,
  sequence_number integer not null check (sequence_number > 0),
  reason text not null check (char_length(trim(reason)) between 1 and 2000),
  content text not null check (char_length(trim(content)) between 1 and 20000),
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, sequence_number)
);

create index if not exists clinical_record_amendments_session_sequence_idx
  on public.clinical_record_amendments(session_id, sequence_number);
create index if not exists clinical_record_amendments_user_approved_idx
  on public.clinical_record_amendments(user_id, approved_at desc);

alter table public.clinical_record_amendments enable row level security;

revoke all on table public.clinical_record_amendments from public, anon, authenticated;
grant select on table public.clinical_record_amendments to authenticated;

drop policy if exists "Users view own clinical record amendments"
  on public.clinical_record_amendments;
create policy "Users view own clinical record amendments"
  on public.clinical_record_amendments for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and approved_by = user_id
    and exists (
      select 1
      from public.sessions session
      where session.id = clinical_record_amendments.session_id
        and session.user_id = (select auth.uid())
        and session.status = 'completed'
    )
  );

create or replace function public.prevent_clinical_record_amendment_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Approved clinical record amendments are immutable.'
    using errcode = '42501';
end;
$$;

drop trigger if exists prevent_clinical_record_amendment_updates
  on public.clinical_record_amendments;
create trigger prevent_clinical_record_amendment_updates
  before update or delete on public.clinical_record_amendments
  for each row
  execute function public.prevent_clinical_record_amendment_changes();

create or replace function public.approve_clinical_record_amendment(
  p_session_id uuid,
  p_reason text,
  p_content text
)
returns public.clinical_record_amendments
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_session public.sessions%rowtype;
  next_sequence integer;
  approved_amendment public.clinical_record_amendments%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Amendment reason is required' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_content, '')), '') is null then
    raise exception 'Amendment content is required' using errcode = '22023';
  end if;
  select * into current_session
  from public.sessions
  where id = p_session_id and user_id = current_user_id
  for update;
  if not found then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;
  if current_session.status <> 'completed' then
    raise exception 'Only approved clinical records can be amended' using errcode = '22023';
  end if;
  select coalesce(max(sequence_number), 0) + 1 into next_sequence
  from public.clinical_record_amendments where session_id = p_session_id;
  insert into public.clinical_record_amendments (
    session_id, user_id, approved_by, sequence_number, reason, content, approved_at
  ) values (
    p_session_id, current_user_id, current_user_id, next_sequence,
    left(trim(p_reason), 2000), left(trim(p_content), 20000), now()
  ) returning * into approved_amendment;
  return approved_amendment;
end;
$$;

revoke all on function public.approve_clinical_record_amendment(uuid, text, text)
  from public, anon;
grant execute on function public.approve_clinical_record_amendment(uuid, text, text)
  to authenticated;

notify pgrst, 'reload schema';

commit;
