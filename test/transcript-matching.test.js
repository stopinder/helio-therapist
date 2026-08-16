import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

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
const TRANSCRIPT_VERSION = '2026-08-16T18:00:00.000Z'

let mockDatabase = { clients: [], sessions: [], zoom_transcripts: [], zoom_session_links: [], integrations: [], zoom_webhook_events: [] }

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
    zoom_transcripts: [], zoom_session_links: [],
    integrations: [
      { user_id: THERAPIST_A.id, provider: 'zoom', provider_account_id: 'zoom-host-a', encrypted_access_token: encryptIntegrationToken('token-a'), encrypted_refresh_token: encryptIntegrationToken('ref-a'), expires_at: '2099-01-01T00:00:00Z' },
      { user_id: THERAPIST_B.id, provider: 'zoom', provider_account_id: 'zoom-host-b', encrypted_access_token: encryptIntegrationToken('token-b'), encrypted_refresh_token: encryptIntegrationToken('ref-b'), expires_at: '2099-01-01T00:00:00Z' }
    ],
    zoom_webhook_events: []
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
    if (authHeader.includes('token-b')) return Response.json({ user: THERAPIST_B })
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), { status: 401 })
  }

  if (urlString.includes('zoom.us')) {
    if (urlString.includes('/recordings')) return Response.json({ recording_files: [{ id: 'file-123', file_type: 'TRANSCRIPT', download_url: 'https://api.zoom.us/dl' }] })
    if (urlString.includes('/transcript')) return Response.json({ download_url: 'https://api.zoom.us/dl' })
    if (urlString.includes('/dl')) return new Response('WEBVTT\n1\n00:00:00.000 --> 00:00:10.000\nHello world')
    if (urlString.includes('/oauth/token')) return Response.json({ access_token: 'new-token', expires_in: 3600, token_type: 'Bearer' })
    if (urlString.includes('/users/me')) return Response.json({ id: 'zoom-host-a' })
  }

  if (urlString.includes('/rest/v1/')) {
    const urlObj = new URL(urlString)
    const table = urlObj.pathname.split('/rest/v1/')[1]
    const params = urlObj.searchParams
    if (method === 'GET') {
      let data = [...(mockDatabase[table] || [])]
      for (const [key, value] of params.entries()) {
        if (value.startsWith('eq.')) data = data.filter(item => String(item[key]) === value.slice(3))
        if (value.startsWith('in.')) data = data.filter(item => value.slice(4, -1).split(',').includes(String(item[key])))
      }
      return isSingle ? Response.json(data[0] || null) : Response.json(data)
    }
    if (method === 'POST') {
      const body = JSON.parse(options.body); const rows = Array.isArray(body) ? body : [body]
      rows.forEach(row => { if (!row.id && table !== 'zoom_session_links' && table !== 'integrations') row.id = crypto.randomUUID(); mockDatabase[table].push(row) })
      if (prefer.toLowerCase().includes('return=representation')) return Response.json(isSingle ? rows[0] : rows)
      return new Response(JSON.stringify(rows), { status: 201 })
    }
    if (method === 'PATCH') {
      const body = JSON.parse(options.body); const data = mockDatabase[table] || []
      const eq = key => params.get(key)?.startsWith('eq.') ? params.get(key).slice(3) : params.get(key)
      const id = eq('id'), therapistId = eq('therapist_user_id'), sessionRef = eq('session_ref'), updatedAt = eq('updated_at')
      const index = data.findIndex(item => (!id || item.id === id) && (!therapistId || item.therapist_user_id === therapistId) && (!sessionRef || item.session_ref === sessionRef) && (!updatedAt || item.updated_at === updatedAt))
      if (index === -1) return isSingle ? Response.json(null) : Response.json([])
      data[index] = { ...data[index], ...body }
      if (prefer.toLowerCase().includes('return=representation')) return Response.json(isSingle ? data[index] : [data[index]])
      return new Response(null, { status: 204 })
    }
    if (method === 'PUT') {
      const body = JSON.parse(options.body); const data = mockDatabase[table] || []
      if (table === 'zoom_transcripts') {
        const i = data.findIndex(t => t.therapist_user_id === body.therapist_user_id && (t.zoom_recording_file_id === body.zoom_recording_file_id || (body.id && t.id === body.id)))
        if (i !== -1) data[i] = { ...data[i], ...body, updated_at: new Date().toISOString() }; else { if (!body.id) body.id = crypto.randomUUID(); data.push(body) }
      } else if (table === 'zoom_session_links') {
        const i = data.findIndex(l => l.therapist_user_id === body.therapist_user_id && l.session_ref === body.session_ref)
        if (i !== -1) data[i] = { ...data[i], ...body, updated_at: new Date().toISOString() }; else data.push(body)
      }
      return new Response(null, { status: 201 })
    }
  }
  return Response.json({ error: 'Not found' }, { status: 404 })
}

