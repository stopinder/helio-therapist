import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('lib/clients.js includes createClient with authenticated user check', async () => {
  const content = await readFile(new URL('../src/lib/clients.js', import.meta.url), 'utf8')
  assert.match(content, /export async function createClient\({ name, email = null, note = '' }\)/)
  assert.match(content, /supabase\.auth\.getUser\(\)/)
  assert.match(content, /\.from\('clients'\)/)
  assert.match(content, /\.insert\({\s*user_id: user\.id/)
  assert.match(content, /display_name: name/)
  assert.match(content, /reference: null/)
  assert.match(content, /email: email \|\| null/)
  assert.match(content, /current_focus: note/)
})

test('Clients.vue integrates AddClientModal correctly', async () => {
  const content = await readFile(new URL('../src/views/Clients.vue', import.meta.url), 'utf8')
  assert.match(content, /import AddClientModal from '\.\.\/components\/sidebar\/AddClientModal\.vue'/)
  assert.match(content, /<AddClientModal/)
  assert.match(content, /v-if="showAddClient"/)
  assert.match(content, /@submit="handleAddClient"/)
  assert.match(content, /@click="showAddClient = true"/)
  assert.match(content, /async function handleAddClient\(clientData\)/)
  assert.match(content, /await createClient\(clientData\)/)
  assert.match(content, /clients\.value\.push\(newClient\)/)
})

test('AddClientModal gives first-time users labelled, accessible fields', async () => {
  const content = await readFile(new URL('../src/components/sidebar/AddClientModal.vue', import.meta.url), 'utf8')
  assert.match(content, /role="dialog"/)
  assert.match(content, /aria-modal="true"/)
  assert.match(content, /Client name/)
  assert.match(content, /Email .*optional/)
  assert.match(content, /Current focus .*optional/)
  assert.match(content, /A short working summary shown in the client directory and workspace/)
  assert.match(content, /@submit\.prevent="submit"/)
  assert.match(content, /nameInput\.value\?\.focus\(\)/)
})

test('App.vue reuses createClient helper', async () => {
  const content = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  assert.match(content, /import { .*createClient as createClientHelper } from ["']\.\/lib\/clients\.js["']/)
  assert.match(content, /await createClientHelper\({/)
  assert.doesNotMatch(content, /supabase\.from\('clients'\)\.insert\({ user_id: auth\.user\.id/)
})
