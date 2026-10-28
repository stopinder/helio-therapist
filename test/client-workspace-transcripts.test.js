import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const workspaceSource = fs.readFileSync(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
const panelSource = fs.readFileSync(new URL('../src/components/workspace/ClientTranscriptsPanel.vue', import.meta.url), 'utf8')
const transcriptsViewSource = fs.readFileSync(new URL('../src/views/Transcripts.vue', import.meta.url), 'utf8')
const transcriptInboxSource = fs.readFileSync(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
const apiSource = fs.readFileSync(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')

test('client workspace exposes a real transcripts section', () => {
  assert.match(workspaceSource, /ClientTranscriptsPanel/)
  assert.match(workspaceSource, /:client-id="String\(route\.params\.clientId\)"/)
})

test('client transcript panel only renders transcripts assigned to the current client', () => {
  assert.match(panelSource, /String\(item\.clientId \|\| ''\) === String\(props\.clientId\)/)
  assert.match(panelSource, /clientTranscripts/)
  assert.match(panelSource, /No transcripts are assigned to this client\./)
  assert.match(panelSource, /Original transcript · unchanged source/)
})

test('Transcript Inbox only requires client assignment', () => {
  assert.match(transcriptInboxSource, /Assign client/)
  assert.match(transcriptInboxSource, /clearAttention:true/)
  assert.match(transcriptInboxSource, /Session linking is optional and can be done there\./)
  assert.doesNotMatch(transcriptInboxSource, /<h2>Session<\/h2>/)
  assert.doesNotMatch(transcriptInboxSource, /Link to an existing encounter instead/)
  assert.doesNotMatch(transcriptInboxSource, /Sessions must begin in progress/)
})

test('client workspace links sessions inline without returning to Transcript Inbox', () => {
  assert.match(panelSource, /Session link/)
  assert.match(panelSource, /\(optional\)/)
  assert.match(panelSource, /An in-progress session is a valid link\./)
  assert.match(panelSource, /method: 'PATCH'/)
  assert.match(panelSource, /expectedUpdatedAt: transcript\.updatedAt/)
  assert.match(panelSource, /sessionRef/)
  assert.match(panelSource, /Link session/)
  assert.match(panelSource, /Change session/)
  assert.doesNotMatch(panelSource, /query: \{ transcript: transcript\.id/)
})

test('in-progress sessions are valid and prioritised in the inline picker', () => {
  assert.match(panelSource, /a\.status === 'in_progress'/)
  assert.match(panelSource, /b\.status === 'in_progress'/)
  assert.match(panelSource, /In progress ·/)
  assert.match(apiSource, /\.eq\('id', ref\)\.eq\('client_id', effectiveClientId\)\.eq\('user_id', user\.id\)/)
  assert.doesNotMatch(apiSource, /validateSession[\s\S]*?\.eq\('status', 'completed'\)/)
})

test('client transcript inbox navigation still preserves a return to the client transcripts tab', () => {
  assert.match(panelSource, /returnClientId: props\.clientId/)
  assert.match(transcriptsViewSource, /route\.query\.returnClientId/)
  assert.match(transcriptsViewSource, /name:\s*'ClientWorkspace'/)
  assert.match(transcriptsViewSource, /query:\s*\{\s*tab:\s*'Transcripts'\s*\}/)
  assert.match(transcriptsViewSource, /Back to client transcripts/)
})

test('transcript assignment can clear Needs attention in the same PATCH', () => {
  assert.match(apiSource, /clearAttention/)
  assert.match(apiSource, /update\.attention_cleared_at = new Date\(\)\.toISOString\(\)/)
  assert.match(transcriptInboxSource, /clientId:selectedClientId\.value,clearAttention:true/)
})

test('client transcript workflow preserves authenticated therapist ownership boundaries', () => {
  assert.match(panelSource, /authenticatedFetch\('\/api\/zoom\/transcripts'/)
  assert.match(apiSource, /requireAuthenticatedUser\(req\)/)
  assert.match(apiSource, /\.eq\('therapist_user_id', user\.id\)/)
})

test('inline linking never edits original transcript text', () => {
  assert.doesNotMatch(panelSource, /contenteditable/i)
  assert.doesNotMatch(panelSource, /v-model=.*transcript\.text/i)
  assert.match(panelSource, /Original transcript · unchanged source/)
})
