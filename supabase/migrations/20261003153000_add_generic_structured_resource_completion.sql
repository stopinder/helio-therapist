begin;

create or replace function public.submit_client_structured_response(
  p_assignment_id uuid,
  p_answers jsonb,
  p_submitted_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  assignment public.client_request_items%rowtype;
  response public.client_resource_responses%rowtype;
begin
  select *
  into assignment
  from public.client_request_items
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'Assignment not found' using errcode = 'P0002';
  end if;

  if assignment.status in ('completed', 'awaiting_review', 'reviewed', 'cancelled') then
    raise exception 'This item has already been submitted' using errcode = '23505';
  end if;

  insert into public.client_resource_responses (
    assignment_id,
    user_id,
    response_kind,
    structured_answers,
    submitted_at
  )
  values (
    assignment.id,
    assignment.user_id,
    'structured',
    coalesce(p_answers, '{}'::jsonb),
    p_submitted_at
  )
  returning * into response;

  update public.client_request_items
  set
    status = 'awaiting_review',
    completed_at = p_submitted_at,
    updated_at = p_submitted_at
  where id = assignment.id;

  return jsonb_build_object(
    'responseId', response.id,
    'submitted', true
  );
end;
$$;

revoke all on function public.submit_client_structured_response(uuid, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.submit_client_structured_response(uuid, jsonb, timestamptz)
  to service_role;

notify pgrst, 'reload schema';

commit;
