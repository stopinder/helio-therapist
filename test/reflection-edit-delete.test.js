import test from 'node:test'
import assert from 'node:assert/strict'
import { deletePrivateReflection, updatePrivateReflectionBody } from '../src/lib/reflections.js'

function authenticatedClient(queryFactory) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'therapist-1' } }, error: null }) },
    from(table) {
      assert.equal(table, 'private_reflections')
      return queryFactory()
    }
  }
}

test('updatePrivateReflectionBody updates only the authenticated therapist reflection', async () => {
  let updateValues
  const eqCalls = []
  const client = authenticatedClient(() => ({
    update(values) {
      updateValues = values
      return {
        eq(column, value) {
          eqCalls.push([column, value])
          return {
            eq(column2, value2) {
              eqCalls.push([column2, value2])
              return {
                select() {
                  return {
                    single: async () => ({ data: { id: 'reflection-1', body: values.body }, error: null })
                  }
                }
              }
            }
          }
        }
      }
    }
  }))

  const result = await updatePrivateReflectionBody({
    supabaseClient: client,
    reflectionId: 'reflection-1',
    body: '  Revised reflection  '
  })

  assert.equal(result.body, 'Revised reflection')
  assert.equal(updateValues.body, 'Revised reflection')
  assert.match(updateValues.updated_at, /^\d{4}-\d{2}-\d{2}T/)
  assert.deepEqual(eqCalls, [['id', 'reflection-1'], ['user_id', 'therapist-1']])
})

test('updatePrivateReflectionBody rejects empty content rather than silently retaining it', async () => {
  await assert.rejects(
    updatePrivateReflectionBody({ supabaseClient: {}, reflectionId: 'reflection-1', body: '   ' }),
    /delete it instead/
  )
})

test('deletePrivateReflection deletes only the authenticated therapist reflection', async () => {
  const eqCalls = []
  const client = authenticatedClient(() => ({
    delete() {
      return {
        eq(column, value) {
          eqCalls.push([column, value])
          return {
            eq(column2, value2) {
              eqCalls.push([column2, value2])
              return {
                select() {
                  return {
                    single: async () => ({ data: { id: 'reflection-1' }, error: null })
                  }
                }
              }
            }
          }
        }
      }
    }
  }))

  const result = await deletePrivateReflection({ supabaseClient: client, reflectionId: 'reflection-1' })
  assert.deepEqual(result, { id: 'reflection-1' })
  assert.deepEqual(eqCalls, [['id', 'reflection-1'], ['user_id', 'therapist-1']])
})

test('reflection edit and delete require authentication', async () => {
  const client = { auth: { getUser: async () => ({ data: { user: null }, error: null }) } }
  await assert.rejects(updatePrivateReflectionBody({ supabaseClient: client, reflectionId: 'reflection-1', body: 'text' }), /Not authenticated/)
  await assert.rejects(deletePrivateReflection({ supabaseClient: client, reflectionId: 'reflection-1' }), /Not authenticated/)
})
