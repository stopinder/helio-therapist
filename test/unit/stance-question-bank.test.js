import test from 'node:test'
import assert from 'node:assert/strict'
import { questionBank, therapistQuestions, generateQuestionSet, resolveQuestionSet, BANK_VERSION } from '../../src/quiz/therapist/questions.js'
import { scoreAnswers, validateAnswers } from '../../src/quiz/therapist/scoring.js'
import { buildResult, buildFallbackReport } from '../../src/quiz/therapist/buildResult.js'
import { createReflectionSnapshot, validateReflectionSnapshot, reflectionText, BANK_SNAPSHOT_VERSION } from '../../src/quiz/therapist/snapshot.js'
import { mergeSeenQuestions, readSeenQuestions, writeSeenQuestions, snapshotQuestionIds } from '../../src/quiz/therapist/history.js'
import { loadPracticeReflectionHistory } from '../../src/lib/practiceReflectionLibrary.js'

const ids = set => set.map(q => q.id)
const answersFor = (set, choices) => Object.fromEntries(set.map((q, i) => [q.id, choices[i % choices.length]]))
const numerical = scores => scores.map(({ positiveEvidence, negativeEvidence, neutralEvidence, ...score }) => score)
const makeSnapshot = set => {
  const questionIds = ids(set), answers = answersFor(set, ['a', 'c', 'b', 'context', 'd'])
  return createReflectionSnapshot({ id: '33333333-3333-4333-8333-333333333333', completedAt: '2026-10-07T12:00:00.000Z',
    answers, questionIds, mode: 'fallback', report: buildFallbackReport(buildResult(answers, questionIds)) })
}

test('60 unique authored situations preserve every original weight matrix and all dimension pairs', () => {
  assert.equal(questionBank.length, 60)
  assert.equal(new Set(ids(questionBank)).size, 60)
  assert.equal(new Set(questionBank.map(q => q.text)).size, 60)
  assert.equal(new Set(questionBank.map(q => q.title)).size, 60)
  const pairs = new Set()
  for (const original of therapistQuestions) {
    const variants = questionBank.filter(q => q.slot === original.id)
    assert.equal(variants.length, 4)
    pairs.add(Object.keys(original.options[0].weights).sort().join(':'))
    for (const q of variants) {
      assert.equal(q.options.length, 4)
      q.options.forEach((o, i) => {
        assert.ok(o.text.trim())
        assert.equal(o.id, original.options[i].id)
        assert.deepEqual(o.weights, original.options[i].weights)
      })
    }
  }
  assert.equal(pairs.size, 15)
})

test('every variant and mixed set has scoring equivalence, including context and contradictory poles', () => {
  for (const choices of [['a'], ['b'], ['c'], ['d'], ['context'], ['a', 'b', 'context', 'd', 'c']]) {
    const baseline = scoreAnswers(answersFor(therapistQuestions, choices))
    for (let variant = 0; variant < 4; variant++) {
      const set = generateQuestionSet([], () => variant / 4)
      const scored = scoreAnswers(answersFor(set, choices), ids(set))
      assert.equal(scored.quizVersion, BANK_VERSION)
      assert.deepEqual(numerical(scored.dimensionScores), numerical(baseline.dimensionScores))
      assert.ok(scored.dimensionScores.every(d => d.availableItems === 5))
    }
    const set = therapistQuestions.map((q, i) => questionBank.filter(v => v.slot === q.id)[i % 4])
    assert.deepEqual(numerical(scoreAnswers(answersFor(set, choices), ids(set)).dimensionScores), numerical(baseline.dimensionScores))
  }
})

test('four attempts exhaust the bank without repeats; exhaustion falls back to oldest seen per pair', () => {
  let seen = []
  const attempts = []
  for (let i = 0; i < 4; i++) {
    const set = generateQuestionSet(seen, () => 0.6)
    assert.equal(set.length, 15)
    assert.equal(new Set(set.map(q => q.slot)).size, 15)
    assert.ok(ids(set).every(id => !seen.includes(id)))
    seen = mergeSeenQuestions(seen, ids(set)); attempts.push(ids(set))
  }
  assert.equal(seen.length, 60)
  assert.deepEqual(ids(generateQuestionSet(seen, () => 0.6)), attempts[0])
  assert.deepEqual(ids(generateQuestionSet(attempts[0].slice(0, 7), () => 0)), ids(generateQuestionSet(attempts[0].slice(0, 7), () => 0)), 'Injectable randomness is reproducible')
})

