import test from 'node:test'
import assert from 'node:assert/strict'
import { assertNoDemoClinicalContent } from '../src/lib/sessions.js'

test('clinical safety: normal therapist draft content is allowed', () => {
  assert.doesNotThrow(() => assertNoDemoClinicalContent(JSON.stringify({ presentingConcerns: 'Client described work stress.' })))
})

test('clinical safety: demonstration content cannot be persisted as a session draft', () => {
  assert.throws(
    () => assertNoDemoClinicalContent(JSON.stringify({ presentingConcerns: '[DEMO] Example clinical content' })),
    error => error?.code === 'DEMO_CLINICAL_CONTENT'
  )
})

test('clinical safety: demonstration content cannot be hidden in legacy notes', () => {
  assert.throws(
    () => assertNoDemoClinicalContent('Previous notes: [demo] example only'),
    error => error?.code === 'DEMO_CLINICAL_CONTENT'
  )
})
