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

test('TranscriptTab is NOT mounted by SessionWorkspace', () => {
  assert.strictEqual(source.includes('<TranscriptTab'), false, 'TranscriptTab should be removed')
})

test('transcript text is rendered directly only when expanded', () => {
  assert.match(source, /v-if="showTranscript"/)
  assert.match(source, /\{\{\s*transcript\.text\s*\}\}/)
})

test('Session summary persistence uses clientDocuments/document draft helpers', () => {
  assert.match(source, /import \{[^}]*saveClientDocumentDraft[^}]*\} from ['"]\.\.\/lib\/clientDocuments\.js['"]/)
  assert.match(source, /saveClientDocumentDraft\(summaryDocument\.value/)
})

test('SessionWorkspace does NOT call saveSessionDraft for the summary', () => {
  assert.strictEqual(source.includes('saveSessionDraft'), false, 'saveSessionDraft should be removed')
})

test('summary body comes from document content, not session.notes', () => {
  assert.match(source, /v-model="summaryDocument\.content\.body"/)
  assert.doesNotMatch(source, /v-model="session\.notes"/)
})

test('Copy summary copies the edited document body', () => {
  assert.match(source, /navigator\.clipboard\.writeText\(summaryDocument\.value\.content\.body\)/)
})

test('copy is disabled for empty content', () => {
  assert.match(source, /:disabled="!summaryDocument\?\.content\?\.body"/)
})
