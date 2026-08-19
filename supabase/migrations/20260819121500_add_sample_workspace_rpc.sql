-- Optional synthetic starter content for a newly created therapist workspace.
-- Reuses the existing schema and normal clinical session completion workflow.

create or replace function public.create_sample_workspace()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  alex_id uuid; priya_id uuid; daniel_id uuid; maya_id uuid;
  session_id uuid; session_version integer;
begin
  if current_user_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if exists (select 1 from public.clients where user_id = current_user_id) then
    raise exception 'Sample content can only be added to an empty workspace.' using errcode = 'P0001';
  end if;

  insert into public.clients (user_id,display_name,reference,current_focus,email,archived,archived_at) values
    (current_user_id,'Alex Morgan — Sample','SAMPLE-001','Work-related anxiety, sleep disruption and building a sustainable weekly routine.','alex.sample@example.invalid',false,null)
    returning id into alex_id;
  insert into public.clients (user_id,display_name,reference,current_focus,email,archived,archived_at) values
    (current_user_id,'Priya Shah — Sample','SAMPLE-002','Recent bereavement, adjustment and maintaining connection with supportive relationships.','priya.sample@example.invalid',false,null)
    returning id into priya_id;
  insert into public.clients (user_id,display_name,reference,current_focus,email,archived,archived_at) values
    (current_user_id,'Daniel Reed — Sample','SAMPLE-003','Confidence in social situations and practising graded behavioural experiments.','daniel.sample@example.invalid',false,null)
    returning id into daniel_id;
  insert into public.clients (user_id,display_name,reference,current_focus,email,archived,archived_at) values
    (current_user_id,'Maya Chen — Sample','SAMPLE-004','Therapy completed after progress with panic symptoms and relapse-prevention planning.','maya.sample@example.invalid',true,now())
    returning id into maya_id;

  insert into public.sessions (user_id,client_id,occurred_at,status,workflow_status,notes,notes_status)
    values (current_user_id,alex_id,now()-interval '21 days','in_progress','no_further_action','','draft')
    returning id,version into session_id,session_version;
  perform public.complete_session(session_id,'Client described a demanding work period with increased evening rumination and reduced sleep. Reviewed the anxiety-maintenance cycle, identified late-night checking as a maintaining behaviour, and agreed a short wind-down routine plus a consistent stopping time for work messages. No current risk concerns identified in this synthetic example.',session_version);

  insert into public.sessions (user_id,client_id,occurred_at,status,workflow_status,notes,notes_status)
    values (current_user_id,alex_id,now()-interval '7 days','in_progress','no_further_action','','draft')
    returning id,version into session_id,session_version;
  perform public.complete_session(session_id,'Client reported modest improvement in sleep and fewer late-night work checks. Explored perfectionistic assumptions and tested a more flexible standard for one low-stakes task. Agreed to continue the wind-down routine and record what happens when a task is completed to a good-enough standard.',session_version);

  insert into public.sessions (user_id,client_id,occurred_at,status,workflow_status,notes,notes_status)
    values (current_user_id,priya_id,now()-interval '5 days','in_progress','no_further_action','','draft')
    returning id,version into session_id,session_version;
  perform public.complete_session(session_id,'Client reflected on waves of grief around family milestones and the pressure to appear recovered. Normalised variation in grief responses, mapped current supports, and agreed one gentle reconnection with a trusted friend. Synthetic example contains no real clinical data.',session_version);

  insert into public.sessions (user_id,client_id,occurred_at,status,workflow_status,notes,notes_status)
    values (current_user_id,daniel_id,now(),'in_progress','no_further_action','Working notes: review confidence ladder and agree one manageable social experiment before next session.','draft');

  insert into public.client_care_items (therapist_id,client_id,kind,body,status,origin) values
    (current_user_id,alex_id,'current_focus','Reduce the spill-over of work anxiety into evenings and sleep.','current','clinician'),
    (current_user_id,alex_id,'trying','20-minute wind-down routine and no work-message checking after 20:30.','current','clinician'),
    (current_user_id,alex_id,'change_noticed','Falling asleep more easily on evenings when the wind-down routine is used.','current','clinician'),
    (current_user_id,priya_id,'shared_understanding','Grief arrives in waves; difficult days do not mean progress has been lost.','current','clinician'),
    (current_user_id,daniel_id,'trying','Use a three-step confidence ladder for social situations and record predictions versus outcomes.','current','clinician');

  insert into public.appointments (user_id,client_id,status,correlation_token,starts_at,ends_at,timezone) values
    (current_user_id,alex_id,'scheduled','sample-'||current_user_id::text||'-alex',date_trunc('day',now()+interval '3 days')+interval '11 hours',date_trunc('day',now()+interval '3 days')+interval '12 hours','Europe/London'),
    (current_user_id,daniel_id,'scheduled','sample-'||current_user_id::text||'-daniel',date_trunc('day',now()+interval '6 days')+interval '9 hours',date_trunc('day',now()+interval '6 days')+interval '10 hours','Europe/London');

  insert into public.documents (user_id,client_id,client_ref,client_name,title,document_type,status,purpose,recipient,content,source_manifest) values
    (current_user_id,alex_id,alex_id::text,'Alex Morgan — Sample','Sample treatment plan','treatment_plan','draft','Illustrate a structured treatment-planning document.','Clinical record','{"goals":["Improve sleep consistency","Reduce work-related checking","Practise flexible standards"],"approach":"Collaborative CBT-informed work with regular review."}'::jsonb,'[]'::jsonb),
    (current_user_id,priya_id,priya_id::text,'Priya Shah — Sample','Sample progress summary','clinical_summary','draft','Illustrate a concise progress summary.','Clinical record','{"summary":"Synthetic example summary showing adjustment, support mapping and agreed next steps."}'::jsonb,'[]'::jsonb);

  return jsonb_build_object('clientsCreated',4,'sessionsCreated',4,'appointmentsCreated',2,'careItemsCreated',5,'documentsCreated',2);
end;
$$;
revoke all on function public.create_sample_workspace() from public;
grant execute on function public.create_sample_workspace() to authenticated;

-- Only synthetic SAMPLE-* clients without completed clinical records may be hard-deleted.
-- Completed sample records use the existing archive flow and retain normal immutability.
create or replace function public.delete_sample_client(p_client_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  sample_reference text;
begin
  if current_user_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select reference into sample_reference from public.clients where id=p_client_id and user_id=current_user_id;
  if not found then raise exception 'Client not found' using errcode = 'P0002'; end if;
  if sample_reference is null or sample_reference not like 'SAMPLE-%' then
    raise exception 'Only synthetic sample clients can be removed with this action.' using errcode = '42501';
  end if;
  if exists (select 1 from public.sessions where client_id=p_client_id and user_id=current_user_id and status='completed') then
    raise exception 'This sample client has completed clinical records and must be archived instead.' using errcode = '42501';
  end if;
  delete from public.appointments where client_id=p_client_id and user_id=current_user_id;
  delete from public.clients where id=p_client_id and user_id=current_user_id;
end;
$$;
revoke all on function public.delete_sample_client(uuid) from public;
grant execute on function public.delete_sample_client(uuid) to authenticated;
