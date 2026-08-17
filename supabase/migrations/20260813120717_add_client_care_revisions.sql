create table if not exists public.client_care_item_revisions (
  id uuid primary key default gen_random_uuid(),
  care_item_id uuid not null references public.client_care_items(id) on delete cascade,
  therapist_id uuid not null references auth.users(id) on delete cascade,
  previous_kind text not null,
  previous_body text not null,
  previous_status text not null,
  previous_origin text not null,
  previous_ai_prompt_version text,
  replaced_at timestamptz not null default now()
);

create index if not exists client_care_item_revisions_item_idx on public.client_care_item_revisions(care_item_id, replaced_at desc);
alter table public.client_care_item_revisions enable row level security;
create policy "therapists read own care revisions" on public.client_care_item_revisions for select to authenticated using (therapist_id = auth.uid());

create or replace function public.revise_client_care_item(p_item_id uuid, p_body text, p_kind text, p_origin text default 'clinician', p_ai_prompt_version text default null)
returns setof public.client_care_items
language plpgsql security invoker as $$
declare current_item public.client_care_items%rowtype;
begin
  select * into current_item from public.client_care_items where id = p_item_id and therapist_id = auth.uid() for update;
  if not found then raise exception 'Care item not found'; end if;
  insert into public.client_care_item_revisions(care_item_id,therapist_id,previous_kind,previous_body,previous_status,previous_origin,previous_ai_prompt_version)
  values(current_item.id,current_item.therapist_id,current_item.kind,current_item.body,current_item.status,current_item.origin,current_item.ai_prompt_version);
  return query update public.client_care_items set body=trim(p_body),kind=p_kind,origin=p_origin,ai_prompt_version=p_ai_prompt_version,updated_at=now() where id=p_item_id returning *;
end $$;
