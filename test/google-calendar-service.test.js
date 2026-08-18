import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchGoogleCalendarEvents, GoogleCalendarAuthError } from '../api/_lib/google-calendar.js'
import { decryptIntegrationToken } from '../api/_lib/token-crypto.js'

function fakeSupabase() {
  const updates = []
  return {
    updates,
    from() {
      return {
        update(value) {
          updates.push(value)
          return { eq() { return this } }
        }
      }
    }
  }
}

function setEncryptionKey() {
  process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
}

test('refreshes an expired legacy Google token, encrypts credentials and retries silently', async () => {
  process.env.GOOGLE_CLIENT_ID = 'client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'client-secret'
  setEncryptionKey()
  const supabase = fakeSupabase()
  const calls = []
  const result = await fetchGoogleCalendarEvents({
    supabase,
    userId: 'therapist-1',
    integration: { access_token: 'expired-token', refresh_token: 'refresh-token' },
    start: new Date('2026-07-21T00:00:00.000Z'),
    end: new Date('2026-07-22T00:00:00.000Z'),
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      if (calls.length === 1) return new Response('', { status: 401 })
      if (calls.length === 2) return Response.json({ access_token: 'fresh-token', expires_in: 3600 })
      return Response.json({ items: [{ id: 'event-1' }] })
    }
  })

  assert.equal(result.items[0].id, 'event-1')
  assert.equal(calls[0].options.headers.Authorization, 'Bearer expired-token')
  assert.equal(calls[2].options.headers.Authorization, 'Bearer fresh-token')
  assert.equal(supabase.updates[0].access_token, null)
  assert.equal(supabase.updates[0].refresh_token, null)
  assert.equal(decryptIntegrationToken(supabase.updates[0].encrypted_access_token), 'fresh-token')
  assert.equal(decryptIntegrationToken(supabase.updates[0].encrypted_refresh_token), 'refresh-token')
})

test('uses encrypted Google credentials without plaintext copies', async () => {
  process.env.GOOGLE_CLIENT_ID = 'client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'client-secret'
  setEncryptionKey()
  const { encryptIntegrationToken } = await import('../api/_lib/token-crypto.js')
  const calls = []
  const result = await fetchGoogleCalendarEvents({
    supabase: fakeSupabase(),
    userId: 'therapist-1',
    integration: { encrypted_access_token: encryptIntegrationToken('valid-token'), encrypted_refresh_token: encryptIntegrationToken('refresh-token') },
    start: new Date('2026-07-21T00:00:00.000Z'),
    end: new Date('2026-07-22T00:00:00.000Z'),
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return calls.length === 1 ? Response.json({ items: [{ id: 'primary' }] }) : Response.json({ items: [{ id: 'event-1' }] })
    }
  })
  assert.equal(result.items[0].id, 'event-1')
  assert.equal(calls[0].options.headers.Authorization, 'Bearer valid-token')
})

test('only asks for reconnect when Google rejects the refresh token', async () => {
  process.env.GOOGLE_CLIENT_ID = 'client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'client-secret'
  setEncryptionKey()
  const supabase = fakeSupabase()
  await assert.rejects(() => fetchGoogleCalendarEvents({
    supabase,
    userId: 'therapist-1',
    integration: { access_token: 'expired-token', refresh_token: 'revoked-token' },
    start: new Date('2026-07-21T00:00:00.000Z'),
    end: new Date('2026-07-22T00:00:00.000Z'),
    fetchImpl: async (_url, options) => options.method === 'POST'
      ? Response.json({ error: 'invalid_grant' }, { status: 400 })
      : new Response('', { status: 401 })
  }), GoogleCalendarAuthError)
})

test('validates range boundaries to prevent 400 errors', async () => {
  const supabase = fakeSupabase()
  const start = new Date('2026-07-21T00:00:00.000Z')
  const end = new Date('2026-07-21T00:00:00.000Z')
  await assert.rejects(() => fetchGoogleCalendarEvents({
    supabase,
    userId: 'therapist-1',
    integration: { access_token: 'valid-token' },
    start,
    end,
    fetchImpl: async () => Response.json({ items: [] })
  }), /Invalid calendar date range/)
})
