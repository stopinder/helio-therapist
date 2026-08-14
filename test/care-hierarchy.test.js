import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Care Hierarchy: Current Care is primary and Reflection is collapsed', async () => {
  const content = await readFile(new URL('../src/components/workspace/ClientCarePanel.vue', import.meta.url), 'utf8')

  // 1. Current Care is the primary/default view
  assert.match(content, /data-testid="current-care-view"/, 'current-care-view exists')
  
  // 2. Reflection is conditional and collapsed by default
  assert.match(content, /showReflection\s*=\s*ref\(false\)/, 'showReflection is false by default')
  assert.match(content, /v-if="showReflection".*data-testid="care-reflection-panel"/, 'care-reflection-panel is conditional on showReflection')

  // 3. "+ Reflect on Care" action exists
  assert.match(content, /\+ Reflect on Care/, '"+ Reflect on Care" button text exists')
  assert.match(content, /@click="showReflection=!showReflection"/, 'Reflection toggle exists')

  // 4. Existing AI review/save controls remain present
  assert.match(content, /data-testid="care-reflection-panel"/, 'Reflection panel has test id')
  assert.match(content, /v-if="suggestions\.length"/, 'Suggestions section exists')
  assert.match(content, /@click="saveAccepted"/, 'Save button exists')
  assert.match(content, /@click="suggestion\.decision='accepted'"/, 'Accept button exists')
  assert.match(content, /@click="suggestion\.decision='declined'"/, 'Decline button exists')

  // 5. Clinical Lens selector remains present
  assert.match(content, /id="lens-selector"/, 'Lens selector exists')
  assert.match(content, /v-model="selectedLensId"/, 'Lens selector uses v-model')
})

test('Care Hierarchy: Longitudinal Care sections are rendered immediately', async () => {
  const content = await readFile(new URL('../src/components/workspace/ClientCarePanel.vue', import.meta.url), 'utf8')

  // Verify the loop for sections is BEFORE the reflection panel
  const currentCareIndex = content.indexOf('data-testid="current-care-view"')
  const reflectionIndex = content.indexOf('data-testid="care-reflection-panel"')
  
  assert.ok(currentCareIndex !== -1, 'current-care-view not found')
  assert.ok(reflectionIndex !== -1, 'care-reflection-panel not found')
  assert.ok(currentCareIndex < reflectionIndex, 'Current Care view should appear before Reflection panel')
})
