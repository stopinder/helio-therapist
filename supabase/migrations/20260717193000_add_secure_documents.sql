create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_ref text not null,
  client_name text not null,
  title text not null,
  document_type text not null default 'other',
  report_date date,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  status text not null default 'completed' check (status in ('draft','review','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.documents enable row level security;
drop policy if exists "Users can view own documents" on public.documents;
create policy "Users can view own documents" on public.documents for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own documents" on public.documents;
create policy "Users can insert own documents" on public.documents for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own documents" on public.documents;
create policy "Users can update own documents" on public.documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own documents" on public.documents;
create policy "Users can delete own documents" on public.documents for delete using (auth.uid() = user_id);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('client-documents','client-documents',false,10485760,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
notify pgrst, 'reload schema';
