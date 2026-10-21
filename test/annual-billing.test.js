import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const annual = fs.readFileSync('api/billing/annual.js', 'utf8')
const authGate = fs.readFileSync('src/AuthGate.vue', 'utf8')
const settings = fs.readFileSync('src/components/Settings.vue', 'utf8')

test('annual billing uses the live £290 yearly Stripe price', () => {
  assert.match(annual, /price_1ULJ1uBCxePdT6Vno9ULJ9v0/)
  assert.match(annual, /mode:\s*'subscription'/)
  assert.match(annual, /billing_cycle_anchor:\s*'now'/)
  assert.match(annual, /proration_behavior:\s*'create_prorations'/)
})

test('non-trial users can choose annual billing', () => {
  assert.match(authGate, /No payment card required/)
  assert.match(authGate, /\/api\/billing\/annual/)
  assert.match(settings, /@click="startAnnualSubscription"/)
  assert.match(settings, /\/api\/billing\/annual/)
})
