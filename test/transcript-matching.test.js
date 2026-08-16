import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

// SET ENV BEFORE IMPORTS
const KEY = Buffer.from('01234567890123456789012345678901').toString('base64')
process.env.INTEGRATION_ENCRYPTION_KEY = KEY
process.env.SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_ANON_KEY = 'mock-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key'
process.env.ZOOM_WEBHOOK_SECRET_TOKEN = 'test-secret'
process.env.ZOOM_CLIENT_ID = 'mock-client-id'
process.env.ZOOM_CLIENT_SECRET = 'mock-client-secret'

import transcriptsHandler from '../api/zoom/transcripts.js'
import webhookHandler from '../api/zoom/webhook.js'
import { encryptIntegrationToken } from '../api/_lib/token-crypto.js'

const THERAPIST_A = { id: 'therapist-a', email: 'a@example.com' }
const THERAPIST_B = { id: 'therapist-b', email: 'b@example.com' }

let mockDatabase = {
  clients: [],
  sessions: [],
  zoom_transcripts: [],
  zoom_session_links: [],
  integrations: [],
  zoom_webhook_events: []
}

function resetMockDatabase() {
  mockDatabase = {
    clients: [
      { id: 'client-a1', user_id: THERAPIST_A.id, display_name: 'Client A1' },
      { id: 'client-b1', user_id: THERAPIST_B.id, display_name: 'Client B1' }
    ],
    sessions: [
      { id: 'sess-a1', user_id: THERAPIST_A.id, client_id: 'client-a1', status: 'in_progress', occurred_at: new Date().toISOString() },
      { id: 'sess-b1', user_id: THERAPIST_B.id, client_id: 'client-b1', status: 'in_progress', occurred_at: new Date().toISOString() }
    ],
    zoom_transcripts: [],
    zoom_session_links: [],
    integrations: [
      { 
        user_id: THERAPIST_A.id, 
        provider: 'zoom', 
        provider_account_id: 'zoom-host-a', 
        encrypted_access_token: encryptIntegrationToken('token-a'), 
        encrypted_refresh_token: encryptIntegrationToken('ref-a'), 
        expires_at: '2099-01-01T00:00:00Z' 
      },
      { 
        user_id: THERAPIST_B.id, 
        provider: 'zoom', 
        provider_account_id: 'zoom-host-b', 
        encrypted_access_token: encryptIntegrationToken('token-b'), 
        encrypted_refresh_token: encryptIntegrationToken('ref-b'), 
        expires_at: '2099-01-01T00:00:00Z' 
      }
    ],
    zoom_webhook_events: []
  }
}

