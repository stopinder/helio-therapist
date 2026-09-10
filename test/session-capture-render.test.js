import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('simplified Session Workspace exposes transcript review without restoring legacy stage tabs', async () => {
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

  assert.match(workspace, /View transcript/)
  assert.match(workspace, /showTranscript = ref\(false\)/)
  assert.match(workspace, /:aria-expanded="showTranscript"/)
  assert.match(workspace, /Linked transcript is not available yet\./)
  assert.match(workspace, /\{\{ transcript\.text \}\}/)

  assert.doesNotMatch(workspace, /activeTab=ref\('Session Capture'\)/)
  assert.doesNotMatch(workspace, /<WorkflowIndicator/)
  assert.doesNotMatch(workspace, /<TranscriptTab/)
  assert.doesNotMatch(workspace, /<SupervisionSummaryTab/)
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

test('raw transcript is collapsed by default and remains available for review', async () => {
  const transcriptTab = await readFile(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8')
  assert.match(transcriptTab, /isTranscriptVisible=ref\(false\)/)
  assert.match(transcriptTab, /Review transcript/)
  assert.match(transcriptTab, /:aria-expanded="isTranscriptVisible"/)
})
