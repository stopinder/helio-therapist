import test from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Ask Helios Persistence: Migration Audit', async (t) => {
  const migrationPath = path.join(__dirname, '../supabase/migrations/20261024200000_add_ask_helios_persistence.sql');
  const migration = await readFile(migrationPath, 'utf8');

  await t.test('Migration has RLS enabled on new tables', () => {
    assert(migration.includes('alter table public.ask_helios_conversations enable row level security;'), 'Conversations RLS missing');
    assert(migration.includes('alter table public.ask_helios_messages enable row level security;'), 'Messages RLS missing');
  });

  await t.test('Migration uses secure auth.uid() checks in policies', () => {
    // We prefer (select auth.uid()) for performance as seen in other migrations
    assert(migration.includes('(select auth.uid()) = user_id'), 'Policy should use (select auth.uid()) = user_id');
  });

  await t.test('Migration enforces ownership on INSERT/UPDATE via WITH CHECK', () => {
    assert(migration.includes('with check ((select auth.uid()) = user_id)'), 'Conversations WITH CHECK missing');
    assert(migration.includes('with check ('), 'Messages WITH CHECK missing');
  });

  await t.test('Migration handles cascade deletes', () => {
    assert(migration.includes('references auth.users(id) on delete cascade'), 'User cascade delete missing');
    assert(migration.includes('references public.ask_helios_conversations(id) on delete cascade'), 'Conversation cascade delete missing');
  });

  await t.test('Migration includes indexes for performance', () => {
    assert(migration.includes('create index if not exists ask_helios_conversations_user_id_idx'), 'Conversation index missing');
    assert(migration.includes('create index if not exists ask_helios_messages_conversation_id_idx'), 'Message index missing');
  });
});

test('Ask Helios Persistence: RLS Isolation Logic', async (t) => {
  const migrationPath = path.join(__dirname, '../supabase/migrations/20261024200000_add_ask_helios_persistence.sql');
  const migration = await readFile(migrationPath, 'utf8');

  await t.test('Messages policy ensures conversation ownership', () => {
    // Verify the cross-table check in ask_helios_messages policy
    assert(migration.includes('exists ('), 'Message policy should check conversation existence');
    assert(migration.includes('conversation.user_id = (select auth.uid())'), 'Message policy should check conversation ownership');
  });
});
