import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWorkspaceHash, parseWorkspaceHash } from '../src/lib/workspaceRoute.js'

test('workspace routes preserve transcript, session, and reflection context', () => {
  assert.equal(buildWorkspaceHash({ transcriptId: 'transcript-1' }), '#/inbox/transcripts/transcript-1')
  assert.equal(buildWorkspaceHash({ clientId: 'client-1', sessionId: 'session-1' }), '#/clients/client-1/sessions/session-1')
  assert.equal(buildWorkspaceHash({ reflectionId: 'reflection-1' }), '#/reflections/reflection-1')

  assert.deepEqual(parseWorkspaceHash('#/inbox/transcripts/transcript-1'), {
    nav: 'Inbox',
    transcriptId: 'transcript-1'
  })
  assert.deepEqual(parseWorkspaceHash('#/clients/client-1/sessions/session-1'), {
    nav: 'Client Workspace',
    clientId: 'client-1',
    sessionId: 'session-1'
  })
  assert.deepEqual(parseWorkspaceHash('#/reflections/reflection-1'), {
    nav: 'Reflections',
    reflectionId: 'reflection-1'
  })
})

test('workspace routes fall back safely and encode identifiers', () => {
  assert.equal(buildWorkspaceHash({ nav: 'Settings' }), '#/settings')
  assert.equal(buildWorkspaceHash({ transcriptId: 'a/b' }), '#/inbox/transcripts/a%2Fb')
  assert.deepEqual(parseWorkspaceHash('#/not-a-route'), { nav: 'Today' })
  assert.deepEqual(parseWorkspaceHash(''), { nav: 'Today' })
})
