import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolvePlanEntitlements, canActivateClient } from '../api/_lib/plan-entitlements.js'
import { hasWorkspaceAccess } from '../api/_lib/billing-access.js'

const signup = readFileSync(new URL('../src/AuthGate.vue', import.meta.url), 'utf8')
const checkout = readFileSync(new URL('../api/billing/checkout.js', import.meta.url), 'utf8')
const status = readFileSync(new URL('../api/billing/status.js', import.meta.url), 'utf8')
const loopsTrial = readFileSync(new URL('../api/_lib/loops-trial.js', import.meta.url), 'utf8')
const newUser = { id: 'new-user', created_at: '2026-10-20T12:00:00Z' }

test('Free signup does not require Stripe or payment card', () => {
  assert.match(signup, /supabase\.auth\.signUp/)
  assert.match(signup, /No payment card required/)
  assert.doesNotMatch(checkout, /trial_period_days\s*:/)
  assert.doesNotMatch(signup, /Start 7-day free trial/)
})

test('Free client quota is five; archiving restores a slot', () => {
  assert.equal(resolvePlanEntitlements({ user: newUser }).plan, 'free')
  assert.equal(resolvePlanEntitlements({ user: newUser }).activeClientLimit, 5)
  assert.equal(hasWorkspaceAccess(newUser, null), true)
  assert.equal(canActivateClient({ plan: 'free', activeClientCount: 4 }), true)
  assert.equal(canActivateClient({ plan: 'free', activeClientCount: 5 }), false)
})

test('Paid, grandfathered and existing trials retain access', () => {
  assert.equal(resolvePlanEntitlements({ user: newUser, subscription: { status: 'active' } }).plan, 'professional')
  assert.equal(resolvePlanEntitlements({ user: newUser, subscription: { status: 'trialing' } }).plan, 'professional')
  assert.equal(resolvePlanEntitlements({ user: { id: 'existing', created_at: '2026-09-24T12:00:00Z' } }).plan, 'legacy')
})

test('Canceled billing reverts to Free but never erases records or blocks workspace', () => {
  assert.equal(resolvePlanEntitlements({ user: newUser, subscription: { status: 'canceled' } }).plan, 'free')
  assert.equal(hasWorkspaceAccess(newUser, { status: 'canceled' }), true)
  assert.equal(hasWorkspaceAccess(null, null), false)
})

test('Billing status reports plan and limit from authenticated backend', () => {
  assert.match(status, /requireAuthenticatedUser\(req\)/)
  assert.match(status, /resolvePlanEntitlements/)
  assert.match(status, /activeClientLimit: entitlement\.activeClientLimit/)
})

test('Trial email is not sent for a new paid subscription', () => {
  assert.match(loopsTrial, /subscription\?\.status !== 'trialing'/)
  assert.match(checkout, /subscription_data: subscriptionData/)
})
