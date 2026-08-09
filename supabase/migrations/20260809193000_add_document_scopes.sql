alter table public.documents
  add column if not exists scope text not null default 'client';

alter table public.documents alter column client_ref drop not null;
alter table public.documents alter column client_name drop not null;

alter table public.documents drop constraint if exists documents_scope_check;
alter table public.documents
  add constraint documents_scope_check
  check (scope in ('client', 'practice', 'prospect'));

alter table public.documents drop constraint if exists documents_client_scope_check;
alter table public.documents
  add constraint documents_client_scope_check
  check (
    (scope = 'client' and client_id is not null and client_ref is not null and client_name is not null)
    or
    (scope in ('practice', 'prospect') and client_id is null)
  );

update public.documents set scope = 'client' where client_id is not null;

create index if not exists documents_user_scope_updated_idx
  on public.documents(user_id, scope, updated_at desc);

notify pgrst, 'reload schema';
