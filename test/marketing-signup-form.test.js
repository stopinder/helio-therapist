import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const form = await readFile(new URL('../src/components/MarketingSignupForm.vue', import.meta.url), 'utf8')

test('public marketing form requires explicit consent and uses the server endpoint', () => {
  assert.match(form, /type="checkbox" required/)
  assert.match(form, /I agree to receive occasional Helios marketing emails/)
  assert.match(form, /unsubscribe at any time/)
  assert.match(form, /to="\/privacy"/)
  assert.match(form, /fetch\('\/api\/marketing\/subscribe'/)
  assert.match(form, /consent: true/)
  assert.match(form, /source: 'landing'/)
})

test('public marketing form asks only for an email address', () => {
  assert.match(form, /type="email"/)
  assert.doesNotMatch(form, /clientId|client_id|sessionId|session_id|transcript|clinical/i)
})
