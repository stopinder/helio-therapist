import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('SessionWorkspace simplification: No live timing', async () => {
  const header = await readFile(new URL('../src/components/workspace/SessionWorkspaceHeader.vue', import.meta.url), 'utf8')
  const clientHeader = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')

  // Clinical Workspace Header no longer has live timer
  assert.doesNotMatch(header, /displayTime/)
  assert.doesNotMatch(header, /incrementTimer/)
  assert.doesNotMatch(header, /\{\{ elapsedTime \}\}/)

  // Client Workspace Header also has no live timer
  assert.doesNotMatch(clientHeader, /Session in progress/)
  assert.doesNotMatch(clientHeader, /\{\{ elapsedTime \}\}/)
  assert.doesNotMatch(clientHeader, /active-session-timer-panel/)

  // ClientWorkspace no longer maintains a one-second clock solely for display
  assert.doesNotMatch(workspace, /elapsedTime/)
  assert.doesNotMatch(workspace, /setInterval/)
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

  // WORKSPACE ACTIVE must NOT be present
  assert.doesNotMatch(appShell, /WORKSPACE ACTIVE/i)

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

test('SessionWorkspace simplification: End Session boundary', async () => {
  const header = await readFile(new URL('../src/components/workspace/SessionWorkspaceHeader.vue', import.meta.url), 'utf8')
  const clientHeader = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')

  // Clinical Workspace Header does not emit end-session
  assert.doesNotMatch(header, /'end-session'/)
  assert.doesNotMatch(header, /@click="emit\('end-session'\)"/)

  // Client Workspace Header does not emit end-session
  assert.doesNotMatch(clientHeader, /'end-session'/)
  assert.doesNotMatch(clientHeader, /@click="\$emit\('end-session'\)"/)

  // ClientWorkspace has no End Session confirmation modal
  assert.doesNotMatch(workspace, /v-if="showEndSessionConfirmation"/)
  assert.doesNotMatch(workspace, /End this client session\?/)

  // ClientWorkspace does not import/call completeSessionRecord
  assert.doesNotMatch(workspace, /completeSessionRecord/)

  // clinical-record approval/completion remains separate from merely opening the workspace
  // (Verify navigation-label or workflow status if needed, but here we just ensure End Session is gone)
})
