import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Clients page uses live Supabase clients and standard UI patterns', async () => {
  const clientsView = await readFile(new URL('../src/views/Clients.vue', import.meta.url), 'utf8')
  const clientsLib = await readFile(new URL('../src/lib/clients.js', import.meta.url), 'utf8')

  assert.match(clientsLib, /export async function listClients/)
  assert.match(clientsLib, /\.from\('clients'\)/)
  assert.match(clientsLib, /includeArchived/)
  assert.match(clientsLib, /\.order\('display_name'/)

  assert.match(clientsView, /listClients/)
  assert.match(clientsView, /createClient/)
  assert.match(clientsView, /listUpcomingClientAppointments/)
  assert.match(clientsView, /listClients\(\{includeArchived:true\}\)/)
  assert.match(clientsView, /onMounted\(loadClients\)/)
  assert.doesNotMatch(clientsView, /mockClient/)

  assert.match(clientsView, /v-if="loading"/)
  assert.match(clientsView, /v-else-if="error"/)
  assert.match(clientsView, /filteredClients\.length === 0/)
  assert.match(clientsView, /v-for="client in filteredClients"/)

  assert.match(clientsView, /router\.push\(`\/clients\/\$\{clientId\}`\)/)
  assert.match(clientsView, /openClient\(client\.id\)/)
  assert.doesNotMatch(clientsView, /ID:\s*\{\{ client\.id/)
})
