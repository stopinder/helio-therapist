import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pendingSessionReview } from '../src/lib/clientDocuments.js'

const session = { id: 'encounter', status: 'completed', workflowStatus: 'drafts_awaiting_review' }
const summary = {
  documentType: 'session_summary',
  status: 'draft',
  content: {
    body: 'Synthetic session summary.',
    summaryGeneration: { anchorSessionId: session.id, reviewRequired: true }
  }
}

test('old workflow flags do not imply a review when there is no actionable draft or source', () => {
  assert.equal(pendingSessionReview(session, []), null)
  assert.equal(pendingSessionReview(session, [{ ...summary, status: 'completed' }]), null)
  const reviewed = {
    ...summary,
    content: {
      ...summary.content,
      summaryGeneration: { ...summary.content.summaryGeneration, reviewedAt: '2026-11-25T00:00:00Z' }
    }
  }
  assert.equal(pendingSessionReview(session, [reviewed, summary]), null)
})

test('an open review goes to the actual draft or flagged transcript', () => {
  assert.deepEqual(pendingSessionReview(session, [summary])?.query, { view: 'summary', summaryKind: 'session' })
  assert.deepEqual(pendingSessionReview(session, [{
    ...summary, documentType: 'across_session_review'
  }])?.query, { view: 'summary', summaryKind: 'across' })
  assert.deepEqual(pendingSessionReview({ ...session, reviewTranscriptId: 'source' }, [summary])?.query, {
    view: 'summary', transcriptId: 'source', reviewSource: '1'
  })
})

test('history uses the review destination and keeps closed source reviews closed', () => {
  const workspace = readFileSync(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
  const encounter = readFileSync(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')
  assert.match(workspace, /query: review.query/)
  assert.doesNotMatch(workspace, /Review is waiting/)
  assert.match(encounter, /source\?\.sourceReview\?\.state === 'needs_review' && requestedId && route.query.reviewSource === '1'/)
})
