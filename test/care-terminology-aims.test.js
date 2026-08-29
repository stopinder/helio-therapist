import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Structured Care Terminology: Uses "Aims and objectives"', async () => {
  const lensesContent = await readFile(new URL('../src/lib/clinicalLenses.js', import.meta.url), 'utf8')
  
  // Clinical lenses should use new labels
  assert.match(lensesContent, /label: 'Aims and objectives'/, 'Lens section label should be Aims and objectives')
  assert.match(lensesContent, /emptyState: 'No aims or objectives recorded yet\.'/, 'Lens empty state should be updated')
  
  const currentCareFocusContent = await readFile(new URL('../src/components/workspace/CurrentCareFocus.vue', import.meta.url), 'utf8')
  
  // Wording in CurrentCareFocus.vue
  assert.match(currentCareFocusContent, /\+ Add aim or objective/, 'Add button should use Aim or objective')
  assert.match(currentCareFocusContent, /Aim or objective/, 'Label/Button should use Aim or objective')
  assert.match(currentCareFocusContent, /What is the client hoping to work towards\?/, 'Placeholder should be updated')
  assert.match(currentCareFocusContent, /Save aim or objective/, 'Save button should use Aim or objective')
  assert.match(currentCareFocusContent, /Aim or objective could not be saved\./, 'Error message should be updated')
  
  // Internal kind should NOT change
  assert.match(currentCareFocusContent, /kind:\s*'current_focus'/, 'Internal kind should remain current_focus')

  const clinicalAttentionPanelContent = await readFile(new URL('../src/components/workspace/ClinicalAttentionPanel.vue', import.meta.url), 'utf8')
  // Client-level Current focus should NOT change
  assert.match(clinicalAttentionPanelContent, /Current focus/, 'Client-level panel should still say Current focus')
})
