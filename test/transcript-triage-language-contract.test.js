import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const inboxSource = fs.readFileSync(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
const attentionSource = fs.readFileSync(new URL('../src/components/NeedsAttention.vue', import.meta.url), 'utf8')

test('client plus session is the transcript triage completion boundary', () => {
  assert.match(inboxSource, /function isConnected\(transcript\)/)
  assert.match(inboxSource, /transcript\?\.clientId && transcript\?\.sessionRef/)
  assert.match(inboxSource, /<p class="eyebrow">Connected<\/p>/)
  assert.match(inboxSource, /<h2>Transcript connected<\/h2>/)
  assert.match(inboxSource, /No further inbox step is required\./)
})

test('review choices are not a mandatory transcript-inbox gate', () => {
  assert.doesNotMatch(inboxSource, /<h2>Review choices<\/h2>/)
  assert.doesNotMatch(inboxSource, /saveReviewChoices/)
  assert.doesNotMatch(attentionSource, /Review transcript handling/)
  assert.match(attentionSource, /if \(!transcript\.sessionRef\)/)
  assert.match(attentionSource, /return null/)
})
