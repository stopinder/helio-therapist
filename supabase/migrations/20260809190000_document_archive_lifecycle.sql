alter table public.documents
  add column if not exists archived_at timestamptz;

create index if not exists documents_user_archived_updated_idx
  on public.documents(user_id, archived_at, updated_at desc);

notify pgrst, 'reload schema';
