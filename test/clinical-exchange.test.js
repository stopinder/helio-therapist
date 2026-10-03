import test from 'node:test'
import assert from 'node:assert/strict'
import { assignmentStatusLabel, completionModeLabel, timelineEventPresentation } from '../src/lib/clinicalExchange.js'
import { calculatePhq9, phq9Items, phq9Definition } from '../src/lib/phq9.js'
import { displayAnswer, safetyNoticeTriggered, validateStructuredAnswers } from '../src/lib/resourceForms.js'
import { thoughtRecordDefinition } from '../src/lib/resourceTemplates.js'

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


test('generic form validation supports the PHQ-9 schema', () => {
  const definition = phq9Definition()
  const answers = Object.fromEntries(phq9Items.map((_, index) => [`q${index + 1}`, '0']))
  assert.equal(validateStructuredAnswers(definition, answers).valid, true)
  assert.equal(validateStructuredAnswers(definition, { q1: '0' }).valid, false)
  assert.equal(safetyNoticeTriggered(definition, { q9: '1' }), true)
  assert.equal(safetyNoticeTriggered(definition, { q9: '0' }), false)
  assert.equal(displayAnswer(definition.items[0], '2'), 'More than half the days')
})

test('CBT thought record is a reusable structured form without scoring', () => {
  const definition = thoughtRecordDefinition()
  const answers = {
    situation: 'A difficult conversation at work.',
    emotions: 'Anxious and tense.',
    emotion_intensity: '70',
    automatic_thoughts: 'I am going to get this wrong.',
    evidence_for: '',
    evidence_against: 'I have managed similar conversations before.',
    balanced_perspective: 'I can prepare and respond one step at a time.',
    emotion_intensity_after: '40',
    next_step: 'Write down the points I want to cover.'
  }
  assert.equal(definition.schema, 'helio-form-v1')
  assert.equal(validateStructuredAnswers(definition, answers).valid, true)
  assert.equal(validateStructuredAnswers(definition, { ...answers, balanced_perspective: '' }).valid, false)
})
