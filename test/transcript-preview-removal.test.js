import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const transcriptInboxSource = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

test('Transcript Inbox previews are explicit and loaded on demand rather than included in the initial list payload', async () => {
  assert.doesNotMatch(transcriptInboxSource, /function transcriptPreview\(transcript\)/)
  assert.match(transcriptInboxSource, /No Zoom note is available/)
  assert.match(transcriptInboxSource, /@click="toggleExpand\(transcript\.id, \$event\)"/)
  assert.match(transcriptInboxSource, /fetchTranscriptDetail/)
  assert.match(transcriptInboxSource, /class="conversation-preview"/)
  assert.match(transcriptInboxSource, /<TranscriptConversation :transcript="transcript"/)
  assert.match(transcriptInboxSource, /preview\?\.scrollIntoView/)
})

test('Transcript Inbox provides a readable full transcript while preserving exact raw source access', async () => {
  assert.match(transcriptInboxSource, /Readable view of the original Zoom transcript/)
  assert.match(transcriptInboxSource, /Search this transcript/)
  assert.match(transcriptInboxSource, /Raw source/)
  assert.match(transcriptInboxSource, /selected\.text/, 'Should still render the exact raw transcript text')
  assert.match(transcriptInboxSource, /Download \.txt/, 'Should still have download action')
})
