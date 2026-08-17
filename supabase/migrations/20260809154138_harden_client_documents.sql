alter table public.documents
  add column if not exists client_id uuid references public.clients(id) on delete cascade,
  add column if not exists content jsonb not null default '{}'::jsonb,
  add column if not exists source_manifest jsonb not null default '[]'::jsonb,
  add column if not exists purpose text not null default '',
  add column if not exists recipient text not null default '',
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists version integer not null default 1,
  add column if not exists finalized_at timestamptz;

-- Drafts are first-class records, so file metadata is populated only after finalisation.
alter table public.documents alter column storage_path drop not null;
alter table public.documents alter column original_filename drop not null;
alter table public.documents alter column mime_type drop not null;
alter table public.documents alter column size_bytes drop not null;

alter table public.documents drop constraint if exists documents_size_bytes_check;
alter table public.documents
  add constraint documents_size_bytes_check
  check (size_bytes is null or (size_bytes > 0 and size_bytes <= 10485760));

alter table public.documents drop constraint if exists documents_version_check;
alter table public.documents
  add constraint documents_version_check check (version > 0);

alter table public.documents drop constraint if exists documents_period_check;
alter table public.documents
  add constraint documents_period_check
  check (period_start is null or period_end is null or period_start <= period_end);

-- Backfill legacy records where client_ref already contains a real Helio client UUID.
update public.documents d
set client_id = c.id
from public.clients c
where d.client_id is null
  and d.user_id = c.user_id
  and d.client_ref = c.id::text;

create index if not exists documents_user_client_created_idx
  on public.documents(user_id, client_id, created_at desc);

-- Keep legacy rows readable while ensuring any real client relationship belongs to the therapist.
drop policy if exists "Users can view own documents" on public.documents;
create policy "Users can view own documents"
on public.documents for select
using (
  auth.uid() = user_id
  and (
    client_id is null
    or exists (
      select 1 from public.clients c
      where c.id = documents.client_id and c.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can insert own documents" on public.documents;
create policy "Users can insert own documents"
on public.documents for insert
with check (
  auth.uid() = user_id
  and (
    client_id is null
    or exists (
      select 1 from public.clients c
      where c.id = documents.client_id and c.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can update own documents" on public.documents;
create policy "Users can update own documents"
on public.documents for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    client_id is null
    or exists (
      select 1 from public.clients c
      where c.id = documents.client_id and c.user_id = auth.uid()
    )
  )
);

notify pgrst, 'reload schema';
