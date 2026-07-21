import test from 'node:test'
import assert from 'node:assert/strict'
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
