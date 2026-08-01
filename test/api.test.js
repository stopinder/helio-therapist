import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert'

// We will mock supabase client directly in src/lib/api.js via proxy or import manipulation
// But since we can't easily redefine imports in node:test without loaders,
// we'll use the fact that supabase in src/lib/supabase.js is exported.
// However, the issue is that src/lib/supabase.js returns null when env vars are missing.

// Mocking global fetch and window
const originalFetch = global.fetch
const originalWindow = global.window
const originalCustomEvent = global.CustomEvent

// Import the module we want to test. 
// We need to ensure supabase is NOT null when this is imported.
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'fake-key'

const { authenticatedFetch } = await import('../src/lib/api.js')
const { supabase } = await import('../src/lib/supabase.js')

describe('authenticatedFetch Logic', () => {
  let fetchCalls = []
  let dispatchCalls = []

  before(() => {
    global.window = {
      dispatchEvent: (event) => {
        dispatchCalls.push(event)
      }
    }
    global.CustomEvent = class {
      constructor(type, detail) {
        this.type = type
        this.detail = detail
      }
    }
  })

  after(() => {
    global.fetch = originalFetch
    global.window = originalWindow
    global.CustomEvent = originalCustomEvent
  })

  beforeEach(() => {
    fetchCalls = []
    dispatchCalls = []
    // Reset supabase mock behavior if needed
    if (supabase) {
      let session = { access_token: 'valid-token' }
      supabase.auth.getSession = async () => {
        return { data: { session }, error: null }
      }
      supabase.auth.refreshSession = async () => {
        session = { access_token: 'new-token' }
        return { data: { session }, error: null }
      }
      supabase.auth.signOut = async () => {
        session = null
        return { error: null }
      }
    }
  })

  it('successful first request', async () => {
    global.fetch = async (url, options) => {
      fetchCalls.push({ url, options })
      return { status: 200, ok: true, json: async () => ({ success: true }) }
    }

    const res = await authenticatedFetch('/api/test')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(fetchCalls.length, 1)
    assert.strictEqual(fetchCalls[0].options.headers.get('Authorization'), 'Bearer valid-token')
  })

  it('successful recovery on 401', async () => {
    let callCount = 0
    global.fetch = async (url, options) => {
      callCount++
      fetchCalls.push({ url, options })
      if (callCount === 1) return { status: 401, ok: false }
      return { status: 200, ok: true, json: async () => ({ success: true }) }
    }

    const res = await authenticatedFetch('/api/test')
    assert.strictEqual(res.status, 200)
    assert.strictEqual(fetchCalls.length, 2)
    assert.strictEqual(fetchCalls[1].options.headers.get('Authorization'), 'Bearer new-token')
  })

  it('failed recovery on 401 triggers local sign-out and event', async () => {
    supabase.auth.refreshSession = async () => ({ data: { session: null }, error: new Error('Refresh failed') })
    
    global.fetch = async (url, options) => {
      fetchCalls.push({ url, options })
      return { status: 401, ok: false }
    }

    try {
      await authenticatedFetch('/api/test')
      assert.fail('Should have thrown expiry error')
    } catch (e) {
      assert.ok(e.message.includes('expired'))
    }

    assert.strictEqual(fetchCalls.length, 1)
    assert.strictEqual(dispatchCalls.length, 1)
    assert.strictEqual(dispatchCalls[0].type, 'helios-session-expired')
  })

  it('no infinite loop on repeated 401', async () => {
    global.fetch = async (url, options) => {
      fetchCalls.push({ url, options })
      return { status: 401, ok: false }
    }

    // Even if refresh succeeds, it should only retry once
    supabase.auth.refreshSession = async () => ({ data: { session: { access_token: 'new-token' } }, error: null })

    const res = await authenticatedFetch('/api/test')
    assert.strictEqual(res.status, 401)
    assert.strictEqual(fetchCalls.length, 2) // Original + 1 retry
  })

  it('Google 403 does not trigger Helios sign-out', async () => {
    global.fetch = async (url, options) => {
      fetchCalls.push({ url, options })
      return { status: 403, ok: false, json: async () => ({ code: 'GOOGLE_REAUTH_REQUIRED' }) }
    }

    const res = await authenticatedFetch('/api/google/events')
    assert.strictEqual(res.status, 403)
    assert.strictEqual(fetchCalls.length, 1)
    assert.strictEqual(dispatchCalls.length, 0)
  })
})
