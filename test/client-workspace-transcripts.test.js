import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const workspaceSource = fs.readFileSync(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
const panelSource = fs.readFileSync(new URL('../src/components/workspace/ClientTranscriptsPanel.vue', import.meta.url), 'utf8')
const transcriptsViewSource = fs.readFileSync(new URL('../src/views/Transcripts.vue', import.meta.url), 'utf8')
const apiSource = fs.readFileSync(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')

test('client workspace exposes a real transcripts tab', () => {
  assert.match(workspaceSource, /'Transcripts'/)
  assert.match(workspaceSource, /activeTab === 'Transcripts'/)
  assert.match(workspaceSource, /<ClientTranscriptsPanel/)
  assert.match(workspaceSource, /:client-id="String\(route\.params\.clientId\)"/)
})

test('client transcript panel only renders transcripts assigned to the current client', () => {
  assert.match(panelSource, /String\(item\.clientId \|\| ''\) === String\(props\.clientId\)/)
  assert.match(panelSource, /clientTranscripts/)
  assert.match(panelSource, /No transcripts are assigned to this client\./)
  assert.match(panelSource, /Original transcript · unchanged source/)
})

test('client transcript inbox navigation preserves a return to the client transcripts tab', () => {
  assert.match(panelSource, /query:\s*\{\s*returnClientId:\s*props\.clientId\s*\}/)
  assert.match(transcriptsViewSource, /route\.query\.returnClientId/)
  assert.match(transcriptsViewSource, /name:\s*'ClientWorkspace'/)
  assert.match(transcriptsViewSource, /query:\s*\{\s*tab:\s*'Transcripts'\s*\}/)
  assert.match(transcriptsViewSource, /Back to client transcripts/)
})

test('client transcript view preserves authenticated therapist ownership boundary', () => {
  assert.match(panelSource, /authenticatedFetch\('\/api\/zoom\/transcripts'\)/)
  assert.match(apiSource, /requireAuthenticatedUser\(req\)/)
  assert.match(apiSource, /\.eq\('therapist_user_id', user\.id\)/)
})

test('client transcript panel does not mutate transcript assignments or source text', () => {
  assert.doesNotMatch(panelSource, /method:\s*'PATCH'/)
  assert.doesNotMatch(panelSource, /method:\s*'POST'/)
  assert.doesNotMatch(panelSource, /contenteditable/i)
  assert.doesNotMatch(panelSource, /v-model=.*transcript/i)
})
