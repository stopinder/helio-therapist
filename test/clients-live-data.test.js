import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Clients page uses live Supabase clients and standard UI patterns', async () => {
  const clientsView = await readFile(new URL('../src/views/Clients.vue', import.meta.url), 'utf8')
  const clientsLib = await readFile(new URL('../src/lib/clients.js', import.meta.url), 'utf8')

  // Data loading remains live and active-only by default, with explicit archive opt-in.
  assert.match(clientsLib, /export async function listClients\({ includeArchived = false } = {}\)/)
  assert.match(clientsLib, /\.from\('clients'\)/)
  assert.match(clientsLib, /if \(!includeArchived\)\s*(?:{\s*)?query = query\.eq\('archived', false\)/)
  assert.match(clientsLib, /\.order\('display_name', { ascending: true }\)/)

  assert.match(clientsView, /listClients, createClient, listUpcomingClientAppointments/)
  assert.match(clientsView, /listClients\({includeArchived:true}\)/)
  assert.match(clientsView, /onMounted\(loadClients\)/)
  assert.doesNotMatch(clientsView, /mockClient/)

  // UI states operate on the filtered directory rather than the old unfiltered list.
  assert.match(clientsView, /v-if="loading"/)
  assert.match(clientsView, /v-else-if="error"/)
  assert.match(clientsView, /filteredClients\.length === 0/)
  assert.match(clientsView, /v-for="client in filteredClients"/)

  // Routing remains client-ID based without displaying database IDs.
  assert.match(clientsView, /function openClient\(clientId\)\{router\.push\(`\/clients\/\$\{clientId\}`\);\}/)
  assert.match(clientsView, /@click="openClient\(client\.id\)"/)
  assert.doesNotMatch(clientsView, /ID:\s*\{\{ client\.id/)
  assert.doesNotMatch(clientsView, /Only one example client is shown/)
})
