import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { hasLegacyAccess, hasWorkspaceAccess } from '../api/_lib/billing-access.js'

const authGate = await readFile(new URL('../src/AuthGate.vue', import.meta.url), 'utf8')
const billingStatus = await readFile(new URL('../api/billing/status.js', import.meta.url), 'utf8')

test('authenticated Free and existing paid accounts retain workspace access', () => {
  const existing = { id: 'legacy-therapist', created_at: '2026-09-24T23:59:59Z' }
  const newAccount = { id: 'new-therapist', created_at: '2026-09-25T10:00:00Z' }
  assert.equal(hasLegacyAccess(existing), true)
  assert.equal(hasLegacyAccess(newAccount), false)
  assert.equal(hasWorkspaceAccess(existing, null), true)
  assert.equal(hasWorkspaceAccess(newAccount, null), true)
  assert.equal(hasWorkspaceAccess(newAccount, { status: 'trialing' }), true)
  assert.equal(hasWorkspaceAccess(newAccount, { status: 'active' }), true)
  assert.equal(hasWorkspaceAccess(newAccount, { status: 'past_due' }), true)
  assert.equal(hasWorkspaceAccess(newAccount, { status: 'canceled' }), true)
  assert.equal(hasWorkspaceAccess(null, null), false)
})

test('the authenticated shell waits for server billing status and offers checkout', () => {
  assert.match(billingStatus, /hasWorkspaceAccess: hasWorkspaceAccess\(user, data\)/)
  assert.match(billingStatus, /legacyAccess: hasLegacyAccess\(user\)/)
  assert.match(authGate, /session && billingLoading/)
  assert.match(authGate, /session && !billingAllowed/)
  assert.match(authGate, /\/api\/billing\/status/)
  assert.match(authGate, /\/api\/billing\/checkout/)
  assert.match(authGate, /Check access again/)
  assert.match(authGate, /No payment card required/)
  assert.doesNotMatch(authGate, /Start 7-day free trial/)
})
