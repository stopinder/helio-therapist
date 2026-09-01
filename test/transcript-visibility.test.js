import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Transcript visibility toggle requirements', async () => {
  const transcriptTab = await readFile(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8')

  // Requirement: source-material heading/provenance remains visible
  assert.match(transcriptTab, /Session source/)
  assert.match(transcriptTab, /Linked transcript/)

  // Requirement: View transcript button exists
  assert.match(transcriptTab, /Review transcript/)
  assert.match(transcriptTab, /Hide transcript/)

  // Requirement: raw transcript stays collapsed until the therapist asks to review it
  assert.match(transcriptTab, /isTranscriptVisible=ref\(false\)/)

  // Requirement: transcript text hidden initially (using v-if or v-show with the state)
  assert.match(transcriptTab, /v-if="isTranscriptVisible"/)

  // Requirement: aria-expanded reflects the state
  assert.match(transcriptTab, /:aria-expanded="isTranscriptVisible"/)

  // Requirement: aria-controls association
  assert.match(transcriptTab, /aria-controls="session-transcript-content"/)
  assert.match(transcriptTab, /id="session-transcript-content"/)

  // Requirement: Real button for accessibility
  assert.match(transcriptTab, /<button type="button"/)

  // Requirement: Control text changes based on state
  assert.match(transcriptTab, /isTranscriptVisible \? 'Hide transcript' : 'Review transcript'/)
})
