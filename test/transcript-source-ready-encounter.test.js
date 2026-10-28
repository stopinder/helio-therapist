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

test('assigned transcript becomes a separate source-ready encounter even when an active session exists', async () => {
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
      ) values (
        '${userId}', '${clientId}', '2026-10-27T10:00:00Z',
        'in_progress', '', 'draft', 'no_further_action'
      );

      insert into public.zoom_transcripts (
        id, therapist_user_id, zoom_meeting_id, zoom_recording_file_id,
        original_format, original_transcript, source, status,
        source_occurred_at, received_at, updated_at
      ) values (
        '${transcriptId}', '${userId}', '12345678901', 'recording-1',
        'VTT', 'Therapist: Hello', 'zoom_cloud', 'unassigned',
        '2026-10-28T10:00:00Z', '2026-10-28T10:05:00Z', '2026-10-28T10:05:00Z'
      );

      grant usage on schema public, auth to authenticated;
      grant select, insert, update on public.sessions to authenticated;
      grant select on public.clients to authenticated;
      grant select, update on public.zoom_transcripts to authenticated;
      grant execute on function public.assign_transcript_to_client(uuid, uuid, timestamptz) to authenticated;

      set role authenticated;
      select set_config('request.jwt.claim.sub', '${userId}', false);
    `)

    const storedTranscript = await database.query(
      `select updated_at from public.zoom_transcripts where id = $1`,
      [transcriptId]
    )
    const assignment = await database.query(
      `select (public.assign_transcript_to_client($1, $2, $3)).*`,
      [transcriptId, clientId, storedTranscript.rows[0].updated_at]
    )

    assert.equal(assignment.rows.length, 1)
    const transcript = assignment.rows[0]
    assert.equal(transcript.client_id, clientId)
    assert.equal(transcript.status, 'ready')
    assert.ok(transcript.session_ref)
    assert.ok(transcript.attention_cleared_at)

    await database.exec('reset role')

    const sessions = await database.query(
      `select id, status, workflow_status, occurred_at
       from public.sessions
       where client_id = $1
       order by occurred_at asc`,
      [clientId]
    )

    assert.equal(sessions.rows.length, 2)
    assert.equal(sessions.rows[0].status, 'in_progress', 'existing active session remains untouched')
    assert.equal(sessions.rows[1].status, 'source_ready', 'new transcript gets its own review encounter')
    assert.equal(sessions.rows[1].workflow_status, 'transcript_received')
    assert.equal(new Date(sessions.rows[1].occurred_at).toISOString(), '2026-10-28T10:00:00.000Z')
    assert.equal(String(sessions.rows[1].id), transcript.session_ref)

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
