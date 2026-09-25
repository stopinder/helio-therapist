import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { hasWorkspaceAccess } from '../api/_lib/billing-access.js'

const authGate = await readFile(new URL('../src/AuthGate.vue', import.meta.url), 'utf8')
const billingStatus = await readFile(new URL('../api/billing/status.js', import.meta.url), 'utf8')

test('existing accounts retain access while a new account needs an active trial or subscription', () => {
  const existing = { created_at: '2026-09-24T23:59:59Z' }
  const newAccount = { created_at: '2026-09-25T10:00:00Z' }
  assert.equal(hasWorkspaceAccess(existing, null), true)
  assert.equal(hasWorkspaceAccess(newAccount, null), false)
  assert.equal(hasWorkspaceAccess(newAccount, { status: 'trialing' }), true)
  assert.equal(hasWorkspaceAccess(newAccount, { status: 'active' }), true)
  assert.equal(hasWorkspaceAccess(newAccount, { status: 'past_due' }), false)
  assert.equal(hasWorkspaceAccess(newAccount, { status: 'canceled' }), false)
})

test('the authenticated shell waits for server billing status and offers checkout', () => {
  assert.match(billingStatus, /hasWorkspaceAccess: hasWorkspaceAccess\(user, data\)/)
  assert.match(authGate, /session && \(billingLoading \|\| !billingAllowed\)/)
  assert.match(authGate, /\/api\/billing\/status/)
  assert.match(authGate, /\/api\/billing\/checkout/)
  assert.match(authGate, /Check subscription again/)
})