test('rejects unknown, duplicate, oversized and pair-unbalanced sets and mismatched answers', () => {
  const set = generateQuestionSet([], () => 0), valid = ids(set), answers = answersFor(set, ['a'])
  for (const invalid of [null, [], valid.slice(1), [...valid, 'q16'], ['unknown', ...valid.slice(1)], [valid[1], ...valid.slice(1)], ['q16', 'q01', ...valid.slice(2)]]) {
    assert.throws(() => resolveQuestionSet(invalid))
  }
  assert.throws(() => validateAnswers({ ...answers, q16: 'a' }, valid))
  assert.throws(() => validateAnswers({ ...answers, q01: 'invalid' }, valid))
  const incomplete = { ...answers }; delete incomplete.q01
  assert.throws(() => validateAnswers(incomplete, valid))
})

test('bank snapshot persists ordered question IDs and verifies historical source on roundtrip', () => {
  const snapshot = makeSnapshot(generateQuestionSet([], () => 0.8))
  assert.equal(snapshot.schemaVersion, BANK_SNAPSHOT_VERSION)
  assert.deepEqual(validateReflectionSnapshot(JSON.parse(JSON.stringify(snapshot))), snapshot)
  assert.match(reflectionText(snapshot), /Question IDs: q46, q47/)
  const missing = structuredClone(snapshot); delete missing.questionIds
  assert.throws(() => validateReflectionSnapshot(missing))
  const changed = structuredClone(snapshot); changed.questionIds[0] = 'q01'
  assert.throws(() => validateReflectionSnapshot(changed))
  const injected = structuredClone(snapshot); injected.scoringVersion = 'future'
  assert.throws(() => validateReflectionSnapshot(injected))
})

test('seen history is therapist-specific, robust to blocked storage, and accepts historical snapshots without IDs', () => {
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
  writeSeenQuestions(storage, 'therapist-a', ['q01', 'q16', 'q01', 'bad'])
  assert.deepEqual(readSeenQuestions(storage, 'therapist-a'), ['q16', 'q01'])
  assert.deepEqual(readSeenQuestions(storage, 'therapist-b'), [])
  assert.deepEqual(readSeenQuestions(storage, ''), [])
  const blocked = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } }
  assert.deepEqual(readSeenQuestions(blocked, 'a'), [])
  assert.doesNotThrow(() => writeSeenQuestions(blocked, 'a', ['q01']))
  values.set('stance-seen:broken', '{')
  assert.deepEqual(readSeenQuestions(storage, 'broken'), [])
  assert.deepEqual(snapshotQuestionIds({ exerciseId: 'therapeutic-stance', responses: { q01: 'a', q02: 'context' } }), ['q01', 'q02'])
  assert.deepEqual(snapshotQuestionIds({ exerciseId: 'other', questionIds: ['q01'] }), [])
})

test('saved history query verifies ownership and paginates beyond the first page', async () => {
  const calls = [], pages = [Array.from({ length: 500 }, (_, i) => ({ workspace_content: { practiceReflection: { exerciseId: 'therapeutic-stance', responses: { q01: 'a' } } } })),
    [{ workspace_content: { practiceReflection: makeSnapshot(generateQuestionSet([], () => 0.8)) } }]]
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
    from(table) {
      calls.push(['from', table])
      const query = {
        select() { return query }, eq(...args) { calls.push(['eq', ...args]); return query }, order() { return query },
        async range(...args) { calls.push(['range', ...args]); return { data: pages.shift() } }
      }; return query
    }
  }
  const seen = await loadPracticeReflectionHistory({ supabaseClient: client, expectedUserId: 'owner' })
  assert.equal(seen.length, 16)
  assert.ok(seen.includes('q46'))
  assert.deepEqual(calls.filter(c => c[0] === 'range'), [['range', 0, 499], ['range', 500, 999]])
  assert.ok(calls.filter(c => c[0] === 'eq' && c[1] === 'user_id').every(c => c[2] === 'owner'))
  await assert.rejects(loadPracticeReflectionHistory({ supabaseClient: client, expectedUserId: 'other' }))
})
