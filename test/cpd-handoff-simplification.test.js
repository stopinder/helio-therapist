import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('CPD Tab Simplification: real supervision handoff', async () => {
  const content = await readFile(new URL('../src/components/workspace/SupervisionSummaryTab.vue', import.meta.url), 'utf8')
  const workspace = await readFile(new URL('../src/views/SessionWorkspace.vue', import.meta.url), 'utf8')

  // 1. Placeholder sections removal
  assert.strictEqual(content.includes('placeholderSections'), false, 'Placeholder sections array should be removed')
  assert.strictEqual(content.includes('Anonymised Case Themes'), false, 'Placeholder cards should be removed')
  assert.strictEqual(content.includes('Ethical Considerations'), false, 'Placeholder cards should be removed')

  // 2. New Header and Content
  assert.match(content, /Professional Development/)
  assert.match(content, /Use this session's private reflection as part of your ongoing reflective practice/)
  assert.match(content, /separate from the client's Clinical Record/)

  // 3. Empty State (No Reflection)
  assert.match(content, /Complete your private reflection first/)
  assert.match(content, /Go to Reflection/)
  assert.match(content, /@click="\$emit\('open-reflection'\)"/)

  // 4. Reflection State (Supervision Question)
  assert.match(content, /Supervision question/)
  assert.match(content, /reflection\.workspace_content\?\.supervisionQuestions/)
  assert.match(content, /No supervision question recorded for this reflection/)

  // 5. Supervision Pack Control
  assert.match(content, /Add to Supervision Pack/)
  assert.match(content, /Remove from Supervision Pack/)
  assert.match(content, /included_in_supervision/)

  // 6. Link to Professional Development
  assert.match(content, /Open Professional Development/)
  assert.match(content, /:to="{ name: 'SupervisionHome' }"/)

  // 7. SessionWorkspace integration
  assert.match(workspace, /<SupervisionSummaryTab/)
  assert.match(workspace, /@open-reflection="activeTab = 'Reflection'"/)
})
