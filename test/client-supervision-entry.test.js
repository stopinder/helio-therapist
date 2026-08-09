import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Client Workspace supervision entry reuses private reflection mutation', async () => {
  const header = await readFile(new URL('../src/components/workspace/ClientWorkspaceHeader.vue', import.meta.url), 'utf8')
  const picker = await readFile(new URL('../src/components/workspace/ClientSupervisionPicker.vue', import.meta.url), 'utf8')
  const reflections = await readFile(new URL('../src/lib/reflections.js', import.meta.url), 'utf8')

  assert.match(header, /Add to Supervision/)
  assert.match(header, /openSupervisionPicker/)
  assert.match(header, /getPrivateReflectionsForClient/)
  assert.match(header, /setReflectionSupervisionSelection/)
  assert.match(header, /listSessions/)
  assert.match(header, /included: true/)

  assert.match(reflections, /export async function getPrivateReflectionsForClient/)
  assert.match(reflections, /\.eq\('user_id', user\.id\)\.eq\('client_id', clientId\)/)
  assert.match(reflections, /included_in_supervision/)

  assert.match(picker, /type="checkbox"/)
  assert.match(picker, /Already in pack/)
  assert.match(picker, /Client identifiers are not shown/)
  assert.doesNotMatch(picker, /client_id/)
  assert.doesNotMatch(picker, /session_ref\s*\}\}/)
})
