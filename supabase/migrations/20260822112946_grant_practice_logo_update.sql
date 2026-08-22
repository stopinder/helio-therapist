-- Allow authenticated therapists to update only their own practice-logo path.
-- Row ownership remains enforced by the existing profiles UPDATE RLS policy.

grant update (practice_logo_path)
on public.profiles
to authenticated;
