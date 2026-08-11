import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('the reflection workspace preserves its private therapist-only boundary', async () => {
  const content = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(content, /v-model="relationshipType"/)
  assert.doesNotMatch(content, /v-model="selectedClientId"/)
  assert.doesNotMatch(content, /supabase\.from\('clients'\)/)
  assert.match(content, /Not part of the client’s clinical record\./)
  assert.match(content, /<p class="type-body mb-4">{{ selectedReflection.latestSummary.edited_content }}<\/p>/)
  assert.match(content, /<button type="button" class="secondary-action" @click="closeDetail">Close<\/button>/)
  assert.match(content, /e\.key === 'Escape'/)
  assert.match(content, /window\.addEventListener\('keydown', handleKeyDown\)/)
})

test('Sprint One keeps reflection and summary ownership explicit in RLS', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260726113823_sprint_one_hardening.sql', import.meta.url), 'utf8')
  assert.match(migration, /on public\.private_reflections for all\s+to authenticated/)
  assert.match(migration, /client\.id = private_reflections\.client_id/)
  assert.match(migration, /client\.user_id = \(select auth\.uid\(\)\)/)
  assert.match(migration, /on public\.reflection_supervision_summaries for all\s+to authenticated/)
  assert.match(migration, /reflection\.id = reflection_supervision_summaries\.reflection_id/)
})
