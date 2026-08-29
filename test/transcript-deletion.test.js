import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import transcriptsHandler from '../api/zoom/transcripts.js'
import { createClient } from '@supabase/supabase-js'

process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key'

const THERAPIST_A = { id: 'therapist-a', email: 'a@example.com' }
const THERAPIST_B = { id: 'therapist-b', email: 'b@example.com' }

let mockDatabase = { zoom_transcripts: [] }

function resetMockDatabase() {
  mockDatabase = {
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
    if (authHeader.includes('token-b')) return Response.json({ user: THERAPIST_B })
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), { status: 401 })
  }

  if (urlString.includes('/rest/v1/zoom_transcripts')) {
    const urlObj = new URL(urlString)
    const params = urlObj.searchParams
    if (method === 'GET') {
      let data = [...(mockDatabase.zoom_transcripts || [])]
      for (const [key, value] of params.entries()) {
        if (value.startsWith('eq.')) data = data.filter(item => String(item[key]) === value.slice(3))
      }
      return isSingle ? Response.json(data[0] || null) : Response.json(data)
    }
    if (method === 'DELETE') {
      const eq = key => params.get(key)?.startsWith('eq.') ? params.get(key).slice(3) : params.get(key)
      const id = eq('id'), therapistId = eq('therapist_user_id')
      const initialLength = mockDatabase.zoom_transcripts.length
      mockDatabase.zoom_transcripts = mockDatabase.zoom_transcripts.filter(item => !(item.id === id && item.therapist_user_id === therapistId))
      if (mockDatabase.zoom_transcripts.length === initialLength) return new Response(null, { status: 404 })
      return new Response(null, { status: 204 })
    }
  }
  return Response.json({ error: 'Not found' }, { status: 404 })
}

function createReq(token, method = 'DELETE', body = {}, query = {}) { return { method, headers: { authorization: `Bearer ${token}` }, body, query, [Symbol.asyncIterator]: async function* () { if (body && typeof body === 'object') yield Buffer.from(JSON.stringify(body)) } } }
function createRes() { const res = { statusCode: 200, body: null, headers: {}, status: s => { res.statusCode=s; return res }, json: j => { res.body=j; return res }, setHeader: (k,v) => { res.headers[k]=v; return res }, end: data => { res.body=data; return res } }; return res }

test('DELETE /api/zoom/transcripts: therapist can delete their completely unassigned transcript', async () => {
  resetMockDatabase()
  const transcript = { id: 't1', therapist_user_id: THERAPIST_A.id, status: 'unassigned', client_id: null, session_ref: null, review_choices_saved_at: null, completed_at: null }
  mockDatabase.zoom_transcripts = [transcript]

  const req = createReq('token-a', 'DELETE', { id: 't1' })
  const res = createRes()
  await transcriptsHandler(req, res)

  assert.equal(res.statusCode, 204)
  assert.equal(mockDatabase.zoom_transcripts.length, 0)
})

test('DELETE /api/zoom/transcripts: transcript belonging to another therapist cannot be deleted', async () => {
  resetMockDatabase()
  const transcript = { id: 't1', therapist_user_id: THERAPIST_B.id, status: 'unassigned', client_id: null, session_ref: null, review_choices_saved_at: null, completed_at: null }
  mockDatabase.zoom_transcripts = [transcript]

  const req = createReq('token-a', 'DELETE', { id: 't1' })
  const res = createRes()
  await transcriptsHandler(req, res)

  assert.equal(res.statusCode, 404)
  assert.equal(mockDatabase.zoom_transcripts.length, 1)
})

test('DELETE /api/zoom/transcripts: assigned transcript cannot be deleted', async () => {
  resetMockDatabase()
  const transcript = { id: 't1', therapist_user_id: THERAPIST_A.id, status: 'ready', client_id: 'c1', session_ref: null, review_choices_saved_at: null, completed_at: null }
  mockDatabase.zoom_transcripts = [transcript]

  const req = createReq('token-a', 'DELETE', { id: 't1' })
  const res = createRes()
  await transcriptsHandler(req, res)

  assert.equal(res.statusCode, 403)
  assert.equal(mockDatabase.zoom_transcripts.length, 1)
})

test('DELETE /api/zoom/transcripts: session-linked transcript cannot be deleted', async () => {
  resetMockDatabase()
  const transcript = { id: 't1', therapist_user_id: THERAPIST_A.id, status: 'ready', client_id: 'c1', session_ref: 's1', review_choices_saved_at: null, completed_at: null }
  mockDatabase.zoom_transcripts = [transcript]

  const req = createReq('token-a', 'DELETE', { id: 't1' })
  const res = createRes()
  await transcriptsHandler(req, res)

  assert.equal(res.statusCode, 403)
  assert.equal(mockDatabase.zoom_transcripts.length, 1)
})

test('DELETE /api/zoom/transcripts: reviewed transcript cannot be deleted', async () => {
  resetMockDatabase()
  const transcript = { id: 't1', therapist_user_id: THERAPIST_A.id, status: 'ready', client_id: 'c1', session_ref: 's1', review_choices_saved_at: '2026-08-28T00:00:00Z', completed_at: null }
  mockDatabase.zoom_transcripts = [transcript]

  const req = createReq('token-a', 'DELETE', { id: 't1' })
  const res = createRes()
  await transcriptsHandler(req, res)

  assert.equal(res.statusCode, 403)
  assert.equal(mockDatabase.zoom_transcripts.length, 1)
})
