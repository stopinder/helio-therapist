-- Enforce database-level immutability for finalised clinical documents.
-- Finalised documents (status = 'completed') cannot have their content or metadata modified.
-- This protects the clinical record from accidental or unauthorized alteration.

create or replace function public.enforce_document_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (tg_op = 'UPDATE' or tg_op = 'DELETE') and (old.status = 'completed' or old.finalized_at is not null) then
    raise exception 'Finalised clinical documents are immutable. They cannot be modified or deleted.'
      using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists enforce_document_immutability_trigger on public.documents;
create trigger enforce_document_immutability_trigger
  before update or delete on public.documents
  for each row
  execute function public.enforce_document_immutability();

-- Hardening RLS to prevent even attempts at updating finalised documents by owners.
drop policy if exists "Users can update own documents" on public.documents;
create policy "Users can update own documents"
on public.documents for update
to authenticated
using (
  auth.uid() = user_id 
  and finalized_at is null
)
with check (
  auth.uid() = user_id
  and finalized_at is null
  and (
    client_id is null
    or exists (
      select 1 from public.clients c
      where c.id = documents.client_id and c.user_id = auth.uid()
    )
  )
);
