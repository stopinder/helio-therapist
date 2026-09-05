import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const clientWorkspaceSource = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')

test('ClientWorkspace does not render institutional tabs', async () => {
  assert.strictEqual(clientWorkspaceSource.includes('ClientWorkspaceTabs'), false, 'ClientWorkspaceTabs should be removed')
  assert.strictEqual(clientWorkspaceSource.includes("const tabs=['Overview'"), false, 'Tabs array should be removed')
})

test('ClientWorkspace presents therapist-first sections', async () => {
  assert.match(clientWorkspaceSource, /Before next session/, 'Should have Before next session section')
  assert.match(clientWorkspaceSource, /Recent sessions/, 'Should have Recent sessions section')
  assert.match(clientWorkspaceSource, /Supporting material/, 'Should have Supporting material section')
})

test('ClientWorkspace uses human-readable session actions and states', async () => {
  assert.match(clientWorkspaceSource, /Open summary/, 'Should have Open summary action')
  assert.match(clientWorkspaceSource, /Transcript/, 'Should have Transcript action')
  
  // Institutional labels should be absent from the normal UI template
  const institutionalLabels = ['Clinical Record', 'Approved', 'Drafts awaiting review', 'Needs review']
  for (const label of institutionalLabels) {
    // We check if they are used as literals in the template part. 
    // They might still exist in the script for logic, but shouldn't be the primary labels.
    // This is a soft check as they might be in a mapping object.
    const templateMatch = clientWorkspaceSource.match(/<template>([\s\S]*?)<\/template>/)
    if (templateMatch) {
       assert.strictEqual(templateMatch[1].includes(`>${label}<`), false, `Institutional label "${label}" should not be exposed directly in template`)
    }
  }
})

test('ClientWorkspace preserves access to underlying data', async () => {
  assert.match(clientWorkspaceSource, /ClientCarePanel/, 'Should still include ClientCarePanel')
  assert.match(clientWorkspaceSource, /ClientDocumentsPanel/, 'Should still include ClientDocumentsPanel')
  assert.match(clientWorkspaceSource, /ClientTranscriptsPanel/, 'Should still include ClientTranscriptsPanel')
})
