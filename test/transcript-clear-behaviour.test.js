import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import * as Vue from 'vue'
import { compile } from '@vue/compiler-dom'
import { renderToString } from '@vue/server-renderer'

const source = fs.readFileSync(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
const names = 'transcripts, selected, saving, loading, errorMessage, successMessage, lastClearedBatch, filterMode, searchQuery, clearAllAttention, undoClearAttention, restoreToAttention'
function inbox(fetch) {
  return new Function('ref', 'computed', 'onMounted', 'watch', 'useRouter', 'authenticatedFetch', 'defineProps', 'defineEmits', `${script}\nreturn {${names}}`)(Vue.ref, Vue.computed, () => {}, () => {}, () => ({}), fetch, () => ({ clients: [] }), () => () => {})
}
const cleared = id => ({ id, updatedAt: '2026-09-23T10:00:00.000Z', attentionClearedAt: '2026-09-23T10:00:00.000Z', text: 'Original text', status: 'ready', clientId: 'client', sessionRef: 'session', reviewChoicesSavedAt: null, completedAt: null })
const restored = id => ({ ...cleared(id), attentionClearedAt: null, updatedAt: '2026-09-23T10:01:00.000Z' })
const response = (transcript, ok = true) => ({ ok, json: async () => ({ transcript }) })
function seed(state, items) {
  state.transcripts.value = [...items]
  state.lastClearedBatch.value = [...items]
}

test('Undo applies successes, retains failed original versions, and retries only failures', async () => {
  const requests = []
  let retry = false
  const state = inbox(async (_, options) => {
    const body = JSON.parse(options.body)
    requests.push(body)
    if (body.id === 'b' && !retry) return response(restored('b'), false)
    return response(restored(body.id))
  })
  seed(state, [cleared('a'), cleared('b')])
  await state.undoClearAttention()
  assert.deepEqual(state.transcripts.value.map(t => t.attentionClearedAt), [null, cleared('b').attentionClearedAt])
  assert.deepEqual(state.lastClearedBatch.value.map(t => t.id), ['b'])
  assert.equal(state.successMessage.value, '')
  assert.match(state.errorMessage.value, /Retry Undo/)
  // A newer list record must not silently replace the original Undo version.
  state.transcripts.value[1] = { ...cleared('b'), updatedAt: '2026-09-23T10:02:00.000Z' }
  retry = true
  await state.undoClearAttention()
  assert.deepEqual(requests.map(t => t.id), ['a', 'b', 'b'])
  assert.equal(requests[2].expectedUpdatedAt, cleared('b').updatedAt)
  assert.equal(state.lastClearedBatch.value.length, 0)
  assert.equal(state.successMessage.value, 'Clearing undone.')
  assert.equal(state.errorMessage.value, '')
})

const failures = {
  'HTTP 409': async () => ({ ok: false, status: 409, json: async () => ({ error: 'Stale write' }) }),
  'HTTP 500 with apparent transcript': async () => response(restored('a'), false),
  'network error': async () => { throw new Error('Offline') },
  'invalid JSON': async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON') } }),
  'null body': async () => ({ ok: true, json: async () => null }),
  'missing transcript': async () => response(undefined),
  'empty transcript': async () => response({}),
  'wrong id': async () => response(restored('other')),
  'completed transcript': async () => response({ ...restored('a'), completedAt: '2026-09-23T10:03:00.000Z' }),
  'still cleared': async () => response(cleared('a')),
  'missing version': async () => response({ ...restored('a'), updatedAt: undefined }),
  'invalid version': async () => response({ ...restored('a'), updatedAt: 'invalid' }),
  'missing content': async () => response({ ...restored('a'), text: undefined })
}
for (const [name, fetch] of Object.entries(failures)) {
  test(`Undo retains retry state after ${name}`, async () => {
    const state = inbox(fetch)
    seed(state, [cleared('a')])
    await state.undoClearAttention()
    assert.deepEqual(state.lastClearedBatch.value, [cleared('a')])
    assert.deepEqual(state.transcripts.value, [cleared('a')])
    assert.equal(state.successMessage.value, '')
    assert.ok(state.errorMessage.value)
    assert.equal(state.saving.value, false)
  })
}

test('Undo blocks overlapping Undo, Clear all, and individual restoration until every request settles', async () => {
  let release
  let calls = 0
  const state = inbox(async () => { calls++; return await new Promise(resolve => { release = resolve }) })
  seed(state, [cleared('a')])
  state.selected.value = cleared('a')
  const pending = state.undoClearAttention()
  await state.undoClearAttention()
  await state.clearAllAttention()
  await state.restoreToAttention()
  assert.equal(calls, 1)
  assert.equal(state.saving.value, true)
  release(response(restored('a')))
  await pending
  assert.equal(state.saving.value, false)
})

test('a rejected network request does not discard another successful restoration', async () => {
  const state = inbox(async (_, options) => {
    const { id } = JSON.parse(options.body)
    if (id === 'a') throw new Error('Offline')
    return response(restored(id))
  })
  seed(state, [cleared('a'), cleared('b')])
  await state.undoClearAttention()
  assert.deepEqual(state.transcripts.value[1], restored('b'))
  assert.deepEqual(state.lastClearedBatch.value.map(t => t.id), ['a'])
})

test('individual restoration rejects malformed response data', async () => {
  const state = inbox(async () => response({}))
  state.selected.value = cleared('a')
  await state.restoreToAttention()
  assert.deepEqual(state.selected.value, cleared('a'))
  assert.equal(state.successMessage.value, '')
  assert.equal(state.errorMessage.value, 'Unable to restore this transcript.')
})

const template = source.match(/<template>([\s\S]*?)<script setup>/)[1].replace(/<\/template>\s*$/, '')
const render = new Function('Vue', compile(template, { mode: 'function' }).code)(Vue)
async function html(overrides) {
  const bindings = `${names}, expandedRows, editingClient, editingSession, editingChoices, showRaw, filters, matchingTranscripts, visibleTranscripts, hasMoreHistory, actionableCount, historyLimit, historyPageSize, rowTitle, formatDate, workflowTone, workflowState, primaryAction, labelFor, clientName, selectedClientId, selectedSessionRef, selectedLens, sourceRetention, showAddClient, addingClient, addClientError, sessionsForClient, selectedSessionDetails, isEligibleForDeletion, sessionOptionLabel`
  const state = new Function('ref', 'computed', 'onMounted', 'watch', 'useRouter', 'authenticatedFetch', 'defineProps', 'defineEmits', `${script}\nreturn {${bindings}, clients: props.clients, ${[...script.matchAll(/^(?:async )?function (\w+)/gm)].map(m => m[1]).join(',')}}`)(Vue.ref, Vue.computed, () => {}, () => {}, () => ({}), () => {}, () => ({ clients: [] }), () => () => {})
  for (const [key, value] of Object.entries(overrides)) state[key].value = value
  state.loading.value = false
  const app = Vue.createSSRApp({ setup: () => state, render })
  app.component('StatusIndicator', { template: '<span><slot /></span>' })
  app.component('AddClientModal', { render: () => null })
  return renderToString(app)
}

test('History explanation appears above populated and empty lists; completion label takes precedence', async () => {
  const explanation = 'Transcripts cleared from the inbox or with completed inbox setup. Clearing does not mark work as complete.'
  const populated = await html({ filterMode: 'history', transcripts: [cleared('a'), { ...cleared('b'), completedAt: '2026-09-23T10:03:00.000Z' }] })
  assert.ok(populated.includes(explanation), 'History explanation exists')
  assert.ok(populated.includes('class="inbox-list"'), 'History inbox list exists')
  assert.ok(populated.indexOf(explanation) < populated.indexOf('class="inbox-list"'))
  assert.equal(populated.split('Inbox setup complete').length - 1, 1)
  assert.equal(populated.split('Cleared from inbox').length - 1, 1)
  const empty = await html({ filterMode: 'history', transcripts: [] })
  assert.ok(empty.indexOf(explanation) >= 0)
  assert.ok(empty.indexOf(explanation) < empty.indexOf('empty-card'))
})

test('Undo control remains visible after error and disabled during saving', async () => {
  const output = await html({ lastClearedBatch: [cleared('a')], errorMessage: 'Retry required', saving: true })
  assert.match(output, /class="undo-link" disabled[^>]*>Undo<\/button>/)
})

// Execute the real handler with an in-memory query adapter, including all filters.
const apiSource = fs.readFileSync(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')
const handlerFactory = new Function('requireAuthenticatedUser', apiSource.replace(/^import .*$/gm, '').replace('export default async function handler', 'return async function handler'))
function api(rows, beforeUpdate = () => {}) {
  const supabase = { from(table) {
    assert.equal(table, 'zoom_transcripts')
    const filters = []
    let update
    const query = {
      select() { return query },
      eq(key, value) { filters.push(row => row[key] === value); return query },
      is(key, value) { filters.push(row => row[key] === value); return query },
      in(key, values) { filters.push(row => values.includes(row[key])); return query },
      update(value) { beforeUpdate(rows); update = value; return query },
      execute(single = false) {
        const matched = rows.filter(row => filters.every(filter => filter(row)))
        if (update) matched.forEach(row => Object.assign(row, update))
        return { data: single ? matched[0] || null : matched, error: null }
      },
      maybeSingle() { return Promise.resolve(query.execute(true)) },
      then(resolve, reject) { return Promise.resolve(query.execute()).then(resolve, reject) }
    }
    return query
  } }
  const handler = handlerFactory(async () => ({ supabase, user: { id: 'owner' } }))
  return async body => {
    const res = { setHeader() {}, status(code) { this.code = code; return this }, json(data) { this.data = data; return this } }
    await handler({ method: 'PATCH', body }, res)
    return res
  }
}
const row = (id, overrides = {}) => ({ id, therapist_user_id: 'owner', completed_at: null, deleted_at: null, attention_cleared_at: null, updated_at: 'original-version', original_transcript: 'Original', client_id: 'client', session_ref: 'session', review_choices_saved_at: 'reviewed', ...overrides })

test('repeated batch clearing preserves existing timestamps and all protected records and fields', async () => {
  const rows = [row('a'), row('already', { attention_cleared_at: 'earlier' }), row('completed', { completed_at: 'complete' }), row('deleted', { deleted_at: 'deleted' }), row('foreign', { therapist_user_id: 'other' }), row('not-requested')]
  const original = structuredClone(rows)
  const request = api(rows)
  const body = { action: 'clear-attention', ids: rows.slice(0, -1).map(t => t.id) }
  const first = await request(body)
  assert.equal(first.code, 200)
  assert.deepEqual(first.data.transcripts.map(t => t.id), ['a'])
  const afterFirst = structuredClone(rows)
  const second = await request(body)
  assert.equal(second.code, 200)
  assert.deepEqual(second.data.transcripts, [])
  assert.deepEqual(rows, afterFirst)
  assert.deepEqual(rows.slice(1), original.slice(1))
  const { attention_cleared_at, updated_at, ...unchanged } = rows[0]
  const { attention_cleared_at: oldClear, updated_at: oldUpdate, ...originalFields } = original[0]
  assert.deepEqual(unchanged, originalFields)
  assert.ok(attention_cleared_at)
  assert.notEqual(updated_at, oldUpdate)
})

test('restoration rejects stale versions before update and concurrent changes during update', async () => {
  const rows = [row('a', { attention_cleared_at: 'cleared' })]
  const stale = await api(rows)({ id: 'a', restoreAttention: true, expectedUpdatedAt: 'stale-version' })
  assert.equal(stale.code, 409)
  assert.equal(rows[0].attention_cleared_at, 'cleared')
  const concurrent = await api(rows, records => { records[0].updated_at = 'newer-version' })({ id: 'a', restoreAttention: true, expectedUpdatedAt: 'original-version' })
  assert.equal(concurrent.code, 409)
  assert.equal(rows[0].attention_cleared_at, 'cleared')
})


test('completed and cleared transcript has no restore button and sends no restoration request', async () => {
  const completed = { ...cleared('a'), completedAt: '2026-09-23T10:03:00.000Z' }
  const output = await html({ selected: completed })
  assert.doesNotMatch(output, /Return to Needs attention/)
  let calls = 0
  const state = inbox(async () => { calls++; return response(restored('a')) })
  state.selected.value = completed
  await state.restoreToAttention()
  assert.equal(calls, 0)
  assert.deepEqual(state.selected.value, completed)
  assert.equal(state.successMessage.value, '')
})

test('uncleared transcript sends no restoration request', async () => {
  let calls = 0
  const state = inbox(async () => { calls++; return response(restored('a')) })
  state.selected.value = restored('a')
  await state.restoreToAttention()
  assert.equal(calls, 0)
})

test('individual restoration rejects a successful response containing completedAt', async () => {
  const state = inbox(async () => response({ ...restored('a'), completedAt: '2026-09-23T10:03:00.000Z' }))
  state.selected.value = cleared('a')
  await state.restoreToAttention()
  assert.deepEqual(state.selected.value, cleared('a'))
  assert.equal(state.successMessage.value, '')
  assert.equal(state.errorMessage.value, 'Unable to restore this transcript.')
})

for (const field of ['completed_at', 'deleted_at']) {
  test(`server rejects restoration of ${field} records without changing any fields`, async () => {
    const rows = [row('a', { attention_cleared_at: 'cleared', [field]: '2026-09-23T10:03:00.000Z' })]
    const original = structuredClone(rows)
    let updates = 0
    const request = api(rows, () => { updates++ })
    for (const extra of [{}, { markComplete: false }]) {
      const result = await request({ id: 'a', restoreAttention: true, expectedUpdatedAt: 'original-version', ...extra })
      assert.equal(result.code, 409)
      assert.equal(result.data.error, 'Completed or deleted transcripts cannot be returned to Needs attention.')
      assert.deepEqual(rows, original)
    }
    assert.equal(updates, 0)
  })

  test(`restoration update rejects concurrent ${field} even with an unchanged version`, async () => {
    const rows = [row('a', { attention_cleared_at: 'cleared' })]
    const expected = [{ ...rows[0], [field]: '2026-09-23T10:03:00.000Z' }]
    const result = await api(rows, records => { records[0][field] = expected[0][field] })({ id: 'a', restoreAttention: true, expectedUpdatedAt: 'original-version' })
    assert.equal(result.code, 409)
    assert.deepEqual(rows, expected)
  })
}

test('eligible server restoration succeeds without modifying completion or transcript content', async () => {
  const rows = [row('a', { attention_cleared_at: 'cleared' })]
  const original = { ...rows[0] }
  const result = await api(rows)({ id: 'a', restoreAttention: true, expectedUpdatedAt: 'original-version' })
  assert.equal(result.code, 200)
  assert.equal(result.data.transcript.completedAt, null)
  assert.equal(result.data.transcript.attentionClearedAt, null)
  assert.deepEqual(rows[0], { ...original, attention_cleared_at: null, updated_at: rows[0].updated_at })
})
