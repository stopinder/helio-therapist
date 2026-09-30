import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const annual = fs.readFileSync('api/billing/annual.js', 'utf8')
const authGate = fs.readFileSync('src/AuthGate.vue', 'utf8')
const landing = fs.readFileSync('src/views/Landing.vue', 'utf8')

test('annual billing uses the live £290 yearly Stripe price', () => {
  assert.match(annual, /price_1ULJ1uBCxePdT6Vno9ULJ9v0/)
  assert.match(annual, /mode:\s*'subscription'/)
  assert.match(annual, /billing_cycle_anchor:\s*'now'/)
  assert.match(annual, /proration_behavior:\s*'create_prorations'/)
})

test('non-trial users can choose annual billing', () => {
  assert.match(authGate, /Pay annually — £290\/year/)
  assert.match(authGate, /\/api\/billing\/annual/)
  assert.match(landing, /£290\/year paid upfront — two months free/)
})