global.fetch = async (url, options) => {
  const urlString = url.toString()
  const method = options.method || 'GET'
  const getHeader = (name) => {
    if (!options.headers) return null;
    if (typeof options.headers.get === 'function') return options.headers.get(name);
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(options.headers)) {
      if (key.toLowerCase() === lowerName) return value;
    }
    return null;
  }
  
  const prefer = getHeader('Prefer') || '';
  const accept = getHeader('Accept') || '';
  const isSingle = prefer.toLowerCase().includes('plurality=singular') || accept.toLowerCase().includes('application/vnd.pgrst.object+json')
  
  // Auth mock
  if (urlString.includes('/auth/v1/user')) {
    const authHeader = getHeader('Authorization') || ''
    if (authHeader.includes('token-a')) return Response.json({ user: THERAPIST_A })
    if (authHeader.includes('token-b')) return Response.json({ user: THERAPIST_B })
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), { status: 401 })
  }

  // Zoom API mock
  if (urlString.includes('zoom.us')) {
    if (urlString.includes('/recordings')) {
      return Response.json({
        recording_files: [{ id: 'file-123', file_type: 'TRANSCRIPT', download_url: 'https://api.zoom.us/dl' }]
      })
    }
    if (urlString.includes('/transcript')) {
      return Response.json({ download_url: 'https://api.zoom.us/dl' })
    }
    if (urlString.includes('/dl')) {
      return new Response('WEBVTT\n1\n00:00:00.000 --> 00:00:10.000\nHello world')
    }
    if (urlString.includes('/oauth/token')) {
      return Response.json({ access_token: 'new-token', expires_in: 3600, token_type: 'Bearer' })
    }
    if (urlString.includes('/users/me')) {
      return Response.json({ id: 'zoom-host-a' })
    }
  }

  // REST mock (Supabase)
  if (urlString.includes('/rest/v1/')) {
    const urlObj = new URL(urlString)
    const table = urlObj.pathname.split('/rest/v1/')[1]
    const params = urlObj.searchParams
    
    if (method === 'GET') {
      let data = [...(mockDatabase[table] || [])]
      for (const [key, value] of params.entries()) {
        if (value.startsWith('eq.')) {
          const expectedValue = value.slice(3)
          data = data.filter(item => String(item[key]) === expectedValue)
        }
        if (value.startsWith('in.')) {
           const values = value.slice(4, -1).split(',')
           data = data.filter(item => values.includes(String(item[key])))
        }
      }

      const prefer = getHeader('Prefer') || '';
      const accept = getHeader('Accept') || '';
      const isSingle = prefer.toLowerCase().includes('plurality=singular') || accept.toLowerCase().includes('application/vnd.pgrst.object+json')
      
      if (isSingle) {
        return Response.json(data[0] || null)
      }
      return Response.json(data)
    }

    if (method === 'POST') {
      const body = JSON.parse(options.body)
      const rows = Array.isArray(body) ? body : [body]
      rows.forEach(row => {
        if (!row.id && table !== 'zoom_session_links' && table !== 'integrations') row.id = crypto.randomUUID()
        mockDatabase[table].push(row)
      })
      if (prefer.toLowerCase().includes('return=representation')) return Response.json(isSingle ? rows[0] : rows)
      return new Response(JSON.stringify(rows), { status: 201 })
    }

    if (method === 'PATCH') {
      const body = JSON.parse(options.body)
      let data = mockDatabase[table] || []
      const id = params.get('id')?.startsWith('eq.') ? params.get('id').slice(3) : params.get('id')
      const therapistId = params.get('therapist_user_id')?.startsWith('eq.') ? params.get('therapist_user_id').slice(3) : params.get('therapist_user_id')
      const sessionRef = params.get('session_ref')?.startsWith('eq.') ? params.get('session_ref').slice(3) : params.get('session_ref')

      const index = data.findIndex(item => 
        (!id || item.id === id) && 
        (!therapistId || item.therapist_user_id === therapistId) &&
        (!sessionRef || item.session_ref === sessionRef)
      )
      
      if (index === -1) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
      }

      data[index] = { ...data[index], ...body }
      if (prefer.toLowerCase().includes('return=representation')) {
         const result = [data[index]]
         const representation = isSingle ? result[0] : result;
         return Response.json(representation)
      }
      return new Response(null, { status: 204 })
    }

    if (method === 'PUT') {
       const body = JSON.parse(options.body)
       let data = mockDatabase[table] || []
       
       if (table === 'zoom_transcripts') {
         const existingIndex = data.findIndex(t => 
           t.therapist_user_id === body.therapist_user_id && 
           (t.zoom_recording_file_id === body.zoom_recording_file_id || (body.id && t.id === body.id))
         )
         if (existingIndex !== -1) {
           data[existingIndex] = { ...data[existingIndex], ...body, updated_at: new Date().toISOString() }
         } else {
           if (!body.id) body.id = crypto.randomUUID()
           data.push(body)
         }
       } else if (table === 'zoom_session_links') {
         const existingIndex = data.findIndex(l => 
           l.therapist_user_id === body.therapist_user_id && 
           l.session_ref === body.session_ref
         )
         if (existingIndex !== -1) {
           data[existingIndex] = { ...data[existingIndex], ...body, updated_at: new Date().toISOString() }
         } else {
           data.push(body)
         }
       }
       return new Response(null, { status: 201 })
    }
  }

  return Response.json({ error: 'Not found' }, { status: 404 })
}

function createReq(token, method = 'GET', body = {}, query = {}, headers = {}) {
  return {
    method,
    headers: { authorization: `Bearer ${token}`, ...headers },
    body,
    query,
    [Symbol.asyncIterator]: async function* () {
       if (body && typeof body === 'object') {
         yield Buffer.from(JSON.stringify(body))
       }
    }
  }
}

function createRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status: (s) => { 
      res.statusCode = s; 
      return res; 
    },
    json: (j) => { 
      res.body = j; 
      return res; 
    },
    setHeader: (k, v) => { res.headers[k] = v; return res },
    end: (data) => { res.body = data; return res }
  }
  return res
}

test('Transcript Matching: Assign valid client and session', async () => {
  resetMockDatabase()
  mockDatabase.zoom_transcripts = [
    { id: 'trans-1', therapist_user_id: THERAPIST_A.id, status: 'unassigned' }
  ]

  const req = createReq('token-a', 'PATCH', { 
    id: 'trans-1', 
    clientId: 'client-a1', 
    sessionRef: 'sess-a1' 
  })
  const res = createRes()

  await transcriptsHandler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(res.body.transcript.clientId, 'client-a1')
  assert.equal(res.body.transcript.sessionRef, 'sess-a1')
  assert.equal(res.body.transcript.status, 'ready')
})

test('Transcript Matching: Reject cross-client session assignment', async () => {
  resetMockDatabase()
  // Add another client for Therapist A
  mockDatabase.clients.push({ id: 'client-a2', user_id: THERAPIST_A.id, display_name: 'Client A2' })
  // Session sess-a1 belongs to client-a1
  mockDatabase.zoom_transcripts = [
    { id: 'trans-1', therapist_user_id: THERAPIST_A.id, status: 'unassigned' }
  ]

  // Attempt to assign client-a2 but sess-a1 (which belongs to client-a1)
  const req = createReq('token-a', 'PATCH', { 
    id: 'trans-1', 
    clientId: 'client-a2', 
    sessionRef: 'sess-a1' 
  })
  const res = createRes()

  await transcriptsHandler(req, res)

  assert.equal(res.statusCode, 404)
  assert.equal(res.body.error, 'That session was not found for this client.')
})

