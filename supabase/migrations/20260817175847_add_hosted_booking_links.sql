alter table public.appointments
  add column if not exists booking_expires_at timestamptz,
  add column if not exists encrypted_booking_url text;

comment on column public.appointments.booking_expires_at is
  'Helios-controlled expiry for the public hosted booking link.';
comment on column public.appointments.encrypted_booking_url is
  'Encrypted single-use Zoom Scheduler URL. Never expose directly from therapist-facing queries.';

create index if not exists appointments_booking_expiry_idx
  on public.appointments(booking_expires_at)
  where booking_expires_at is not null;

notify pgrst, 'reload schema';
