import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const checkout = fs.readFileSync('api/billing/checkout.js', 'utf8')

test('no account receives an automatic trial when upgrading to Professional', () => {
  assert.doesNotMatch(checkout, /trial_period_days\s*:/)
  assert.match(checkout, /billing_plan:\s*'monthly'/)
  assert.match(checkout, /mode:\s*'subscription'/)
})
