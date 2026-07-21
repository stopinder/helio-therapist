import test from 'node:test'
import assert from 'node:assert/strict'
import { assignmentStatusLabel, completionModeLabel } from '../src/lib/clinicalExchange.js'

test('clinical exchange labels preserve the distinct assignment lifecycle', () => {
  assert.equal(assignmentStatusLabel('awaiting_review'), 'Awaiting review')
  assert.equal(assignmentStatusLabel('reviewed'), 'Reviewed')
  assert.equal(completionModeLabel('upload'), 'Upload completed copy')
  assert.equal(completionModeLabel('either'), 'Complete or upload')
})
