import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

// SET ENV BEFORE IMPORTS
const KEY = Buffer.from('01234567890123456789012345678901').toString('base64')
process.env.INTEGRATION_ENCRYPTION_KEY = KEY
process.env.SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_ANON_KEY = 'mock-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key'

import transcriptsHandler from '../api/zoom/transcripts.js'

const THERAPIST_A = { id: 'therapist-a', email: 'a@example.com' }

let mockDatabase = {
  clients: [
    { id: 'client-1', user_id: THERAPIST_A.id, name: 'Test Client' }
  ],
  zoom_transcripts: [
    {
      id: 'transcript-1',
      therapist_user_id: THERAPIST_A.id,
      zoom_meeting_id: '123456789',
      original_transcript: 'Hello world',
      status: 'unassigned',
      received_at: new Date().toISOString()
    }
  ]
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
  
  if (urlString.includes('/auth/v1/user')) {
    return Response.json({ user: THERAPIST_A })
  }

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
      }
      return Response.json(data)
    }

    if (method === 'PATCH') {
      const body = JSON.parse(options.body)
      let data = mockDatabase[table] || []
      const id = params.get('id')?.startsWith('eq.') ? params.get('id').slice(3) : params.get('id')
      
      const index = data.findIndex(item => item.id === id)
      if (index === -1) return new Response(null, { status: 404 })

      data[index] = { ...data[index], ...body }
      return Response.json([data[index]])
    }
  }
  return Response.json({ error: 'Not found' }, { status: 404 })
}

function createReq(method = 'GET', body = {}, query = {}) {
  return {
    method,
    headers: { authorization: 'Bearer token-a' },
    body,
    query
  }
}

function createRes() {
  const res = {
    statusCode: 200,
    body: null,
    status: (s) => { res.statusCode = s; return res },
    json: (j) => { res.body = j; return res },
    setHeader: () => res
  }
  return res
}

test('Reproduction: assign transcript to client and verify it is returned for that client', async (t) => {
  // 1. Assign transcript to client
  const patchReq = createReq('PATCH', {
    id: 'transcript-1',
    clientId: 'client-1'
  })
  const patchRes = createRes()
  await transcriptsHandler(patchReq, patchRes)

  assert.strictEqual(patchRes.statusCode, 200)
  assert.strictEqual(patchRes.body.transcript.clientId, 'client-1')
  assert.strictEqual(mockDatabase.zoom_transcripts[0].client_id, 'client-1')

  // 2. Fetch transcripts (simulating ClientTranscriptsPanel.vue load)
  const getReq = createReq('GET')
  const getRes = createRes()
  await transcriptsHandler(getReq, getRes)

  assert.strictEqual(getRes.statusCode, 200)
  const transcripts = getRes.body.transcripts
  const assigned = transcripts.find(t => t.id === 'transcript-1')
  
  assert.ok(assigned, 'Transcript should be present in the list')
  assert.strictEqual(assigned.clientId, 'client-1', 'Transcript should have the correct clientId')
  
  // 3. Simulate ClientTranscriptsPanel.vue local filtering
  const clientTranscripts = transcripts.filter(item => String(item.clientId || '') === 'client-1')
  assert.strictEqual(clientTranscripts.length, 1, 'Should find one transcript for client-1')
})
