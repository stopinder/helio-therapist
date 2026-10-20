import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

// Disposable, entirely in-memory PostgreSQL. No Supabase project or customer data is contacted.
const migrationDirectory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url))
const therapistA = '11111111-1111-4111-8111-111111111111'
const therapistB = '22222222-2222-4222-8222-222222222222'
const clientA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const clientB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const completedDocument = 'd0000000-0000-4000-8000-000000000001'
const draftDocument = 'd0000000-0000-4000-8000-000000000002'
const protectedObject = 'e0000000-0000-4000-8000-000000000001'
const tempObject = 'e0000000-0000-4000-8000-000000000002'
const foreignObject = 'e0000000-0000-4000-8000-000000000003'
const draftObject = 'e0000000-0000-4000-8000-000000000004'
const resource = 'f0000000-0000-4000-8000-000000000001'
const published = 'f0000000-0000-4000-8000-000000000002'
const workingVersion = 'f0000000-0000-4000-8000-000000000003'
const deletableDraftVersion = 'f0000000-0000-4000-8000-000000000004'
const ownFile = `${therapistA}/${completedDocument}/approved.pdf`
const workingFile = `${therapistA}/tmp/working.pdf`
const otherFile = `${therapistB}/tmp/foreign.pdf`

async function createDisposableDatabase() {
  const db = new PGlite()
  await db.waitReady
  await db.exec(`
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
      id text primary key, name text not null, public boolean not null default false,
      file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects(
      id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null
    );
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select case when name is null or name = '' then array[]::text[]
      else string_to_array(trim(both '/' from name), '/') end
    $$;
  `)

  const migrationNames = (await readdir(migrationDirectory)).filter(name => name.endsWith('.sql')).sort()
  const expectedMigrations = [
    'block_direct_completed_session_inserts',
    'protect_finalised_document_storage',
    'freeze_published_resource_versions'
  ]
  for (const label of expectedMigrations) {
    assert.equal(migrationNames.filter(name => name.endsWith(`_${label}.sql`)).length, 1,
      `Expected exactly one migration for ${label}`)
  }
  for (const migration of migrationNames) {
    // Existing clinical-timeline migration requires clients before the backfill.
    if (migration === '20260722193000_refine_clinical_timeline_events.sql') {
      await db.exec(`
        insert into auth.users(id, email) values
          ('${therapistA}', 'a@example.invalid'),
          ('${therapistB}', 'b@example.invalid');
        insert into public.clients(id, user_id, display_name, reference) values
          ('${clientA}', '${therapistA}', 'Test Client A', 'A-TEST'),
          ('${clientB}', '${therapistB}', 'Test Client B', 'B-TEST');
      `)
    }
    await db.exec(await readFile(join(migrationDirectory, migration), 'utf8'))
  }

  await db.exec(`
    -- Model Supabase Storage's RLS-enforced storage.objects table.
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;
    grant execute on function auth.uid() to authenticated;
    grant execute on function storage.foldername(text) to authenticated;

    insert into public.documents(id, user_id, client_id, client_ref, client_name, title, status, finalized_at, storage_path)
    values
      ('${completedDocument}', '${therapistA}', '${clientA}', 'A-TEST', 'Test Client A', 'Approved document', 'completed', now(), '${ownFile}'),
      ('${draftDocument}', '${therapistA}', '${clientA}', 'A-TEST', 'Test Client A', 'Working document', 'draft', null, '${therapistA}/tmp/draft.pdf');

    insert into storage.objects(id, bucket_id, name) values
      ('${protectedObject}', 'client-documents', '${ownFile}'),
      ('${tempObject}', 'client-documents', '${workingFile}'),
      ('${foreignObject}', 'client-documents', '${otherFile}'),
      ('${draftObject}', 'client-documents', '${therapistA}/tmp/draft.pdf');

    insert into public.resource_library_items(
      id, user_id, title, resource_kind, content_type
    ) values ('${resource}', '${therapistA}', 'Clinical questionnaire', 'outcome_measure', 'form');

    insert into public.resource_versions(
      id, resource_id, user_id, version_number, completion_mode, client_title,
      form_definition, published_at
    ) values
      ('${published}', '${resource}', '${therapistA}', 1, 'complete_in_helio', 'Published v1', '{}'::jsonb, now()),
      ('${workingVersion}', '${resource}', '${therapistA}', 2, 'complete_in_helio', 'Working v2', '{}'::jsonb, null),
      ('${deletableDraftVersion}', '${resource}', '${therapistA}', 3, 'complete_in_helio', 'Unpublished v3', '{}'::jsonb, null);
  `)
  return db
}

