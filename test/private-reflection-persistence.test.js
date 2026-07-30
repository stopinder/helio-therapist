import test from 'node:test'
import assert from 'node:assert/strict'
import { getPrivateReflection, upsertPrivateReflection, getAllPrivateReflections } from '../src/lib/reflections.js'

test('reflections lib: getAllPrivateReflections fetches all reflections for user', async (t) => {
  const mockUser = { id: 'user-123' };
  const mockReflections = [
    { id: 'ref-1', body: 'Reflection 1', client_id: 'c1', clients: { full_name: 'Client A' } },
    { id: 'ref-2', body: 'Reflection 2', client_id: 'c2', clients: { full_name: 'Client B' } }
  ];

  const mockSupabase = {
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null })
    },
    from: (table) => {
      assert.strictEqual(table, 'private_reflections');
      return {
        select: (query) => {
          assert.ok(query.includes('clients'));
          return {
            eq: (col, val) => {
              assert.strictEqual(col, 'user_id');
              assert.strictEqual(val, mockUser.id);
              return {
                order: (col2, opts) => {
                  assert.strictEqual(col2, 'created_at');
                  assert.strictEqual(opts.ascending, false);
                  return Promise.resolve({ data: mockReflections, error: null });
                }
              }
            }
          }
        }
      };
    }
  };

  const result = await getAllPrivateReflections({ supabaseClient: mockSupabase });
  assert.deepStrictEqual(result, mockReflections);
});

test('reflections lib: getPrivateReflection handles session context', async (t) => {
  const mockUser = { id: 'user-123' };
  const mockReflection = { id: 'ref-1', body: 'Test reflection' };
  
  const mockSupabase = {
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null })
    },
    from: (table) => {
      assert.strictEqual(table, 'private_reflections');
      return {
        select: () => ({
          eq: (col, val) => {
            if (col === 'user_id') assert.strictEqual(val, mockUser.id);
            if (col === 'client_id') assert.strictEqual(val, 'client-1');
            if (col === 'session_ref') assert.strictEqual(val, 'session-1');
            return {
              eq: (col2, val2) => {
                return {
                  eq: (col3, val3) => {
                    return {
                      order: () => ({
                        limit: () => ({
                          maybeSingle: async () => ({ data: mockReflection, error: null })
                        })
                      })
                    }
                  }
                }
              }
            }
          }
        })
      };
    }
  };

  const result = await getPrivateReflection({
    supabaseClient: mockSupabase,
    clientId: 'client-1',
    sessionId: 'session-1'
  });

  assert.deepStrictEqual(result, mockReflection);
});

test('reflections lib: upsertPrivateReflection inserts new record if none exists', async (t) => {
  const mockUser = { id: 'user-123' };
  const mockNewReflection = { id: 'ref-new', body: 'New reflection' };
  
  const mockSupabase = {
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null })
    },
    from: (table) => {
      assert.strictEqual(table, 'private_reflections');
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null, error: null })
                  })
                })
              })
            })
          })
        }),
        insert: (payload) => {
          assert.strictEqual(payload.body, 'New reflection');
          assert.strictEqual(payload.user_id, mockUser.id);
          assert.strictEqual(payload.client_id, 'client-1');
          assert.strictEqual(payload.session_ref, 'session-1');
          return {
            select: () => ({
              single: async () => ({ data: mockNewReflection, error: null })
            })
          };
        }
      };
    }
  };

  const result = await upsertPrivateReflection({
    supabaseClient: mockSupabase,
    clientId: 'client-1',
    sessionId: 'session-1',
    body: 'New reflection'
  });

  assert.deepStrictEqual(result, mockNewReflection);
});

test('reflections lib: upsertPrivateReflection updates existing record', async (t) => {
  const mockUser = { id: 'user-123' };
  const existingReflection = { id: 'ref-existing', body: 'Old content' };
  const updatedReflection = { id: 'ref-existing', body: 'Updated content' };
  
  const mockSupabase = {
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null })
    },
    from: (table) => {
      assert.strictEqual(table, 'private_reflections');
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: existingReflection, error: null })
                  })
                })
              })
            })
          })
        }),
        update: (payload) => {
          assert.strictEqual(payload.body, 'Updated content');
          return {
            eq: (col, val) => {
              assert.strictEqual(col, 'id');
              assert.strictEqual(val, existingReflection.id);
              return {
                select: () => ({
                  single: async () => ({ data: updatedReflection, error: null })
                })
              };
            }
          };
        }
      };
    }
  };

  const result = await upsertPrivateReflection({
    supabaseClient: mockSupabase,
    clientId: 'client-1',
    sessionId: 'session-1',
    body: 'Updated content'
  });

  assert.deepStrictEqual(result, updatedReflection);
});
