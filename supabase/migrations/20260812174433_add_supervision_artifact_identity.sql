begin;

alter table public.reflection_supervision_summaries
  add column if not exists source_hash text,
  add column if not exists model_policy_version text;

alter table public.reflection_supervision_summaries
  drop constraint if exists reflection_supervision_summaries_source_hash_check;
alter table public.reflection_supervision_summaries
  add constraint reflection_supervision_summaries_source_hash_check
  check (source_hash is null or source_hash ~ '^[0-9a-f]{64}$');

create unique index if not exists reflection_supervision_generated_artifact_unique
  on public.reflection_supervision_summaries(
    reflection_id,
    source_hash,
    prompt_version,
    model_policy_version
  )
  where generation_status = 'generated'
    and source_hash is not null
    and prompt_version is not null
    and model_policy_version is not null;

create index if not exists reflection_supervision_artifact_lookup_idx
  on public.reflection_supervision_summaries(
    reflection_id,
    source_hash,
    prompt_version,
    model_policy_version,
    generated_at desc
  )
  where generation_status = 'generated';

comment on column public.reflection_supervision_summaries.source_hash is
  'SHA-256 identity of the canonical reflection source. The source text is not duplicated for cache identity.';
comment on column public.reflection_supervision_summaries.model_policy_version is
  'Application model-routing policy version used to decide whether a generated artifact is reusable.';

commit;
