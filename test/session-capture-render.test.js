import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Session Capture stage rendering wiring', async () => {
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')
  
  // Verify canonical stage name is used for initialization
  assert.match(workspace, /activeTab=ref\('Session Capture'\)/)
  
  // Verify canonical stage name is used for conditional rendering
  assert.match(workspace, /v-if="activeTab === 'Session Capture'"/)
  assert.match(workspace, /<TranscriptTab\s+v-if="activeTab === 'Session Capture'"/)
  
  // Verify the adjacent professional-development destination uses the canonical CPD label
  assert.match(workspace, /v-else-if="activeTab === 'CPD'"/)
  assert.match(workspace, /<SupervisionSummaryTab v-else-if="activeTab === 'CPD'"/)
})

test('WorkflowIndicator uses Session Capture', async () => {
  const workflow = await readFile(new URL('../src/components/workspace/WorkflowIndicator.vue', import.meta.url), 'utf8')
  assert.match(workflow, /'Session Capture'/)
  assert.doesNotMatch(workflow, /'Transcript'/)
})

test('TranscriptTab renders Session Capture labels', async () => {
  const transcriptTab = await readFile(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8')
  assert.match(transcriptTab, /Linked transcript/)
  assert.match(transcriptTab, /Confirm speaker identities/)
  assert.match(transcriptTab, /Prepare session capture/)
  assert.match(transcriptTab, /Waiting for session capture/)
  assert.match(transcriptTab, /Checking session capture…/)
})
