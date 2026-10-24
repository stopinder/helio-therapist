import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const migrationDirectory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const userOne = '11111111-1111-4111-8111-111111111111';
const clientOne = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('Transcript Session Creation Regression Suite', async () => {
  const database = new PGlite();
  await database.waitReady;

  try {
    // 1. Setup minimal Supabase-like environment
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
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create schema storage;
      create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null,name text not null);
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select case when name is null or name='' then array[]::text[] else string_to_array(trim(both '/' from name),'/') end $$;
    `);
    // 2. Apply all migrations
    const migrations = (await readdir(migrationDirectory)).filter(n => n.endsWith('.sql')).sort();
    for (const migration of migrations) {
      const content = await readFile(join(migrationDirectory, migration), 'utf8');
      await database.exec(content);
    }
    // 3. Setup test data
    await database.exec(`
      insert into auth.users (id) values ('${userOne}');
      insert into public.clients (id, user_id, display_name) values ('${clientOne}', '${userOne}', 'Test Client');
    `);
    // 4. Act as the authenticated therapist
    await database.exec(`
      grant usage on schema public, auth to authenticated;
      grant select, update, delete, insert on public.sessions to authenticated;
      grant select on public.clients to authenticated;
      grant select, insert on public.client_timeline_events to authenticated;
      grant execute on function public.create_session_from_transcript to authenticated;
      grant execute on function public.complete_session to authenticated;
      alter table public.sessions enable row level security;
      alter table public.clients enable row level security;
      set role authenticated;
      select set_config('request.jwt.claim.sub', '${userOne}', false);
    `);
    // 5. Test successful creation from transcript
    await database.exec(`select public.create_session_from_transcript('${clientOne}', now())`);

    const sessionCount = await database.query(`select count(*) from public.sessions where client_id = $1`, [clientOne]);
    assert.strictEqual(parseInt(sessionCount.rows[0].count), 1, 'Should have created one session');
    const session = await database.query(`select status, notes_status, completed_at from public.sessions where client_id = $1`, [clientOne]);
    assert.strictEqual(session.rows[0].status, 'in_progress', 'Session should be in_progress');
    assert.strictEqual(session.rows[0].notes_status, 'draft', 'Notes status should be draft');
    assert.strictEqual(session.rows[0].completed_at, null, 'Completed at should be null');
    // 6. Test conflict prevention (blocking reuse)
    try {
      await database.exec(`select public.create_session_from_transcript('${clientOne}', now())`);
      assert.fail('Should have blocked creation when an in-progress session exists');
    } catch (e) {
      if (e.code === 'ERR_ASSERTION') throw e;
      assert.strictEqual(e.code, 'P0003', 'Should throw P0003 on session conflict');
    }
    // 7. Verify clinical integrity trigger still blocks direct completion
    try {
      await database.exec(`insert into public.sessions (user_id, client_id, status, completed_at) values ('${userOne}', '${clientOne}', 'completed', now())`);
      assert.fail('Should have blocked direct completion insert');
    } catch (e) {
      if (e.code === 'ERR_ASSERTION') throw e;
      assert.strictEqual(e.code, '42501', 'Should throw 42501 on direct session completion');
    }
    // 8. Test creation after completing the previous session
    // Complete the session via authorized RPC
    await database.exec(`reset role`);
    const existingSessionId = (await database.query(`select id from public.sessions where client_id = $1`, [clientOne])).rows[0].id;
    await database.exec(`select public.complete_session('${existingSessionId}', 'Notes', 1)`);

    // Now try creating again
    await database.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userOne}', false);`);
    await database.exec(`select public.create_session_from_transcript('${clientOne}', now())`);

    const sessionCountFinal = await database.query(`select count(*) from public.sessions where client_id = $1`, [clientOne]);
    assert.strictEqual(parseInt(sessionCountFinal.rows[0].count), 2, 'Should have created a second session now that the first is completed');
    console.log('Verification successful: All requirements met.');
  } finally {
    await database.close();
  }
});