const database = await createDisposableDatabase()
after(async () => { await database.close() })

async function asTherapistA() {
  await database.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${therapistA}', false)`)
}
async function asAdministrator() {
  await database.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`)
}

test('completed sessions cannot be inserted directly, but normal drafts are allowed', async () => {
  await asTherapistA()
  try {
    await assert.rejects(
      database.exec(`insert into public.sessions(user_id, client_id, status)
        values ('${therapistA}', '${clientA}', 'completed')`),
      /complete_session|must begin in progress/i
    )
    await assert.rejects(
      database.exec(`insert into public.sessions(user_id, client_id, status, completed_at)
        values ('${therapistA}', '${clientA}', 'in_progress', now())`),
      /complete_session|must begin in progress/i
    )
    const normal = await database.query(`insert into public.sessions(user_id, client_id, status)
      values ('${therapistA}', '${clientA}', 'in_progress') returning id`)
    assert.equal(normal.rows.length, 1)
  } finally {
    await asAdministrator()
  }
  const state = await database.query(`select status, completed_at from public.sessions where user_id='${therapistA}'`)
  assert.ok(state.rows.every(row => row.status === 'in_progress' && row.completed_at === null))
})

test('finalised document files cannot be modified or deleted, while temporary files remain manageable', async () => {
  await asTherapistA()
  try {
    const changed = await database.query(`update storage.objects set name='${therapistA}/tmp/altered.pdf'
      where id='${protectedObject}' returning id`)
    assert.equal(changed.rows.length, 0)
    const deleted = await database.query(`delete from storage.objects where id='${protectedObject}' returning id`)
    assert.equal(deleted.rows.length, 0)

    const moved = await database.query(`update storage.objects set name='${therapistA}/tmp/renamed.pdf'
      where id='${tempObject}' returning id`)
    assert.equal(moved.rows.length, 1)
    const removed = await database.query(`delete from storage.objects where id='${tempObject}' returning id`)
    assert.equal(removed.rows.length, 1)
    const draftMoved = await database.query(`update storage.objects
      set name='${therapistA}/tmp/draft-renamed.pdf'
      where id='${draftObject}' returning id`)
    assert.equal(draftMoved.rows.length, 1)
    const draftDeleted = await database.query(`delete from storage.objects
      where id='${draftObject}' returning id`)
    assert.equal(draftDeleted.rows.length, 1)
    const foreign = await database.query(`delete from storage.objects where id='${foreignObject}' returning id`)
    assert.equal(foreign.rows.length, 0)
  } finally {
    await asAdministrator()
  }
  const protectedRow = await database.query(`select name from storage.objects where id='${protectedObject}'`)
  assert.equal(protectedRow.rows[0]?.name, ownFile)
  const tempRow = await database.query(`select count(*)::integer as count from storage.objects where id='${tempObject}'`)
  assert.equal(tempRow.rows[0].count, 0)
})

test('published resource versions reject edits and deletion; working versions remain editable', async () => {
  await asTherapistA()
  try {
    await assert.rejects(
      database.exec(`update public.resource_versions set client_title='Tampered' where id='${published}'`),
      /published resource versions are immutable/i
    )
    await assert.rejects(
      database.exec(`delete from public.resource_versions where id='${published}'`),
      /published resource versions are immutable/i
    )
    const deletedDraft = await database.query(`delete from public.resource_versions
      where id='${deletableDraftVersion}' returning id`)
    assert.equal(deletedDraft.rows.length, 1)
    const editedDraft = await database.query(`update public.resource_versions
      set client_title='Updated draft' where id='${workingVersion}' returning client_title`)
    assert.equal(editedDraft.rows[0]?.client_title, 'Updated draft')
    const publishedDraft = await database.query(`update public.resource_versions
      set published_at=now() where id='${workingVersion}' returning published_at`)
    assert.equal(publishedDraft.rows.length, 1)
    await assert.rejects(
      database.exec(`update public.resource_versions set client_title='Changed post-publication'
        where id='${workingVersion}'`),
      /published resource versions are immutable/i
    )
  } finally {
    await asAdministrator()
  }
  const original = await database.query(`select client_title from public.resource_versions where id='${published}'`)
  assert.equal(original.rows[0]?.client_title, 'Published v1')
})
