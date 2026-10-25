import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveWorkspaceContext, loadOwnedWorkspaceContext, isContextualDocumentRequest, isDocumentRecordFollowUp,
  isAmbiguousDocumentFollowUp, resolveDocumentSelection
} from '../api/_lib/ask-helios-context.js';
const msg = content => ({ role: 'user', content });

test('rebuilds typed filters and page index from saved user messages after refresh', () => {
  const messages = [msg('Find my documents'), { role: 'assistant', content: 'Showing 1–8 of 19' },
    msg('Show only consent forms'), msg('Which of these are still drafts?'), msg('Show more documents')];
  assert.deepEqual(deriveWorkspaceContext(messages),
    { kind: 'documents', type: 'consent', status: 'draft', page: 1 });
});
test('reset and switching topics never continue a stale document task', () => {
  assert.equal(deriveWorkspaceContext([msg('Find my documents'), msg('Show my appointments tomorrow')]), null);
  assert.deepEqual(deriveWorkspaceContext([msg('Find my documents'), msg('Show only drafts'), msg('All documents')]),
    { kind: 'documents', type: null, status: null, page: 0 });
  assert.equal(deriveWorkspaceContext([msg('Find my documents'), msg('Remind me to call next week')]), null);
});
test('server reloads only therapist-owned conversation rows', async () => {
  const owner = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
  const conversation = 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
  const ordered = [ { role: 'user', content: 'Find my documents' },
    { role: 'assistant', content: 'Showing 1–8 of 19' },
    { role: 'user', content: 'Show only consent forms' },
    { role: 'user', content: 'Show more documents' } ];
  const predicates = [];
  const q = {
    select(fields) { assert.equal(fields, 'role,content'); return q; },
    eq(key, value) { predicates.push([key, value]); return q; },
    order(key, opts) { assert.equal(key, 'created_at'); assert.equal(opts.ascending, false); return q; },
    limit(n) { assert.equal(n, 36); return Promise.resolve({ data: [...ordered].reverse(), error: null }); }
  };
  const db = { from(table) { assert.equal(table, 'ask_helios_messages'); return q; } };
  const context = await loadOwnedWorkspaceContext(db, owner, conversation);
  assert.deepEqual(predicates, [['conversation_id', conversation], ['user_id', owner]]);
  assert.deepEqual(context, { kind: 'documents', type: 'consent', status: null, page: 1 });
});

test('missing database context fails closed rather than accepting browser filters', async () => {
  const q = { select() { return q; }, eq() { return q; }, order() { return q; },
    limit() { return Promise.resolve({ data: null, error: { message: 'permission denied' } }); } };
  const db = { from() { return q; } };
  await assert.rejects(loadOwnedWorkspaceContext(db, 'owner', 'conversation'), { status: 503 });
});

test('non-user content cannot poison restored search filters or state', () => {
  const state = deriveWorkspaceContext([
    { role: 'assistant', content: 'Show only consent forms' },
    msg('Find my documents'),
    { role: 'assistant', content: 'Show more documents' }
  ]);
  assert.deepEqual(state, { kind: 'documents', type: null, status: null, page: 0 });
});
test('follow-up selection resolves actual trusted page results, never fabricated IDs', () => {
  const docs = [
    { title: 'A consent', url: '/documents?open=aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', type: 'consent', status: 'draft' },
    { title: 'B consent', url: '/documents?open=bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', type: 'consent', status: 'review' }
  ];
  assert.equal(isDocumentRecordFollowUp('Open the most recent one'), true);
  assert.equal(isContextualDocumentRequest('Open the most recent one', { kind: 'documents' }), true);
  assert.deepEqual(resolveDocumentSelection('Open the second one', docs).reference.url, docs[1].url);
  assert.deepEqual(resolveDocumentSelection('Open the most recent one', docs).reference.url, docs[0].url);
  assert.match(resolveDocumentSelection('Open the third one', docs).error, /not on the current page/);
  assert.match(resolveDocumentSelection('Open the one', docs).error, /Which document/);
  assert.equal(isAmbiguousDocumentFollowUp('Open it'), true);
});
test('no document context exists unless the owned transcript contained document queries', () => {
  assert.equal(deriveWorkspaceContext([msg('What needs attention this week?')]), null);
  assert.equal(isContextualDocumentRequest('Open it', null), false);
});
