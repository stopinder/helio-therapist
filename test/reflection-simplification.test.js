import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('frontend ReflectionWorkspace.vue does NOT contain relationship controls', async () => {
  const content = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(content, /v-model="relationshipType"/)
  assert.doesNotMatch(content, /v-model="selectedClientId"/)
  assert.doesNotMatch(content, /v-for="client in clients"/)
  assert.doesNotMatch(content, /Personal \/ general practice/)
  assert.doesNotMatch(content, /supabase\.from\('clients'\)/)
  assert.doesNotMatch(content, /client_id:/)
})

test('ReflectionWorkspace.vue has 20,000 character validation', async () => {
  const content = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  assert.match(content, /const maxReflectionCharacters = 20000/)
  assert.match(content, /const isBodyValid = computed\(\(\) => \(body\.value \|\| ''\)\.length <= maxReflectionCharacters\)/)
  assert.match(content, /!isBodyReady\.value/)
  assert.match(content, /Reflection is too long\. The maximum length is 20,000 characters\./)
  assert.match(content, /const canSummariseText = value => String\(value \|\| ''\)\.trim\(\)\.length >= minimumSummaryCharacters/)
})

test('ReflectionWorkspace.vue detail modal is simplified', async () => {
  const content = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(content, /selectedReflection\.client_id \?/)
  assert.doesNotMatch(content, /clientDisplayName/)
  assert.match(content, /Not part of the client’s clinical record\./)
})
