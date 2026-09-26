import test from 'node:test'
import assert from 'node:assert/strict'
import { checkBilling, clearBillingCache, setCachedAccess } from '../src/lib/billing.js'

test('Billing logic for session refresh and user switch', async (t) => {
  const userA = { id: 'user-a' }
  const userB = { id: 'user-b' }
  const tokenA1 = 'token-a-1'
  const tokenA2 = 'token-a-2'
  const tokenB1 = 'token-b-1'

  let fetchCount = 0
  global.fetch = async (url, options) => {
    fetchCount++
    const auth = options.headers.Authorization
    if (auth === `Bearer ${tokenA1}` || auth === `Bearer ${tokenA2}`) {
      return { ok: true, json: async () => ({ subscription: { status: 'active' } }) }
    }
    if (auth === `Bearer ${tokenB1}`) {
      return { ok: true, json: async () => ({ subscription: { status: 'trialing' } }) }
    }
    return { ok: false, json: async () => ({}) }
  }

  await t.test('Initial check for User A', async () => {
    clearBillingCache()
    fetchCount = 0
    const access = await checkBilling({ user: userA, access_token: tokenA1 })
    assert.equal(access, true)
    assert.equal(fetchCount, 1)
  })

  await t.test('Session refresh for User A (same ID, different token) uses cache', async () => {
    const access = await checkBilling({ user: userA, access_token: tokenA2 })
    assert.equal(access, true)
    assert.equal(fetchCount, 1)
  })

  await t.test('Switch to User B clears old access and fetches new', async () => {
    const access = await checkBilling({ user: userB, access_token: tokenB1 })
    assert.equal(access, true)
    assert.equal(fetchCount, 2)
  })

  await t.test('Sign out clears everything', async () => {
    setCachedAccess(userB.id, true)
    clearBillingCache()
    fetchCount = 0
    const access = await checkBilling({ user: userB, access_token: tokenB1 })
    assert.equal(access, true)
    assert.equal(fetchCount, 1)
  })

  await t.test('Handling billing errors explicitly', async () => {
    clearBillingCache()
    global.fetch = async () => { throw new Error('Network error') }
    try {
      await checkBilling({ user: userA, access_token: tokenA1 })
      assert.fail('Should throw')
    } catch (e) {
      assert.equal(e.message, 'Network error')
    }
  })
})
