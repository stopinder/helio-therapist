begin;

create or replace function public.publish_resource_version(
  p_user_id uuid,
  p_resource_id uuid,
  p_title text,
  p_description text,
  p_completion_mode text,
  p_form_definition jsonb,
  p_scoring_definition jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owned_resource public.resource_library_items%rowtype;
  created_version public.resource_versions%rowtype;
  next_version integer;
begin
  select *
  into owned_resource
  from public.resource_library_items
  where id = p_resource_id
    and user_id = p_user_id
    and archived = false
  for update;

  if not found then
    raise exception 'Resource not found' using errcode = 'P0002';
  end if;

  select coalesce(max(version_number), 0) + 1
  into next_version
  from public.resource_versions
  where resource_id = p_resource_id
    and user_id = p_user_id;

  update public.resource_library_items
  set
    title = p_title,
    description = p_description,
    updated_at = now()
  where id = p_resource_id
    and user_id = p_user_id
  returning * into owned_resource;

  insert into public.resource_versions (
    resource_id,
    user_id,
    version_number,
    completion_mode,
    client_title,
    client_description,
    form_definition,
    scoring_definition,
    published_at
  )
  values (
    p_resource_id,
    p_user_id,
    next_version,
    p_completion_mode,
    p_title,
    p_description,
    coalesce(p_form_definition, '{}'::jsonb),
    coalesce(p_scoring_definition, '{}'::jsonb),
    now()
  )
  returning * into created_version;

  return jsonb_build_object(
    'resource', to_jsonb(owned_resource),
    'version', to_jsonb(created_version)
  );
end;
$$;

revoke all on function public.publish_resource_version(uuid, uuid, text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.publish_resource_version(uuid, uuid, text, text, text, jsonb, jsonb)
  to service_role;

notify pgrst, 'reload schema';

commit;
