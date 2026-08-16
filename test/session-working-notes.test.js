import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { emptyWorkingNotes, normalizeWorkingNotes } from '../src/lib/workingNotes.js'
import { emptyWorkspaceReflection, normalizeWorkspaceReflection, workspaceReflectionBody } from '../src/lib/reflections.js'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('working notes normalize only supported string fields', () => {
  assert.deepEqual(normalizeWorkingNotes({ observations: 'Observed', interventions: 42, extra: 'ignore' }), {
    observations: 'Observed', interventions: '', themes: '', followUp: ''
  })
  assert.deepEqual(normalizeWorkingNotes(null), emptyWorkingNotes())
})

test('working notes use versioned RPC persistence and surface stale-save conflicts', async () => {
  const service = await read('../src/lib/workingNotes.js')
  const component = await read('../src/components/workspace/TherapistNotesTab.vue')
  const migration = await read('../supabase/migrations/20260816103000_add_working_notes_concurrency.sql')

  assert.match(migration, /add column if not exists version integer not null default 1/)
  assert.match(migration, /save_session_working_notes/)
  assert.match(migration, /for update/)
  assert.match(migration, /current_record\.version <> p_expected_version/)
  assert.match(migration, /errcode = '40001'/)
  assert.match(service, /select\('session_id,client_id,content,updated_at,version'\)/)
  assert.match(service, /rpc\('save_session_working_notes'/)
  assert.match(service, /p_expected_version: expectedVersion/)
  assert.match(service, /WORKING_NOTES_CONFLICT/)
  assert.match(component, /expectedVersion: version\.value/)
  assert.match(component, /changed in another tab/)
})

test('workspace reflection remains structured while body stays readable', () => {
  const content = normalizeWorkspaceReflection({ stoodOut: 'A key moment', supervisionQuestions: 'What next?', unknown: 'ignore' })
  assert.deepEqual(content, { ...emptyWorkspaceReflection(), stoodOut: 'A key moment', supervisionQuestions: 'What next?' })
  assert.equal(workspaceReflectionBody(content), 'A key moment\n\nWhat next?')
})
