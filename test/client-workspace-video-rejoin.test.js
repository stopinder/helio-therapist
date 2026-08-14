import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Client Workspace Video Rejoin Workflow', async () => {
  const headerContent = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')

  // 1. Appointment Zoom button hidden when activeSession exists
  assert.match(headerContent, /v-if="!client\.archived && !activeSession"\s+@click="joinMeeting"/)

  // 2. Active session panel shows "Reopen Zoom"
  assert.match(headerContent, /@click="rejoinSessionVideo"/)
  assert.match(headerContent, /Reopen Zoom/)

  // 3. rejoinSessionVideo calls /api/zoom/start-session with correct parameters
  assert.match(headerContent, /authenticatedFetch\('\/api\/zoom\/start-session'/)
  assert.match(headerContent, /body:\s*JSON\.stringify\(\{\s*clientId:\s*props\.client\.id,\s*sessionRef:\s*props\.activeSession\.id\s*\}\)/)

  // 4. Loading state handling
  assert.match(headerContent, /joiningMeeting \? 'Opening Zoom…' : 'Reopen Zoom'/)
  assert.match(headerContent, /:disabled="joiningMeeting"/)

  // 5. Clinical Workspace is available
  assert.match(headerContent, /Clinical Workspace/)
  assert.doesNotMatch(headerContent, /End Session/)
  assert.doesNotMatch(headerContent, /elapsedTime/)
})