test('Transcript Matching: Reject cross-therapist client assignment', async () => {
  resetMockDatabase()
  mockDatabase.zoom_transcripts = [
    { id: 'trans-1', therapist_user_id: THERAPIST_A.id, status: 'unassigned' }
  ]

  // Therapist A attempts to assign Therapist B's client
  const req = createReq('token-a', 'PATCH', { 
    id: 'trans-1', 
    clientId: 'client-b1'
  })
  const res = createRes()

  await transcriptsHandler(req, res)

  assert.equal(res.statusCode, 404)
  assert.equal(res.body.error, 'That client was not found.')
})

test('Transcript Matching: Unmatched transcript remains unassigned', async () => {
  resetMockDatabase()
  
  // Webhook without session link
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const webhookBody = {
    event: 'recording.completed',
    payload: {
      object: {
        id: 'meeting-123',
        host_id: 'zoom-host-a',
        recording_files: [{ id: 'file-123', file_type: 'TRANSCRIPT' }]
      }
    }
  }
  const signature = `v0=${crypto.createHmac('sha256', 'test-secret').update(`v0:${timestamp}:`).update(JSON.stringify(webhookBody)).digest('hex')}`
  
  const req = createReq(null, 'POST', webhookBody, {}, {
    'x-zm-request-timestamp': timestamp,
    'x-zm-signature': signature
  })
  const res = createRes()

  await webhookHandler(req, res)

  assert.equal(res.statusCode, 200)
  const transcript = mockDatabase.zoom_transcripts.find(t => t.zoom_meeting_id === 'meeting-123')
  assert.ok(transcript)
  assert.equal(transcript.status, 'unassigned')
  assert.equal(transcript.client_id, null)
})

test('Transcript Matching: Auto-matches if session link exists', async () => {
  resetMockDatabase()
  mockDatabase.zoom_session_links = [
    { therapist_user_id: THERAPIST_A.id, client_id: 'client-a1', session_ref: 'sess-a1', zoom_meeting_id: 'meeting-123', status: 'started' }
  ]
  
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const webhookBody = {
    event: 'recording.completed',
    payload: {
      object: {
        id: 'meeting-123',
        host_id: 'zoom-host-a',
        recording_files: [{ id: 'file-123', file_type: 'TRANSCRIPT' }]
      }
    }
  }
  const signature = `v0=${crypto.createHmac('sha256', 'test-secret').update(`v0:${timestamp}:`).update(JSON.stringify(webhookBody)).digest('hex')}`
  
  const req = createReq(null, 'POST', webhookBody, {}, {
    'x-zm-request-timestamp': timestamp,
    'x-zm-signature': signature
  })
  const res = createRes()

  await webhookHandler(req, res)

  assert.equal(res.statusCode, 200)
  const transcript = mockDatabase.zoom_transcripts.find(t => t.zoom_meeting_id === 'meeting-123')
  assert.ok(transcript)
  assert.equal(transcript.status, 'ready')
  assert.equal(transcript.client_id, 'client-a1')
  assert.equal(transcript.session_ref, 'sess-a1')
})

test('Transcript Matching: Unknown host is not assigned to the only connected therapist', async () => {
  resetMockDatabase()
  mockDatabase.integrations = [
    {
      user_id: THERAPIST_B.id,
      provider: 'zoom',
      provider_account_id: 'zoom-host-b',
      encrypted_access_token: encryptIntegrationToken('token-b'),
      encrypted_refresh_token: encryptIntegrationToken('ref-b'),
      expires_at: '2099-01-01T00:00:00Z'
    }
  ]

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const webhookBody = {
    event: 'recording.completed',
    payload: {
      object: {
        id: 'meeting-unknown',
        host_id: 'unknown-host',
        recording_files: [{ id: 'file-123', file_type: 'TRANSCRIPT' }]
      }
    }
  }
  const signature = `v0=${crypto.createHmac('sha256', 'test-secret').update(`v0:${timestamp}:`).update(JSON.stringify(webhookBody)).digest('hex')}`

  const req = createReq(null, 'POST', webhookBody, {}, {
    'x-zm-request-timestamp': timestamp,
    'x-zm-signature': signature
  })
  const res = createRes()

  await webhookHandler(req, res)

  assert.equal(res.statusCode, 200)
  const transcript = mockDatabase.zoom_transcripts.find(t => t.zoom_meeting_id === 'meeting-unknown')
  assert.equal(transcript, undefined)
  const intakeEvent = mockDatabase.zoom_webhook_events.find(event => event.zoom_meeting_id === 'meeting-unknown')
  assert.ok(intakeEvent)
  assert.equal(intakeEvent.processing_status, 'unmatched')
})