import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const inboxSource = fs.readFileSync(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

test('completed transcript state is named as triage completion', () => {
  assert.match(inboxSource, /label:'Triage complete'/)
  assert.match(inboxSource, /<p class="eyebrow">Triage complete<\/p>/)
  assert.match(inboxSource, /<h2>Transcript triage complete<\/h2>/)
})

test('triage completion does not imply requested output or Clinical Record creation', () => {
  assert.match(inboxSource, /nothing has been generated/)
  assert.match(inboxSource, /No requested output or Clinical Record was created by this triage step\./)
  assert.doesNotMatch(inboxSource, /This item is retained for search and in the linked session record\./)
})
