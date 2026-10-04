import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGrowthSummaryInput,
  validateGrowthSummaryResponse,
  growthSummarySystemPrompt,
  isDirectPracticeReflection
} from '../api/_lib/ai-growth-summary.js'

test('longitudinal Growth prompt requires synthesis rather than record recap', () => {
  assert.match(growthSummarySystemPrompt, /This is NOT a summarisation task/)
  assert.match(growthSummarySystemPrompt, /Do not walk through records one by one/)
  assert.match(growthSummarySystemPrompt, /WHY it matters for practice/)
  assert.match(growthSummarySystemPrompt, /Never infer competence/)
  assert.match(growthSummarySystemPrompt, /Frequency is not importance/)
})

test('Growth input excludes stance questionnaire records and keeps direct practice chronological', () => {
  const questionnaire = {
    created_at: '2026-01-15T10:00:00Z',
    body: 'Questionnaire material',
    workspace_content: { captureSource: 'practice_reflection' }
  }
  assert.equal(isDirectPracticeReflection(questionnaire), false)

  const input = buildGrowthSummaryInput([
    {
      created_at: '2026-02-01T10:00:00Z',
      body: 'Later reflection',
      theme: 'Boundaries',
      workspace_content: { reflectiveMap: { innerPosition: 'Rescuer', protectiveIntention: 'Keep the alliance safe' } }
    },
    questionnaire,
    {
      created_at: '2026-01-01T10:00:00Z',
      body: 'Earlier reflection',
      theme: 'Boundaries',
      workspace_content: { captureSource: 'quick_capture' }
    }
  ])

  assert.ok(input.indexOf('2026-01-01') < input.indexOf('2026-02-01'))
  assert.doesNotMatch(input, /Questionnaire material/)
  assert.match(input, /Therapist-assigned theme: Boundaries/)
  assert.match(input, /Inner position: Rescuer/)
  assert.match(input, /Protective intention: Keep the alliance safe/)
})

test('Growth AI response validation keeps developmental structure and evidence', () => {
  const result = validateGrowthSummaryResponse({
    overview: 'A cautious synthesis.',
    developmental_threads: [{
      title: 'From filling space to noticing the urge',
      synthesis: 'A cross-record pattern.',
      movement: 'Recognition appears earlier.',
      practice_significance: 'This may affect how much space clients have.',
      evidence_refs: ['r1', 'R2', 'bad'],
      confidence: 'moderate'
    }],
    tensions_or_contradictions: [{
      title: 'Structure versus space',
      synthesis: 'Two pulls recur.',
      evidence_refs: ['R1', 'R2']
    }],
    supervision_focus: [{
      question: 'What happens just before the urge to organise?',
      why_this_question: 'It tests the repeated sequence.',
      evidence_refs: ['R1', 'R2']
    }],
    limitations: 'Evidence remains sparse.'
  })

  assert.deepEqual(result.developmental_threads[0].evidence_refs, ['R1', 'R2'])
  assert.equal(result.developmental_threads[0].confidence, 'moderate')
  assert.equal(result.supervision_focus[0].question, 'What happens just before the urge to organise?')
})
