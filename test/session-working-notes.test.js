import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyWorkingNotes, normalizeWorkingNotes } from '../src/lib/workingNotes.js'
import { emptyWorkspaceReflection, normalizeWorkspaceReflection, workspaceReflectionBody } from '../src/lib/reflections.js'

test('working notes normalize only supported string fields', () => {
  assert.deepEqual(normalizeWorkingNotes({ observations: 'Observed', interventions: 42, extra: 'ignore' }), {
    observations: 'Observed', interventions: '', themes: '', followUp: ''
  })
  assert.deepEqual(normalizeWorkingNotes(null), emptyWorkingNotes())
})

test('workspace reflection remains structured while body stays readable', () => {
  const content = normalizeWorkspaceReflection({ stoodOut: 'A key moment', supervisionQuestions: 'What next?', unknown: 'ignore' })
  assert.deepEqual(content, { ...emptyWorkspaceReflection(), stoodOut: 'A key moment', supervisionQuestions: 'What next?' })
  assert.equal(workspaceReflectionBody(content), 'A key moment\n\nWhat next?')
})
