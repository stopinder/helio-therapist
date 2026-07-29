import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('ClinicalSummaryTab.vue handles amendment drafts correctly', async () => {
  const content = await readFile(new URL('../src/components/workspace/ClinicalSummaryTab.vue', import.meta.url), 'utf8')
  
  // Verify Save Amendment Draft button is removed/replaced
  assert.ok(!content.includes('Save Amendment Draft'), 'Should not contain "Save Amendment Draft" button')
  assert.match(content, /Drafts are local-only and not saved until approved\./, 'Should contain notice about local-only drafts')
  
  // Verify saveDraft safeguard
  assert.match(content, /const saveDraft = async \(\) => {/, 'Should have saveDraft function')
  assert.match(content, /if \(props\.session\.status === 'completed'\) {/, 'Should check if session is completed')
  assert.match(content, /saveMessage\.value = '';/, 'Should clear saveMessage on completed session')
  assert.match(content, /return; \/\/ Do not save session drafts for completed sessions/, 'Should return early for completed sessions')
})

test('ClientWorkspace.vue resolves EmptyState component', async () => {
  const content = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
  
  assert.match(content, /import EmptyState from ["']\.\.\/components\/workspace\/EmptyState\.vue["']/, 'Should import EmptyState component')
})
