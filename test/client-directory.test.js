import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { clientIdentifier, clientMatchesSearch, exactSearchMatches, sortClients } from '../src/lib/clientDirectory.js'

const clients = [
  { id: 'a', name: 'Alice Brown', reference: 'AB-01' },
  { id: 'b', name: 'Alice Brown', reference: 'AB-02' },
  { id: 'c', name: 'Ben Carter', email: 'ben@example.test' }
]

test('searches names and identifiers without requiring email to be displayed', () => {
  assert.equal(clientMatchesSearch(clients[0], 'alice'), true)
  assert.equal(clientMatchesSearch(clients[0], 'ab-01'), true)
  assert.equal(clientMatchesSearch(clients[0], 'ben'), false)
})

test('only a single exact result is eligible for Enter-to-open', () => {
  assert.deepEqual(exactSearchMatches(clients, 'AB-01').map(client => client.id), ['a'])
  assert.equal(exactSearchMatches(clients, 'Alice Brown').length, 2)
})

test('recent sorting prioritises recently opened clients and then uses name order', () => {
  assert.deepEqual(sortClients(clients, 'recent', ['c', 'a']).map(client => client.id), ['c', 'a', 'b'])
})

test('identifiers appear only when needed to distinguish duplicate names', () => {
  assert.equal(clientIdentifier(clients[0], clients), 'AB-01')
  assert.equal(clientIdentifier(clients[2], clients), '')
})

test('client directory exposes active archived and all views without database UUID noise', async () => {
  const view = await readFile(new URL('../src/views/Clients.vue', import.meta.url), 'utf8')
  assert.match(view, /statusFilter=ref\('active'\)/)
  assert.match(view, /label:'Archived'/)
  assert.match(view, /label:'All'/)
  assert.match(view, /Search clients by name or reference/)
  assert.doesNotMatch(view, /client\.id\.substring/)
  assert.match(view, /v-if="client\.reference"/)
})

test('sample clients can be archived and restored without deletion', async () => {
  const view = await readFile(new URL('../src/views/Clients.vue', import.meta.url), 'utf8')
  assert.match(view, /isSampleClient\(client\)/)
  assert.match(view, /Archive sample/)
  assert.match(view, /Restore sample/)
  assert.match(view, /setClientArchived/)
  assert.doesNotMatch(view, /deleteSampleClient/)
})

test('client rows remain directly and keyboard navigable', async () => {
  const view = await readFile(new URL('../src/views/Clients.vue', import.meta.url), 'utf8')
  assert.match(view, /tabindex="0" role="link"/)
  assert.match(view, /openClient\(client\.id\)/)
})

test('directory loads real upcoming appointments and listClients keeps active-only default', async () => {
  const view = await readFile(new URL('../src/views/Clients.vue', import.meta.url), 'utf8')
  const source = await readFile(new URL('../src/lib/clients.js', import.meta.url), 'utf8')
  assert.match(view, /listClients\(\{includeArchived:true\}\)/)
  assert.match(view, /listUpcomingClientAppointments\(\)/)
  assert.match(source, /includeArchived = false/)
  assert.match(source, /query\.eq\('archived', false\)/)
  assert.match(source, /\.from\('appointments'\)/)
})
