import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocumentSearch, isDocumentDiscoveryQuery, listWorkspaceDocuments, DOCUMENT_PAGE_SIZE } from '../api/_lib/ask-helios-documents.js';

const OWNER = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const docs = [...Array(19)].map((_, i) => ({
  id: '00000000-0000-4000-8000-' + String(i).padStart(12, '0'),
  user_id: OWNER, title: i % 3 === 0 ? 'Consent form ' + i : 'Session summary ' + i,
  document_type: i % 3 === 0 ? 'consent' : 'session_summary',
  original_filename: null, archived_at: null,
  status: i % 2 === 0 ? 'draft' : 'review',
  updated_at: new Date(2026, 9, 25 - i).toISOString()
}));
docs.push({ ...docs[0], id: 'dddddddd-dddd-4ddd-dddd-dddddddddddd', user_id: OTHER, title: 'Other therapist confidential document' });

function mockDb(records) {
  const calls = [];
  const db = { from(table) {
    assert.equal(table, 'documents');
    const filters = []; let ascending = false; let list;
    const query = {
      select(columns, options) { calls.push({ columns, options }); return query },
      eq(k, v) { filters.push(x => x[k] === v); return query },
      is(k, v) { filters.push(x => x[k] === v); return query },
      in(k, vs) { filters.push(x => vs.includes(x[k])); return query },
      or(expr) {
        assert.match(expr, /^title\.ilike\.%[a-z]+%,document_type\.ilike\.%[a-z]+%,original_filename\.ilike\.%[a-z]+%$/);
        const keyword = expr.split('%')[1];
        filters.push(x => [x.title, x.document_type, x.original_filename].some(y => String(y || '').toLowerCase().includes(keyword)));
        return query;
      },
      order(k, opt) { if (k === 'updated_at') ascending = opt?.ascending !== false; return query },
      range(start, end) {
        list = records.filter(x => filters.every(f => f(x)));
        list.sort((a,b) => (ascending ? 1 : -1) * a.updated_at.localeCompare(b.updated_at));
        return Promise.resolve({ data: list.slice(start, end+1), count: list.length, error: null });
      }
    };
    return query;
  }};
  return { db, calls };
}

test('document intent includes consent phrasing and follow-up requests', () => {
  assert.equal(isDocumentDiscoveryQuery('Find my consent forms and documents'), true);
  assert.equal(isDocumentDiscoveryQuery('Show only drafts', { kind: 'documents' }), true);
  assert.equal(isDocumentDiscoveryQuery('Show more', { kind: 'documents' }), true);
  assert.equal(isDocumentDiscoveryQuery('Show more', null), false);
});

test('filters persist across pagination and change only when requested', () => {
  const first = parseDocumentSearch('Find my consent forms and documents');
  assert.deepEqual(first, { kind:'documents',type:'consent',status:null,page:0 });
  const drafts = parseDocumentSearch('Show only drafts', first);
  assert.deepEqual(drafts, { kind:'documents',type:'consent',status:'draft',page:0 });
  const next = parseDocumentSearch('Show more documents', drafts);
  assert.deepEqual(next, { kind:'documents',type:'consent',status:'draft',page:1 });
  assert.deepEqual(parseDocumentSearch('All documents', next), {kind:'documents',type:null,status:null,page:0});
});

test('accurate count, owner isolation, limited pages and individual deep links', async () => {
  const { db, calls } = mockDb(docs);
  const first = await listWorkspaceDocuments({ supabase: db, userId: OWNER, search: parseDocumentSearch('Find my documents') });
  assert.equal(first.documentSearch.total, 19);
  assert.equal(first.references.length, DOCUMENT_PAGE_SIZE);
  assert.equal(first.documentSearch.shown, 8);
  assert.match(first.answer, /Showing 1–8 of 19 matching documents/);
  assert.doesNotMatch(first.answer, /Other therapist/);
  assert.match(first.references[0].url, /^\/documents\?open=[a-f0-9-]{36}$/);
  assert.equal(calls[0].options.count, 'exact');
  const next = await listWorkspaceDocuments({ supabase: db, userId: OWNER, search: parseDocumentSearch('show more documents', first.documentSearch) });
  assert.match(next.answer, /Showing 9–16 of 19 matching documents/);
  const last = await listWorkspaceDocuments({ supabase: db, userId: OWNER, search: parseDocumentSearch('show more documents', next.documentSearch) });
  assert.match(last.answer, /Showing 17–19 of 19 matching documents/);
  assert.equal(last.documentSearch.hasMore, false);
});

test('consent and draft refinements use bounded server-side filters', async () => {
  const { db } = mockDb(docs);
  const consent = await listWorkspaceDocuments({ supabase: db, userId: OWNER, search: parseDocumentSearch('show only consent forms') });
  assert.equal(consent.documentSearch.total, 7);
  assert.ok(consent.references.every(r => r.title.includes('Consent form')));
  const drafts = await listWorkspaceDocuments({ supabase: db, userId: OWNER, search: parseDocumentSearch('show only drafts', consent.documentSearch) });
  assert.equal(drafts.documentSearch.total, 4);
  assert.ok(drafts.references.every(r => r.citation.startsWith('draft')));
});
