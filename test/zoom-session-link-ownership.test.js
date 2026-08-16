import test from 'node:test';
import assert from 'node:assert/strict';

process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.from('01234567890123456789012345678901').toString('base64');
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';

const { findVerifiedSessionLink } = await import('../api/zoom/webhook.js');

function queryResult(rows) {
  const filters = [];
  return {
    select() { return this; },
    eq(column, value) { filters.push([column, value]); return this; },
    async maybeSingle() {
      const match = rows.find((row) => filters.every(([column, value]) => String(row[column]) === String(value)));
      return { data: match || null, error: null };
    }
  };
}

function mockSupabase({ links, sessions }) {
  return {
    from(table) {
      if (table === 'zoom_session_links') return queryResult(links);
      if (table === 'sessions') return queryResult(sessions);
      throw new Error(`Unexpected table: ${table}`);
    }
  };
}

const validLink = {
  therapist_user_id: 'therapist-a',
  client_id: 'client-a',
  session_ref: 'session-a',
  zoom_meeting_id: 'meeting-a'
};

test('verified Zoom session link accepts matching therapist, client, and session', async () => {
  const supabase = mockSupabase({
    links: [validLink],
    sessions: [{ id: 'session-a', user_id: 'therapist-a', client_id: 'client-a' }]
  });

  const result = await findVerifiedSessionLink(supabase, 'therapist-a', 'meeting-a');
  assert.deepEqual(result, validLink);
});

test('verified Zoom session link rejects a session owned by another therapist', async () => {
  const supabase = mockSupabase({
    links: [validLink],
    sessions: [{ id: 'session-a', user_id: 'therapist-b', client_id: 'client-a' }]
  });

  const result = await findVerifiedSessionLink(supabase, 'therapist-a', 'meeting-a');
  assert.equal(result, null);
});

test('verified Zoom session link rejects a session belonging to another client', async () => {
  const supabase = mockSupabase({
    links: [validLink],
    sessions: [{ id: 'session-a', user_id: 'therapist-a', client_id: 'client-b' }]
  });

  const result = await findVerifiedSessionLink(supabase, 'therapist-a', 'meeting-a');
  assert.equal(result, null);
});

test('verified Zoom session link rejects a stale session reference', async () => {
  const supabase = mockSupabase({ links: [validLink], sessions: [] });

  const result = await findVerifiedSessionLink(supabase, 'therapist-a', 'meeting-a');
  assert.equal(result, null);
});
