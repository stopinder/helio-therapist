import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildReflectionInput, AI_REFLECTION_PROMPT_VERSION, aiReflectionSystemPrompt, validateAIReflectionResponse } from '../api/_lib/ai-reflection.js'

test('reflection prompt version changes when bounded client context is introduced', () => {
  assert.equal(AI_REFLECTION_PROMPT_VERSION, 'ai-reflection-v3')
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


test('reflection AI may suggest mapping only from therapist-authored reflection material', () => {
  assert.match(aiReflectionSystemPrompt, /mapping must be based ONLY on the therapist-authored reflection text/i)
  assert.match(aiReflectionSystemPrompt, /never on client context/i)
  const result = validateAIReflectionResponse({
    reflective_questions: [],
    possible_themes: [],
    alternative_perspectives: [],
    ethical_considerations: [],
    learning_points: [],
    reflective_map: {
      innerPosition: 'Wanting to organise',
      protectiveIntention: 'Reduce uncertainty',
      trigger: 'A long silence',
      impact: 'I sped up',
      spaceCreated: '',
      supervisionQuestion: 'What happens when I wait?'
    },
    limitations: 'Tentative only.'
  })
  assert.equal(result.reflective_map.innerPosition, 'Wanting to organise')
  assert.equal(result.reflective_map.spaceCreated, '')
})
