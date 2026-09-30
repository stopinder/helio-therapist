import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const founderOffer = fs.readFileSync('src/views/FounderOffer.vue', 'utf8')
const authGate = fs.readFileSync('src/AuthGate.vue', 'utf8')

test('founder offer shows a clear unavailable state when the trial offer cannot be used', () => {
  assert.match(founderOffer, /This offer is not available for this account/)
  assert.match(founderOffer, /\/api\/billing\/status/)
  assert.match(founderOffer, /subscription\?\.status === 'trialing'/)
  assert.match(founderOffer, /View subscription settings/)
})

test('founder offer email sign-in preserves the intended return route', () => {
  assert.match(authGate, /authRedirectTarget/)
  assert.match(authGate, /route\.query\.redirect/)
  assert.match(authGate, /router\.replace\(authRedirectTarget\(\)\)/)
})
