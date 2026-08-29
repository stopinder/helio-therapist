import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('lib/clients.js includes createClient with authenticated user check', async () => {
  const content = await readFile(new URL('../src/lib/clients.js', import.meta.url), 'utf8')
  assert.match(content, /export async function createClient/)
  assert.match(content, /supabase\.auth\.getUser\(\)/)
  assert.match(content, /\.from\('clients'\)/)
  assert.match(content, /user_id: user\.id/)
  assert.match(content, /display_name: name/)
  assert.match(content, /reference: null/)
})

test('Clients.vue integrates AddClientModal correctly', async () => {
  const content = await readFile(new URL('../src/views/Clients.vue', import.meta.url), 'utf8')
  assert.match(content, /AddClientModal/)
  assert.match(content, /v-if="showAddClient"/)
  assert.match(content, /@submit="handleAddClient"/)
  assert.match(content, /showAddClient\s*=\s*true/)
  assert.match(content, /handleAddClient/)
  assert.match(content, /await createClient\(data\)/)
  assert.match(content, /clients\.value\.push\(c\)/)
})

test('AddClientModal gives first-time users labelled, accessible fields', async () => {
  const content = await readFile(new URL('../src/components/sidebar/AddClientModal.vue', import.meta.url), 'utf8')
  assert.match(content, /role="dialog"/)
  assert.match(content, /aria-modal="true"/)
  assert.match(content, /Client name/)
  assert.match(content, /Email .*optional/)
  assert.match(content, /Current focus .*optional/)
})

test('App.vue reuses createClient helper', async () => {
  const content = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  assert.match(content, /createClient as createClientHelper/)
  assert.match(content, /createClientHelper/)
  assert.doesNotMatch(content, /supabase\.from\('clients'\)\.insert\({ user_id: auth\.user\.id/)
})
