import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const migrationDirectory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const userOne = '11111111-1111-4111-8111-111111111111';
const clientOne = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('session completion bypass reproduction', async () => {
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

    const sessionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    await database.exec(`
      insert into public.sessions (id, user_id, client_id, status, notes)
      values ('${sessionId}', '${userOne}', '${clientOne}', 'in_progress', 'Initial notes');
    `);

    // 4. Act as the authenticated therapist
    await database.exec(`
      grant usage on schema public, auth to authenticated;
      grant select, update, delete on public.sessions to authenticated;
      grant select, update, delete on public.session_work_segments to authenticated;
      grant select on public.clients to authenticated;
      grant select on public.session_billable_time_revisions to authenticated;
      grant select on public.client_timeline_events to authenticated;
      alter table public.sessions enable row level security;
      alter table public.clients enable row level security;
      alter table public.session_work_segments enable row level security;
      set role authenticated;
      select set_config('request.jwt.claim.sub', '${userOne}', false);
    `);

    // 5. ATTEMPT BYPASS: Directly set session to completed and set billable minutes
    // This SHOULD fail now with the new trigger.
    const bypassTime = '2026-09-11T12:00:00Z';
    try {
      await database.exec(`
        update public.sessions 
        set status = 'completed', 
            completed_at = '${bypassTime}',
            billable_minutes = 60,
            billable_confirmed_at = '${bypassTime}'
        where id = '${sessionId}';
      `);
      assert.fail('Should have blocked direct completion update');
    } catch (e) {
      if (e.code === 'ERR_ASSERTION') throw e;
      assert.strictEqual(e.code, '42501', 'Should throw 42501 on direct session completion');
      assert.ok(e.message.includes('complete_session RPC'), 'Error message should mention RPC');
    }

    // 6. Verify bypass failed
    const session = await database.query(`select status, completed_at, billable_minutes from public.sessions where id = $1`, [sessionId]);
    assert.strictEqual(session.rows[0].status, 'in_progress', 'Vulnerability Fixed: Status should still be in_progress');
    assert.strictEqual(session.rows[0].billable_minutes, null, 'Vulnerability Fixed: billable_minutes should still be null');

    // 7. Verify RPC STILL WORKS (as it is SECURITY DEFINER and runs as postgres/service_role in PGlite if we simulate it)
    await database.exec(`reset role`);
    // PGlite runs as postgres by default when role is reset.
    // In actual Supabase, security definer functions run as the owner (postgres).
    await database.exec(`select public.complete_session('${sessionId}', 'Legit notes', 1)`);
    
    const completedSession = await database.query(`select status from public.sessions where id = $1`, [sessionId]);
    assert.strictEqual(completedSession.rows[0].status, 'completed', 'RPC should still be able to complete the session');

    // 8. Test direct modification of billing fields on COMPLETED session (should still be blocked)
    await database.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userOne}', false);`);
    try {
      await database.exec(`update public.sessions set billable_minutes = 100 where id = '${sessionId}'`);
      assert.fail('Should have blocked direct billing update even on completed session');
    } catch (e) {
      if (e.code === 'ERR_ASSERTION') throw e;
      assert.strictEqual(e.code, '42501', 'Should throw 42501 on direct billing update');
    }

    // 9. Verify confirm_session_billable_time RPC works
    await database.exec(`reset role`);
    await database.exec(`select public.confirm_session_billable_time('${sessionId}', 60, 2, 'Confirmed')`);
    const confirmedSession = await database.query(`select billable_minutes from public.sessions where id = $1`, [sessionId]);
    assert.strictEqual(confirmedSession.rows[0].billable_minutes, 60, 'Billing RPC should still work');

    console.log('Verification successful: Direct bypass blocked, RPCs remain functional.');

  } finally {
    await database.close();
  }
});
