import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Care Hierarchy: Current Care is primary and Reflection is collapsed', async () => {
  const content = await readFile(new URL('../src/components/workspace/ClientCarePanel.vue', import.meta.url), 'utf8')

  assert.match(content, /data-testid="current-care-view"/, 'current-care-view exists')
  assert.match(content, /showReflection\s*=\s*ref\(false\)/, 'showReflection is false by default')
  assert.match(content, /v-if="showReflection".*data-testid="care-reflection-panel"/, 'care-reflection-panel is conditional on showReflection')
  assert.match(content, /\+ Reflect on Care/, '"+ Reflect on Care" button text exists')
  assert.match(content, /@click="showReflection=!showReflection"/, 'Reflection toggle exists')
  assert.match(content, /data-testid="care-reflection-panel"/, 'Reflection panel has test id')
  assert.match(content, /v-if="suggestions\.length"/, 'Suggestions section exists')
  assert.match(content, /@click="saveAccepted"/, 'Save button exists')
  assert.match(content, /reviewSuggestion\(suggestion,'accepted'\)/, 'Accept advances the review flow')
  assert.match(content, /reviewSuggestion\(suggestion,'declined'\)/, 'Decline advances the review flow')
  assert.match(content, /scrollIntoView\(\{behavior:'smooth',block:'center'\}\)/, 'Review flow scrolls to the next action')
  assert.match(content, /\.focus\(\{preventScroll:true\}\)/, 'Review flow moves keyboard focus with the scroll')
  assert.match(content, /ref="saveAcceptedArea"/, 'Final decision can advance to save controls')
  assert.match(content, /id="lens-selector"/, 'Lens selector exists')
  assert.match(content, /v-model="selectedLensId"/, 'Lens selector uses v-model')
})

test('Care Hierarchy: Reflection panel appears immediately below the header', async () => {
  const content = await readFile(new URL('../src/components/workspace/ClientCarePanel.vue', import.meta.url), 'utf8')

  const headerIndex = content.indexOf('<header')
  const reflectionIndex = content.indexOf('data-testid="care-reflection-panel"')
  const currentCareIndex = content.indexOf('data-testid="current-care-view"')
  assert.ok(headerIndex !== -1, 'header not found')
  assert.ok(reflectionIndex !== -1, 'care-reflection-panel not found')
  assert.ok(currentCareIndex !== -1, 'current-care-view not found')
  assert.ok(headerIndex < reflectionIndex, 'Header should appear before Reflection panel')
  assert.ok(reflectionIndex < currentCareIndex, 'Reflection panel should appear before Current Care view')
})
