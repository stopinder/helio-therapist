-- A published version is the stable clinical artefact used in client assignments.
-- Publishing creates a new row; an existing published row may not be edited,
-- retrospectively retired or deleted. Draft versions stay editable.
begin;

create or replace function public.enforce_published_resource_version_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.published_at is not null then
    raise exception
      'Published resource versions are immutable. Publish a new version instead.'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_published_resource_version_immutability_trigger
  on public.resource_versions;
create trigger enforce_published_resource_version_immutability_trigger
  before update or delete on public.resource_versions
  for each row
  execute function public.enforce_published_resource_version_immutability();

commit;
