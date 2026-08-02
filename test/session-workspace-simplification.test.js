import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('SessionWorkspace simplification: UI elements removed', async () => {
  const header = await readFile(new URL('../src/components/workspace/SessionWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

  // Remove Listening indicator
  assert.doesNotMatch(header, /Listening…/)
  assert.doesNotMatch(header, /animate-pulse/)

  // Remove Timer
  assert.doesNotMatch(header, /displayTime/)
  assert.doesNotMatch(header, /incrementTimer/)
  assert.doesNotMatch(header, /timerInterval/)
  assert.doesNotMatch(header, /onMounted/)
  assert.doesNotMatch(header, /onUnmounted/)
  assert.doesNotMatch(header, /⏱/)

  // Keep the inert display value expected by the header shape
  assert.match(workspace, /elapsedTime: '00:00:00'/)
})

test('SessionWorkspace uses the authenticated linked transcript source without mock fallback', async () => {
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')
  const transcriptTab = await readFile(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8')
  const endpoint = await readFile(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')

  assert.doesNotMatch(workspace, /sessionWorkspaceData/)
  assert.doesNotMatch(workspace, /mockSession/)
  assert.match(workspace, /authenticatedFetch/)
  assert.match(workspace, /sessionRef: String\(session\.value\.id\)/)
  assert.match(workspace, /clientId: String\(session\.value\.clientId\)/)
  assert.match(transcriptTab, /Original Zoom transcript/)
  assert.match(transcriptTab, /No linked transcript/)
  assert.match(transcriptTab, /Transcript unavailable/)
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

  // Therapist Notes -> Notes
  assert.match(workspace, /'Notes'/)
  assert.doesNotMatch(workspace, /'Therapist Notes'/)
  assert.match(workflow, /'Notes'/)

  // Clinical Summary -> Clinical Record
  assert.match(workspace, /'Clinical Record'/)
  assert.doesNotMatch(workspace, /'Clinical Summary'/)
  assert.match(workflow, /'Clinical Record'/)
})

test('SessionWorkspace simplification: End Session confirmation wiring', async () => {
  const header = await readFile(new URL('../src/components/workspace/SessionWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

  // Header emits end-session
  assert.match(header, /'end-session'/)
  assert.match(header, /@click="emit\('end-session'\)"/)

  // Workspace has confirmation dialog
  assert.match(workspace, /v-if="showEndSessionConfirmation"/)
  assert.match(workspace, /End this client session\?/)
  assert.match(workspace, /@click="showEndSessionConfirmation = false"/) // Cancel
  assert.match(workspace, /@click="handleEndSession"/) // Confirm

  // Workspace listens for end-session and shows confirmation
  assert.match(workspace, /@end-session="confirmEndSession"/)
  assert.match(workspace, /function confirmEndSession\(\)/)

  // handleEndSession calls library
  assert.match(workspace, /completeSessionRecord/)
  assert.match(workspace, /from '\.\.\/lib\/sessions\.js'/)
  assert.match(workspace, /async function handleEndSession\(\)/)
  assert.match(workspace, /await completeSessionRecord\(session\.value, session\.value\.notes\)/)
  assert.match(workspace, /session\.value = updatedSession/)
  assert.match(workspace, /router\.push\(`\/clients\/\$\{session\.value\.clientId\}`\)/)
})
