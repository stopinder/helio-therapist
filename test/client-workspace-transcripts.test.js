import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const workspaceSource = fs.readFileSync(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
const panelSource = fs.readFileSync(new URL('../src/components/workspace/ClientTranscriptsPanel.vue', import.meta.url), 'utf8')
const linkerSource = fs.readFileSync(new URL('../src/components/TranscriptSessionLinker.vue', import.meta.url), 'utf8')
const apiSource = fs.readFileSync(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')

test('client workspace exposes assigned transcripts as source material', () => {
  assert.match(workspaceSource, /ClientTranscriptsPanel/)
  assert.match(workspaceSource, /:client-id="String\(route\.params\.clientId\)"/)
  assert.match(panelSource, /String\(item\.clientId \|\| ''\) === String\(props\.clientId\)/)
  assert.match(panelSource, /Original transcript · unchanged source/)
})

test('known-client transcript linking stays inside the client workspace', () => {
  assert.match(panelSource, /TranscriptSessionLinker/)
  assert.match(panelSource, /linkingId === transcript\.id/)
  assert.match(panelSource, /'Link session'/)
  assert.doesNotMatch(panelSource, /query:\s*\{\s*transcript:/)
  assert.match(panelSource, /name:\s*'SessionWorkspace'/)
  assert.match(panelSource, />Open session<\/router-link>/)
})

test('existing encounters are primary and new session creation is secondary', () => {
  assert.match(linkerSource, /Which session was this\?/)
  assert.match(linkerSource, /Existing sessions/)
  assert.match(linkerSource, /Link selected session/)
  assert.match(linkerSource, /Create another session/)
  assert.match(linkerSource, /A session is already open for this client/)
})

test('client transcript chronology uses encounter time before import time', () => {
  assert.match(panelSource, /Session \$\{formatDate\(encounter\.startedAt \|\| encounter\.createdAt\)\} · Imported/)
  assert.match(panelSource, /Imported \$\{formatDate\(transcript\.receivedAt\)\} · Needs session/)
})

test('linking preserves authenticated therapist ownership boundaries', () => {
  assert.match(linkerSource, /authenticatedFetch\('\/api\/zoom\/transcripts'/)
  assert.match(apiSource, /requireAuthenticatedUser\(req\)/)
  assert.match(apiSource, /\.eq\('therapist_user_id', user\.id\)/)
  assert.match(apiSource, /\.eq\('client_id', effectiveClientId\)\.eq\('user_id', user\.id\)/)
})

test('client transcript source remains read-only', () => {
  assert.doesNotMatch(panelSource, /contenteditable/i)
  assert.doesNotMatch(panelSource, /v-model=.*transcript/i)
  assert.match(panelSource, /Original transcript · unchanged source/)
})
