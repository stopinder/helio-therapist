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
    insert into public.sessions(id, user_id, client_id, status, version) values ('${sessionA}', '${therapistA}', '${clientA}', 'completed', 1);
    
    -- Work segments for Therapist A
    insert into public.session_work_segments(session_id, user_id, started_at, ended_at) values
      ('${sessionA}', '${therapistA}', now() - interval '30 minutes', now() - interval '15 minutes');
      
    -- POISON: Work segments for Therapist B leaked into Session A
    insert into public.session_work_segments(session_id, user_id, started_at, ended_at) values
      ('${sessionA}', '${therapistB}', now() - interval '10 minutes', now());
  `)

  return database
}

async function asTherapistA(database) {
  await database.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${therapistA}', false);`)
}

test('confirm_session_billable_time uses only current user segments (regression)', async () => {
  const database = await buildDatabase()
  try {
    await asTherapistA(database)
    
    // Therapist A has 15 minutes of work. 
    // Therapist B has 10 minutes of work.
    // Total recorded in session_work_segments for sessionA is 25 minutes.
    
    // If the function is vulnerable, it will calculate v_recorded_minutes as 25.
    // If it is hardened, it will calculate v_recorded_minutes as 15.
    
    // We try to confirm 15 minutes WITHOUT an adjustment reason.
    // If it fails, it means it thinks recorded_minutes is 25.
    
    await database.query(
      `select public.confirm_session_billable_time($1, $2, $3, $4)`,
      [sessionA, 15, 1, null]
    )
    
    // If we reach here, it accepted 15 minutes as matching the recorded time.
    // This currently (before fix) should FAIL if the function is indeed vulnerable.
    
  } finally {
    await database.close()
  }
})
