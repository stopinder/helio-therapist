import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildReflectionInput, AI_REFLECTION_PROMPT_VERSION } from '../api/_lib/ai-reflection.js'

test('reflection prompt version changes when bounded client context is introduced', () => {
  assert.equal(AI_REFLECTION_PROMPT_VERSION, 'ai-reflection-v2')
})

test('reflection input includes only the assembled bounded client context', () => {
  const input = buildReflectionInput(
    { body: 'I felt pulled to solve this quickly.', theme: 'pace', supervision_question: 'What am I missing?' },
    {
      version: 'client-context-v1',
      currentFocus: 'sleep and boundaries',
      sessions: [{ occurredAt: '2026-08-10T10:00:00Z', content: 'Client described difficulty switching off after work.' }]
    }
  )
  assert.match(input, /Bounded client context \(background only\)/)
  assert.match(input, /Client context version: client-context-v1/)
  assert.match(input, /Current focus: sleep and boundaries/)
  assert.match(input, /Completed session 2026-08-10T10:00:00Z: Client described difficulty switching off after work\./)
})

test('unlinked reflections do not receive client context', () => {
  const input = buildReflectionInput({ body: 'Standalone professional reflection.' })
  assert.doesNotMatch(input, /Bounded client context/)
})

test('reflection endpoint loads context only through the owned client context loader', async () => {
  const endpoint = await readFile(new URL('../api/ai/reflect.js', import.meta.url), 'utf8')
  assert.match(endpoint, /select\('id, body, theme, supervision_question, client_id'\)/)
  assert.match(endpoint, /reflection\.client_id\s*\?\s*await loadOwnedClientAIContext\(supabase, \{ clientId: reflection\.client_id, userId: user\.id \}\)/)
  assert.doesNotMatch(endpoint, /from\('transcripts'\)/)
  assert.doesNotMatch(endpoint, /from\('sessions'\)/)
})
