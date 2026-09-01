import test from 'node:test'
import assert from 'node:assert/strict'
import { formatClinicalRecordForDocument } from '../src/lib/clinicalRecordFormat.js'

test('formats a structured Clinical Record as readable labelled prose', () => {
  const result = formatClinicalRecordForDocument(JSON.stringify({
    presentingConcerns: '',
    sessionThemes: 'Humour and light-heartedness as a means of engagement.',
    interventionsUsed: 'Encouragement of humour to foster connection.',
    clientResponse: 'Initiated a joke to engage in the session.',
    riskSafeguarding: '',
    progressGoals: '',
    planNextSession: 'Continue noticing what supports connection.',
    legacyNotes: 'Earlier contextual note.',
    internalMetadata: 'must not be rendered'
  }))

  assert.match(result, /Session themes\nHumour and light-heartedness/)
  assert.match(result, /Interventions used\nEncouragement of humour/)
  assert.match(result, /Client response\nInitiated a joke/)
  assert.match(result, /Plan for next session\nContinue noticing/)
  assert.match(result, /Legacy session notes\nEarlier contextual note/)
  assert.doesNotMatch(result, /Presenting concerns|Risk and safeguarding|Progress toward goals/)
  assert.doesNotMatch(result, /internalMetadata|must not be rendered|[{}]/)
})

test('preserves legacy plain text and malformed JSON without data loss', () => {
  assert.equal(formatClinicalRecordForDocument('Legacy clinical note.'), 'Legacy clinical note.')
  assert.equal(formatClinicalRecordForDocument('{ malformed'), '{ malformed')
  assert.equal(formatClinicalRecordForDocument(''), '')
})
