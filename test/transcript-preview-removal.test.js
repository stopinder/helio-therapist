import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const transcriptInboxSource = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

test('Transcript Inbox does not render conversation excerpts in the list', async () => {
  // The transcriptPreview function and its usage in the template should be gone
  assert.strictEqual(transcriptInboxSource.includes('transcriptPreview'), false, 'transcriptPreview should be removed')
  assert.strictEqual(transcriptInboxSource.includes('class="transcript-preview"'), false, 'transcript-preview class usage should be removed')
})

test('Transcript Inbox still provides access to the full transcript', async () => {
  // "View original transcript" and the raw text display must remain
  assert.match(transcriptInboxSource, /View original transcript/, 'Should still have View original transcript action')
  assert.match(transcriptInboxSource, /selected\.text/, 'Should still render the full transcript text')
  assert.match(transcriptInboxSource, /Download \.txt/, 'Should still have download action')
})
