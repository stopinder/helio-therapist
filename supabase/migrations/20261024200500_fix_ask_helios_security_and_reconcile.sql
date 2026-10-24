begin;

-- Fix security advisor warning for handle_ask_helios_message_update
-- Using an empty search_path with explicitly schema-qualified table references
-- to ensure the function is secure against search_path manipulation.
create or replace function public.handle_ask_helios_message_update()
returns trigger 
language plpgsql
set search_path = ''
as $$
begin
  update public.ask_helios_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

commit;
