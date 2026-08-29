import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const migrationDirectory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url))

const therapistA = '11111111-1111-4111-8111-111111111111'
const therapistB = '22222222-2222-4222-8222-222222222222'
const clientA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const sessionA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

async function buildDatabase() {
  const database = new PGlite()
  await database.waitReady
  await database.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users(
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
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
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select case when name is null or name = '' then array[]::text[] else string_to_array(trim(both '/' from name), '/') end
    $$;
  `)

  const migrations = (await readdir(migrationDirectory)).filter(name => name.endsWith('.sql')).sort()
  for (const migration of migrations) {
    await database.exec(await readFile(join(migrationDirectory, migration), 'utf8'))
  }

  await database.exec(`
    insert into auth.users(id, email) values ('${therapistA}', 'a@example.test'), ('${therapistB}', 'b@example.test');
    insert into public.clients(id, user_id, display_name) values ('${clientA}', '${therapistA}', 'Client A');
    insert into public.sessions(id, user_id, client_id, status, version) values ('${sessionA}', '${therapistA}', '${clientA}', 'in_progress', 1);
    
    -- Therapist A has one ended segment: 10 minutes (600 seconds)
    insert into public.session_work_segments(session_id, user_id, started_at, ended_at) values
      ('${sessionA}', '${therapistA}', now() - interval '20 minutes', now() - interval '10 minutes');

    -- POISON: Therapist B leaked into Session A: 15 minutes (900 seconds)
    insert into public.session_work_segments(session_id, user_id, started_at, ended_at) values
      ('${sessionA}', '${therapistB}', now() - interval '45 minutes', now() - interval '30 minutes');
      
    -- POISON: Therapist B has an OPEN segment on Session A
    insert into public.session_work_segments(session_id, user_id, started_at, ended_at) values
      ('${sessionA}', '${therapistB}', now() - interval '5 minutes', null);
  `)

  return database
}

async function asTherapistA(database) {
  await database.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${therapistA}', false);`)
}

test('get_session_work_summary leak regression test', async () => {
  const database = await buildDatabase()
  try {
    await asTherapistA(database)
    
    const { rows } = await database.query(
      `select * from public.get_session_work_summary($1)`,
      [sessionA]
    )
    
    const summary = rows[0]
    console.log('Current summary:', summary)

    // VULNERABILITY PROOF:
    // If vulnerable, recorded_seconds will include Therapist B's ended segment (900s) + Therapist A's ended segment (600s) = 1500s
    // AND it will likely see Therapist B's OPEN segment as the "current segment" or add its time.
    
    // If hardened, it should only see Therapist A's 10 minutes (600s) and NO open segment.
    
    // We expect it to be VULNERABLE now, so we assert the VULNERABLE behavior to confirm the test works.
    // Actually, let's assert the DESIRED behavior and see it fail.
    
    assert.equal(summary.tracking_state, 'paused', 'Should be paused (only ended segments for Therapist A)')
    assert.equal(summary.recorded_seconds, 600, 'Should only count Therapist A segments')
    assert.equal(summary.current_segment_started_at, null, 'Should not see Therapist B open segment')

  } finally {
    await database.close()
  }
})
