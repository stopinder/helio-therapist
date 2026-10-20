-- Close the storage.objects gap: a finalised documents row was immutable but its
-- underlying client-documents object could still be overwritten, moved or deleted.
-- Unreferenced uploads and working draft files remain editable by their owner.
begin;

drop policy if exists "Therapists can update own document files" on storage.objects;
create policy "Therapists can update own document files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'client-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (
    select 1
    from public.documents as document_record
    where document_record.storage_path = storage.objects.name
      and (
        document_record.status = 'completed'
        or document_record.finalized_at is not null
      )
  )
)
with check (
  bucket_id = 'client-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (
    select 1
    from public.documents as document_record
    where document_record.storage_path = storage.objects.name
      and (
        document_record.status = 'completed'
        or document_record.finalized_at is not null
      )
  )
);

drop policy if exists "Therapists can delete own document files" on storage.objects;
create policy "Therapists can delete own document files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'client-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (
    select 1
    from public.documents as document_record
    where document_record.storage_path = storage.objects.name
      and (
        document_record.status = 'completed'
        or document_record.finalized_at is not null
      )
  )
);

commit;
