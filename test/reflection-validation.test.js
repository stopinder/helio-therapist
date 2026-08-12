import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('frontend validation matches database constraints', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260724110500_allow_empty_private_reflections.sql', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  const migrationMatch = migration.match(/char_length\(body\) <= (\d+)/)
  assert.ok(migrationMatch, 'Migration should define a max length for body')
  const maxLength = parseInt(migrationMatch[1], 10)
  const workspaceMatch = workspace.match(/const maxReflectionCharacters = (\d+)/)
  assert.ok(workspaceMatch, 'Workspace should define maxReflectionCharacters')
  const workspaceLength = parseInt(workspaceMatch[1], 10)
  assert.strictEqual(workspaceLength, maxLength, 'Frontend validation length must match database constraint')
  assert.strictEqual(maxLength, 20000, 'Expected max length is 20000')
})

test('reflection saving has length validation and error handling', async () => {
  const workspace = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  assert.match(workspace, /const isBodyValid = computed\(\(\) => \(body\.value \|\| ''\)\.length <= maxReflectionCharacters\)/)
  assert.match(workspace, /const isBodyReady = computed\(\(\) => Boolean\(body\.value\.trim\(\)\) && isBodyValid\.value\)/)
  assert.match(workspace, /if \(!isBodyReady\.value\)/)
  assert.match(workspace, /:disabled="saving \|\| !isBodyReady"/)
  assert.match(workspace, /error\?\.code === '23514'/)
  assert.match(workspace, /'Your reflection is too long to be saved\.'/)
})

test('summary generation handles non-JSON responses safely', async () => {
  const workspace = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  assert.match(workspace, /async function safeParseJson\(response\)/)
  assert.match(workspace, /contentType\.includes\('application\/json'\)/)
  assert.match(workspace, /const data = await safeParseJson\(response\)/)
  assert.match(workspace, /throw new Error\(data\?\.error\?\.message \|\| data\?\.error \|\| `Server error \(\$\{response\.status\}\)\. Please try again later\.`\)/)
})

test('transcription also uses safe JSON parsing', async () => {
  const workspace = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  assert.match(workspace, /async function transcribe\(\)[\s\S]*await safeParseJson\(response\)/)
})