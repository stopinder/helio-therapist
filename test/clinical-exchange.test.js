import test from 'node:test'
import assert from 'node:assert/strict'
import { assignmentStatusLabel, completionModeLabel, timelineEventPresentation } from '../src/lib/clinicalExchange.js'
import { calculatePhq9, phq9Items } from '../src/lib/phq9.js'

test('clinical exchange labels preserve the distinct assignment lifecycle', () => {
  assert.equal(assignmentStatusLabel('awaiting_review'), 'Awaiting review')
  assert.equal(assignmentStatusLabel('reviewed'), 'Reviewed')
  assert.equal(completionModeLabel('upload'), 'Upload completed copy')
  assert.equal(completionModeLabel('complete_or_upload'), 'Complete or upload')
  assert.equal(completionModeLabel('complete_in_helio'), 'Complete in Helio')
})

test('clinical timeline presents clinical findings, not workflow activity', () => {
  assert.deepEqual(timelineEventPresentation('outcome_measure_recorded'), { icon: '✓', detail: 'Outcome measure' })
  assert.deepEqual(timelineEventPresentation('resource_completed'), { icon: '•', detail: 'Clinical event' })
})

test('PHQ-9 only calculates complete valid answers and preserves item answers', () => {
  const answers = Object.fromEntries(phq9Items.map((_, index) => [`q${index + 1}`, String(index % 4)]))
  assert.deepEqual(calculatePhq9(answers), { total: 12, itemScores: [0, 1, 2, 3, 0, 1, 2, 3, 0], calculationVersion: 'phq-9-v1' })
  assert.equal(calculatePhq9({ q1: '0' }), null)
})
