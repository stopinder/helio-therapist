import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { transcriptWorkflowState } from '../src/lib/transcriptWorkflow.js'

const inboxSource = fs.readFileSync(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

test('completed transcript history still names triage completion explicitly', () => {
  assert.match(inboxSource, /<p class="eyebrow">Triage complete<\/p>/)
  assert.match(inboxSource, /<h2>Transcript triage complete<\/h2>/)
  assert.equal(transcriptWorkflowState({completedAt:'saved',clientId:'c',sessionRef:'s'}).label,'Inbox setup complete')
})

test('triage completion does not imply requested output or Clinical Record creation', () => {
  assert.match(inboxSource, /No requested output or Clinical Record was created by this triage step\./)
  assert.doesNotMatch(inboxSource, /This item is retained for search and in the linked session record\./)
})
