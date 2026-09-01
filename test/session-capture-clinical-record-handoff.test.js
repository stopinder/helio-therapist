import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const clinicalRecord = readFileSync(new URL('../src/components/workspace/ClinicalSummaryTab.vue', import.meta.url), 'utf8')

test('Clinical Record offers reviewed Session Capture without automatic approval', () => {
  assert.match(clinicalRecord, /getSessionCapture/)
  assert.match(clinicalRecord, /capture\?\.status === 'reviewed'/)
  assert.match(clinicalRecord, /Prepare draft from reviewed Session Capture/)
  assert.match(clinicalRecord, /Use in draft/)
  assert.match(clinicalRecord, /Replace draft field/)
  assert.match(clinicalRecord, /Session Capture remains separate and unchanged/)
  assert.match(clinicalRecord, /does not approve the Clinical Record/)
  assert.match(clinicalRecord, /Approve Clinical Record/)
})
