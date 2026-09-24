import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const router = fs.readFileSync('src/router/index.js', 'utf8')
const gate = fs.readFileSync('src/AuthGate.vue', 'utf8')
const setup = fs.readFileSync('src/views/SubscriptionSetup.vue', 'utf8')
const checkout = fs.readFileSync('api/billing/checkout.js', 'utf8')

test('authenticated users need a trialing or active subscription for the workspace', () => {
  assert.match(router, /\['trialing', 'active'\]\.includes\(status\)/)
  assert.match(router, /path: '\/subscription\/setup'/)
  assert.match(router, /Authorization: `Bearer \$\{data\.session\.access_token\}`/)
})

test('subscription setup is outside the workspace shell and starts Stripe checkout', () => {
  assert.match(gate, /session && route\.meta\.subscriptionSetup/)
  assert.match(setup, /Start 30-day free trial/)
  assert.match(setup, /\/api\/billing\/checkout/)
})

test('checkout returns to subscription setup until webhook entitlement is visible', () => {
  assert.match(checkout, /success_url: `\$\{origin\}\/subscription\/setup\?billing=success`/)
  assert.match(checkout, /cancel_url: `\$\{origin\}\/subscription\/setup\?billing=cancelled`/)
})
