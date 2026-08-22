alter table public.profiles
  add column if not exists marketing_email_consent_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, marketing_email_consent_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when coalesce((new.raw_user_meta_data ->> 'marketing_email_consent')::boolean, false)
        then now()
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
