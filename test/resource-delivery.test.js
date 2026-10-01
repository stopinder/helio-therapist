import test from 'node:test'
import assert from 'node:assert/strict'
import { buildResourceDelivery } from '../src/lib/resourceDelivery.js'

const assignment = { sent_snapshot: { title: 'PHQ-9' } }

test('resource delivery prepares a prefilled email draft when the client has email', () => {
  const delivery = buildResourceDelivery({
    assignments: [assignment],
    clientAccessTokens: ['secure-token'],
    client: { name: 'Alex Example', email: 'alex@example.com' },
    origin: 'https://therapyworks.works'
  })

  assert.equal(delivery.links.length, 1)
  assert.equal(delivery.links[0].title, 'PHQ-9')
  assert.equal(delivery.links[0].url, 'https://therapyworks.works/complete?token=secure-token')
  assert.match(delivery.mailto, /^mailto:alex%40example\.com\?/)
  assert.match(decodeURIComponent(delivery.mailto), /PHQ-9 from your therapist/)
  assert.match(decodeURIComponent(delivery.mailto), /Hello Alex,/)
  assert.match(decodeURIComponent(delivery.mailto), /https:\/\/therapyworks\.works\/complete\?token=secure-token/)
  assert.match(decodeURIComponent(delivery.mailto), /expires after 30 days/)
})

test('resource delivery returns secure links without mailto when no client email is saved', () => {
  const delivery = buildResourceDelivery({
    assignments: [assignment],
    clientAccessTokens: ['secure-token'],
    client: { name: 'Alex Example' },
    origin: 'https://therapyworks.works'
  })

  assert.equal(delivery.mailto, '')
  assert.deepEqual(delivery.links, [{
    title: 'PHQ-9',
    url: 'https://therapyworks.works/complete?token=secure-token'
  }])
})

test('resource delivery ignores assignments without a returned one-time token', () => {
  const delivery = buildResourceDelivery({
    assignments: [assignment],
    clientAccessTokens: [],
    client: { name: 'Alex Example', email: 'alex@example.com' },
    origin: 'https://therapyworks.works'
  })

  assert.deepEqual(delivery.links, [])
  assert.equal(delivery.mailto, '')
})
