-- Strengthen private_reflections RLS policy.
-- Ensures that if a client_id is provided, it must belong to the same therapist (auth.uid()).

-- Drop existing policy
drop policy if exists "Users manage own private reflections" on public.private_reflections;

-- Recreate with strengthened check
create policy "Users manage own private reflections"
  on public.private_reflections for all
  using (
    auth.uid() = user_id
    and (
      client_id is null
      or exists (
        select 1
        from public.clients
        where clients.id = private_reflections.client_id
          and clients.user_id = auth.uid()
      )
    )
  )
  with check (
    auth.uid() = user_id
    and (
      client_id is null
      or exists (
        select 1
        from public.clients
        where clients.id = private_reflections.client_id
          and clients.user_id = auth.uid()
      )
    )
  );

comment on policy "Users manage own private reflections" on public.private_reflections is
  'Therapists manage their own reflections and can only link them to their own clients.';

-- Force PostgREST to reload schema cache
notify pgrst, 'reload schema';
