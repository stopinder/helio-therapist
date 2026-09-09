import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { reactive, computed } from 'vue'
import { therapistQuestions, CONTEXT_ANSWER } from '../src/quiz/therapist/questions.js'
import { answerProgress } from '../src/quiz/therapist/progress.js'
import { buildResult, buildFallbackReport } from '../src/quiz/therapist/buildResult.js'
import { createReflectionSnapshot, reflectionText, canonicalJSON } from '../src/quiz/therapist/snapshot.js'
import { saveStanceReflection, isStanceReflection } from '../src/lib/stanceReflections.js'

const all = (value = 'a') => Object.fromEntries(therapistQuestions.map(q => [q.id, value]))
const makeSnapshot = (value = 'a') => {
  const answers = all(value)
  return createReflectionSnapshot({ id: '22222222-2222-4222-8222-222222222222', completedAt: '2026-09-09T10:00:00.000Z', answers,
    report: buildFallbackReport(buildResult(answers)), mode: 'fallback' })
}
function database({ userId = '11111111-1111-4111-8111-111111111111', insertError = null, existing = null } = {}) {
  const calls = []
  const client = { auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) }, from(table) {
    calls.push(['table', table]); const filters = {}
    return {
      insert(row) { calls.push(['insert', row]); return { select: () => ({ single: async () => ({ data: insertError ? null : { ...row, created_at: '2026-09-09T10:01:00Z' }, error: insertError }) }) } },
      select() { return this }, eq(key, value) { filters[key] = value; calls.push(['filter', key, value]); return this },
      async maybeSingle() { return { data: existing && existing.user_id === filters.user_id && existing.id === filters.id ? existing : null, error: null } }
    }
  } }
  return { client, calls }
}
test('completion remains reactive through all 15 answers and context stays unscored', () => {
  const answers = reactive({}), progress = computed(() => answerProgress(answers))
  assert.equal(progress.value.answered, 0)
  therapistQuestions.forEach((q, i) => { answers[q.id] = CONTEXT_ANSWER; assert.equal(progress.value.answered, i + 1) })
  assert.equal(progress.value.complete, true)
  assert.deepEqual(buildResult(answers).primaryDimensions, [])
})
test('identical answers deterministically preserve evidence and opposite poles', () => {
  assert.deepEqual(buildResult(all()), buildResult(Object.fromEntries(Object.entries(all()).reverse())))
  assert.ok(buildResult(all('a')).dimensions.every(d => d.lean === 'negative'))
  assert.ok(buildResult(all('b')).dimensions.every(d => d.lean === 'positive'))
})
test('saves the exact downloadable text with an owner-bound snapshot and no clinical context', async () => {
  const { client, calls } = database(), snapshot = makeSnapshot()
  const saved = await saveStanceReflection({ snapshot, supabaseClient: client })
  assert.equal(saved.body, reflectionText(snapshot))
  assert.equal(saved.user_id, '11111111-1111-4111-8111-111111111111')
  assert.equal(saved.client_id, null); assert.equal(saved.session_ref, null); assert.equal(saved.included_in_supervision, false)
  assert.ok(isStanceReflection(saved)); assert.deepEqual(saved.workspace_content.stanceSnapshot, snapshot)
  assert.equal(saved.workspace_content.reflectiveMap, undefined)
  assert.equal(saved.workspace_content.stanceSnapshot.continuity.status, 'not_analysed')
  assert.deepEqual(calls.filter(c => c[0] === 'table').map(c => c[1]), ['private_reflections'])
})
test('does not write without authentication', async () => {
  const { client, calls } = database({ userId: null })
  await assert.rejects(saveStanceReflection({ snapshot: makeSnapshot(), supabaseClient: client }), /sign in/)
  assert.equal(calls.length, 0)
})
test('rejects forged interpretation, unknown fields and altered authored prose before persistence', async () => {
  for (const change of [s => { s.interpretation.primaryDimensions = [] }, s => { s.user_id = 'other' }, s => { s.narrative.report.sections[0].paragraphs[0] = 'Invented claim' }]) {
    const snapshot = makeSnapshot(); change(snapshot)
    const { client, calls } = database()
    await assert.rejects(saveStanceReflection({ snapshot, supabaseClient: client }))
    assert.equal(calls.length, 0)
  }
})
test('does not save an AI-labelled report without the later provenance-aware native AI adapter', async () => {
  const answers = all(), snapshot = createReflectionSnapshot({ id: makeSnapshot().id, completedAt: makeSnapshot().completedAt,
    answers, report: buildFallbackReport(buildResult(answers)), mode: 'ai' })
  const { client, calls } = database()
  await assert.rejects(saveStanceReflection({ snapshot, supabaseClient: client }), /authored/)
  assert.equal(calls.length, 0)
})
test('retry after a successful insert confirms the same record without an update', async () => {
  const first = database(), snapshot = makeSnapshot()
  const existing = await saveStanceReflection({ snapshot, supabaseClient: first.client })
  const retry = database({ insertError: { code: '23505' }, existing })
  const saved = await saveStanceReflection({ snapshot, supabaseClient: retry.client })
  assert.equal(saved.id, existing.id)
  assert.ok(retry.calls.some(c => c[0] === 'filter' && c[1] === 'user_id' && c[2] === existing.user_id))
})
test('a colliding record owned by another therapist cannot be accepted or overwritten', async () => {
  const first = database(), snapshot = makeSnapshot()
  const existing = await saveStanceReflection({ snapshot, supabaseClient: first.client })
  existing.user_id = 'other'
  const retry = database({ insertError: { code: '23505' }, existing })
  await assert.rejects(saveStanceReflection({ snapshot, supabaseClient: retry.client }), /not confirmed|could not be confirmed/)
})
test('network errors do not claim success and do not change the snapshot', async () => {
  const snapshot = makeSnapshot(), before = canonicalJSON(snapshot)
  const { client } = database({ insertError: { code: 'network' } })
  await assert.rejects(saveStanceReflection({ snapshot, supabaseClient: client }))
  assert.equal(canonicalJSON(snapshot), before)
})
test('the native route is authenticated, lazy and does not add an external report service', () => {
  const router = readFileSync(new URL('../src/router/index.js', import.meta.url), 'utf8')
  assert.match(router, /path: 'practice-reflection'/)
  const entry = router.split('\n').find(line => line.includes("path: 'practice-reflection'"))
  assert.ok(!entry.includes('public: true'))
  const wrapper = readFileSync(new URL('../src/views/supervision/PracticeReflection.vue', import.meta.url), 'utf8')
  assert.match(wrapper, /report-endpoint=""/)
  assert.match(wrapper, /saveStanceReflection/)
})
test('exercise detail stays source-aware and outside the existing reflection AI modal', () => {
  const layout = readFileSync(new URL('../src/layouts/ProfessionalDevelopmentLayout.vue', import.meta.url), 'utf8')
  assert.match(layout, /selectedReflection && isStanceReflection\(selectedReflection\)/)
  const detail = readFileSync(new URL('../src/components/professional-development/ExerciseReflectionModal.vue', import.meta.url), 'utf8')
  assert.ok(!detail.includes('/api/ai/'))
  assert.ok(!detail.includes('v-html'))
})
