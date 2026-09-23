import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'

const inboxSource = fs.readFileSync(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

test('TranscriptInbox has Clear all button and logic', () => {
  // UI presence
  assert.match(inboxSource, /class="secondary clear-all"/)
  assert.match(inboxSource, /@click="clearAllAttention"/)
  assert.match(inboxSource, /:disabled="saving \|\| !!searchQuery"/)
  
  // Logic presence
  assert.match(inboxSource, /async function clearAllAttention\(\)/)
  assert.match(inboxSource, /action: 'clear-attention'/)
  assert.match(inboxSource, /lastClearedBatch\.value = cleared/)
  assert.match(inboxSource, /successMessage\.value = `\${cleared\.length} item\${cleared\.length === 1 \? '' : 's'} cleared from Needs attention\.`/)
})

test('TranscriptInbox has Undo logic', () => {
  assert.match(inboxSource, /async function undoClearAttention\(\)/)
  assert.match(inboxSource, /restoreAttention: true/)
  assert.match(inboxSource, /@click="undoClearAttention"/)
})

test('TranscriptInbox has restoration logic for individual items', () => {
  assert.match(inboxSource, /async function restoreToAttention\(\)/)
  assert.match(inboxSource, /@click="restoreToAttention"/)
  assert.match(inboxSource, /Return to Needs attention/)
})

test('TranscriptInbox filtering includes cleared items in history', () => {
  assert.match(inboxSource, /if \(filterMode\.value === 'attention' && \(item\.completedAt \|\| item\.attentionClearedAt\)\) return false/)
  assert.match(inboxSource, /if \(filterMode\.value === 'history' && !item\.completedAt && !item\.attentionClearedAt\) return false/)
})
