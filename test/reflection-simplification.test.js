import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('frontend ReflectionWorkspace.vue does NOT contain relationship controls', async () => {
  const content = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  
  // Verify relationship controls are GONE
  assert.doesNotMatch(content, /v-model="relationshipType"/)
  assert.doesNotMatch(content, /v-model="selectedClientId"/)
  assert.doesNotMatch(content, /v-for="client in clients"/)
  assert.doesNotMatch(content, /Personal \/ general practice/) // Removed from radio but keep in mind detail view also removed it
  
  // Verify no clients query is made
  assert.doesNotMatch(content, /supabase\.from\('clients'\)/)
  
  // Verify payload does NOT contain client_id
  assert.doesNotMatch(content, /client_id:/)
})

test('ReflectionWorkspace.vue has 20,000 character validation', async () => {
  const content = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  
  // Verify 20,000 char validation exists
  assert.match(content, /const maxReflectionCharacters = 20000/)
  assert.match(content, /const isBodyValid = computed\(\(\) => \(body\.value \|\| ''\)\.length <= maxReflectionCharacters\)/)
  assert.match(content, /if \(!isBodyValid\.value\)/)
  assert.match(content, /Reflection is too long\. The maximum length is 20,000 characters\./)
  
  // Verify empty reflections allowed (check constraint 1 to 20000 was removed in migration)
  // The frontend code should NOT have a minimum length check for saving
  // (though it has one for summarising)
  assert.match(content, /const canSummariseText = value => String\(value \|\| ''\)\.trim\(\)\.length >= minimumSummaryCharacters/)
})

test('ReflectionWorkspace.vue detail modal is simplified', async () => {
  const content = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  
  // Verify relationship display is GONE
  assert.doesNotMatch(content, /selectedReflection\.client_id \?/)
  assert.doesNotMatch(content, /clientDisplayName/)
  
  // Verify privacy reassurance remains
  assert.match(content, /Not part of the client’s clinical record\./)
})
