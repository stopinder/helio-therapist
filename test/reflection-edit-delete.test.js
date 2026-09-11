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

function scopedSingle(result, eqCalls) {
  return {
    eq(column, value) {
      eqCalls.push([column, value])
      return {
        eq(column2, value2) {
          eqCalls.push([column2, value2])
          return { single: async () => result }
        }
      }
    }
  }
}

test('updatePrivateReflectionBody updates only an authenticated therapist free-text reflection', async () => {
  let updateValues
  const readEqCalls = []
  const updateEqCalls = []
  const client = authenticatedClient(() => ({
    select(fields) {
      assert.equal(fields, 'id, client_id, session_ref, workspace_content')
      return scopedSingle({
        data: { id: 'reflection-1', client_id: null, session_ref: null, workspace_content: { captureSource: 'quick_capture' } },
        error: null
      }, readEqCalls)
    },
    update(values) {
      updateValues = values
      return {
        eq(column, value) {
          updateEqCalls.push([column, value])
          return {
            eq(column2, value2) {
              updateEqCalls.push([column2, value2])
              return {
                select() {
                  return { single: async () => ({ data: { id: 'reflection-1', body: values.body }, error: null }) }
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
  assert.deepEqual(readEqCalls, [['id', 'reflection-1'], ['user_id', 'therapist-1']])
  assert.deepEqual(updateEqCalls, [['id', 'reflection-1'], ['user_id', 'therapist-1']])
})

test('updatePrivateReflectionBody rejects structured and therapeutic stance reflections', async () => {
  for (const existing of [
    { id: 'reflection-1', client_id: 'client-1', session_ref: 'session-1', workspace_content: {} },
    { id: 'reflection-1', client_id: null, session_ref: null, workspace_content: { captureSource: 'practice_reflection' } }
  ]) {
    const client = authenticatedClient(() => ({
      select() {
        return scopedSingle({ data: existing, error: null }, [])
      }
    }))
    await assert.rejects(
      updatePrivateReflectionBody({ supabaseClient: client, reflectionId: 'reflection-1', body: 'Changed text' }),
      /original reflective workspace/
    )
  }
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
                select(fields) {
                  assert.equal(fields, 'id')
                  return { single: async () => ({ data: { id: 'reflection-1' }, error: null }) }
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
