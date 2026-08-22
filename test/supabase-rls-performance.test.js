import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(
  new URL('../supabase/migrations/20260822201500_optimize_rls_and_active_foreign_keys.sql', import.meta.url),
  'utf8'
)

test('RLS optimization preserves the existing ownership policy set', () => {
  for (const policy of [
    'Users manage own appointments',
    'Users can view own documents',
    'Users can insert own documents',
    'Users can update own documents',
    'Users can delete own working documents',
    'therapists read own care revisions',
    'Therapists can manage their own follow-ups',
    'Therapists can manage their own reminders'
  ]) {
    assert.match(migration, new RegExp(`alter policy "${policy}"`))
  }

  assert.match(migration, /status in \('draft', 'review'\)/)
  assert.match(migration, /c\.id = documents\.client_id/)
  assert.match(migration, /clients\.id = client_follow_ups\.client_id/)
})

test('optimized policies use init-plan friendly authenticated identity checks', () => {
  assert.doesNotMatch(migration, /(?<!select )auth\.uid\(\)/)
  assert.ok((migration.match(/select auth\.uid\(\)/g) || []).length >= 10)
})

test('migration adds only the focused active foreign-key indexes', () => {
  for (const index of [
    'client_care_item_revisions_therapist_idx',
    'client_care_items_provenance_session_idx',
    'client_care_items_therapist_idx',
    'client_follow_ups_therapist_idx',
    'clinical_record_amendments_approved_by_idx'
  ]) {
    assert.match(migration, new RegExp(`create index if not exists ${index}`))
  }

  assert.doesNotMatch(migration, /drop index/i)
  assert.doesNotMatch(migration, /create index if not exists documents_client_id_idx/i)
})
