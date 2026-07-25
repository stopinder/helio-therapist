import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('frontend ReflectionWorkspace.vue contains required relationship controls and logic', async () => {
  const content = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  
  // Check for radio buttons for relationship type
  assert.match(content, /v-model="relationshipType" value="personal"/)
  assert.match(content, /v-model="relationshipType" value="client"/)
  
  // Check for client dropdown
  assert.match(content, /v-model="selectedClientId"/)
  assert.match(content, /v-for="client in clients"/)
  
  // Check for save validation
  assert.match(content, /:disabled="saving \|\| \(relationshipType === 'client' && !selectedClientId\)"/)
  
  // Check for client_id in save payload
  assert.match(content, /client_id: relationshipType\.value === 'client' \? selectedClientId\.value : null/)
  
  // Check for relationship info in detail view
  assert.match(content, /Privately linked to \${clientDisplayName\(selectedReflection.client_id\)}/)
  assert.match(content, /Not part of the client’s clinical record\./)
  
  // Check for italic removal
  assert.match(content, /<p class="type-body mb-4">{{ selectedReflection.latestSummary.edited_content }}<\/p>/)
  assert.doesNotMatch(content, /<p class="type-body italic mb-4">{{ selectedReflection.latestSummary.edited_content }}<\/p>/)
  
  // Check for Close button next to Edit summary
  assert.match(content, /<button type="button" class="secondary-action" @click="closeDetail">Close<\/button>/)
  
  // Check for Escape key support
  assert.match(content, /if \(e\.key === 'Escape'\)/)
  assert.match(content, /window\.addEventListener\('keydown', handleKeyDown\)/)
})

test('RLS migration strengthens the policy with client ownership check', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260725161000_strengthen_private_reflections_rls.sql', import.meta.url), 'utf8')
  
  assert.match(migration, /auth\.uid\(\) = user_id/)
  assert.match(migration, /client_id is null/)
  assert.match(migration, /exists \(/)
  assert.match(migration, /from public\.clients/)
  assert.match(migration, /clients\.id = private_reflections\.client_id/)
  assert.match(migration, /clients\.user_id = auth\.uid\(\)/)
})

test('Reflection load logic fetches non-archived clients', async () => {
  const content = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  
  assert.match(content, /supabase\.from\('clients'\)\.select\('id, display_name'\)\.eq\('archived', false\)/)
})
