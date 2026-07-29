import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupervisionReflection } from '../src/lib/reflections.js';

// Mock Supabase
const mockUser = { id: 'user-123' };
const mockReflection = { id: 'reflection-123', body: 'Test note' };

test('createSupervisionReflection success', async (t) => {
  // Mock implementation
  const mockInsert = t.mock.fn(() => ({
    select: () => ({
      single: () => Promise.resolve({ data: mockReflection, error: null })
    })
  }));

  const supabaseClient = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: mockUser } })
    },
    from: (table) => {
      assert.strictEqual(table, 'private_reflections');
      return { insert: mockInsert };
    }
  };

  const params = {
    supabaseClient,
    clientId: 'client-123',
    sessionId: 'session-123',
    body: 'Test note',
    supervisionQuestion: 'Test question',
    theme: 'Test theme',
    urgency: 'soon'
  };

  const result = await createSupervisionReflection(params);

  assert.strictEqual(result, mockReflection);
  
  const insertCall = mockInsert.mock.calls[0];
  const insertedData = insertCall.arguments[0];

  assert.strictEqual(insertedData.user_id, mockUser.id);
  assert.strictEqual(insertedData.client_id, params.clientId);
  assert.strictEqual(insertedData.session_ref, params.sessionId);
  assert.strictEqual(insertedData.body, params.body);
  assert.strictEqual(insertedData.supervision_question, params.supervisionQuestion);
  assert.strictEqual(insertedData.theme, params.theme);
  assert.strictEqual(insertedData.urgency, params.urgency);
  assert.strictEqual(insertedData.included_in_supervision, true);
});

test('createSupervisionReflection unauthenticated error', async () => {
  const supabaseClient = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } })
    }
  };

  await assert.rejects(
    createSupervisionReflection({ supabaseClient }),
    { message: 'Not authenticated' }
  );
});
