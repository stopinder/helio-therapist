import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { reactive, computed } from 'vue'
import { PGlite } from '@electric-sql/pglite'
import { therapistQuestions, CONTEXT_ANSWER } from '../../src/quiz/therapist/questions.js'
import { buildResult, buildFallbackReport } from '../../src/quiz/therapist/buildResult.js'
import { answerProgress } from '../../src/quiz/therapist/progress.js'
import { createReflectionSnapshot, validateReflectionSnapshot, reflectionText, canonicalJSON } from '../../src/quiz/therapist/snapshot.js'
import { savePracticeReflection } from '../../src/lib/practiceReflectionLibrary.js'

const USER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const ID = '33333333-3333-4333-8333-333333333333'
const all = (choice = 'a') => Object.fromEntries(therapistQuestions.map(q => [q.id, choice]))
const snapshot = (id = ID, answers = all()) => createReflectionSnapshot({ id, completedAt: '2026-09-09T18:00:00.000Z', answers,
  report: buildFallbackReport(buildResult(answers)), mode: 'fallback' })
function fakeClient({ user = USER, authError = null, readError = false, rejectInsert = false, loseResponse = false } = {}) {
  const rows = new Map(), writes = [], reads = []
  let lost = false
  return {
    rows, writes, reads,
    auth: { getUser: async () => ({ data: { user: user ? { id: user } : null }, error: authError }) },
    from(table) {
      assert.equal(table, 'private_reflections')
      let payload, filters = {}
      const query = {
        select() { return query },
        eq(key, value) { filters[key] = value; return query },
        async maybeSingle() {
          reads.push({ ...filters })
          if (readError) return { error: { code: '403' } }
          const row = rows.get(filters.id)
          return { data: row?.user_id === filters.user_id ? structuredClone(row) : null, error: null }
        },
        insert(value) { payload = structuredClone(value); writes.push(payload); return query },
        async single() {
          if (rejectInsert) return { error: { code: '42501' } }
          if (rows.has(payload.id)) return { error: { code: '23505' } }
          const row = { ...payload, created_at: '2026-09-09T19:00:00.000Z' }
          rows.set(row.id, row)
          if (loseResponse && !lost) { lost = true; throw new Error('connection lost after insert') }
          return { data: structuredClone(row), error: null }
        }
      }
      return query
    }
  }
}
const save = (client, value = snapshot(), extra = {}) => savePracticeReflection({ snapshot: value, supabaseClient: client, expectedUserId: USER, ...extra })

