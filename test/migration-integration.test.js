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
          insert into public.clients (id, user_id, display_name, reference)
          values
            ('${clientOne}', '${userOne}', 'Client One', 'CLIENT-ONE'),
            ('${clientTwo}', '${userTwo}', 'Client Two', 'CLIENT-TWO');
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
    assert.equal(migrations.at(-1), '20260729161000_persist_clinical_record_amendments.sql')

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

    // A. Completed treatment plan
    const docA = 'f0000000-0000-4000-8000-00000000000a'
    await database.exec(`
      insert into public.documents (
        id, user_id, client_ref, client_name, title, document_type,
        storage_path, original_filename, mime_type, size_bytes, status
      )
      values (
        '${docA}', '${userOne}', 'CLIENT-ONE', 'Client One', 'Plan A', 'treatment_plan',
        'path/a', 'a.pdf', 'application/pdf', 100, 'completed'
      );
    `)
    const checkA = await database.query(`
      select event_type, subject_type, subject_id, client_id, user_id, summary
      from public.client_timeline_events where subject_id = '${docA}'
    `)
    assert.deepEqual(checkA.rows[0], {
      event_type: 'treatment_plan_updated',
      subject_type: 'document',
      subject_id: docA,
      client_id: clientOne,
      user_id: userOne,
      summary: 'Treatment plan completed: Plan A'
    })

    // B. Completed risk assessment
    const docB = 'f0000000-0000-4000-8000-00000000000b'
    await database.exec(`
      insert into public.documents (
        id, user_id, client_ref, client_name, title, document_type,
        storage_path, original_filename, mime_type, size_bytes, status
      )
      values (
        '${docB}', '${userOne}', 'CLIENT-ONE', 'Client One', 'Risk B', 'risk_assessment',
        'path/b', 'b.pdf', 'application/pdf', 100, 'completed'
      );
    `)
    const checkB = await database.query(`
      select event_type from public.client_timeline_events where subject_id = '${docB}'
    `)
    assert.equal(checkB.rows[0].event_type, 'risk_assessment_recorded')

    // C. Completed referral
    const docC = 'f0000000-0000-4000-8000-00000000000c'
    await database.exec(`
      insert into public.documents (
        id, user_id, client_ref, client_name, title, document_type,
        storage_path, original_filename, mime_type, size_bytes, status
      )
      values (
        '${docC}', '${userOne}', 'CLIENT-ONE', 'Client One', 'Ref C', 'referral',
        'path/c', 'c.pdf', 'application/pdf', 100, 'completed'
      );
    `)
    const checkC = await database.query(`
      select event_type from public.client_timeline_events where subject_id = '${docC}'
    `)
    assert.equal(checkC.rows[0].event_type, 'referral_recorded')

    // D. Other completed document
    const docD = 'f0000000-0000-4000-8000-00000000000d'
    await database.exec(`
      insert into public.documents (
        id, user_id, client_ref, client_name, title, document_type,
        storage_path, original_filename, mime_type, size_bytes, status
      )
      values (
        '${docD}', '${userOne}', 'CLIENT-ONE', 'Client One', 'Other D', 'other',
        'path/d', 'd.pdf', 'application/pdf', 100, 'completed'
      );
    `)
    const checkD = await database.query(`
      select event_type from public.client_timeline_events where subject_id = '${docD}'
    `)
    assert.equal(checkD.rows[0].event_type, 'clinical_milestone')

    // E. Draft document
    const docE = 'f0000000-0000-4000-8000-00000000000e'
    await database.exec(`
      insert into public.documents (
        id, user_id, client_ref, client_name, title, document_type,
        storage_path, original_filename, mime_type, size_bytes, status
      )
      values (
        '${docE}', '${userOne}', 'CLIENT-ONE', 'Client One', 'Draft E', 'other',
        'path/e', 'e.pdf', 'application/pdf', 100, 'draft'
      );
    `)
    const checkE = await database.query(`
      select count(*)::integer from public.client_timeline_events where subject_id = '${docE}'
    `)
    assert.equal(checkE.rows[0].count, 0)

    // F. Review-stage document
    const docF = 'f0000000-0000-4000-8000-00000000000f'
    await database.exec(`
      insert into public.documents (
        id, user_id, client_ref, client_name, title, document_type,
        storage_path, original_filename, mime_type, size_bytes, status
      )
      values (
        '${docF}', '${userOne}', 'CLIENT-ONE', 'Client One', 'Review F', 'other',
        'path/f', 'f.pdf', 'application/pdf', 100, 'review'
      );
    `)
    const checkF = await database.query(`
      select count(*)::integer from public.client_timeline_events where subject_id = '${docF}'
    `)
    assert.equal(checkF.rows[0].count, 0)

    // G. Draft to completed
    const docG = 'f0000000-0000-4000-8000-000000000010'
    await database.exec(`
      insert into public.documents (
        id, user_id, client_ref, client_name, title, document_type,
        storage_path, original_filename, mime_type, size_bytes, status
      )
      values (
        '${docG}', '${userOne}', 'CLIENT-ONE', 'Client One', 'Transition G', 'other',
        'path/g', 'g.pdf', 'application/pdf', 100, 'draft'
      );
      update public.documents set status = 'completed' where id = '${docG}';
    `)
    const checkG = await database.query(`
      select count(*)::integer from public.client_timeline_events where subject_id = '${docG}'
    `)
    assert.equal(checkG.rows[0].count, 1)

    // H. Completed document edited again
    await database.exec(`
      update public.documents set title = 'Updated G' where id = '${docG}';
    `)
    const checkH = await database.query(`
      select count(*)::integer from public.client_timeline_events where subject_id = '${docG}'
    `)
    assert.equal(checkH.rows[0].count, 1)

    // I. Tenant isolation
    const docI = 'f0000000-0000-4000-8000-000000000011'
    await database.exec(`
      insert into public.documents (
        id, user_id, client_ref, client_name, title, document_type,
        storage_path, original_filename, mime_type, size_bytes, status
      )
      values (
        '${docI}', '${userOne}', 'CLIENT-TWO', 'Client Two', 'Theft I', 'other',
        'path/i', 'i.pdf', 'application/pdf', 100, 'completed'
      );
    `)
    const checkI = await database.query(`
      select count(*)::integer from public.client_timeline_events where subject_id = '${docI}'
    `)
    assert.equal(checkI.rows[0].count, 0)

    // J. Missing client reference
    const docJ = 'f0000000-0000-4000-8000-000000000012'
    await database.exec(`
      insert into public.documents (
        id, user_id, client_ref, client_name, title, document_type,
        storage_path, original_filename, mime_type, size_bytes, status
      )
      values (
        '${docJ}', '${userOne}', 'UNKNOWN-REF', 'Ghost', 'Ghost J', 'other',
        'path/j', 'j.pdf', 'application/pdf', 100, 'completed'
      );
    `)
    const checkJ = await database.query(`
      select count(*)::integer from public.client_timeline_events where subject_id = '${docJ}'
    `)
    assert.equal(checkJ.rows[0].count, 0)

    // K. report_date
    const docK = 'f0000000-0000-4000-8000-000000000013'
    await database.exec(`
      insert into public.documents (
        id, user_id, client_ref, client_name, title, document_type, report_date,
        storage_path, original_filename, mime_type, size_bytes, status
      )
      values (
        '${docK}', '${userOne}', 'CLIENT-ONE', 'Client One', 'Backdated K', 'other', '2026-07-01',
        'path/k', 'k.pdf', 'application/pdf', 100, 'completed'
      );
    `)
    const checkK = await database.query(`
      select occurred_at from public.client_timeline_events where subject_id = '${docK}'
    `)
    assert.equal(new Date(checkK.rows[0].occurred_at).toISOString().split('T')[0], '2026-07-01')

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

    // Amendment Tests
    await database.exec(`reset role;`)
    await database.exec(`select set_config('request.jwt.claim.sub', '${userOne}', false);`)

    // 1. Owner can approve an amendment for their completed session
    const amendmentResult = await database.query(`
      select * from public.approve_clinical_record_amendment(
        '${sessionId}', 'Factual correction', 'Corrected content'
      )
    `)
    assert.ok(amendmentResult.rows[0].id)
    assert.equal(amendmentResult.rows[0].sequence_number, 1)
    assert.equal(amendmentResult.rows[0].reason, 'Factual correction')
    assert.equal(amendmentResult.rows[0].content, 'Corrected content')

    // 2. Original session notes remain unchanged
    const sessionNotesCheck = await database.query(`
      select notes from public.sessions where id = '${sessionId}'
    `)
    assert.equal(sessionNotesCheck.rows[0].notes, 'Approved note')

    // 3. Sequence numbers increment
    const secondAmendment = await database.query(`
      select * from public.approve_clinical_record_amendment(
        '${sessionId}', 'More context', 'Even more content'
      )
    `)
    assert.equal(secondAmendment.rows[0].sequence_number, 2)

    // 4. Blank reason fails
    await assert.rejects(database.exec(`
      select public.approve_clinical_record_amendment('${sessionId}', ' ', 'content')
    `), /Amendment reason is required/)

    // 5. Blank content fails
    await assert.rejects(database.exec(`
      select public.approve_clinical_record_amendment('${sessionId}', 'reason', '')
    `), /Amendment content is required/)

    // 6. Non-owner cannot approve an amendment
    await database.exec(`select set_config('request.jwt.claim.sub', '${userTwo}', false);`)
    await assert.rejects(database.exec(`
      select public.approve_clinical_record_amendment('${sessionId}', 'Steal', 'Content')
    `), /Session not found/)

    // 7. Amendment cannot be added to an incomplete session
    const draftSessionId = 'd1111111-1111-4111-8111-111111111111'
    await database.exec(`reset role;`) // Back to superuser for setup
    await database.exec(`
      insert into public.sessions (id, user_id, client_id, occurred_at, status, notes_status)
      values ('${draftSessionId}', '${userOne}', '${clientOne}', now(), 'in_progress', 'draft');
    `)
    await database.exec(`select set_config('request.jwt.claim.sub', '${userOne}', false);`)
    await assert.rejects(database.exec(`
      select public.approve_clinical_record_amendment('${draftSessionId}', 'Premature', 'Content')
    `), /Only approved clinical records can be amended/)

    // 8. RLS hides another therapist’s amendments
    await database.exec(`reset role; set role authenticated;`)
    await database.exec(`select set_config('request.jwt.claim.sub', '${userTwo}', false);`)
    const userTwoView = await database.query(`
      select count(*)::integer from public.clinical_record_amendments where session_id = '${sessionId}'
    `)
    assert.equal(userTwoView.rows[0].count, 0)

    // 9. Update fails (Immutability)
    await database.exec(`reset role;`)
    const amendmentId = amendmentResult.rows[0].id
    await assert.rejects(database.exec(`
      update public.clinical_record_amendments set reason = 'Changed' where id = '${amendmentId}'
    `), /Approved clinical record amendments are immutable/)

    // 10. Delete fails (Immutability)
    await assert.rejects(database.exec(`
      delete from public.clinical_record_amendments where id = '${amendmentId}'
    `), /Approved clinical record amendments are immutable/)

    await database.exec('reset role;')
  } finally {
    await database.close()
  }
})
