import test from 'node:test'
import assert from 'node:assert/strict'
import transcriptsHandler from '../api/zoom/transcripts.js'
import googleStatusHandler from '../api/google/status.js'
import googleEventsHandler from '../api/google/events.js'
import supervisionSummaryHandler from '../api/ai/supervision-summary.js'
import { findReusableSupervisionArtifact } from '../api/_lib/ai-artifacts.js'

// Mocking environment variables
process.env.SUPABASE_URL = 'https://mock.supabase.co'
process.env.SUPABASE_ANON_KEY = 'mock-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key'
process.env.GOOGLE_CLIENT_ID = 'mock-google-id'
process.env.GOOGLE_CLIENT_SECRET = 'mock-google-secret'

const THERAPIST_A = { id: 'therapist-a-id', email: 'a@example.com' }
const THERAPIST_B = { id: 'therapist-b-id', email: 'b@example.com' }

let fetchCalls = []
let mockDatabase = {
  integrations: [],
  zoom_transcripts: [],
  private_reflections: [],
  reflection_supervision_summaries: []
}

global.fetch = async (url, options) => {
  const urlString = url.toString()
  fetchCalls.push({ url: urlString, options })

  // Auth mock
  if (urlString.includes('/auth/v1/user')) {
    const authHeader = options.headers.Authorization || ''
    if (authHeader.includes('token-a')) return Response.json({ user: THERAPIST_A })
    if (authHeader.includes('token-b')) return Response.json({ user: THERAPIST_B })
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), { status: 401 })
  }

  // REST mock (Supabase)
  if (urlString.includes('/rest/v1/')) {
    const table = urlString.split('/rest/v1/')[1].split('?')[0]
    const method = options.method || 'GET'
    const params = new URLSearchParams(urlString.split('?')[1])
    
    if (method === 'GET') {
      let data = mockDatabase[table] || []
      
      // Basic filtering support
      for (const [key, value] of params.entries()) {
        if (value.startsWith('eq.')) {
          const expectedValue = value.slice(3)
          data = data.filter(item => String(item[key]) === expectedValue)
        }
      }

      if (options.headers.Prefer?.includes('plurality=singular')) {
        return Response.json(data[0] || null)
      }
      return Response.json(data)
    }

    if (method === 'PATCH') {
      const body = JSON.parse(options.body)
      let data = mockDatabase[table] || []
      
      // Find the item
      const idParam = params.get('id')
      const id = idParam?.startsWith('eq.') ? idParam.slice(3) : null
      
      const therapistParam = params.get('therapist_user_id')
      const therapistId = therapistParam?.startsWith('eq.') ? therapistParam.slice(3) : null

      const index = data.findIndex(item => item.id === id && (!therapistId || item.therapist_user_id === therapistId))
      
      if (index === -1) {
        return Response.json([], { status: 404 })
      }

      data[index] = { ...data[index], ...body }
      
      if (options.headers.Prefer?.includes('return=representation')) {
        return Response.json([data[index]])
      }
      return new Response(null, { status: 204 })
    }
  }

  return Response.json({ error: 'Not found' }, { status: 404 })
}

function createReq(token, method = 'GET', body = {}, query = {}) {
  return {
    method,
    headers: { authorization: `Bearer ${token}` },
    body,
    query
  }
}

function createRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status: (s) => { res.statusCode = s; return res },
    json: (j) => { res.body = j; return res },
    setHeader: (k, v) => { res.headers[k] = v; return res },
    redirect: (url) => { res.redirectUrl = url; return res }
  }
  return res
}

test('Transcript Isolation: Therapist B cannot see Therapist A transcripts', async () => {
  mockDatabase.zoom_transcripts = [
    { id: 'trans-a', therapist_user_id: THERAPIST_A.id, zoom_meeting_id: '123' },
    { id: 'trans-b', therapist_user_id: THERAPIST_B.id, zoom_meeting_id: '456' }
  ]
  
  const req = createReq('token-b', 'GET')
  const res = createRes()
  
  await transcriptsHandler(req, res)
  
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.transcripts.length, 1)
  assert.equal(res.body.transcripts[0].id, 'trans-b')
})

test('Transcript Isolation: Therapist B cannot update Therapist A transcript', async () => {
  mockDatabase.zoom_transcripts = [
    { id: 'trans-a', therapist_user_id: THERAPIST_A.id, zoom_meeting_id: '123' }
  ]

  const req = createReq('token-b', 'PATCH', { id: 'trans-a', markComplete: true })
  const res = createRes()
  
  await transcriptsHandler(req, res)
  
  assert.equal(res.statusCode, 404)
  assert.equal(res.body.error, 'Transcript not found.')
  assert.equal(mockDatabase.zoom_transcripts[0].completed_at, undefined)
})

test('Google Status Isolation: Therapist B cannot see Therapist A connection', async () => {
  mockDatabase.integrations = [
    { user_id: THERAPIST_A.id, provider: 'google', provider_email: 'a@gmail.com', access_token: 'token-a', scope: 'calendar.readonly' }
  ]
  
  const req = createReq('token-b', 'GET')
  const res = createRes()
  
  await googleStatusHandler(req, res)
  
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.connected, false)
})

test('Google Events Isolation: Therapist B cannot see Therapist A events', async () => {
  mockDatabase.integrations = [
    { user_id: THERAPIST_A.id, provider: 'google', provider_email: 'a@gmail.com', access_token: 'token-a', scope: 'calendar.readonly' }
  ]
  
  const req = createReq('token-b', 'GET', {}, { timeMin: '2026-08-15T00:00:00Z', timeMax: '2026-08-16T00:00:00Z' })
  const res = createRes()
  
  await googleEventsHandler(req, res)
  
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.error, 'Google Calendar is not connected')
})

test('Supervision Summary Isolation: Therapist B cannot access Therapist A reflections', async () => {
  mockDatabase.private_reflections = [
    { id: 'ref-a', user_id: THERAPIST_A.id, body: 'Very long reflection body that exceeds the minimum character limit.' }
  ]
  
  const req = createReq('token-b', 'POST', { reflectionId: 'ref-a' })
  const res = createRes()
  
  await supervisionSummaryHandler(req, res)
  
  assert.equal(res.statusCode, 404)
  assert.equal(res.body.error.code, 'REFLECTION_NOT_FOUND')
})

test('AI Artifacts Library: findReusableSupervisionArtifact should ideally be scoped', async () => {
  // Currently it only scopes by reflectionId.
  // We want to verify that it works as expected currently.
  mockDatabase.reflection_supervision_summaries = [
    { 
      reflection_id: 'ref-a', 
      generated_content: 'Summary A', 
      source_hash: 'hash-a', 
      prompt_version: 'v1',
      model_policy_version: 'text-model-policy-v1',
      generation_status: 'generated',
      generated_at: new Date().toISOString()
    }
  ]
  
  const { getSupabaseClient } = await import('../api/_lib/supabase.js')
  const supabase = getSupabaseClient()
  
  const artifact = await findReusableSupervisionArtifact(supabase, {
    reflectionId: 'ref-a',
    sourceHash: 'hash-a',
    promptVersion: 'v1'
  })
  
  assert.equal(artifact.generated_content, 'Summary A')
})
