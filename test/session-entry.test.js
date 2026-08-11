import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Client Workspace session entry exposes safe loading, failure, and retry behaviour', async () => {
  const header = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')

  assert.match(header, /const openingSession = ref\(false\)/)
  assert.match(header, /const sessionOpenError = ref\(''\)/)
  assert.match(header, /if \(openingSession\.value\) return/)
  assert.match(header, /:disabled="openingSession"/)
  assert.match(header, /:aria-busy="openingSession"/)
  assert.match(header, /Opening session…/)
  assert.match(header, /role="alert"/)
  assert.match(header, /Couldn’t open the session workspace\. Please try again\./)
  assert.match(header, /await router\.push/)
  assert.match(header, /finally \{\s*openingSession\.value = false/)
})

test('Client Workspace session entry keeps diagnostics bounded and therapist-safe', async () => {
  const header = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')

  assert.match(header, /console\.error\('Failed to open session workspace', \{ code: error\?\.code \|\| 'UNKNOWN' \}\)/)
  assert.doesNotMatch(header, /sessionOpenError\.value\s*=\s*error\?\.message/)
  assert.doesNotMatch(header, /console\.error\('Failed to open session workspace:', error\)/)
})

test('Session create or resume remains retry-safe under concurrent creation', async () => {
  const sessions = await readFile(new URL('../src/lib/sessions.js', import.meta.url), 'utf8')

  assert.match(sessions, /export async function createOrResumeSession\(clientId\)/)
  assert.match(sessions, /\.eq\('status', 'in_progress'\)\s*\.maybeSingle\(\)/)
  assert.match(sessions, /if \(existing\) return \{ session: presentSession\(existing\), resumed: true \}/)
  assert.match(sessions, /if \(error\?\.code === '23505'\)/)
  assert.match(sessions, /return \{ session: presentSession\(raced\), resumed: true \}/)
})
