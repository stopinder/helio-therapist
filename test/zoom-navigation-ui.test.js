import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Transcripts view has a back button', async () => {
  const transcripts = await readFile(new URL('../src/views/Transcripts.vue', import.meta.url), 'utf8')

  // Requirement: Add a quiet “← Back” button to the Transcripts page
  assert.match(transcripts, /← Back/)
  assert.match(transcripts, /@click="goBack"/)
  
  // Requirement: use router.back() or fall back to /
  assert.match(transcripts, /function goBack\(\)/)
  assert.match(transcripts, /router\.back\(\)/)
  assert.match(transcripts, /router\.push\('\/'\)/)
})

test('Transcripts view supports direct transcript opening via query param', async () => {
  const transcripts = await readFile(new URL('../src/views/Transcripts.vue', import.meta.url), 'utf8')
  const inbox = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

  // Transcripts.vue should extract the query param
  assert.match(transcripts, /const openTranscriptId = computed\(\(\) => typeof route\.query\.transcript === 'string' \? route\.query\.transcript : null\)/)
  
  // Transcripts.vue should pass it to TranscriptInbox
  assert.match(transcripts, /<TranscriptInbox [^>]*:open-transcript-id="openTranscriptId"/)
  
  // TranscriptInbox.vue should handle the prop
  assert.match(inbox, /openTranscriptId:\s*\{\s*type:\s*\[String,\s*Number\],\s*default:\s*null\s*\}/)
  assert.match(inbox, /watch\(\s*\(\)\s*=>\s*props\.openTranscriptId,\s*openQueuedTranscript\s*\)/)
  assert.match(inbox, /function openQueuedTranscript\(id\)/)
})
