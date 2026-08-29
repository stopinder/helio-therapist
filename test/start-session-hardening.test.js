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
    grant all on schema public to service_role;
    grant all on all tables in schema public to service_role;
    grant all on all sequences in schema public to service_role;
    grant all on all functions in schema public to service_role;
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
  `)

  return database
}

async function asTherapistA(database) {
  await database.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${therapistA}', false);`)
}

async function asTherapistB(database) {
  await database.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${therapistB}', false);`)
}

test('start_session_work leak regression test', async () => {
  const database = await buildDatabase()
  try {
    // 1. POISON: Therapist B creates an open segment on Therapist A's session.
    // To simulate cross-tenant/corrupt data that violates the (session_id) uniqueness,
    // we temporarily drop the unique index, insert the poison, then recreate the hardened RPC.
    // This allows us to test the security boundary even when the invariant is broken.
    await database.exec(`
      drop index public.session_work_segments_one_open_per_session;
      insert into public.session_work_segments(session_id, user_id, started_at, ended_at)
      values ('${sessionA}', '${therapistB}', now() - interval '5 minutes', null);
    `)

    // 2. Therapist A tries to start work on their own session.
    await asTherapistA(database)
    
    // We expect the function to NOT return Therapist B's segment.
    // It will try to insert a new one, which might fail if we put the index back,
    // but the requirement is just to prove it doesn't return Therapist B's segment.
    
    const { rows } = await database.query(
      `select * from public.start_session_work($1)`,
      [sessionA]
    )
    
    const segment = rows[0]
    console.log('Therapist A start_session_work result:', segment)

    // VULNERABILITY PROOF:
    // If vulnerable, start_session_work will see Therapist B's open segment and return it.
    
    assert.equal(segment.user_id, therapistA, 'Should have ignored Therapist B segment and created a new one for Therapist A')
    
  } finally {
    await database.close()
  }
})
