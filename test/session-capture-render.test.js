import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Session Capture / Transcript rendering wiring', async () => {
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')
  
  // Verify transcript is reachable
  assert.match(workspace, /View transcript/)
  assert.match(workspace, /v-if="showTranscript"/)
  assert.match(workspace, /\{\{\s*transcript\.text\s*\}\}/)
})

test('ReflectionTab is present', async () => {
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')
  assert.match(workspace, /<ReflectionTab/)
})

test('WorkflowIndicator uses Session Capture', async () => {
  const workflow = await readFile(new URL('../src/components/workspace/WorkflowIndicator.vue', import.meta.url), 'utf8')
  // The component still uses canonical names internally or is kept for other views
  assert.match(workflow, /'Session Capture'/)
})

test('TranscriptTab remains available as a component', async () => {
  const transcriptTab = await readFile(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8')
  assert.match(transcriptTab, /Linked transcript/)
  assert.match(transcriptTab, /Confirm speaker identities/)
  assert.match(transcriptTab, /Prepare session capture/)
})

test('raw transcript is collapsed by default and remains available for review', async () => {
  const transcriptTab = await readFile(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8')
  assert.match(transcriptTab, /isTranscriptVisible=ref\(false\)/)
  assert.match(transcriptTab, /Review transcript/)
  assert.match(transcriptTab, /:aria-expanded="isTranscriptVisible"/)
})
