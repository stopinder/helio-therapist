import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Session Capture simplification requirements', async () => {
  const transcriptTab = await readFile(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8')

  // Requirement: Waiting state (no transcript)
  assert.match(transcriptTab, /Waiting for session capture/)
  assert.match(transcriptTab, /Your Zoom transcript will be linked to this session when it becomes available/)

  // Requirement: Linked source is reviewed before speaker confirmation and generation
  assert.match(transcriptTab, /Session source/)
  assert.match(transcriptTab, /Linked transcript/)
  assert.match(transcriptTab, /Review transcript/)
  assert.match(transcriptTab, /Confirm speaker identities/)
  assert.match(transcriptTab, /Confirm speakers/)
  assert.match(transcriptTab, /v-if="speakersConfirmed && !captureDraft"/)

  // Requirement: Generated capture is editable and remains outside the Clinical Record
  assert.match(transcriptTab, /Prepare session capture/)
  assert.match(transcriptTab, /AI-assisted working material/)
  assert.match(transcriptTab, /v-model="captureDraft\[field\.key\]"/)
  assert.match(transcriptTab, /Downstream steps remain separate/)
  assert.match(transcriptTab, /not an approved Clinical Record/i)

  // Requirement: Source transcript is readable and unchanged
  assert.match(transcriptTab, /Hide transcript/)
  assert.match(transcriptTab, /isTranscriptVisible=ref\(true\)/)
  assert.match(transcriptTab, /v-if="isTranscriptVisible"/)
  assert.match(transcriptTab, /:aria-expanded="isTranscriptVisible"/)
  assert.match(transcriptTab, /The imported transcript remains unchanged/)

  // Requirement: Clinical formulation boundary (avoid these terms for summary)
  assert.doesNotMatch(transcriptTab, /clinical formulation/i)
  assert.doesNotMatch(transcriptTab, /diagnosis/i)
  assert.doesNotMatch(transcriptTab, /clinical impression/i)
})
