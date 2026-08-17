drop policy if exists "Therapists can read own document files" on storage.objects;
create policy "Therapists can read own document files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'client-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Therapists can upload own document files" on storage.objects;
create policy "Therapists can upload own document files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'client-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Therapists can update own document files" on storage.objects;
create policy "Therapists can update own document files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'client-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'client-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Therapists can delete own document files" on storage.objects;
create policy "Therapists can delete own document files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'client-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
