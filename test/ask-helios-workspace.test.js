import test from 'node:test';
import assert from 'node:assert/strict';
import { answerWorkspaceQuestion, classifyWorkspaceRequest, parseReminderProposal } from '../api/_lib/ask-helios-workspace.js';

const OWNER = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const CLIENT = 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
const FOREIGN = 'dddddddd-dddd-4ddd-dddd-dddddddddddd';

function createDatabase(fixtures) {
  const reads = [];
  const db = {
    from(table) {
      const restrictions = [];
      let max = 100;
      let sort = null;
      const obj = {
        select(columns) { reads.push({ table, columns }); return obj; },
        eq(k, v) { restrictions.push(r => r[k] === v); return obj; },
        neq(k, v) { restrictions.push(r => r[k] !== v); return obj; },
        is(k, v) { restrictions.push(r => r[k] === v); return obj; },
        in(k, values) { restrictions.push(r => values.includes(r[k])); return obj; },
        ilike(k, value) { restrictions.push(r => String(r[k] || '').toLowerCase().includes(value.replaceAll('%', '').toLowerCase())); return obj; },
        gte(k, v) { restrictions.push(r => String(r[k]) >= String(v)); return obj; },
        lte(k, v) { restrictions.push(r => String(r[k]) <= String(v)); return obj; },
        order(k, options = {}) { sort = [k, options.ascending !== false]; return obj; },
        limit(n) { max = n; return obj; },
        result() {
          let items = (fixtures[table] || []).filter(r => restrictions.every(fn => fn(r)));
          if (sort) items.sort((a, b) => String(a[sort[0]]).localeCompare(String(b[sort[0]])) * (sort[1] ? 1 : -1));
          return items.slice(0, max);
        },
        maybeSingle() { return Promise.resolve({ data: obj.result()[0] || null, error: null }); },
        then(onFulfilled, onRejected) { return Promise.resolve({ data: obj.result(), error: null }).then(onFulfilled, onRejected); }
      };
      return obj;
    }
  };
  return { db, reads };
}

const fixtures = {
  appointments: [
    { id: 'app1', user_id: OWNER, client_id: CLIENT, starts_at: '2026-10-27T12:00:00Z', status: 'confirmed' },
    { id: 'app2', user_id: OTHER, client_id: FOREIGN, starts_at: '2026-10-27T12:30:00Z', status: 'confirmed' }
  ],
  clients: [
    { id: CLIENT, user_id: OWNER, display_name: 'My client', archived: false, current_focus: 'Recorded goal', updated_at: '2026-10-20' },
    { id: FOREIGN, user_id: OTHER, display_name: 'Other therapist client', archived: false, current_focus: 'Secret goal', updated_at: '2026-10-20' }
  ],
  sessions: [
    { id:'session1',user_id:OWNER,client_id:CLIENT,status:'in_progress',notes_status:'draft',occurred_at:'2026-10-24T12:00:00Z' },
    { id:'session2',user_id:OTHER,client_id:FOREIGN,status:'in_progress',notes_status:'draft',occurred_at:'2026-10-23T12:00:00Z' }
  ],
  documents: [{ id:'doc1',user_id:OWNER,title:'Consent template',status:'draft',updated_at:'2026-10-25T12:00:00Z' }],
  therapist_reminders: [{ id:'rem1',therapist_id:OWNER,body:'Review appointment notes',completed_at:null,created_at:'2026-10-24T12:00:00Z' }],
  private_reflections: [
    { id:'refl1',user_id:OWNER,client_id:null,theme:'Professional growth',created_at:'2026-10-24T12:00:00Z' },
    { id:'refl2',user_id:OWNER,client_id:CLIENT,theme:'Private clinical reflection',created_at:'2026-10-25T12:00:00Z' }
  ],
  client_timeline_events: [
    { id:'time1',user_id:OWNER,client_id:CLIENT,summary:'Client reported a change in sleep',occurred_at:'2026-10-24T12:00:00Z' },
    { id:'time2',user_id:OTHER,client_id:FOREIGN,summary:'Another therapist secret',occurred_at:'2026-10-24T12:00:00Z' }
  ]
};

test('Classifies reminder proposal, preparation, and clinical workspace questions', () => {
  assert.equal(classifyWorkspaceRequest('Remind me to submit the form'), 'propose_reminder');
  assert.equal(classifyWorkspaceRequest('Prepare for my next session', CLIENT), 'client_brief');
  assert.equal(classifyWorkspaceRequest('Show my unfinished sessions'), 'sessions');
  assert.equal(classifyWorkspaceRequest('Which appointments do I have?'), 'appointments');
  assert.equal(classifyWorkspaceRequest('What needs my attention this week?'), 'overview');
});
test('Reminder proposals have zero database side effects', async () => {
  const { db, reads } = createDatabase(fixtures);
  const result = await answerWorkspaceQuestion({ supabase: db, userId: OWNER, query: 'Remind me to review my notes' });
  assert.equal(result.proposedAction.body, 'review my notes');
  assert.match(result.answer, /Nothing has been saved/);
  assert.equal(reads.length, 0);
});
test('Workspace overview reads only owner-scoped rows', async () => {
  const { db, reads } = createDatabase(fixtures);
  const result = await answerWorkspaceQuestion({
    supabase: db, userId: OWNER, query: 'What needs attention?', now: new Date('2026-10-25T12:00:00Z')
  });
  assert.match(result.answer, /My client/);
  assert.match(result.answer, /Review appointment notes/);
  assert.match(result.answer, /Consent template/);
  assert.doesNotMatch(result.answer, /Other therapist client|Secret goal|Another therapist secret/);
  assert.ok(reads.every(r => !r.columns.includes('*')));
});
test('Document lookups find named records rather than only drafts', async () => {
  const { db } = createDatabase(fixtures);
  const result = await answerWorkspaceQuestion({ supabase: db, userId: OWNER, query: 'Find the consent form' });
  assert.match(result.answer, /Consent template/);
  assert.match(result.answer, /matching consent/);
});
test('Client preparation requires an explicit, owned client identifier', async () => {
  const { db } = createDatabase(fixtures);
  const result = await answerWorkspaceQuestion({ supabase: db, userId: OWNER, query: 'Prepare for our next session', clientId: CLIENT });
  assert.match(result.answer, /Recorded goal/);
  assert.match(result.answer, /Client reported a change in sleep/);
  assert.doesNotMatch(result.answer, /Another therapist secret/);
  await assert.rejects(
    answerWorkspaceQuestion({ supabase: db, userId: OWNER, query: 'Prepare for our next session', clientId: FOREIGN }),
    { status: 404 }
  );
});
test('Client-linked reflections never enter a general CPD lookup', async () => {
  const { db } = createDatabase(fixtures);
  const result = await answerWorkspaceQuestion({ supabase: db, userId: OWNER, query: 'Show my CPD reflections' });
  assert.match(result.answer, /Professional growth/);
  assert.doesNotMatch(result.answer, /Private clinical reflection/);
});
test('Reminder parser rejects empty or oversized action payloads', () => {
  assert.equal(parseReminderProposal('Remind me to'), null);
  assert.equal(parseReminderProposal('Remind me to ' + 'x'.repeat(301)), null);
});
