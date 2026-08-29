import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Session Capture simplification requirements', async () => {
  const transcriptTab = await readFile(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8')

  // Requirement: Waiting state (no transcript)
  assert.match(transcriptTab, /Waiting for session capture/)
  assert.match(transcriptTab, /Your Zoom transcript will be linked to this session when it becomes available/)

  // Requirement: Ready state (transcript exists)
  assert.match(transcriptTab, /Session capture ready/)
  assert.match(transcriptTab, /Zoom transcript linked to this session/)

  // Requirement: Quick clinical summary section
  assert.match(transcriptTab, /Quick clinical summary/)
  assert.match(transcriptTab, /Helio can prepare an editable summary of the session for therapist review/)
  assert.match(transcriptTab, /not an approved Clinical Record/i)

  // Requirement: Original transcript toggle (collapsed by default)
  assert.match(transcriptTab, /View original transcript/)
  assert.match(transcriptTab, /Hide original transcript/)
  assert.match(transcriptTab, /isTranscriptVisible=ref\(false\)/)
  assert.match(transcriptTab, /v-if="isTranscriptVisible"/)
  assert.match(transcriptTab, /:aria-expanded="isTranscriptVisible"/)
  assert.match(transcriptTab, /aria-controls="session-transcript-content"/)

  // Requirement: Preserve draft_note and cbt paths
  assert.match(transcriptTab, /draft_note: 'Draft clinical note requested'/)
  assert.match(transcriptTab, /cbt: 'CBT reflection requested'/)
  assert.match(transcriptTab, /prepareButtonLabel=computed/)
  assert.match(transcriptTab, /prepareRequestedDraft/)

  // Requirement: Clinical formulation boundary (avoid these terms for summary)
  assert.doesNotMatch(transcriptTab, /clinical formulation/i)
  assert.doesNotMatch(transcriptTab, /diagnosis/i)
  assert.doesNotMatch(transcriptTab, /clinical impression/i)
})
