-- Allow authenticated therapists to update the practice-profile fields already
-- protected by the existing owner-only profiles UPDATE policy.
-- This does not broaden row access; RLS still requires auth.uid() = id.

grant update (
  full_name,
  professional_title,
  practice_name,
  document_email,
  document_phone,
  practice_website,
  practice_address,
  updated_at
) on public.profiles to authenticated;
