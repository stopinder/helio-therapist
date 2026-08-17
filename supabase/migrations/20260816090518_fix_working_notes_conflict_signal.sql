create or replace function public.save_session_working_notes(
  p_session_id uuid,
  p_client_id uuid,
  p_content jsonb,
  p_expected_version integer
)
returns public.session_working_notes
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_record public.session_working_notes;
  saved_record public.session_working_notes;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
  into current_record
  from public.session_working_notes
  where session_id = p_session_id
    and client_id = p_client_id
    and user_id = auth.uid()
  for update;

  if found then
    if current_record.version <> p_expected_version then
      raise exception 'WORKING_NOTES_CONFLICT' using errcode = 'P0001';
    end if;

    update public.session_working_notes
    set content = coalesce(p_content, '{}'::jsonb),
        updated_at = now(),
        version = version + 1
    where session_id = p_session_id
      and client_id = p_client_id
      and user_id = auth.uid()
    returning * into saved_record;

    return saved_record;
  end if;

  if p_expected_version <> 0 then
    raise exception 'WORKING_NOTES_CONFLICT' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.sessions session
    where session.id = p_session_id
      and session.client_id = p_client_id
      and session.user_id = auth.uid()
  ) then
    raise exception 'Session not found' using errcode = '42501';
  end if;

  insert into public.session_working_notes (
    session_id,
    user_id,
    client_id,
    content,
    version
  )
  values (
    p_session_id,
    auth.uid(),
    p_client_id,
    coalesce(p_content, '{}'::jsonb),
    1
  )
  returning * into saved_record;

  return saved_record;
end;
$$;

grant execute on function public.save_session_working_notes(uuid, uuid, jsonb, integer) to authenticated;
