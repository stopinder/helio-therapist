begin;

-- Conversations table
create table if not exists public.ask_helios_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Research Query',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages table
create table if not exists public.ask_helios_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ask_helios_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citation_metadata jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists ask_helios_conversations_user_id_idx on public.ask_helios_conversations(user_id, updated_at desc);
create index if not exists ask_helios_messages_conversation_id_idx on public.ask_helios_messages(conversation_id, created_at asc);

-- Enable RLS
alter table public.ask_helios_conversations enable row level security;
alter table public.ask_helios_messages enable row level security;

-- RLS Policies for conversations
drop policy if exists "Users manage own research conversations" on public.ask_helios_conversations;
create policy "Users manage own research conversations"
  on public.ask_helios_conversations for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- RLS Policies for messages
drop policy if exists "Users manage own research messages" on public.ask_helios_messages;
create policy "Users manage own research messages"
  on public.ask_helios_messages for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.ask_helios_conversations conversation
      where conversation.id = ask_helios_messages.conversation_id
        and conversation.user_id = (select auth.uid())
    )
  );

-- Trigger to update updated_at on conversations when new messages are added
create or replace function public.handle_ask_helios_message_update()
returns trigger as $$
begin
  update public.ask_helios_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger on_ask_helios_message_insert
  after insert on public.ask_helios_messages
  for each row execute function public.handle_ask_helios_message_update();

-- Grant permissions to authenticated role
grant all on public.ask_helios_conversations to authenticated;
grant all on public.ask_helios_messages to authenticated;

commit;
