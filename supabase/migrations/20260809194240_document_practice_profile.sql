alter table public.profiles
  add column if not exists practice_name text not null default '',
  add column if not exists professional_title text not null default '',
  add column if not exists document_email text not null default '',
  add column if not exists document_phone text not null default '',
  add column if not exists practice_website text not null default '',
  add column if not exists practice_address text not null default '',
  add column if not exists document_footer text not null default '';

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
with check ((select auth.uid()) = id);

notify pgrst, 'reload schema';
