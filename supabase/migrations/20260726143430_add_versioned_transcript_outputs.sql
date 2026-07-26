-- Versioned, therapist-reviewed clinical drafts derived from Zoom transcripts.
-- Original transcripts remain unchanged source material. Generated content is
-- not part of the session record until a therapist explicitly approves it.

alter table public.zoom_transcripts
  drop constraint if exists zoom_transcripts_requested_lens_check;

alter table public.zoom_transcripts
  add constraint zoom_transcripts_requested_lens_check
  check (requested_lens is null or requested_lens in (
    'clinical_summary',
    'draft_note',
    'cbt',
    'ifs',
    'emdr',
    'supervision_reflection'
  ));

create table public.transcript_clinical_outputs (
  id uuid primary key default gen_random_uuid(),
  therapist_user_id uuid not null references auth.users(id) on delete cascade,
  transcript_id uuid not null references public.zoom_transcripts(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  lens text not null check (lens in (
    'clinical_summary',
    'draft_note',
    'cbt',
    'ifs',
    'emdr'
  )),
  version integer not null check (version > 0),
  generation_status text not null default 'generating'
    check (generation_status in ('generating', 'draft', 'approved', 'superseded', 'failed')),
  generated_content text not null default '',
  edited_content text not null default '',
  model text not null,
  prompt_version text not null,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (transcript_id, lens, version),
  constraint transcript_clinical_outputs_generated_length_check
    check (char_length(generated_content) <= 50000),
  constraint transcript_clinical_outputs_edited_length_check
    check (char_length(edited_content) <= 50000),
  constraint transcript_clinical_outputs_state_check check (
    (generation_status = 'generating'
      and generated_content = ''
      and edited_content = ''
      and failure_code is null
      and approved_at is null)
    or
    (generation_status = 'draft'
      and char_length(edited_content) > 0
      and failure_code is null
      and approved_at is null)
    or
    (generation_status = 'approved'
      and char_length(edited_content) > 0
      and failure_code is null
      and approved_at is not null)
    or
    (generation_status = 'superseded'
      and char_length(edited_content) > 0
      and failure_code is null)
    or
    (generation_status = 'failed'
      and failure_code is not null
      and approved_at is null)
  )
);

create index transcript_clinical_outputs_user_transcript_idx
  on public.transcript_clinical_outputs (
    therapist_user_id,
    transcript_id,
    created_at desc
  );

create index transcript_clinical_outputs_session_idx
  on public.transcript_clinical_outputs (
    therapist_user_id,
    session_id,
    created_at desc
  );

create unique index transcript_clinical_outputs_one_approved_idx
  on public.transcript_clinical_outputs (transcript_id, lens)
  where generation_status = 'approved';

alter table public.transcript_clinical_outputs enable row level security;

create policy "Users can view own transcript clinical outputs"
  on public.transcript_clinical_outputs
  for select
  to authenticated
  using (
    (select auth.uid()) = therapist_user_id
    and exists (
      select 1
      from public.clients client
      where client.id = transcript_clinical_outputs.client_id
        and client.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.sessions session
      where session.id = transcript_clinical_outputs.session_id
        and session.user_id = (select auth.uid())
        and session.client_id = transcript_clinical_outputs.client_id
    )
  );

revoke insert, update, delete, truncate
  on public.transcript_clinical_outputs
  from anon, authenticated;
grant select on public.transcript_clinical_outputs to authenticated;

create or replace function public.create_transcript_clinical_output(
  p_user_id uuid,
  p_transcript_id uuid,
  p_lens text,
  p_model text,
  p_prompt_version text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  transcript_record public.zoom_transcripts%rowtype;
  session_record public.sessions%rowtype;
  output_record public.transcript_clinical_outputs%rowtype;
  next_version integer;
begin
  if p_lens not in ('clinical_summary', 'draft_note', 'cbt', 'ifs', 'emdr') then
    raise exception 'Unsupported clinical lens' using errcode = '22023';
  end if;

  if nullif(trim(p_model), '') is null or nullif(trim(p_prompt_version), '') is null then
    raise exception 'Model and prompt version are required' using errcode = '22023';
  end if;

  select *
  into transcript_record
  from public.zoom_transcripts
  where id = p_transcript_id
    and therapist_user_id = p_user_id
  for update;

  if not found then
    raise exception 'Transcript not found' using errcode = 'P0002';
  end if;

  if transcript_record.client_id is null or transcript_record.session_ref is null then
    raise exception 'Link a client and session before generating a draft'
      using errcode = '23514';
  end if;

  select *
  into session_record
  from public.sessions
  where id::text = transcript_record.session_ref
    and user_id = p_user_id
    and client_id = transcript_record.client_id;

  if not found then
    raise exception 'Linked session not found' using errcode = 'P0002';
  end if;

  update public.transcript_clinical_outputs
  set generation_status = 'superseded',
      updated_at = now()
  where transcript_id = p_transcript_id
    and lens = p_lens
    and generation_status = 'draft';

  select coalesce(max(version), 0) + 1
  into next_version
  from public.transcript_clinical_outputs
  where transcript_id = p_transcript_id
    and lens = p_lens;

  insert into public.transcript_clinical_outputs (
    therapist_user_id,
    transcript_id,
    client_id,
    session_id,
    lens,
    version,
    model,
    prompt_version
  )
  values (
    p_user_id,
    p_transcript_id,
    transcript_record.client_id,
    session_record.id,
    p_lens,
    next_version,
    trim(p_model),
    trim(p_prompt_version)
  )
  returning * into output_record;

  update public.zoom_transcripts
  set requested_lens = p_lens,
      review_choices_saved_at = coalesce(review_choices_saved_at, now()),
      completed_at = null,
      updated_at = now()
  where id = p_transcript_id;

  update public.sessions
  set workflow_status = 'drafts_awaiting_review',
      updated_at = now()
  where id = session_record.id;

  return to_jsonb(output_record);
end;
$$;

create or replace function public.save_transcript_clinical_output_draft(
  p_user_id uuid,
  p_output_id uuid,
  p_edited_content text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  output_record public.transcript_clinical_outputs%rowtype;
begin
  if nullif(trim(p_edited_content), '') is null
    or char_length(p_edited_content) > 50000 then
    raise exception 'Draft content must be between 1 and 50000 characters'
      using errcode = '22023';
  end if;

  update public.transcript_clinical_outputs
  set edited_content = trim(p_edited_content),
      updated_at = now()
  where id = p_output_id
    and therapist_user_id = p_user_id
    and generation_status = 'draft'
  returning * into output_record;

  if not found then
    raise exception 'Editable draft not found' using errcode = 'P0002';
  end if;

  return to_jsonb(output_record);
end;
$$;

create or replace function public.approve_transcript_clinical_output(
  p_user_id uuid,
  p_output_id uuid,
  p_edited_content text,
  p_source_retention text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  output_record public.transcript_clinical_outputs%rowtype;
begin
  if nullif(trim(p_edited_content), '') is null
    or char_length(p_edited_content) > 50000 then
    raise exception 'Approved content must be between 1 and 50000 characters'
      using errcode = '22023';
  end if;

  if p_source_retention not in ('keep_until_review', 'delete_after_approved_output') then
    raise exception 'Unsupported source-retention preference' using errcode = '22023';
  end if;

  select *
  into output_record
  from public.transcript_clinical_outputs
  where id = p_output_id
    and therapist_user_id = p_user_id
  for update;

  if not found or output_record.generation_status not in ('draft', 'approved') then
    raise exception 'Approvable draft not found' using errcode = 'P0002';
  end if;

  update public.transcript_clinical_outputs
  set generation_status = 'superseded',
      approved_at = coalesce(approved_at, now()),
      updated_at = now()
  where transcript_id = output_record.transcript_id
    and lens = output_record.lens
    and generation_status = 'approved'
    and id <> output_record.id;

  update public.transcript_clinical_outputs
  set generation_status = 'approved',
      edited_content = trim(p_edited_content),
      approved_at = coalesce(approved_at, now()),
      updated_at = now()
  where id = output_record.id
  returning * into output_record;

  update public.zoom_transcripts
  set requested_lens = output_record.lens,
      source_retention = p_source_retention,
      review_choices_saved_at = coalesce(review_choices_saved_at, now()),
      completed_at = now(),
      updated_at = now()
  where id = output_record.transcript_id
    and therapist_user_id = p_user_id;

  update public.sessions
  set workflow_status = 'approved',
      updated_at = now()
  where id = output_record.session_id
    and user_id = p_user_id;

  return to_jsonb(output_record);
end;
$$;

revoke all on function public.create_transcript_clinical_output(uuid, uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.save_transcript_clinical_output_draft(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.approve_transcript_clinical_output(uuid, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.create_transcript_clinical_output(uuid, uuid, text, text, text)
  to service_role;
grant execute on function public.save_transcript_clinical_output_draft(uuid, uuid, text)
  to service_role;
grant execute on function public.approve_transcript_clinical_output(uuid, uuid, text, text)
  to service_role;

notify pgrst, 'reload schema';
