import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileZoomMyNotes } from '../api/_lib/zoom-my-notes-reconciliation.js';

function createMockSupabase() {
  const chain = (data = []) => {
    const self = {
      select: () => self,
      eq: () => self,
      not: () => self,
      order: () => self,
      limit: () => self,
      gte: () => self,
      lte: () => self,
      in: () => self,
      update: () => self,
      upsert: () => self,
      maybeSingle: () => Promise.resolve({ data: data[0] || null, error: null }),
      single: () => Promise.resolve({ data: data[0] || null, error: null }),
      then: (resolve) => resolve({ data, error: null }),
      catch: (reject) => reject(new Error('Mock error'))
    };
    return self;
  };

  return {
    from: (table) => {
      if (table === 'zoom_session_links' || table === 'sessions') {
        return chain([{ zoom_meeting_id: '12345' }]);
      }
      return chain([]);
    }
  };
}

test('reconcileZoomMyNotes uses Canvas Search when scope is present', async (t) => {
  const therapistUserId = 'user-1';
  
  process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64');
  const { encryptIntegrationToken } = await import('../api/_lib/token-crypto.js');
  
  const integration = {
    scope: 'my_notes:read:note my_notes:read:content canvas:write:file_search',
    encrypted_access_token: encryptIntegrationToken('access-token'),
    encrypted_refresh_token: encryptIntegrationToken('refresh-token'),
    expires_at: '2099-01-01T00:00:00Z'
  };

  const mockSupabase = createMockSupabase();

  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });

  let canvasSearchCalled = false;
  let contentFetchedFor = [];

  global.fetch = async (url, options) => {
    const method = options?.method || 'GET';
    if (url === 'https://api.zoom.us/v2/docs/file_search' && method === 'POST') {
      canvasSearchCalled = true;
      const body = JSON.parse(options.body);
      assert.deepEqual(body.file_types, ['note']);
      assert.ok(body.created_time_from, 'created_time_from should be present');
      assert.ok(body.created_time_to, 'created_time_to should be present');
      assert.strictEqual(body.from, undefined, 'Old "from" field should NOT be present');
      assert.strictEqual(body.to, undefined, 'Old "to" field should NOT be present');
      return {
        ok: true,
        json: async () => ({
          files: [
            {
              file_id: 'canvas-note-1',
              file_name: 'Standalone Note',
              file_type: 'note',
              created_time: '2026-08-25T10:00:00Z',
              modified_time: '2026-08-25T10:05:00Z'
            }
          ]
        })
      };
    }

    if (url.includes('/my_notes/notes/canvas-note-1/content')) {
      contentFetchedFor.push('canvas-note-1');
      return {
        ok: true,
        json: async () => ({
          transcript: {
            items: [{ start_time: '00:00:01', speaker_id: '1', text: 'Hello from Canvas' }],
            speakers: [{ speaker_id: '1', display_name: 'Therapist' }]
          }
        })
      };
    }

    // fallback for other calls
    return {
      ok: true,
      json: async () => ({ notes: [], items: [], results: [] })
    };
  };

  const result = await reconcileZoomMyNotes({
    supabase: mockSupabase,
    integration,
    therapistUserId
  });

  assert.strictEqual(canvasSearchCalled, true, 'Canvas Search should be called');
  assert.deepEqual(contentFetchedFor, ['canvas-note-1'], 'Content should be fetched for discovered note');
  assert.strictEqual(result.imported, 1);
  assert.strictEqual(result.checked, 1);
});

test('reconcileZoomMyNotes falls back to meeting-id search when Canvas scope is missing', async (t) => {
  const therapistUserId = 'user-1';

  process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64');
  const { encryptIntegrationToken } = await import('../api/_lib/token-crypto.js');

  const integration = {
    scope: 'my_notes:read:note my_notes:read:content',
    encrypted_access_token: encryptIntegrationToken('access-token'),
    encrypted_refresh_token: encryptIntegrationToken('refresh-token'),
    expires_at: '2099-01-01T00:00:00Z'
  };

  const mockSupabase = createMockSupabase();

  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });

  let canvasSearchCalled = false;
  let meetingNotesCalled = false;

  global.fetch = async (url, options) => {
    if (url.includes('/docs/file_search')) {
      canvasSearchCalled = true;
    }
    if (url.includes('/my_notes/notes?meeting_id=12345')) {
      meetingNotesCalled = true;
      return {
        ok: true,
        json: async () => ({ notes: [{ note_id: 'meeting-note-1', meeting_id: '12345' }] })
      };
    }
    if (url.includes('/my_notes/notes/meeting-note-1/content')) {
      return {
        ok: true,
        json: async () => ({
          transcript: { items: [{ text: 'From meeting' }] }
        })
      };
    }
    return {
      ok: true,
      json: async () => ({ notes: [], items: [], results: [] })
    };
  };

  const result = await reconcileZoomMyNotes({
    supabase: mockSupabase,
    integration,
    therapistUserId
  });

  assert.strictEqual(canvasSearchCalled, false, 'Canvas Search should NOT be called');
  assert.strictEqual(meetingNotesCalled, true, 'Meeting-scoped search SHOULD be called');
  assert.strictEqual(result.imported, 1);
  assert.strictEqual(result.checked, 1); // 1 meeting ID found
});
