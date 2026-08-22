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
const clientB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const sessionA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const sessionB = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

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
    if (migration === '20260722193000_refine_clinical_timeline_events.sql') {
      await database.exec(`
        insert into auth.users(id, email, raw_user_meta_data) values
          ('${therapistA}', 'a@example.test', '{"full_name":"Therapist A"}'::jsonb),
          ('${therapistB}', 'b@example.test', '{"full_name":"Therapist B"}'::jsonb);
        insert into public.clients(id, user_id, display_name, reference) values
          ('${clientA}', '${therapistA}', 'Client A', 'CLIENT-A'),
          ('${clientB}', '${therapistB}', 'Client B', 'CLIENT-B');
      `)
    }
    await database.exec(await readFile(join(migrationDirectory, migration), 'utf8'))
  }

  await database.exec(`
    insert into public.sessions(id, user_id, client_id, occurred_at, status, notes, notes_status, workflow_status, version) values
      ('${sessionA}', '${therapistA}', '${clientA}', now(), 'in_progress', 'A draft', 'draft', 'no_further_action', 1),
      ('${sessionB}', '${therapistB}', '${clientB}', now(), 'in_progress', 'B draft', 'draft', 'no_further_action', 1);
    insert into public.session_working_notes(session_id, user_id, client_id, content) values
      ('${sessionA}', '${therapistA}', '${clientA}', '{"note":"A private working note"}'::jsonb),
      ('${sessionB}', '${therapistB}', '${clientB}', '{"note":"B private working note"}'::jsonb);
    insert into public.private_reflections(id, user_id, client_id, body) values
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '${therapistA}', '${clientA}', 'A reflection'),
      ('ffffffff-ffff-4fff-8fff-ffffffffffff', '${therapistB}', '${clientB}', 'B reflection');
    insert into public.client_care_items(id, therapist_id, client_id, kind, body) values
      ('10000000-0000-4000-8000-000000000001', '${therapistA}', '${clientA}', 'current_focus', 'A care item'),
      ('10000000-0000-4000-8000-000000000002', '${therapistB}', '${clientB}', 'current_focus', 'B care item');
    insert into public.documents(id, user_id, client_id, client_ref, client_name, title, document_type, status) values
      ('20000000-0000-4000-8000-000000000001', '${therapistA}', '${clientA}', 'CLIENT-A', 'Client A', 'A draft document', 'other', 'draft'),
      ('20000000-0000-4000-8000-000000000002', '${therapistB}', '${clientB}', 'CLIENT-B', 'Client B', 'B draft document', 'other', 'draft');
  `)

  await database.exec(`
    grant usage on schema public, auth to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    grant execute on function auth.uid() to authenticated;
  `)

  return database
}

async function asTherapistA(database) {
  await database.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${therapistA}', false);`)
}

async function visibleCount(database, table) {
  const result = await database.query(`select count(*)::integer as count from public.${table}`)
  return result.rows[0].count
}

test('therapist cannot read another therapist clinical rows through RLS', async () => {
  const database = await buildDatabase()
  try {
    await asTherapistA(database)
    for (const table of ['clients', 'sessions', 'session_working_notes', 'private_reflections', 'client_care_items', 'documents']) {
      assert.equal(await visibleCount(database, table), 1, `${table} should expose only Therapist A rows`)
    }

    const foreignClient = await database.query(`select id from public.clients where id = '${clientB}'`)
    const foreignSession = await database.query(`select id from public.sessions where id = '${sessionB}'`)
    assert.equal(foreignClient.rows.length, 0)
    assert.equal(foreignSession.rows.length, 0)
  } finally {
    await database.close()
  }
})

test('therapist cannot create rows owned by another therapist or attach work to another therapist client', async () => {
  const database = await buildDatabase()
  try {
    await asTherapistA(database)

    await assert.rejects(
      database.exec(`insert into public.clients(user_id, display_name) values('${therapistB}', 'Injected client')`),
      /row-level security policy/
    )
    await assert.rejects(
      database.exec(`insert into public.sessions(user_id, client_id, occurred_at) values('${therapistA}', '${clientB}', now())`),
      /row-level security policy/
    )
    await assert.rejects(
      database.exec(`insert into public.private_reflections(user_id, client_id, body) values('${therapistA}', '${clientB}', 'Cross-tenant reflection')`),
      /row-level security policy/
    )
    await assert.rejects(
      database.exec(`insert into public.client_care_items(therapist_id, client_id, kind, body) values('${therapistA}', '${clientB}', 'current_focus', 'Cross-tenant care')`),
      /row-level security policy/
    )
    await assert.rejects(
      database.exec(`insert into public.documents(user_id, client_id, title, document_type, status) values('${therapistA}', '${clientB}', 'Cross-tenant document', 'other', 'draft')`),
      /row-level security policy/
    )
  } finally {
    await database.close()
  }
})

test('therapist cannot mutate or delete another therapist rows', async () => {
  const database = await buildDatabase()
  try {
    await asTherapistA(database)

    const updateClient = await database.query(`update public.clients set display_name = 'Tampered' where id = '${clientB}' returning id`)
    const updateSession = await database.query(`update public.sessions set notes = 'Tampered' where id = '${sessionB}' returning id`)
    const deleteDocument = await database.query(`delete from public.documents where id = '20000000-0000-4000-8000-000000000002' returning id`)

    assert.equal(updateClient.rows.length, 0)
    assert.equal(updateSession.rows.length, 0)
    assert.equal(deleteDocument.rows.length, 0)
  } finally {
    await database.close()
  }
})

test('ownership-checking clinical RPC rejects another therapist session', async () => {
  const database = await buildDatabase()
  try {
    await asTherapistA(database)
    await assert.rejects(
      database.exec(`select public.complete_session('${sessionB}', 'Injected approved record', 1)`),
      /Session not found|not found|ownership|authorized/i
    )
  } finally {
    await database.close()
  }
})
