-- Working documents may be removed by their owning therapist.
-- Completed/finalised documents are retained as clinical records.
drop policy if exists "Users can delete own documents" on public.documents;

create policy "Users can delete own working documents"
on public.documents
for delete
to authenticated
using (
  auth.uid() = user_id
  and status in ('draft', 'review')
);
