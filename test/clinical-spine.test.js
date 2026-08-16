import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('working notes are durable, therapist-owned and bound to the matching session/client', async () => {
  const [library, migration] = await Promise.all([read('src/lib/workingNotes.js'), read('supabase/migrations/20260812080000_add_session_working_notes.sql')])
  assert.match(library, /from\('session_working_notes'\)/); assert.match(library, /\.eq\('session_id', sessionId\)/); assert.match(library, /\.eq\('client_id', clientId\)/); assert.match(library, /user_id: auth\.user\.id/); assert.match(library, /upsert\(payload, \{ onConflict: 'session_id' \}\)/)
  assert.match(migration, /alter table public\.session_working_notes enable row level security/); assert.match(migration, /user_id = \(select auth\.uid\(\)\)/); assert.match(migration, /session\.id = session_working_notes\.session_id/); assert.match(migration, /session\.client_id = session_working_notes\.client_id/)
})

test('clinical draft and completion use optimistic concurrency and one transactional completion boundary', async () => {
  const [sessions, migration] = await Promise.all([read('src/lib/sessions.js'), read('supabase/migrations/20260726113823_sprint_one_hardening.sql')])
  assert.match(sessions, /rpc\('save_session_draft'/); assert.match(sessions, /rpc\('complete_session'/); assert.match(sessions, /p_expected_version: session\.version/); assert.match(sessions, /error\?\.code === '40001'/); assert.match(sessions, /conflict\.code = 'SESSION_CONFLICT'/)
  assert.match(migration, /create or replace function public\.complete_session/); assert.match(migration, /client_timeline_events_session_completion_unique/); assert.match(migration, /on conflict \(session_id\) where event_type = 'session_completed'/)
})

test('completed clinical record is rendered read-only and corrections are amendments', async () => {
  const clinicalSummary = await read('src/components/workspace/ClinicalSummaryTab.vue')
  assert.match(clinicalSummary, /This approved record is read-only\. Corrections must be added through an amendment\./); assert.match(clinicalSummary, /<ApprovedClinicalRecordView/); assert.match(clinicalSummary, /Create Record Amendment/); assert.match(clinicalSummary, /completeSessionRecord/)
})

test('approved amendments use the immutable backend and reload for completed records', async () => {
  const [service, completedRecord, workspace] = await Promise.all([read('src/lib/clinicalRecordAmendments.js'), read('src/components/workspace/CompletedClinicalRecord.vue'), read('src/views/SessionWorkspace.vue')])
  assert.match(service, /from\('clinical_record_amendments'\)/)
  assert.match(service, /\.eq\('session_id', sessionId\)/)
  assert.match(service, /rpc\('approve_clinical_record_amendment'/)
  assert.match(completedRecord, /listClinicalRecordAmendments\(props\.session\.id\)/)
  assert.match(completedRecord, /approveClinicalRecordAmendment\(props\.session\.id/)
  assert.match(completedRecord, /The approved record above will not be changed/)
  assert.doesNotMatch(completedRecord, /Robert Ormiston \(Mock\)/)
  assert.match(workspace, /session\.status === 'completed'/)
  assert.match(workspace, /<CompletedClinicalRecord/)
})

test('workspace remounts the clinical record when approval changes the session to completed', async () => {
  const workspace = await read('src/views/SessionWorkspace.vue')
  assert.match(workspace, /:key="clinicalRecordKey"/); assert.match(workspace, /@update:session="handleSessionUpdate"/); assert.match(workspace, /updatedSession\?\.status==='completed'/); assert.match(workspace, /clinicalRecordKey\.value\+=1/)
})
