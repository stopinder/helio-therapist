import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Client Workspace session entry behavior', async () => {
  const header = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
  
  // ClientWorkspaceHeader shows Start Session and manages busy state
  assert.match(header, /:disabled="sessionBusy"/)
  assert.match(header, /@click="\$emit\('start-session'\)"/)
  assert.match(header, /Starting…/)
  assert.match(header, /Start Session/)

  // ClientWorkspace handles session creation and errors
  assert.match(workspace, /const\s+sessionBusy\s*=\s*ref\(false\)/)
  assert.match(workspace, /sessionError\s*=\s*ref\(\s*['"]['"]\s*\)/)
  assert.match(workspace, /async\s+function\s+startSession\(\)/)
  assert.match(workspace, /sessionBusy\.value\s*=\s*true/)
  assert.match(workspace, /await\s+createOrResumeSession/)
  assert.match(workspace, /sessionError\.value\s*=\s*e\?\.code\s*===\s*['"]CLIENT_ARCHIVED['"]/)
  assert.match(workspace, /Couldn’t start the session\. Please try again\./)
  assert.match(workspace, /finally\s*{\s*sessionBusy\.value\s*=\s*false/)
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
