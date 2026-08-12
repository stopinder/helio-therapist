import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CLIENT_AI_CONTEXT_SESSION_LIMIT,
  CLIENT_AI_CONTEXT_VERSION,
  buildClientAIContext,
  presentApprovedSessionContext
} from '../api/_lib/client-ai-context.js'

test('client AI context is explicitly versioned and source constrained', () => {
  const context = buildClientAIContext({
    client: { id: 'client-1', current_focus: '  sleep   and boundaries ' },
    sessions: [
      { id: 's1', status: 'completed', occurred_at: '2026-08-10T10:00:00Z', notes: ' Older approved notes ' },
      { id: 's2', status: 'in_progress', occurred_at: '2026-08-12T10:00:00Z', notes: 'Draft notes must not appear' },
      { id: 's3', status: 'completed', occurred_at: '2026-08-11T10:00:00Z', notes: ' Newer   approved notes ' }
    ]
  })

  assert.equal(context.version, CLIENT_AI_CONTEXT_VERSION)
  assert.equal(context.currentFocus, 'sleep and boundaries')
  assert.deepEqual(context.sessions.map(session => session.sourceId), ['s3', 's1'])
  assert.equal(context.sessions[0].content, 'Newer approved notes')
  assert.deepEqual(context.sourcePolicy.includes, ['client_current_focus', 'completed_session_notes'])
  assert.deepEqual(context.sourcePolicy.excludes, ['raw_transcripts', 'private_reflections', 'session_working_notes', 'draft_sessions'])
})

test('approved session context rejects drafts, empty notes, and missing IDs', () => {
  assert.equal(presentApprovedSessionContext({ id: 'draft', status: 'in_progress', notes: 'text' }), null)
  assert.equal(presentApprovedSessionContext({ id: 'empty', status: 'completed', notes: '   ' }), null)
  assert.equal(presentApprovedSessionContext({ status: 'completed', notes: 'text' }), null)
})

test('client AI context caps completed-session history', () => {
  const sessions = Array.from({ length: CLIENT_AI_CONTEXT_SESSION_LIMIT + 2 }, (_, index) => ({
    id: `s${index}`,
    status: 'completed',
    occurred_at: new Date(Date.UTC(2026, 7, index + 1)).toISOString(),
    notes: `note ${index}`
  }))
  const context = buildClientAIContext({ client: { id: 'client-1' }, sessions })
  assert.equal(context.sessions.length, CLIENT_AI_CONTEXT_SESSION_LIMIT)
})
