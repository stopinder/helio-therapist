-- Add detailed client information columns to public.clients
alter table public.clients 
add column if not exists preferred_name text,
add column if not exists date_of_birth date,
add column if not exists phone text,
add column if not exists email text,
add column if not exists address text,
add column if not exists gp_details text,
add column if not exists emergency_contact text,
add column if not exists notes text;

-- Notify PostgREST to reload the schema
notify pgrst, 'reload schema';
