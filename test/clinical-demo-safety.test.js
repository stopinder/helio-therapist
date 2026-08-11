import test from 'node:test'
import assert from 'node:assert/strict'
import { assertNoDemoClinicalContent } from '../src/lib/sessions.js'

test('clinical safety: normal therapist draft content is allowed', () => {
  assert.doesNotThrow(() => assertNoDemoClinicalContent(JSON.stringify({ presentingConcerns: 'Client described work stress.' })))
})

test('clinical safety: demonstration content cannot be persisted as a session draft', () => {
  assert.throws(
    () => assertNoDemoClinicalContent(JSON.stringify({ presentingConcerns: '[DEMO] Example clinical content' })),
    error => error?.code === 'DEMO_CLINICAL_CONTENT'
  )
})

test('clinical safety: demonstration content cannot be hidden in legacy notes', () => {
  assert.throws(
    () => assertNoDemoClinicalContent('Previous notes: [demo] example only'),
    error => error?.code === 'DEMO_CLINICAL_CONTENT'
  )
})

test('frontend: prepareDraft should not generate [DEMO] content', async () => {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const source = await readFile(join(process.cwd(), 'src/components/workspace/ClinicalSummaryTab.vue'), 'utf8');
  
  // Verify that prepareDraft does not contain any [DEMO] strings
  const prepareDraftBlock = source.match(/const prepareDraft = async \(\) => \{([\s\S]*?)\};/);
  assert.ok(prepareDraftBlock, 'Could not find prepareDraft function');
  assert.doesNotMatch(prepareDraftBlock[1], /\[DEMO\]/, 'prepareDraft should not contain [DEMO] content');
})
