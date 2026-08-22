import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const migrationPath = 'supabase/migrations/20260822194500_harden_function_execution_grants.sql'

test('therapist-facing helper RPCs are not executable anonymously', async () => {
  const migration = await read(migrationPath)

  for (const signature of [
    'create_sample_workspace\\(\\)',
    'delete_sample_client\\(uuid\\)',
    'revise_client_care_item\\(uuid, text, text, text, text\\)',
    'save_session_working_notes\\(uuid, uuid, jsonb, integer\\)'
  ]) {
    assert.match(migration, new RegExp(`revoke execute on function public\\.${signature} from public`))
    assert.match(migration, new RegExp(`revoke execute on function public\\.${signature} from anon`))
    assert.match(migration, new RegExp(`grant execute on function public\\.${signature} to authenticated, service_role`))
  }
})

test('trigger-only helpers cannot be invoked directly by browser roles', async () => {
  const migration = await read(migrationPath)

  for (const name of [
    'enforce_billing_revision_append_only',
    'enforce_session_immutability',
    'enforce_work_segment_immutability',
    'handle_updated_at',
    'prevent_clinical_record_amendment_changes',
    'prevent_completed_session_deletion',
    'reject_archived_client_new_work',
    'set_client_care_item_updated_at'
  ]) {
    assert.match(migration, new RegExp(`revoke execute on function public\\.${name}\\(\\) from public, anon, authenticated`))
  }
})

test('generic updated-at trigger has a fixed search path', async () => {
  const migration = await read(migrationPath)
  assert.match(migration, /alter function public\.handle_updated_at\(\) set search_path = ''/)
})

test('hardening does not revoke the intentional authenticated clinical workflow RPCs', async () => {
  const migration = await read(migrationPath)

  for (const name of [
    'approve_clinical_record_amendment',
    'complete_session',
    'confirm_session_billable_time',
    'get_session_work_summary',
    'pause_session_work',
    'start_session_work'
  ]) {
    assert.doesNotMatch(migration, new RegExp(`revoke execute on function public\\.${name}[^\\n]*from authenticated`))
  }
})
