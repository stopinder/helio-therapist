import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Client Workspace session entry behavior', async () => {
  const header = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
  
  // ClientWorkspaceHeader contains Clinical Workspace action
  assert.match(header, /Clinical Workspace/)
  assert.match(header, /data-testid="open-clinical-workspace"/)
  assert.match(header, /import { createOrResumeSession/)
  assert.match(header, /async function openClinicalWorkspace\(\)/)
  assert.match(header, /props\.activeSession \|\| \(await createOrResumeSession\(props\.client\.id\)\)\.session/)
  assert.match(header, /name: 'SessionWorkspace', params: { clientId: props\.client\.id, sessionId: session\.id }/)

  // Negative assertions for removed ceremony/timer
  assert.doesNotMatch(header, /Start Session/)
  assert.doesNotMatch(header, /@click="\$emit\('start-session'\)"/)
  assert.doesNotMatch(header, /End Session/)
  assert.doesNotMatch(header, /elapsedTime/)
  assert.doesNotMatch(header, /timer-panel/)

  // ClientWorkspaceHeader handles workspace busy/error state
  assert.match(header, /workspaceBusy/)
  assert.match(header, /workspaceError/)
  assert.match(header, /Couldn’t open Clinical Workspace\. Please try again\./)
  
  // ClientWorkspace view no longer manages session ceremony state
  assert.doesNotMatch(workspace, /const\s+sessionBusy\s*=\s*ref\(false\)/)
  assert.doesNotMatch(workspace, /async\s+function\s+startSession\(\)/)
})

test('Session create or resume rejects archived clients before touching sessions', async () => {
  const sessions = await readFile(new URL('../src/lib/sessions.js', import.meta.url), 'utf8')
  assert.match(sessions, /async function requireActiveOwnedClient/)
  assert.match(sessions, /\.from\('clients'\)/)
  assert.match(sessions, /\.select\('id,archived'\)/)
  assert.match(sessions, /if \(data\.archived\) throw archivedClientError\(\)/)
  assert.match(sessions, /await requireActiveOwnedClient\(client, clientId, auth\.user\.id\)/)
  assert.match(sessions, /error\.code = 'CLIENT_ARCHIVED'/)
})

test('Session create or resume remains retry-safe under concurrent creation', async () => {
  const sessions = await readFile(new URL('../src/lib/sessions.js', import.meta.url), 'utf8')
  assert.match(sessions, /export async function createOrResumeSession\(clientId\)/)
  assert.match(sessions, /\.eq\('status', 'in_progress'\)\.maybeSingle\(\)/)
  assert.match(sessions, /if \(existing\) return \{ session: presentSession\(existing\), resumed: true \}/)
  assert.match(sessions, /if \(error\?\.code === '23505'\)/)
  assert.match(sessions, /return \{ session: presentSession\(raced\), resumed: true \}/)
})
