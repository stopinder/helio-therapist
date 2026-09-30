import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const checkout = fs.readFileSync('api/billing/checkout.js', 'utf8')

test('existing Helios accounts do not receive a new free trial', () => {
  assert.match(checkout, /hasLegacyAccess\(user\)/)
  assert.match(checkout, /legacyAccess\s*\?\s*\{ metadata:/)
  assert.match(checkout, /trial_period_days:\s*7/)
  assert.match(checkout, /billing_plan:\s*'monthly'/)
})
