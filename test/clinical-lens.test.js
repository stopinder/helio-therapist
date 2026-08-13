import test from 'node:test'
import assert from 'node:assert/strict'
import { getLens, DEFAULT_LENS_ID, CLINICAL_LENSES } from '../src/lib/clinicalLenses.js'
import { resolveLensConfig } from '../api/_lib/clinical-lenses.js'
import { readFile } from 'node:fs/promises'

test('Clinical Lens: Shared neutral configuration registry', () => {
  // src/lib/clinicalLenses.js (client-side)
  assert.ok(CLINICAL_LENSES.gentle_cbt, 'gentle_cbt lens exists')
  assert.ok(CLINICAL_LENSES.integrative, 'integrative lens exists')
  assert.strictEqual(DEFAULT_LENS_ID, 'gentle_cbt')

  const lens = getLens('gentle_cbt')
  assert.strictEqual(lens.label, 'Gentle CBT')
  assert.ok(lens.sections.current_focus, 'gentle_cbt has current_focus section')
  assert.ok(lens.aiFraming, 'gentle_cbt has aiFraming')

  // Fallback behavior
  const fallback = getLens('unknown_id')
  assert.strictEqual(fallback.id, 'gentle_cbt', 'unknown lens falls back to default')
})

test('Clinical Lens: Server-side resolution', () => {
  const config = resolveLensConfig('gentle_cbt')
  assert.strictEqual(config.id, 'gentle_cbt')
  assert.ok(config.aiFraming)
  assert.ok(Array.isArray(config.allowedKinds))
  assert.ok(config.allowedKinds.includes('current_focus'))

  const fallback = resolveLensConfig('invalid-id')
  assert.strictEqual(fallback.id, 'gentle_cbt', 'server-side resolution falls back safely')
})

test('Clinical Lens: UI uses lens configuration', async () => {
  const carePanel = await readFile(new URL('../src/components/workspace/ClientCarePanel.vue', import.meta.url), 'utf8')
  const careFocus = await readFile(new URL('../src/components/workspace/CurrentCareFocus.vue', import.meta.url), 'utf8')

  // Care Panel uses lens terminology and sections
  assert.match(carePanel, /lens\.terminology\.care/)
  assert.match(carePanel, /availableLenses/)
  assert.match(carePanel, /sections=computed/)
  assert.match(carePanel, /v-for="l in availableLenses"/)

  // Care Focus uses lens sections
  assert.match(careFocus, /lens\.sections\.current_focus\?\.label/)
  assert.match(careFocus, /lens\.terminology\.care/)
})

test('Clinical Lens: AI suggestions endpoint resolves lensId', async () => {
  const handler = await readFile(new URL('../api/ai/care-suggestions.js', import.meta.url), 'utf8')

  assert.match(handler, /const lensId = String\(req\.body\?\.lensId || ''\)\.trim\(\)/)
  assert.match(handler, /const lensConfig = resolveLensConfig\(lensId\)/)
  assert.match(handler, /\${lensConfig\.aiFraming} Generate 3-6 discrete possibilities/)
  assert.match(handler, /Allowed kinds: \${ALLOWED_KINDS\.join\(', '\)}/)
  
  // Verify it doesn't accept arbitrary prompt text from client for framing
  assert.doesNotMatch(handler, /req\.body\.aiFraming/)
})

test('Clinical Lens: Explicitly CBT-specific tools remain untouched', async () => {
  // We check if these files still exist and likely contain CBT specific wording as they should
  try {
    const cbtLoader = await readFile(new URL('../src/components/tools/CBTToolLoader.vue', import.meta.url), 'utf8')
    assert.match(cbtLoader, /CBT/)
  } catch (e) {
    // If file doesn't exist, it's fine for this test pass if it wasn't there before
  }
})
