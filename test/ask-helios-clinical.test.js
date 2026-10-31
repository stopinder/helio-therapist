import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  ASK_HELIOS_CLINICAL_LENSES,
  ASK_HELIOS_CLINICAL_WINDOWS,
  askHeliosClinicalResponseFormat,
  askHeliosClinicalSystemPrompt,
  buildAskHeliosClinicalInput,
  renderAskHeliosClinicalAnswer
} from '../api/_lib/ask-helios-clinical.js'

const assistSource = await readFile(new URL('../api/ai/assist.js', import.meta.url), 'utf8')
const clientWorkspace = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
const sessionWorkspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

test('Ask Helios clinical reasoning exposes all supported evidence windows and therapeutic perspectives', () => {
  assert.deepEqual(ASK_HELIOS_CLINICAL_WINDOWS, ['current','last_three','last_five','history'])
  assert.deepEqual(ASK_HELIOS_CLINICAL_LENSES, ['general','integrative','gentle_cbt','internal_family_systems','transactional_analysis'])
})

test('clinical reasoning prompt preserves therapist responsibility and uncertainty', () => {
  const prompt = askHeliosClinicalSystemPrompt('internal_family_systems')
  assert.match(prompt, /clinical thinking assistant for a qualified therapist/i)
  assert.match(prompt, /without replacing their judgement or acting as a supervisor/i)
  assert.match(prompt, /Separate what is recorded from what is inferred/i)
  assert.match(prompt, /alternative explanation/i)
  assert.match(prompt, /Do not write or update the clinical record/i)
  assert.match(prompt, /Internal Family Systems \(IFS\) lens/)
  assert.match(prompt, /Do not infer an exile/)
})

test('clinical reasoning response uses strict structured output', () => {
  const format = askHeliosClinicalResponseFormat()
  assert.equal(format.type, 'json_schema')
  assert.equal(format.json_schema.strict, true)
  const schema = format.json_schema.schema
  assert.equal(schema.additionalProperties, false)
  assert.deepEqual(schema.required, [
    'recordedContext','clinicalInterpretation','alternativePossibilities','therapistAttention','questionsForConsideration'
  ])
  assert.equal(schema.properties.questionsForConsideration.maxItems, 5)
})

test('clinical reasoning input carries only the selected evidence scope and therapist question', () => {
  const context = {
    window: 'last_three',
    anchorSessionId: 'session-1',
    client: { currentFocus: 'Staying with conflict without withdrawing.' },
    care: [{ id:'care:1', kind:'current_focus', content:'Notice escalation earlier.' }],
    sources: [
      { id:'session:s1', sessionId:'s1', occurredAt:'2026-10-30T10:00:00Z', sourceType:'linked_transcript', content:'Current evidence.' },
      { id:'document:d2', sessionId:'s2', occurredAt:'2026-10-23T10:00:00Z', sourceType:'transcript_backed_session_summary', content:'Earlier evidence.' }
    ]
  }
  const parsed = JSON.parse(buildAskHeliosClinicalInput({
    query:'What might I be missing?', lens:'internal_family_systems', context
  }))
  assert.equal(parsed.therapistQuestion, 'What might I be missing?')
  assert.equal(parsed.selectedPerspective, 'internal_family_systems')
  assert.equal(parsed.evidenceWindow, 'last_three')
  assert.equal(parsed.sessionEvidence.length, 2)
  assert.equal(parsed.sessionEvidence[1].sourceType, 'transcript_backed_session_summary')
  assert.equal(parsed.clientContext.currentFocus, 'Staying with conflict without withdrawing.')
})

test('clinical reasoning answer visibly separates record, inference, alternatives and questions', () => {
  const answer = renderAskHeliosClinicalAnswer({
    recordedContext:'A recurring withdrawal-pursuit sequence is recorded.',
    clinicalInterpretation:'One possibility is reciprocal protection.',
    alternativePossibilities:'Fatigue and situational stress may also account for part of the pattern.',
    therapistAttention:'Notice what happens immediately before withdrawal.',
    questionsForConsideration:['What signals the shift first?', 'What would disconfirm this interpretation?']
  })
  assert.match(answer, /^Recorded context/m)
  assert.match(answer, /Clinical interpretation/)
  assert.match(answer, /Alternative possibilities/)
  assert.match(answer, /What may deserve your attention/)
  assert.match(answer, /What would disconfirm this interpretation/)
})

test('Ask Helios clinical mode remains explicitly therapist-scoped and uses the existing metered Ask Helios feature', () => {
  assert.match(assistSource, /feature:\s*AI_FEATURES\.ASK_HELIOS_RESEARCH/)
  assert.match(assistSource, /ASK_HELIOS_CLINICAL_PROMPT_VERSION/)
  assert.match(assistSource, /clinicalContext/)
  assert.match(assistSource, /loadAskHeliosClinicalContext/)
  assert.match(assistSource, /askHeliosClinicalResponseFormat\(\)/)
  assert.match(assistSource, /safeClinicalHistory/)
  assert.match(assistSource, /deidentifyClinicalQuestion/)
  assert.match(assistSource, /ask_helios_clinical_context/)
})

test('Client and Session workspaces open Ask Helios with explicit clinical context', () => {
  assert.match(clientWorkspace, /Ask Helios about this client/)
  assert.match(clientWorkspace, /openClinicalContext\(\{/)
  assert.match(clientWorkspace, /window:'last_three'/)
  assert.match(sessionWorkspace, />Ask Helios</)
  assert.match(sessionWorkspace, /askHeliosAboutSession/)
  assert.match(sessionWorkspace, /anchorSessionId:\s*String\(session\.value\.id\)/)
  assert.match(sessionWorkspace, /lens:\s*summaryLens\.value/)
})
