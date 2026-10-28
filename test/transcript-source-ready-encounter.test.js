import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const migrationDirectory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url))
const userId = '11111111-1111-4111-8111-111111111111'
const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const transcriptId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

test('source-ready encounters can coexist with one active session without weakening the active-session rule', async () => {
  const database = new PGlite()
  await database.waitReady

  try {
    await database.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create table auth.users (
        id uuid primary key,
        created_at timestamptz not null default now(),
        raw_user_meta_data jsonb not null default '{}'::jsonb
      );
      create function auth.uid() returns uuid language sql stable
        as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create schema storage;
      create table storage.buckets(
        id text primary key,
        name text not null,
        public boolean not null default false,
        file_size_limit bigint,
        allowed_mime_types text[]
      );
      create table storage.objects(
        id uuid primary key default gen_random_uuid(),
        bucket_id text not null,
        name text not null
      );
      create function storage.foldername(name text) returns text[] language sql immutable
        as $$ select case when name is null or name='' then array[]::text[] else string_to_array(trim(both '/' from name),'/') end $$;
    `)

    const migrations = (await readdir(migrationDirectory)).filter(name => name.endsWith('.sql')).sort()
    for (const migration of migrations) {
      await database.exec(await readFile(join(migrationDirectory, migration), 'utf8'))
    }

    await database.exec(`
      insert into auth.users (id) values ('${userId}');
      insert into public.clients (id, user_id, display_name)
        values ('${clientId}', '${userId}', 'Test Client');

      insert into public.sessions (
        user_id, client_id, occurred_at, status, notes, notes_status, workflow_status
      ) values
        (
          '${userId}', '${clientId}', '2026-10-27T10:00:00Z',
          'in_progress', '', 'draft', 'no_further_action'
        ),
        (
          '${userId}', '${clientId}', '2026-10-28T10:00:00Z',
          'source_ready', '', 'draft', 'transcript_received'
        );
    `)

    const sessions = await database.query(
      `select status, workflow_status, occurred_at
       from public.sessions
       where client_id = $1
       order by occurred_at asc`,
      [clientId]
    )

    assert.equal(sessions.rows.length, 2)
    assert.equal(sessions.rows[0].status, 'in_progress')
    assert.equal(sessions.rows[1].status, 'source_ready')
    assert.equal(sessions.rows[1].workflow_status, 'transcript_received')

    const activeCount = await database.query(
      `select count(*)::int as count
       from public.sessions
       where client_id = $1 and status = 'in_progress'`,
      [clientId]
    )
    assert.equal(activeCount.rows[0].count, 1, 'one-open-session rule remains intact')
  } finally {
    await database.close()
  }
})

test('source-ready encounters remain editable and approvable through authorised session RPCs', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261028114500_transcript_source_ready_encounters.sql', import.meta.url), 'utf8')

  assert.match(migration, /status in \('in_progress', 'source_ready', 'completed'\)/)
  assert.match(migration, /status in \('in_progress', 'source_ready'\)/)
  assert.match(migration, /when current_session\.status = 'source_ready' then 'approved'/)
  assert.match(migration, /security invoker/)
  assert.match(migration, /Therapists update own zoom transcripts/)
})
