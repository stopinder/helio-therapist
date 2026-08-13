import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('SessionWorkspace simplification: Timer moved to Client Workspace', async () => {
  const header = await readFile(new URL('../src/components/workspace/SessionWorkspaceHeader.vue', import.meta.url), 'utf8')
  const clientHeader = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

  // Clinical Workspace Header no longer has live timer
  assert.doesNotMatch(header, /displayTime/)
  assert.doesNotMatch(header, /incrementTimer/)
  assert.doesNotMatch(header, /\{\{ elapsedTime \}\}/)
  assert.match(header, /Timing continues in the client workspace/)

  // Client Workspace Header now owns the timer
  assert.match(clientHeader, /Session in progress/)
  assert.match(clientHeader, /\{\{ elapsedTime \}\}/)
  assert.match(clientHeader, /active-session-timer-panel/)

  // SessionWorkspace (view) still has the reactive elapsedTime but doesn't pass it to the header for display
  assert.match(workspace, /const elapsedTime=computed/)
})

test('SessionWorkspace uses the authenticated linked transcript source without mock fallback', async () => {
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')
  const transcriptTab = await readFile(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8')
  const endpoint = await readFile(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')

  assert.doesNotMatch(workspace, /sessionWorkspaceData/)
  assert.doesNotMatch(workspace, /mockSession/)
  assert.match(workspace, /authenticatedFetch/)
  assert.match(workspace, /sessionRef:String\(session\.value\.id\)/)
  assert.match(workspace, /clientId:String\(session\.value\.clientId\)/)
  assert.match(transcriptTab, /Session Capture · Transcript/)
  assert.match(transcriptTab, /Session capture in progress/)
  assert.match(transcriptTab, /Session capture unavailable/)
  assert.doesNotMatch(transcriptTab, /demonstration data/)
  assert.doesNotMatch(transcriptTab, /Add Marker/)
  assert.match(endpoint, /\.eq\('therapist_user_id', user\.id\)/)
  assert.match(endpoint, /\.eq\('session_ref', sessionRef\)/)
  assert.match(endpoint, /\.eq\('client_id', clientId\)/)
})

test('SessionWorkspace: Header and layout cleanup', async () => {
  const appShell = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')
  const header = await readFile(new URL('../src/components/workspace/SessionWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

  // WORKSPACE ACTIVE is rendered
  assert.match(appShell, /WORKSPACE ACTIVE/i)

  // Session status mapping exists
  assert.match(workspace, /'In Progress'/)
  assert.match(workspace, /'Completed'/)

  // In-person session type is informational
  assert.match(header, /Session type: \{\{ session\.type \}\}/)
  assert.doesNotMatch(header, /<span v-if="isInPerson">In-person session<\/span>/)

  // Save Notes is disabled as no autosave
  assert.match(header, /Save Notes/)
  assert.match(header, /disabled/)
})

test('SessionWorkspace: Navigation labels updated', async () => {
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')
  const workflow = await readFile(new URL('../src/components/workspace/WorkflowIndicator.vue', import.meta.url), 'utf8')

  // Transcript -> Session Capture
  assert.match(workspace, /'Session Capture'/)
  assert.doesNotMatch(workspace, /'Transcript'/)
  assert.match(workflow, /'Session Capture'/)

  // Therapist Notes -> Notes

  // Clinical Summary -> Clinical Record
  assert.match(workspace, /'Clinical Record'/)
  assert.doesNotMatch(workspace, /'Clinical Summary'/)
  assert.match(workflow, /'Clinical Record'/)

  // Supervision -> Professional Development
  assert.match(workspace, /'Professional Development'/)
  assert.doesNotMatch(workspace, /'Supervision'/)
  assert.match(workflow, /'Professional Development'/)
})

test('SessionWorkspace simplification: End Session confirmation wiring', async () => {
  const header = await readFile(new URL('../src/components/workspace/SessionWorkspaceHeader.vue', import.meta.url), 'utf8')
  const clientHeader = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')

  // Clinical Workspace Header NO LONGER emits end-session (moved to Client Workspace)
  assert.doesNotMatch(header, /'end-session'/)
  assert.doesNotMatch(header, /@click="emit\('end-session'\)"/)

  // Client Workspace Header emits end-session
  assert.match(clientHeader, /'end-session'/)
  assert.match(clientHeader, /@click="\$emit\('end-session'\)"/)

  // ClientWorkspace has confirmation dialog
  assert.match(workspace, /v-if="showEndSessionConfirmation"/)
  assert.match(workspace, /End this client session\?/)
  assert.match(workspace, /@click="showEndSessionConfirmation=false"/) // Cancel
  assert.match(workspace, /@click="endSession"/) // Confirm

  // ClientWorkspace listens for end-session and shows confirmation
  assert.match(workspace, /@end-session="confirmEndSession"/)
  assert.match(workspace, /function confirmEndSession\(\)/)

  // endSession calls library
  assert.match(workspace, /completeSessionRecord/)
  assert.match(workspace, /from '\.\.\/lib\/sessions\.js'/)
  assert.match(workspace, /async function endSession\(\)/)
  assert.match(workspace, /await completeSessionRecord\(activeSession\.value,activeSession\.value\.notes\)/)
})
