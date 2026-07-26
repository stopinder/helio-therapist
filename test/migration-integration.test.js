import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const migrationDirectory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url))
const userOne = '11111111-1111-4111-8111-111111111111'
const userTwo = '22222222-2222-4222-8222-222222222222'
const clientOne = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const clientTwo = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

test('the full migration chain preserves clinical invariants', async () => {
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
        email text,
        raw_user_meta_data jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );
      create function auth.uid()
      returns uuid
      language sql
      stable
      as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;

      create schema storage;
      create table storage.buckets (
        id text primary key,
        name text not null,
        public boolean not null default false,
        file_size_limit bigint,
        allowed_mime_types text[]
      );
    `)

    const migrations = (await readdir(migrationDirectory))
      .filter(name => name.endsWith('.sql'))
      .sort()

    for (const migration of migrations) {
      if (migration === '20260722193000_refine_clinical_timeline_events.sql') {
        await database.exec(`
          insert into auth.users (id, raw_user_meta_data)
          values
            ('${userOne}', '{"full_name":"One"}'::jsonb),
            ('${userTwo}', '{"full_name":"Two"}'::jsonb);
          insert into public.clients (id, user_id, display_name)
          values
            ('${clientOne}', '${userOne}', 'Client One'),
            ('${clientTwo}', '${userTwo}', 'Client Two');
          insert into public.client_timeline_events (
            user_id, client_id, event_type, subject_type, subject_id, summary
          )
          values (
            '${userOne}', '${clientOne}', 'resource_sent', 'assignment',
            'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Legacy workflow event'
          );
        `)
      }
      await database.exec(await readFile(join(migrationDirectory, migration), 'utf8'))
    }

    assert.equal(migrations[0], '20260717120000_bootstrap_legacy_integrations.sql')
    assert.equal(migrations.at(-1), '20260726125500_remove_duplicate_timeline_index.sql')

    const integrationsColumns = await database.query(`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'integrations'
      order by ordinal_position
    `)
    assert.deepEqual(integrationsColumns.rows.map(column => column.column_name), [
      'id',
      'user_id',
      'provider',
      'provider_user_id',
      'provider_email',
      'access_token',
      'refresh_token',
      'expires_at',
      'connected_at',
      'updated_at',
      'token_type',
      'scope',
      'encrypted_access_token',
      'encrypted_refresh_token',
      'provider_account_id',
      'last_synced_at'
    ])

    const timelineIndexes = await database.query(`
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'client_timeline_events'
        and indexname in (
          'client_timeline_events_client_time_idx',
          'client_timeline_events_client_occurred_idx'
        )
      order by indexname
    `)
    assert.deepEqual(timelineIndexes.rows, [
      { indexname: 'client_timeline_events_client_time_idx' }
    ])

    await database.exec(`select set_config('request.jwt.claim.sub', '${userOne}', false);`)

    const sessionId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    await database.exec(`
      insert into public.sessions (
        id, user_id, client_id, occurred_at, status, notes, notes_status,
        workflow_status, version
      )
      values (
        '${sessionId}', '${userOne}', '${clientOne}', now(), 'in_progress',
        'Draft', 'draft', 'no_further_action', 1
      );
      select public.complete_session('${sessionId}', 'Approved note', 1);
      select public.complete_session('${sessionId}', 'Approved note', 1);
    `)

    const sessionCheck = await database.query(`
      select
        (select status from public.sessions where id = '${sessionId}') as status,
        (select count(*)::integer from public.client_timeline_events
          where session_id = '${sessionId}' and event_type = 'session_completed') as timeline_count,
        (select count(*)::integer from public.client_timeline_events
          where event_type = 'resource_sent') as retained_legacy_events
    `)
    assert.deepEqual(sessionCheck.rows[0], {
      status: 'completed',
      timeline_count: 1,
      retained_legacy_events: 1
    })

    const reflectionId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    await database.exec(`
      insert into public.private_reflections (id, user_id, body)
      values ('${reflectionId}', '${userOne}', '');
      select public.save_reflection_supervision_summary(
        '${reflectionId}', 'Generated', 'Edited', 'test-model', 'v1', now()
      );
      select public.save_reflection_supervision_summary(
        '${reflectionId}', 'Generated again', 'Edited again', 'test-model', 'v1', now()
      );
    `)
    const summaryCheck = await database.query(`
      select generation_status, count(*)::integer as rows
      from public.reflection_supervision_summaries
      where reflection_id = '${reflectionId}'
      group by generation_status
      order by generation_status
    `)
    assert.deepEqual(summaryCheck.rows, [
      { generation_status: 'saved', rows: 1 },
      { generation_status: 'superseded', rows: 1 }
    ])

    const resourceResult = await database.query(`
      select public.create_resource_with_version(
        '${userOne}', 'PHQ-9', 'outcome_measure', 'worksheet', 'outcome_measure',
        'client', 'Test measure', 'complete_in_helio',
        '{"kind":"phq9"}'::jsonb, '{"calculation":"sum"}'::jsonb, now()
      ) as result
    `)
    const versionId = resourceResult.rows[0].result.version.id
    const requestResult = await database.query(`
      select public.create_client_request_with_items(
        '${userOne}', '${clientOne}', array['${versionId}'::uuid],
        array['test-token-hash'], 'Complete this', null, 'test-idempotency',
        now() + interval '1 day'
      ) as result
    `)
    const assignmentId = requestResult.rows[0].result.assignments[0].id
    await database.exec(`
      select public.submit_client_completion(
        '${assignmentId}', '{"q1":1}'::jsonb, '{"total":1}'::jsonb, 'test-v1', now()
      );
    `)
    const completionCheck = await database.query(`
      select
        (select count(*)::integer from public.client_resource_responses
          where assignment_id = '${assignmentId}') as responses,
        (select count(*)::integer from public.outcome_measure_results
          where assignment_id = '${assignmentId}') as results,
        (select count(*)::integer from public.client_timeline_events
          where client_request_item_id = '${assignmentId}'
            and event_type = 'outcome_measure_recorded') as timeline_events
    `)
    assert.deepEqual(completionCheck.rows[0], {
      responses: 1,
      results: 1,
      timeline_events: 1
    })

    await database.exec(`
      insert into public.resource_library_items (
        id, user_id, title, resource_kind, content_type, category, audience, description
      )
      values (
        'ffffffff-ffff-4fff-8fff-ffffffffffff', '${userTwo}', 'Other tenant resource',
        'worksheet', 'worksheet', 'worksheet', 'client', ''
      );
      grant usage on schema public, auth to authenticated;
      grant select, insert, update, delete on all tables in schema public to authenticated;
      grant execute on function auth.uid() to authenticated;
      set role authenticated;
      select set_config('request.jwt.claim.sub', '${userOne}', false);
    `)
    await assert.rejects(database.exec(`
      insert into public.resource_versions (
        resource_id, user_id, version_number, completion_mode,
        client_title, client_description
      )
      values (
        'ffffffff-ffff-4fff-8fff-ffffffffffff', '${userOne}', 99,
        'read_only', 'Cross tenant', ''
      );
    `), /row-level security policy/)
    await database.exec('reset role;')
  } finally {
    await database.close()
  }
})
