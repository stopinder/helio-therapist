import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateCareSuggestions } from '../api/_lib/ai-care-suggestions.js'

const panel = await readFile(new URL('../src/components/workspace/ClientCarePanel.vue', import.meta.url), 'utf8')
const endpoint = await readFile(new URL('../api/ai/care-suggestions.js', import.meta.url), 'utf8')
const lensUi = await readFile(new URL('../src/lib/clinicalLenses.js', import.meta.url), 'utf8')
const lensApi = await readFile(new URL('../api/_lib/clinical-lenses.js', import.meta.url), 'utf8')

test('Therapy Focus is the therapist-facing product language', () => {
  assert.match(panel, />Therapy Focus</)
  assert.match(panel, /How Therapy Focus works/)
  assert.match(panel, /Review with Helios/)
  assert.match(panel, /\+ Add reflection/)
  assert.doesNotMatch(panel, />Care</)
  assert.match(lensUi, /care: 'Therapy Focus'/)
  assert.match(lensApi, /Therapy Focus/)
})

test('history review exposes perspective, evidence window and review goal', () => {
  assert.match(panel, /Review Therapy Focus with Helios/)
  assert.match(panel, /v-model="historyWindow"/)
  assert.match(panel, /Latest session/)
  assert.match(panel, /Last 3 sessions/)
  assert.match(panel, /Last 5 sessions/)
  assert.match(panel, /Entire available history/)
  assert.match(panel, /Fill empty sections/)
  assert.match(panel, /Review current Therapy Focus for updates/)
  assert.match(panel, /Reviewed Session Captures are preferred/)
})

test('history review uses reviewed captures and transcript-backed summaries rather than raw transcript text', () => {
  assert.match(endpoint, /session_capture_drafts/)
  assert.match(endpoint, /document_type', 'session_summary'/)
  assert.match(endpoint, /buildClinicalIntelligenceSessionCandidates/)
  assert.match(endpoint, /selectClinicalIntelligenceSources/)
  assert.doesNotMatch(endpoint, /select\('id,original_transcript/)
})

test('history suggestions carry bounded evidence metadata and recurrence needs two sessions', () => {
  const validSourceIds = new Set(['session:a','session:b'])
  const result = validateCareSuggestions({
    suggestions: [{
      kind:'current_focus',
      body:'A tentative focus',
      basis:'clinical_history',
      epistemic:'clinical_inference',
      action:'add',
      targetItemId:null,
      reason:'Observed across the selected material.',
      sourceIds:['session:a'],
      evidenceStrength:'recurring'
    }]
  }, {
    allowedKinds:['current_focus'],
    validSourceIds,
    promptVersion:'therapy-focus-suggestions-v1',
    defaultBasis:'clinical_history'
  })
  assert.equal(result[0].evidenceStrength, 'current_observation')
  assert.deepEqual(result[0].sourceIds, ['session:a'])
})

test('nothing is persisted until the therapist accepts and saves', () => {
  assert.match(panel, /Suggestions remain provisional until you accept, edit and save them/)
  assert.match(panel, /reviewSuggestion\(suggestion,'accepted'\)/)
  assert.match(panel, /reviewSuggestion\(suggestion,'declined'\)/)
  assert.match(panel, /@click="saveAccepted"/)
})