function createReq(token, method = 'GET', body = {}, query = {}, headers = {}) { return { method, headers: { authorization: `Bearer ${token}`, ...headers }, body, query, [Symbol.asyncIterator]: async function* () { if (body && typeof body === 'object') yield Buffer.from(JSON.stringify(body)) } } }
function createRes() { const res = { statusCode: 200, body: null, headers: {}, status: s => { res.statusCode=s; return res }, json: j => { res.body=j; return res }, setHeader: (k,v) => { res.headers[k]=v; return res }, end: data => { res.body=data; return res } }; return res }

function versionedTranscript(overrides = {}) { return { id: 'trans-1', therapist_user_id: THERAPIST_A.id, status: 'unassigned', updated_at: TRANSCRIPT_VERSION, ...overrides } }

async function patchTranscript(body) { const req=createReq('token-a','PATCH',{ expectedUpdatedAt: TRANSCRIPT_VERSION, ...body }); const res=createRes(); await transcriptsHandler(req,res); return res }

test('Transcript Matching: Assign valid client and session', async () => {
  resetMockDatabase(); mockDatabase.zoom_transcripts=[versionedTranscript()]
  const res=await patchTranscript({ id:'trans-1', clientId:'client-a1', sessionRef:'sess-a1' })
  assert.equal(res.statusCode,200); assert.equal(res.body.transcript.clientId,'client-a1'); assert.equal(res.body.transcript.sessionRef,'sess-a1'); assert.equal(res.body.transcript.status,'ready')
})

test('Transcript Matching: Reject cross-client session assignment', async () => {
  resetMockDatabase(); mockDatabase.clients.push({ id:'client-a2', user_id:THERAPIST_A.id, display_name:'Client A2' }); mockDatabase.zoom_transcripts=[versionedTranscript()]
  const res=await patchTranscript({ id:'trans-1', clientId:'client-a2', sessionRef:'sess-a1' })
  assert.equal(res.statusCode,404); assert.equal(res.body.error,'That session was not found for this client.')
})

test('Transcript Matching: Reject cross-therapist client assignment', async () => {
  resetMockDatabase(); mockDatabase.zoom_transcripts=[versionedTranscript()]
  const res=await patchTranscript({ id:'trans-1', clientId:'client-b1' })
  assert.equal(res.statusCode,404); assert.equal(res.body.error,'That client was not found.')
})

function signedWebhook(hostId='zoom-host-a') {
  const timestamp=Math.floor(Date.now()/1000).toString(); const body={ event:'recording.completed', payload:{ object:{ id:'meeting-123', host_id:hostId, recording_files:[{ id:'file-123', file_type:'TRANSCRIPT' }] } } }
  const signature=`v0=${crypto.createHmac('sha256','test-secret').update(`v0:${timestamp}:`).update(JSON.stringify(body)).digest('hex')}`
  return { req:createReq(null,'POST',body,{}, {'x-zm-request-timestamp':timestamp,'x-zm-signature':signature}), body }
}

test('Transcript Matching: Unmatched transcript remains unassigned', async () => {
  resetMockDatabase(); const {req}=signedWebhook(); const res=createRes(); await webhookHandler(req,res); assert.equal(res.statusCode,200); const transcript=mockDatabase.zoom_transcripts.find(t=>t.zoom_meeting_id==='meeting-123'); assert.ok(transcript); assert.equal(transcript.status,'unassigned'); assert.equal(transcript.client_id,null)
})

test('Transcript Matching: Auto-matches if session link exists', async () => {
  resetMockDatabase(); mockDatabase.zoom_session_links=[{ therapist_user_id:THERAPIST_A.id, client_id:'client-a1', session_ref:'sess-a1', zoom_meeting_id:'meeting-123', status:'started' }]; const {req}=signedWebhook(); const res=createRes(); await webhookHandler(req,res); assert.equal(res.statusCode,200); const transcript=mockDatabase.zoom_transcripts.find(t=>t.zoom_meeting_id==='meeting-123'); assert.ok(transcript); assert.equal(transcript.status,'ready'); assert.equal(transcript.client_id,'client-a1'); assert.equal(transcript.session_ref,'sess-a1')
})

test('Transcript Matching: Unknown host is not assigned to the only connected therapist', async () => {
  resetMockDatabase(); mockDatabase.integrations=[{ user_id:THERAPIST_B.id, provider:'zoom', provider_account_id:'zoom-host-b', encrypted_access_token:encryptIntegrationToken('token-b'), encrypted_refresh_token:encryptIntegrationToken('ref-b'), expires_at:'2099-01-01T00:00:00Z' }]
  const {req}=signedWebhook('unknown-host'); const res=createRes(); await webhookHandler(req,res); assert.equal(res.statusCode,200); assert.equal(mockDatabase.zoom_transcripts.length,0)
})