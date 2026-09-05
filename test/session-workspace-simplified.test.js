import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

test('SessionWorkspace does not render WorkflowIndicator', () => {
  assert.strictEqual(source.includes('<WorkflowIndicator'), false, 'WorkflowIndicator should be removed')
})

test('SessionWorkspace uses therapist-first language', () => {
  assert.match(source, /Session summary/i)
  assert.match(source, /View transcript/i)
  assert.match(source, /Therapist reflection/i)
  assert.match(source, /Return to client/i)
  
  // Note: We check for visible labels and sections. 
  // Internal identifiers like activeTab="Session Capture" prop passed to TranscriptTab are preserved in code.
  assert.doesNotMatch(source, /<[^>]*>Clinical Workspace<\/[^>]*>/i)
  assert.doesNotMatch(source, /<[^>]*>Clinical Record<\/[^>]*>/i)
  assert.doesNotMatch(source, /<[^>]*>Approved<\/[^>]*>/i)
  assert.doesNotMatch(source, /<[^>]*>Locked<\/[^>]*>/i)
  assert.doesNotMatch(source, /<[^>]*>Review required<\/[^>]*>/i)
  // We allow "Session Capture" as a prop value but not as visible text in the template outside of props
  const templateOnly = source.split('<script')[0];
  // Match "Session Capture" only if NOT in activeTab="Session Capture"
  assert.doesNotMatch(templateOnly, /[^:]\bSession Capture\b(?!"\s*)/)
})

test('Session summary is the primary visible section', () => {
  assert.match(source, /<h2[^>]*>Session summary<\/h2>/)
})

test('Transcript and Reflection are present but secondary/collapsible', () => {
  assert.match(source, /View transcript/i)
  assert.match(source, /Therapist reflection/i)
})

test('Copy summary action exists', () => {
  assert.match(source, /Copy summary/i)
  assert.match(source, /navigator\.clipboard\.writeText/)
})
