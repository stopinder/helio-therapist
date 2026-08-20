import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('working notes are durable, therapist-owned and bound to the matching session/client', async () => {
  const [library, baseMigration, concurrencyMigration] = await Promise.all([
    read('src/lib/workingNotes.js'),
    read('supabase/migrations/20260812085247_add_session_working_notes.sql'),
    read('supabase/migrations/20260816083523_add_working_notes_concurrency.sql')
  ])
  assert.match(library, /from\('session_working_notes'\)/)
  assert.match(library, /\.eq\('session_id', sessionId\)/)
  assert.match(library, /\.eq\('client_id', clientId\)/)
  assert.match(library, /rpc\('save_session_working_notes'/)
  assert.match(library, /p_expected_version: expectedVersion/)
  assert.match(baseMigration, /alter table public\.session_working_notes enable row level security/)
  assert.match(baseMigration, /user_id = \(select auth\.uid\(\)\)/)
  assert.match(baseMigration, /session\.id = session_working_notes\.session_id/)
  assert.match(baseMigration, /session\.client_id = session_working_notes\.client_id/)
  assert.match(concurrencyMigration, /security invoker/)
  assert.match(concurrencyMigration, /session\.user_id = auth\.uid\(\)/)
})

test('clinical draft and completion use optimistic concurrency and one transactional completion boundary', async () => {
  const [sessions, migration] = await Promise.all([read('src/lib/sessions.js'), read('supabase/migrations/20260726113823_sprint_one_hardening.sql')])
  assert.match(sessions, /rpc\('save_session_draft'/); assert.match(sessions, /rpc\('complete_session'/); assert.match(sessions, /p_expected_version: session\.version/); assert.match(sessions, /error\?\.code === '40001'/); assert.match(sessions, /conflict\.code = 'SESSION_CONFLICT'/)
  assert.match(migration, /create or replace function public\.complete_session/); assert.match(migration, /client_timeline_events_session_completion_unique/); assert.match(migration, /on conflict \(session_id\) where event_type = 'session_completed'/)
})

test('clinical record draft dictation stays editable and uses the authenticated transient transcription path', async () => {
  const clinicalSummary = await read('src/components/workspace/ClinicalSummaryTab.vue')
  assert.match(clinicalSummary, /navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\)/)
  assert.match(clinicalSummary, /authenticatedFetch\('\/api\/ai\/transcribe'/)
  assert.match(clinicalSummary, /summaryData\[key\] = \[summaryData\[key\]\.trim\(\), text\]/)
  assert.match(clinicalSummary, /v-if="status === 'draft'" class="flex items-center justify-between gap-3"/)
  assert.match(clinicalSummary, /Dictation adds editable draft text for you to review before approval\./)
  assert.match(clinicalSummary, /if \(submitting\.value \|\| activeDictationKey\.value \|\| transcribingKey\.value\) return/)
  assert.doesNotMatch(clinicalSummary, /audio_storage|upload.*audio|from\('.*audio/i)
})

test('clinical summary preparation reports real session source availability without fake checkboxes', async () => {
  const [clinicalSummary, workspace] = await Promise.all([
    read('src/components/workspace/ClinicalSummaryTab.vue'),
    read('src/views/SessionWorkspace.vue')
  ])
  assert.match(clinicalSummary, /getSessionWorkingNotes/)
  assert.match(clinicalSummary, /getPrivateReflection/)
  assert.match(clinicalSummary, /workspaceReflectionBody/)
  assert.match(clinicalSummary, /Boolean\(props\.transcript\?\.text\?\.trim\?\.\(\)\)/)
  assert.match(clinicalSummary, /Therapist reflection is private working material\. Helio reports only whether it exists here/)
  assert.doesNotMatch(clinicalSummary, /Client Feedback/)
  assert.doesNotMatch(clinicalSummary, /Source Material Checklist/)
  assert.doesNotMatch(clinicalSummary, /item\.available \? '✓'/)
  assert.match(workspace, /:transcript="transcript"/)
  assert.match(workspace, /:transcriptLoading="transcriptLoading"/)
  assert.match(workspace, /:transcriptError="transcriptError"/)
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