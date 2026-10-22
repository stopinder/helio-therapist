import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const migrationDirectory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const userOne = '11111111-1111-4111-8111-111111111111';
const clientOne = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('Transcript Workflow Simplification Suite', async () => {
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

    // 5. Test creating a historical session
    const historicalTime = '2026-01-01T10:00:00Z';
    const result = await database.query(`select * from public.create_session_from_transcript($1, $2)`, [clientOne, historicalTime]);
    
    assert.strictEqual(result.rows.length, 1);
    const session = result.rows[0];
    assert.strictEqual(session.status, 'in_progress');
    assert.strictEqual(new Date(session.occurred_at).toISOString(), new Date(historicalTime).toISOString(), 'Session should have the correct historical occurred_at');

    // 6. Test conflict handling (one in-progress session per client)
    try {
      await database.query(`select public.create_session_from_transcript($1, $2)`, [clientOne, '2026-01-02T10:00:00Z']);
      assert.fail('Should have blocked creation of second in-progress session');
    } catch (e) {
      if (e.code === 'ERR_ASSERTION') throw e;
      assert.strictEqual(e.code, 'P0003', 'Should throw P0003 on session conflict');
      assert.ok(e.message.includes('in-progress session already exists'), 'Error message should be helpful');
    }

    // 7. Verify we can still link a transcript to an EXISTING session (simulated by querying)
    // In reality, this is handled by patching the zoom_transcripts table with session_ref.
    // The database function only creates the session.
    
    // 8. Complete the session and verify we can create a new one
    await database.exec(`reset role`);
    await database.query(`select public.complete_session($1, 'Notes', 1)`, [session.id]);
    
    await database.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userOne}', false);`);
    const newTime = '2026-02-01T10:00:00Z';
    const result2 = await database.query(`select * from public.create_session_from_transcript($1, $2)`, [clientOne, newTime]);
    assert.strictEqual(result2.rows.length, 1);
    assert.strictEqual(new Date(result2.rows[0].occurred_at).toISOString(), new Date(newTime).toISOString());

    console.log('Transcript Workflow Simplification Suite: PASSED');

  } finally {
    await database.close();
  }
});
