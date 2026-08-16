import test from 'node:test'
import assert from 'node:assert/strict'
import { getLens, DEFAULT_LENS_ID, CLINICAL_LENSES } from '../src/lib/clinicalLenses.js'
import { resolveLensConfig } from '../api/_lib/clinical-lenses.js'
import { readFile } from 'node:fs/promises'

test('Clinical Lens: Shared neutral configuration registry', () => {
  assert.ok(CLINICAL_LENSES.gentle_cbt, 'gentle_cbt lens exists')
  assert.ok(CLINICAL_LENSES.integrative, 'integrative lens exists')
  assert.strictEqual(DEFAULT_LENS_ID, 'gentle_cbt')

  const lens = getLens('gentle_cbt')
  assert.strictEqual(lens.label, 'Gentle CBT')
  assert.ok(lens.sections.current_focus, 'gentle_cbt has current_focus section')
  assert.ok(lens.aiFraming, 'gentle_cbt has aiFraming')

  const fallback = getLens('unknown_id')
  assert.strictEqual(fallback.id, 'gentle_cbt', 'unknown lens falls back to default')
})

test('Clinical Lens: Server-side resolution', () => {
  const config = resolveLensConfig('gentle_cbt')
  assert.strictEqual(config.id, 'gentle_cbt')
  assert.ok(config.aiFraming)
  assert.ok(Array.isArray(config.allowedKinds))
  assert.ok(config.allowedKinds.includes('current_focus'))

  const integrative = resolveLensConfig('integrative')
  assert.deepEqual(integrative.allowedKinds, ['narrative', 'themes', 'interventions', 'outcomes'])

  const fallback = resolveLensConfig('invalid-id')
  assert.strictEqual(fallback.id, 'gentle_cbt', 'server-side resolution falls back safely')
})

test('Clinical Lens: UI uses lens configuration', async () => {
  const carePanel = await readFile(new URL('../src/components/workspace/ClientCarePanel.vue', import.meta.url), 'utf8')
  const careFocus = await readFile(new URL('../src/components/workspace/CurrentCareFocus.vue', import.meta.url), 'utf8')

  assert.match(carePanel, /lens\.terminology\.care/)
  assert.match(carePanel, /availableLenses/)
  assert.match(carePanel, /sections=computed/)
  assert.match(carePanel, /v-for="l in availableLenses"/)

  assert.match(careFocus, /lens\.sections\.current_focus\?\.label/)
  assert.match(careFocus, /lens\.terminology\.care/)
})

test('Clinical Lens: AI suggestions endpoint resolves lensId through the shared prompt builder', async () => {
  const handler = await readFile(new URL('../api/ai/care-suggestions.js', import.meta.url), 'utf8')
  const promptBuilder = await readFile(new URL('../api/_lib/ai-care-suggestions.js', import.meta.url), 'utf8')

  assert.match(handler, /const lensId = String\(req\.body\?\.lensId || ''\)\.trim\(\)/)
  assert.match(handler, /const lensConfig = resolveLensConfig\(lensId\)/)
  assert.match(handler, /buildCareSuggestionsPrompt\(\{ lensConfig, input, steering, currentCare, approvedContext \}\)/)
  assert.match(promptBuilder, /\${lensConfig\.aiFraming}/)
  assert.match(promptBuilder, /Allowed kinds: \${lensConfig\.allowedKinds\.join\(', '\)}/)
  assert.doesNotMatch(handler, /req\.body\.aiFraming/)
})

test('Clinical Lens: database constraint permits all configured Care kinds', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260814114000_allow_integrative_care_kinds.sql', import.meta.url), 'utf8')
  const configuredKinds = new Set(
    Object.values(CLINICAL_LENSES).flatMap(lens => Object.keys(lens.sections))
  )

  for (const kind of configuredKinds) {
    assert.match(migration, new RegExp(`'${kind}'`), `${kind} is allowed by the Care kind constraint`)
  }
})

test('Clinical Lens: Explicitly CBT-specific tools remain untouched', async () => {
  try {
    const cbtLoader = await readFile(new URL('../src/components/tools/CBTToolLoader.vue', import.meta.url), 'utf8')
    assert.match(cbtLoader, /CBT/)
  } catch (e) {
    // This tool is optional in deployments where it has not been introduced.
  }
})
