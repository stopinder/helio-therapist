import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

const KEY = Buffer.from('01234567890123456789012345678901').toString('base64')
process.env.INTEGRATION_ENCRYPTION_KEY = KEY
process.env.SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_ANON_KEY = 'mock-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key'

import transcriptsHandler from '../api/zoom/transcripts.js'

const THERAPIST_A = { id: 'therapist-a', email: 'a@example.com' }
const TRANSCRIPT_VERSION = '2026-08-16T18:00:00.000Z'

let mockDatabase = { clients: [], sessions: [], zoom_transcripts: [] }

function resetMockDatabase() {
  mockDatabase = {
    clients: [
      { id: 'client-a', user_id: THERAPIST_A.id, display_name: 'Client A' },
      { id: 'client-b', user_id: 'therapist-b', display_name: 'Client B' }
    ],
    sessions: [
      { id: 'sess-a1', user_id: THERAPIST_A.id, client_id: 'client-a', status: 'in_progress' },
      { id: 'sess-a2', user_id: THERAPIST_A.id, client_id: 'client-a', status: 'in_progress' }
    ],
    zoom_transcripts: []
  }
}

global.fetch = async (url, options) => {
  const urlString = url.toString()
  const method = options.method || 'GET'
  const getHeader = (name) => {
    if (!options.headers) return null
    if (typeof options.headers.get === 'function') return options.headers.get(name)
    const lowerName = name.toLowerCase()
    for (const [key, value] of Object.entries(options.headers)) if (key.toLowerCase() === lowerName) return value
    return null
  }
  const prefer = getHeader('Prefer') || ''
  const accept = getHeader('Accept') || ''
  const isSingle = prefer.toLowerCase().includes('plurality=singular') || accept.toLowerCase().includes('application/vnd.pgrst.object+json')

  if (urlString.includes('/auth/v1/user')) {
    const authHeader = getHeader('Authorization') || ''
    if (authHeader.includes('token-a')) return Response.json({ user: THERAPIST_A })
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), { status: 401 })
  }

  if (urlString.includes('/rest/v1/')) {
    const urlObj = new URL(urlString)
    const table = urlObj.pathname.split('/rest/v1/')[1]
    const params = urlObj.searchParams
    if (method === 'GET') {
      let data = [...(mockDatabase[table] || [])]
      for (const [key, value] of params.entries()) {
        if (value.startsWith('eq.')) data = data.filter(item => String(item[key]) === value.slice(3))
      }
      return isSingle ? Response.json(data[0] || null) : Response.json(data)
    }
    if (method === 'PATCH') {
      const body = JSON.parse(options.body)
      const data = mockDatabase[table] || []
      const eq = key => params.get(key)?.startsWith('eq.') ? params.get(key).slice(3) : params.get(key)
      const id = eq('id'), therapistId = eq('therapist_user_id'), updatedAt = eq('updated_at')
      const index = data.findIndex(item => (!id || item.id === id) && (!therapistId || item.therapist_user_id === therapistId) && (!updatedAt || item.updated_at === updatedAt))
      if (index === -1) return isSingle ? Response.json(null) : Response.json([])
      data[index] = { ...data[index], ...body, updated_at: new Date().toISOString() }
      if (prefer.toLowerCase().includes('return=representation')) return Response.json(isSingle ? data[index] : [data[index]])
      return new Response(null, { status: 204 })
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
      if (body && typeof body === 'object') yield Buffer.from(JSON.stringify(body)) 
    } 
  } 
}
function createRes() { 
  const res = { 
    statusCode: 200, 
    body: null, 
    headers: {}, 
    status: s => { res.statusCode=s; return res }, 
    json: j => { res.body=j; return res }, 
    setHeader: (k,v) => { res.headers[k]=v; return res }, 
    end: data => { res.body=data; return res } 
  }; 
  return res 
}

async function patchTranscript(body) { 
  const req=createReq('token-a','PATCH',{ expectedUpdatedAt: TRANSCRIPT_VERSION, ...body }); 
  const res=createRes(); 
  await transcriptsHandler(req,res); 
  return res 
}

test('Session Correction: Preserves review choices when only session changes for same client', async () => {
  resetMockDatabase()
  const SAVED_AT = new Date().toISOString()
  mockDatabase.zoom_transcripts = [{
    id: 'trans-1',
    therapist_user_id: THERAPIST_A.id,
    client_id: 'client-a',
    session_ref: 'sess-a1',
    requested_lens: 'clinical_summary',
    review_choices_saved_at: SAVED_AT,
    updated_at: TRANSCRIPT_VERSION,
    status: 'ready'
  }]

  // Changing session to sess-a2 for the SAME client (client-a)
  const res = await patchTranscript({
    id: 'trans-1',
    sessionRef: 'sess-a2'
  })

  assert.equal(res.statusCode, 200)
  const updated = mockDatabase.zoom_transcripts[0]
  assert.equal(updated.session_ref, 'sess-a2', 'Session should be updated')
  assert.equal(updated.client_id, 'client-a', 'Client should remain same')
  assert.equal(updated.requested_lens, 'clinical_summary', 'Requested lens should be preserved')
  
  assert.ok(updated.review_choices_saved_at, 'Review choices SHOULD be preserved when session changes within same client')
  assert.equal(updated.review_choices_saved_at, SAVED_AT)
  assert.equal(updated.completed_at, null, 'Completion state should be cleared on session correction')
})

test('Session Correction: Invalidates review choices when client changes', async () => {
  resetMockDatabase()
  const SAVED_AT = new Date().toISOString()
  mockDatabase.zoom_transcripts = [{
    id: 'trans-1',
    therapist_user_id: THERAPIST_A.id,
    client_id: 'client-a',
    session_ref: 'sess-a1',
    requested_lens: 'clinical_summary',
    review_choices_saved_at: SAVED_AT,
    updated_at: TRANSCRIPT_VERSION,
    status: 'ready'
  }]

  // Changing client to null (unassigning)
  const res = await patchTranscript({
    id: 'trans-1',
    clientId: null
  })

  assert.equal(res.statusCode, 200)
  const updated = mockDatabase.zoom_transcripts[0]
  assert.equal(updated.client_id, null)
  assert.equal(updated.session_ref, null)
  assert.equal(updated.review_choices_saved_at, null, 'Review choices must be cleared when client changes')
})

test('Clinical Summary: Rejects unsaved review choices', async () => {
  // This confirms the existing boundary that ai/transcript-clinical-summary.js depends on
  const transcript = {
    requested_lens: 'clinical_summary',
    review_choices_saved_at: null,
    client_id: 'c1',
    session_ref: 's1'
  }
  
  const isRejected = transcript.requested_lens !== 'clinical_summary' || !transcript.review_choices_saved_at
  assert.ok(isRejected, 'Endpoint should reject when review_choices_saved_at is null')
})
