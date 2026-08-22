alter table public.profiles
  add column if not exists practice_logo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'practice-branding',
  'practice-branding',
  false,
  2097152,
  array['image/png','image/jpeg','image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Therapists can read own practice branding" on storage.objects;
create policy "Therapists can read own practice branding"
on storage.objects for select
to authenticated
using (
  bucket_id = 'practice-branding'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Therapists can upload own practice branding" on storage.objects;
create policy "Therapists can upload own practice branding"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'practice-branding'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Therapists can update own practice branding" on storage.objects;
create policy "Therapists can update own practice branding"
on storage.objects for update
to authenticated
using (
  bucket_id = 'practice-branding'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'practice-branding'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Therapists can delete own practice branding" on storage.objects;
create policy "Therapists can delete own practice branding"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'practice-branding'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
