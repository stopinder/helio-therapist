import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { transcriptNeedsAttention } from '../src/lib/transcriptWorkflow.js'

const inboxSource = fs.readFileSync(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

test('TranscriptInbox has Clear all button and logic', () => {
  // UI presence
  assert.match(inboxSource, /class="button-secondary clear-all compact-button"/)
  assert.match(inboxSource, /@click="clearAllAttention"/)
  assert.match(inboxSource, /:disabled="inboxBusy \|\| !!searchQuery"/)
  
  // Logic presence
  assert.match(inboxSource, /async function clearAllAttention\(\)/)
  assert.match(inboxSource, /action: 'clear-attention'/)
  assert.match(inboxSource, /lastClearedBatch\.value = cleared/)
  assert.match(inboxSource, /successMessage\.value = `\${cleared\.length} item\${cleared\.length === 1 \? '' : 's'} archived\.`/)
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

test('TranscriptInbox filtering includes cleared, completed and verified-matched items in history', () => {
  assert.match(inboxSource, /if \(filterMode\.value === 'attention' && !needsAttention\(item\)\) return false/)
  assert.match(inboxSource, /if \(filterMode\.value === 'history' && needsAttention\(item\)\) return false/)
  for (const row of [{attentionClearedAt:'saved'},{completedAt:'saved'},{clientId:'c',sessionRef:'s',status:'unassigned'}]) assert.equal(transcriptNeedsAttention(row),false)
  assert.equal(transcriptNeedsAttention({}),true)
})
