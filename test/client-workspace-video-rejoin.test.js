import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Client Workspace Header Actions Simplified', async () => {
  const headerContent = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')

  // 1. Buttons removed
  assert.doesNotMatch(headerContent, /Schedule appointment/)
  assert.doesNotMatch(headerContent, /Reopen Zoom/)
  assert.doesNotMatch(headerContent, /@click="joinMeeting"/)

  // 2. Kept actions
  assert.match(headerContent, /Add to Supervision/)
  assert.match(headerContent, /Create Document/)
  assert.match(headerContent, /Clinical Workspace/)
  assert.match(headerContent, /Archive client/)

  // 3. Clinical Workspace is the dark primary action
  assert.match(headerContent, /class="[^"]*bg-action-link[^"]*".*>\s*\{\{\s*workspaceBusy\s*\?\s*'Opening…'\s*:\s*'Clinical Workspace'\s*\}\}/)
  
  // 4. Zoom code removed
  assert.doesNotMatch(headerContent, /authenticatedFetch\('\/api\/zoom\/join-appointment'/)
  assert.doesNotMatch(headerContent, /authenticatedFetch\('\/api\/zoom\/start-session'/)
  assert.doesNotMatch(headerContent, /videoLabel/)
})
