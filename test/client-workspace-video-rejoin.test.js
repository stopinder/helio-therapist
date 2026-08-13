import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Client Workspace Video Rejoin Workflow', async () => {
  const headerContent = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')

  // 1. Appointment Zoom button hidden when activeSession exists
  assert.match(headerContent, /v-if="!client\.archived && !activeSession"\s+@click="joinMeeting"/)

  // 2. Active session panel shows "Return to Video Session"
  assert.match(headerContent, /@click="rejoinSessionVideo"/)
  assert.match(headerContent, /Return to Video Session/)

  // 3. rejoinSessionVideo calls /api/zoom/start-session with correct parameters
  assert.match(headerContent, /authenticatedFetch\('\/api\/zoom\/start-session'/)
  assert.match(headerContent, /body:JSON\.stringify\(\{clientId:props\.client\.id,sessionRef:props\.activeSession\.id\}\)/)

  // 4. Loading state handling
  assert.match(headerContent, /joiningMeeting \? 'Opening Zoom…' : 'Return to Video Session'/)
  assert.match(headerContent, /:disabled="joiningMeeting"/)

  // 5. Existing session timer / Clinical Workspace / End Session controls still render correctly
  assert.match(headerContent, /v-if="activeSession"/)
  assert.match(headerContent, /Clinical Workspace/)
  assert.match(headerContent, /End Session/)
  assert.match(headerContent, /aria-live="polite">\{\{ elapsedTime \}\}</)
})
