import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Clients page uses live Supabase clients and standard UI patterns', async () => {
  const clientsView = await readFile(new URL('../src/views/Clients.vue', import.meta.url), 'utf8')
  const clientsLib = await readFile(new URL('../src/lib/clients.js', import.meta.url), 'utf8')

  // Data Loading
  assert.match(clientsLib, /export async function listClients\(\)/)
  assert.match(clientsLib, /\.from\('clients'\)/)
  assert.match(clientsLib, /\.neq\('status', 'archived'\)/)
  assert.match(clientsLib, /\.order\('display_name', { ascending: true }\)/)

  assert.match(clientsView, /import { listClients } from '\.\.\/lib\/clients\.js'/)
  assert.match(clientsView, /onMounted\(loadClients\)/)
  assert.doesNotMatch(clientsView, /mockClient/)

  // UI States
  assert.match(clientsView, /v-if="loading"/)
  assert.match(clientsView, /v-else-if="error"/)
  assert.match(clientsView, /v-else-if="clients\.length === 0"/)
  assert.match(clientsView, /v-for="client in clients"/)

  // Routing
  assert.match(clientsView, /:to="`\/clients\/\${client\.id}`"/)
  
  // Cleanliness
  assert.doesNotMatch(clientsView, /Only one example client is shown/)
})
