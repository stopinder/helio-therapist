import { strict as assert } from 'node:assert';
// We use a small hack to mock the internal supabase variable since we removed the test helper
import * as reflectionsModule from '../src/lib/reflections.js';
const { setReflectionSupervisionSelection } = reflectionsModule;

async function testSetReflectionSupervisionSelection() {
  console.log('Testing setReflectionSupervisionSelection...');

  const mockUser = { id: 'user-123' };
  const mockReflection = { id: 'ref-456', included_in_supervision: true };

  const mockSupabase = {
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null })
    },
    from: (table) => {
      assert.equal(table, 'private_reflections');
      return {
        update: (values) => {
          assert.equal(values.included_in_supervision, true);
          return {
            eq: (col1, val1) => {
              if (col1 === 'id') assert.equal(val1, 'ref-456');
              if (col1 === 'user_id') assert.equal(val1, 'user-123');
              return {
                eq: (col2, val2) => {
                  if (col2 === 'id') assert.equal(val2, 'ref-456');
                  if (col2 === 'user_id') assert.equal(val2, 'user-123');
                  return {
                    select: () => ({
                      single: async () => ({ data: mockReflection, error: null })
                    })
                  };
                }
              };
            }
          };
        }
      };
    }
  };

  // Skip __TEST_ONLY_mockSupabase(mockSupabase); since we removed it
  // and pass the client directly in the call.
  // The function will use the passed client instead of the internal one.

  const result = await setReflectionSupervisionSelection({
    supabaseClient: mockSupabase,
    reflectionId: 'ref-456',
    included: true
  });

  assert.deepEqual(result, mockReflection);
  console.log('✓ Success: Update is scoped correctly and returns updated row');

  // Test authentication requirement
  const unauthSupabase = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null })
    }
  };
  
  try {
    await setReflectionSupervisionSelection({
      supabaseClient: unauthSupabase,
      reflectionId: 'ref-456',
      included: true
    });
    assert.fail('Should have thrown "Not authenticated"');
  } catch (err) {
    assert.equal(err.message, 'Not authenticated');
    console.log('✓ Success: Authentication requirement enforced');
  }

  // Test error handling
  const errorSupabase = {
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null })
    },
    from: () => ({
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { message: 'DB Error' } })
            })
          })
        })
      })
    })
  };

  try {
    await setReflectionSupervisionSelection({
      supabaseClient: errorSupabase,
      reflectionId: 'ref-456',
      included: true
    });
    assert.fail('Should have thrown generic error');
  } catch (err) {
    assert.equal(err.message, 'Could not update supervision selection');
    console.log('✓ Success: Database errors return a safe error');
  }
}

testSetReflectionSupervisionSelection().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
