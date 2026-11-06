import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const inbox = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
const api = await readFile(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')
const migration = await readFile(new URL('../supabase/migrations/20261028114500_transcript_source_ready_encounters.sql', import.meta.url), 'utf8')

test('Transcript Inbox makes encounter date explicit and editable before assignment', () => {
  assert.match(inbox, /Encounter: \{\{ formatDate\(transcript\.sourceOccurredAt \|\| transcript\.receivedAt\) \}\}/)
  assert.match(inbox, />Encounter date<\/label>/)
  assert.match(inbox, /type="date"/)
  assert.match(inbox, /This date controls longitudinal ordering and becomes the session date when assigned\./)
  assert.match(inbox, /@click="saveEncounterDate\(transcript\)"/)
  assert.match(inbox, /Save date/)
})

test('all assignment paths save a changed encounter date before the assignment PATCH', () => {
  const shared = inbox.split('async function assignTranscriptToClient')[1].split('async function assignFromInbox')[0]
  assert.match(shared, /encounterDateChanged\(current\)/)
  assert.ok(shared.indexOf('saveEncounterDate(current') < shared.indexOf('authenticatedFetch'))
  assert.match(shared, /expectedUpdatedAt:current\.updatedAt/)
  assert.match(shared, /if\(!current\)return null/)
})

test('new-client and detail assignment reuse the corrected-date transaction', () => {
  assert.match(inbox, /assignTranscriptToClient\(transcript,newClient\.id/)
  assert.match(inbox, /assignTranscriptToClient\(selected\.value,selectedClientId\.value/)
})

test('encounter date can only be changed on untouched unassigned transcripts', () => {
  assert.match(api, /existing\.status !== 'unassigned'/)
  assert.match(api, /existing\.client_id !== null/)
  assert.match(api, /existing\.session_ref !== null/)
  assert.match(api, /existing\.review_choices_saved_at !== null/)
  assert.match(api, /The encounter date can only be changed before this transcript is assigned or reviewed\./)
})

test('encounter date update cannot be combined with assignment or review mutations', () => {
  assert.match(api, /sourceOccurredAt !== undefined && \([\s\S]*clientId !== undefined[\s\S]*clearAttention !== undefined[\s\S]*Update the encounter date before assigning or changing this transcript\./)
  assert.match(api, /update\.source_occurred_at = new Date\(sourceOccurredAt\)\.toISOString\(\)/)
})

test('assignment RPC uses source_occurred_at as sessions.occurred_at', () => {
  assert.match(migration, /coalesce\(current_transcript\.source_occurred_at, current_transcript\.received_at, now\(\)\)/)
  assert.match(migration, /insert into public\.sessions[\s\S]*occurred_at[\s\S]*coalesce\(current_transcript\.source_occurred_at, current_transcript\.received_at, now\(\)\)/)
})
