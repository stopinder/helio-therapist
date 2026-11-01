import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  ASK_HELIOS_REFLECTION_DRAFT_PROMPT_VERSION,
  askHeliosReflectionDraftSystemPrompt,
  buildAskHeliosReflectionDraftInput,
  validateAskHeliosReflectionDraft
} from '../api/_lib/ask-helios-reflection-draft.js'

const endpoint = await readFile(new URL('../api/ai/reflection-draft.js', import.meta.url), 'utf8')
const actions = await readFile(new URL('../api/ai/actions.js', import.meta.url), 'utf8')
const panel = await readFile(new URL('../src/components/ui/AskHeliosPanel.vue', import.meta.url), 'utf8')
const bridge = await readFile(new URL('../src/components/ui/AskHeliosReflectionBridge.vue', import.meta.url), 'utf8')
const reflections = await readFile(new URL('../src/lib/reflections.js', import.meta.url), 'utf8')
const practiceMap = await readFile(new URL('../src/views/supervision/SupervisionInsights.vue', import.meta.url), 'utf8')

test('Ask Helios reflection draft contract uses therapist first-person material as the evidence boundary', () => {
  assert.equal(ASK_HELIOS_REFLECTION_DRAFT_PROMPT_VERSION, 'ask-helios-reflection-draft-v1')
  assert.match(askHeliosReflectionDraftSystemPrompt, /only FIRST-PERSON therapist material/i)
  assert.match(askHeliosReflectionDraftSystemPrompt, /Assistant messages.*NOT evidence/i)
  assert.match(askHeliosReflectionDraftSystemPrompt, /Do not repeat client names/i)
  assert.match(askHeliosReflectionDraftSystemPrompt, /leave fields blank/i)
})

test('reflection draft normalisation is bounded and ignores unknown fields', () => {
  const result = validateAskHeliosReflectionDraft({
    theme: 'Rescuing',
    reflection: {
      stoodOut: 'I noticed myself rushing.',
      emotionalResponse: 'Urgency',
      inventedField: 'must disappear'
    },
    reflectiveMap: {
      innerPosition: 'Wanting to rescue',
      trigger: 'Distress',
      diagnosis: 'must disappear'
    },
    limitations: 'No evidence about what created more space.'
  })
  assert.ok(result)
  assert.equal(result.reflection.stoodOut, 'I noticed myself rushing.')
  assert.equal(result.reflectiveMap.innerPosition, 'Wanting to rescue')
  assert.equal(Object.hasOwn(result.reflection, 'inventedField'), false)
  assert.equal(Object.hasOwn(result.reflectiveMap, 'diagnosis'), false)
})

test('draft input labels therapist and assistant roles distinctly', () => {
  const input = buildAskHeliosReflectionDraftInput([
    { role:'user', content:'I felt pulled to fix it.' },
    { role:'assistant', content:'You might wonder what urgency means here.' }
  ])
  assert.match(input, /THERAPIST 1: I felt pulled to fix it/)
  assert.match(input, /ASSISTANT 2: You might wonder/)
})

test('reflection draft endpoint loads an owned saved Ask Helios conversation and never receives client records directly', () => {
  assert.match(endpoint, /ask_helios_conversations/)
  assert.match(endpoint, /eq\('user_id', user\.id\)/)
  assert.match(endpoint, /ask_helios_messages/)
  assert.match(endpoint, /AI_FEATURES\.REFLECTION_ANALYSIS/)
  assert.doesNotMatch(endpoint, /zoom_transcripts/)
  assert.doesNotMatch(endpoint, /session_capture_drafts/)
  assert.doesNotMatch(endpoint, /client_care_items/)
})

test('Send to Reflect is deliberate and restricted to reflective or clinically scoped Ask Helios conversations', () => {
  assert.match(panel, /Send to Reflect/)
  assert.match(panel, /mode\.value === 'reflect'/)
  assert.match(panel, /mode\.value === 'workspace' && Boolean\(clinicalContext\.value\)/)
  assert.match(panel, /index !== latestAssistantIndex\.value/)
  assert.doesNotMatch(panel, /Save my reflection to CPD/)
})

test('review surface requires explicit inclusion and save before Practice Map can receive mapping', () => {
  assert.match(bridge, /Practice Map will use mapping only after you explicitly include and save it/)
  assert.match(bridge, /v-model="reflectionState\[field\.key\]\.include"/)
  assert.match(bridge, /v-model="mapState\[field\.key\]\.include"/)
  assert.match(bridge, /Save to Reflect/)
  assert.match(actions, /captureSource: 'ask_helios'/)
  assert.match(actions, /sourceConversationId/)
  assert.match(reflections, /\['quick_capture','ask_helios'\]/)
  assert.match(practiceMap, /workspace_content\?\.reflectiveMap/)
})
