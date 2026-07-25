import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('ReflectionWorkspace.vue implements single modal with internal stages', async () => {
  const content = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  
  // Single modal structure
  assert.match(content, /<!-- Detail & Summary Modal -->/)
  assert.match(content, /<div v-if="selectedReflection" class="modal-backdrop"/)
  assert.match(content, /<section class="modal-panel shadow-2xl"/)
  
  // No second modal for summary
  assert.doesNotMatch(content, /<div v-if="summaryOpen" class="modal-backdrop"/)
  
  // detailStage transitions
  assert.match(content, /const detailStage = ref\('reflection'\)/)
  assert.match(content, /v-if="detailStage === 'reflection'"/)
  assert.match(content, /v-else-if="detailStage === 'generating'"/)
  assert.match(content, /v-else-if="detailStage === 'summary'"/)
  
  // Stage control logic
  assert.match(content, /detailStage\.value = 'generating'/)
  assert.match(content, /detailStage\.value = 'summary'/)
  assert.match(content, /function backToReflection\(\)/)
  assert.match(content, /detailStage\.value = 'reflection'/)
  
  // Short reflection handling
  assert.match(content, /:disabled="!canSummariseText\(selectedReflection\.body\)"/)
  assert.match(content, /This reflection needs at least {{ minimumSummaryCharacters }} characters/)
  
  // Visual requirements
  assert.match(content, /\.modal-backdrop{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:1rem;background:rgba\(20,18,16,\.65\);backdrop-filter:blur\(4px\)}/)
  assert.match(content, /\.modal-panel{width:min\(100%,42rem\);max-height:95vh;overflow:hidden;display:flex;flex-direction:column;border:1px solid var\(--border\);border-radius:1rem;background:var\(--surface\);padding:2rem;box-shadow:0 20px 50px rgba\(0,0,0,\.3\)}/)
})

test('ReflectionWorkspace prevents background scroll when modal is open', async () => {
  const content = await readFile(new URL('../src/components/ReflectionWorkspace.vue', import.meta.url), 'utf8')
  
  assert.match(content, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(content, /document\.body\.style\.overflow = ''/)
})
