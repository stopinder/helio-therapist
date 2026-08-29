import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('AddClientModal includes Current focus field and emits note', async () => {
  const content = await readFile(new URL('../src/components/sidebar/AddClientModal.vue', import.meta.url), 'utf8')
  assert.match(content, /Current focus/)
  assert.match(content, /v-model="note"/)
  assert.match(content, /emit\('submit', \{ name: name\.value\.trim\(\), email: email\.value\.trim\(\), note: note\.value\.trim\(\) \}\)/)
})

test('lib/clients.js maps current_focus to note correctly', async () => {
  const content = await readFile(new URL('../src/lib/clients.js', import.meta.url), 'utf8')
  // In getClient
  assert.match(content, /return \{ \.\.\.data, name: data\.display_name, note: data\.current_focus \}/)
  // In updateClient
  assert.match(content, /current_focus: updates\.note \|\| ''/)
  // In createClient
  assert.match(content, /current_focus: note \|\| ''/)
})

test('ClinicalAttentionPanel renders Current focus from client.note', async () => {
  const content = await readFile(new URL('../src/components/workspace/ClinicalAttentionPanel.vue', import.meta.url), 'utf8')
  
  // Should NOT rely on attention_items
  assert.doesNotMatch(content, /attention_items/) 
  
  // Should show "Current focus" label
  assert.match(content, /Current focus/)
  
  // Should render client.note
  assert.match(content, /\{\{ client\.note \}\}/)
  
  // Should have neutral empty state
  assert.match(content, /No current focus recorded\./)
})
