import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { SUPERVISION_SUMMARY_MINIMUM_CHARACTERS, buildReflectionInput, canSummariseReflection, validateSupervisionSummary } from '../api/_lib/supervision-summary.js'

test('a reflection may be saved empty or short, while summary generation needs enough source material', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260724110500_allow_empty_private_reflections.sql', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  assert.match(migration, /char_length\(body\) <= 20000/)
  assert.equal(canSummariseReflection(''), false)
  assert.equal(canSummariseReflection('short note'), false)
  assert.equal(canSummariseReflection('x'.repeat(SUPERVISION_SUMMARY_MINIMUM_CHARACTERS)), true)
  assert.match(workspace, /:disabled="saving"/)
  assert.match(workspace, /minimumSummaryCharacters = 80/)
})

test('the summary request is authenticated and delimits source writing', async () => {
  const endpoint = await readFile(new URL('../api/ai/supervision-summary.js', import.meta.url), 'utf8')
  assert.match(endpoint, /requireAuthenticatedUser/)
  assert.match(endpoint, /supervisionSummarySystemPrompt/)
  assert.match(endpoint, /buildReflectionInput\(reflection\)/)
  assert.equal(buildReflectionInput('one reflection'), '<reflection>\none reflection\n</reflection>')
})

test('only a bounded, supported draft is accepted', () => {
  assert.ok(validateSupervisionSummary('Themes\n\nA tentative theme.\n\nQuestions to explore\n\nWhat might be worth exploring?'))
  assert.equal(validateSupervisionSummary('Moments that stayed with me\n\nA thought'), null)
  assert.equal(validateSupervisionSummary(''), null)
})

test('regeneration versions summaries and never overwrites the original reflection', async () => {
  const workspace = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  const migration = await readFile(new URL('../supabase/migrations/20260724110000_add_reflection_summary_artifacts.sql', import.meta.url), 'utf8')
  assert.match(workspace, /generation_status: 'superseded'/)
  assert.match(workspace, /generation_status: 'failed'/)
  assert.match(workspace, /Regenerate draft/)
  assert.match(workspace, /from\('reflection_supervision_summaries'\)\.insert/)
  assert.doesNotMatch(workspace, /from\('private_reflections'\)\.update/)
  assert.match(migration, /generated_content text/)
  assert.match(migration, /edited_content text/)
})
