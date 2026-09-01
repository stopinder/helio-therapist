import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('SessionWorkspace simplification: No live timing', async () => {
  const header = await readFile(new URL('../src/components/workspace/SessionWorkspaceHeader.vue', import.meta.url), 'utf8')
  const clientHeader = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
  const sessionWorkspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

  assert.doesNotMatch(header, /displayTime/)
  assert.doesNotMatch(header, /incrementTimer/)
  assert.doesNotMatch(header, /elapsedTime/)
  assert.doesNotMatch(header, /Timing continues/i)
  assert.doesNotMatch(header, /Session timing/i)

  assert.doesNotMatch(clientHeader, /Session in progress/)
  assert.doesNotMatch(clientHeader, /\{\{ elapsedTime \}\}/)
  assert.doesNotMatch(clientHeader, /active-session-timer-panel/)

  assert.doesNotMatch(workspace, /elapsedTime/)
  assert.doesNotMatch(workspace, /setInterval/)

  assert.doesNotMatch(sessionWorkspace, /elapsedTime/)
  assert.doesNotMatch(sessionWorkspace, /setInterval/)
  assert.doesNotMatch(sessionWorkspace, /clockTimer/)
  assert.doesNotMatch(sessionWorkspace, /Date\.now\(\)/)
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
  assert.match(transcriptTab, /Linked transcript/)
  assert.match(transcriptTab, /Waiting for session capture/)
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

  assert.doesNotMatch(appShell, /WORKSPACE ACTIVE/i)
  assert.match(workspace, /'In Progress'/)
  assert.match(workspace, /'Completed'/)
  assert.match(header, /Session type: \{\{ session\.type \}\}/)
  assert.doesNotMatch(header, /<span v-if="isInPerson">In-person session<\/span>/)
  assert.doesNotMatch(header, /Save Notes/)
})

test('SessionWorkspace: CPD sits beside, but outside, the numbered clinical workflow', async () => {
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')
  const workflow = await readFile(new URL('../src/components/workspace/WorkflowIndicator.vue', import.meta.url), 'utf8')

  assert.match(workflow, /aria-label="Session workspace navigation"/)
  assert.match(workflow, /'Session Capture'/)
  assert.match(workflow, /'Notes'/)
  assert.match(workflow, /'Reflection'/)
  assert.match(workflow, /'Clinical Record'/)
  assert.match(workflow, /activeStage === 'CPD'/)
  assert.match(workflow, />CPD<\/button>/)
  assert.doesNotMatch(workflow, /stages = \[[^\]]*'CPD'/s)
  assert.doesNotMatch(workflow, /Professional Development/)

  assert.match(workspace, /activeTab === 'CPD'/)
  assert.match(workspace, /<SupervisionSummaryTab/)
  assert.doesNotMatch(workspace, /Professional Development/)
  assert.doesNotMatch(workspace, /'Transcript'/)
  assert.doesNotMatch(workspace, /'Clinical Summary'/)
  assert.doesNotMatch(workspace, /'Supervision'/)
})

test('SessionWorkspace simplification: End Session boundary', async () => {
  const header = await readFile(new URL('../src/components/workspace/SessionWorkspaceHeader.vue', import.meta.url), 'utf8')
  const clientHeader = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')

  assert.doesNotMatch(header, /'end-session'/)
  assert.doesNotMatch(header, /@click="emit\('end-session'\)"/)
  assert.doesNotMatch(clientHeader, /'end-session'/)
  assert.doesNotMatch(clientHeader, /@click="\$emit\('end-session'\)"/)
  assert.doesNotMatch(workspace, /v-if="showEndSessionConfirmation"/)
  assert.doesNotMatch(workspace, /End this client session\?/)
  assert.doesNotMatch(workspace, /completeSessionRecord/)
})
