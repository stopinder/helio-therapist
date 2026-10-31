import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const transcriptInboxSource = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

test('Transcript Inbox previews are explicit and loaded on demand rather than included in the initial list payload', async () => {
  assert.match(transcriptInboxSource, /function transcriptPreview\(transcript\)/)
  assert.match(transcriptInboxSource, /Preview loads on demand/)
  assert.match(transcriptInboxSource, /@click="toggleExpand\(transcript\.id, \$event\)"/)
  assert.match(transcriptInboxSource, /fetchTranscriptDetail/)
  assert.match(transcriptInboxSource, /inline-transcript-preview/)
})

test('Transcript Inbox still provides access to the full transcript', async () => {
  // "View original transcript" and the raw text display must remain
  assert.match(transcriptInboxSource, /View original transcript/, 'Should still have View original transcript action')
  assert.match(transcriptInboxSource, /selected\.text/, 'Should still render the full transcript text')
  assert.match(transcriptInboxSource, /Download \.txt/, 'Should still have download action')
})
