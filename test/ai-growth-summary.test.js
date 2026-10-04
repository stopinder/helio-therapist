import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGrowthSummaryInput,
  validateGrowthSummaryResponse,
  growthSummarySystemPrompt
} from '../api/_lib/ai-growth-summary.js'

test('longitudinal Growth prompt requires evidence and avoids competence claims', () => {
  assert.match(growthSummarySystemPrompt, /Ground every substantive observation/)
  assert.match(growthSummarySystemPrompt, /evidence_refs/)
  assert.match(growthSummarySystemPrompt, /Never infer competence/)
  assert.match(growthSummarySystemPrompt, /Frequency is not importance/)
})

test('Growth input is chronological and includes therapist-authored mapped fields', () => {
  const input = buildGrowthSummaryInput([
    {
      created_at: '2026-02-01T10:00:00Z',
      body: 'Later reflection',
      theme: 'Boundaries',
      workspace_content: { reflectiveMap: { innerPosition: 'Rescuer', protectiveIntention: 'Keep the alliance safe' } }
    },
    {
      created_at: '2026-01-01T10:00:00Z',
      body: 'Earlier reflection',
      theme: 'Boundaries'
    }
  ])

  assert.ok(input.indexOf('2026-01-01') < input.indexOf('2026-02-01'))
  assert.match(input, /Theme: Boundaries/)
  assert.match(input, /Inner position: Rescuer/)
  assert.match(input, /Protective intention: Keep the alliance safe/)
})

test('Growth AI response validation limits arrays and evidence references', () => {
  const result = validateGrowthSummaryResponse({
    overview: 'A cautious overview.',
    repeated_patterns: [{
      title: 'Boundaries',
      observation: 'This wording recurs.',
      evidence_refs: ['r1', 'R2', 'bad']
    }],
    changes_over_time: [],
    emerging_capacities: [],
    supervision_questions: ['What is changing?'],
    limitations: 'This is reflective support only.'
  })

  assert.equal(result.repeated_patterns[0].evidence_refs.length, 2)
  assert.deepEqual(result.repeated_patterns[0].evidence_refs, ['R1', 'R2'])
  assert.equal(result.supervision_questions[0], 'What is changing?')
})