test('completion tracks all 15 selections including context and does not invent a type', () => {
  const answers = reactive({}), progress = computed(() => answerProgress(answers))
  assert.equal(progress.value.answered, 0)
  therapistQuestions.forEach((q, i) => { answers[q.id] = CONTEXT_ANSWER; assert.equal(progress.value.answered, i + 1) })
  assert.equal(progress.value.complete, true)
  assert.deepEqual(buildResult(answers).primaryDimensions, [])
})
test('snapshot roundtrips JSONB key order and preserves distinct source and narrative', () => {
  const value = snapshot(), reversed = Object.fromEntries(Object.entries(value).reverse())
  assert.deepEqual(validateReflectionSnapshot(reversed), value)
  assert.deepEqual(value.responses, all())
  assert.equal(value.continuity.status, 'not_analysed')
  assert.equal(value.narrative.model, null)
  assert.match(reflectionText(value), /not AI-generated/)
})
test('library saves the report and versioned source privately using existing columns only', async () => {
  const client = fakeClient(), value = snapshot(), result = await save(client, value)
  assert.equal(result.id, ID)
  assert.equal(client.writes.length, 1)
  const row = client.writes[0]
  assert.equal(row.user_id, USER)
  assert.equal(row.client_id, null)
  assert.equal(row.session_ref, null)
  assert.equal(row.included_in_supervision, false)
  assert.equal(row.body, reflectionText(value))
  assert.deepEqual(row.workspace_content.practiceReflection, value)
  assert.equal(row.workspace_content.captureSource, 'practice_reflection')
  assert.equal(row.workspace_content.reflectiveMap, undefined)
  assert.equal(row.created_at, undefined, 'Database assigns save time independently of browser completion time')
  assert.ok(client.reads.every(q => q.user_id === USER))
})
test('retries confirm the same snapshot without overwriting or duplicating it', async () => {
  const client = fakeClient(), value = snapshot()
  await save(client, value)
  await save(client, value)
  assert.equal(client.writes.length, 1)
  assert.equal(client.rows.size, 1)
})
test('recovers a committed insert when the response was lost', async () => {
  const client = fakeClient({ loseResponse: true })
  assert.equal((await save(client)).id, ID)
  assert.equal(client.writes.length, 1)
  assert.equal(client.reads.length, 2)
})
test('a new completion is a new row; an earlier reflection is not overwritten', async () => {
  const client = fakeClient()
  await save(client)
  await save(client, snapshot('44444444-4444-4444-8444-444444444444', all('b')))
  assert.equal(client.rows.size, 2)
  assert.deepEqual(client.rows.get(ID).workspace_content.practiceReflection.responses, all())
})
test('failed or switched authentication cannot save into another therapist account', async () => {
  for (const options of [{ user: null }, { user: OTHER }, { authError: new Error('expired') }]) {
    const client = fakeClient(options)
    await assert.rejects(save(client))
    assert.equal(client.writes.length, 0)
  }
})
test('read and insert failures never return false save success', async () => {
  for (const options of [{ readError: true }, { rejectInsert: true }]) {
    const client = fakeClient(options)
    await assert.rejects(save(client))
    assert.equal(client.rows.size, 0)
  }
})
test('conflicting same-ID contents are not overwritten', async () => {
  const client = fakeClient()
  await save(client)
  client.rows.get(ID).body = 'A separate existing reflection'
  await assert.rejects(save(client))
  assert.equal(client.writes.length, 1)
  assert.equal(client.rows.get(ID).body, 'A separate existing reflection')
})
test('rejects extra identity fields, unsupported versions and tampered authored wording', async () => {
  for (const mutate of [s => { s.user_id = OTHER }, s => { s.scoringVersion = 'different' },
    s => { s.narrative.report.sections[0].paragraphs = ['Unrelated narrative'] }]) {
    const value = snapshot(), client = fakeClient(); mutate(value)
    await assert.rejects(save(client, value))
    assert.equal(client.writes.length, 0)
  }
})
test('existing RLS isolates stored exercise evidence between therapists (local PostgreSQL)', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create schema auth; create role authenticated;
      create table auth.users(id uuid primary key);
      create table public.clients(id uuid primary key, user_id uuid);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`)
    await db.exec(await readFile(new URL('../../supabase/migrations/20260722210000_add_private_reflections.sql', import.meta.url), 'utf8'))
    await db.exec(await readFile(new URL('../../supabase/migrations/20260725161000_strengthen_private_reflections_rls.sql', import.meta.url), 'utf8'))
    await db.exec(`alter table public.private_reflections add column workspace_content jsonb;
      grant usage on schema public, auth to authenticated;
      grant select, insert, update, delete on public.private_reflections to authenticated;
      grant select on public.clients to authenticated;
      insert into auth.users(id) values ('${USER}'),('${OTHER}');
      set role authenticated;`)
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [USER])
    const value = snapshot()
    await db.query('insert into public.private_reflections(id,user_id,body,workspace_content) values($1,$2,$3,$4)', [ID, USER, reflectionText(value), JSON.stringify({ captureSource: 'practice_reflection', practiceReflection: value })])
    let selected = await db.query('select * from public.private_reflections')
    assert.equal(selected.rows.length, 1)
    assert.equal(canonicalJSON(selected.rows[0].workspace_content.practiceReflection), canonicalJSON(value))
    assert.equal(selected.rows[0].included_in_supervision, false)
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [OTHER])
    selected = await db.query('select * from public.private_reflections')
    assert.equal(selected.rows.length, 0)
    await assert.rejects(db.query('insert into public.private_reflections(user_id,body) values($1,$2)', [USER, 'spoofed owner']))
    const changed = await db.query('update public.private_reflections set body=$1 where id=$2 returning id', ['not allowed', ID])
    assert.equal(changed.rows.length, 0)
  } finally { await db.close() }
})
