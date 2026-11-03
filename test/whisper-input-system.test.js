import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('therapist writing surfaces share one icon-only Whisper input system', async () => {
  const [dictation, button, ask, quick, notes, capture, reflection, summary, documents, care, focus, clinical, amendment] = await Promise.all([
    read('../src/composables/useWhisperDictation.js'),
    read('../src/components/ui/WhisperMicButton.vue'),
    read('../src/components/ui/AskHeliosPanel.vue'),
    read('../src/components/reminders/GlobalQuickCapture.vue'),
    read('../src/components/workspace/TherapistNotesTab.vue'),
    read('../src/components/workspace/TranscriptTab.vue'),
    read('../src/components/ReflectionWorkspace.vue'),
    read('../src/components/workspace/ClientDocumentComposer.vue'),
    read('../src/components/documents/RichDocumentEditor.vue'),
    read('../src/components/workspace/ClientCarePanel.vue'),
    read('../src/components/workspace/CurrentCareFocus.vue'),
    read('../src/components/workspace/ClinicalSummaryTab.vue'),
    read('../src/components/workspace/CompletedClinicalRecord.vue')
  ])

  assert.match(dictation, /authenticatedFetch\('\/api\/ai\/transcribe'/)
  assert.match(dictation, /new MediaRecorder\(stream\)/)
  assert.match(dictation, /maxSeconds = 120/)
  assert.match(dictation, /onBeforeUnmount/)

  assert.match(button, /<Mic v-else/)
  assert.match(button, /<Square v-else-if="recording"/)
  assert.match(button, /LoaderCircle/)
  assert.doesNotMatch(button.split('<script setup>')[0], />Dictate</)

  for (const source of [ask, quick, notes, capture, reflection, summary, documents, care, focus, clinical, amendment]) {
    assert.match(source, /WhisperMicButton/)
    assert.doesNotMatch(source, /\/api\/ai\/transcribe/)
  }

  assert.match(ask, /<Send class="h-4 w-4"/)
  assert.match(quick, /h\(Send/)
  assert.match(care, /<Send v-else/)
  assert.match(documents, /setTextSelection/)
})

test('legacy labelled dictation controls are absent from the migrated core surfaces', async () => {
  const sources = await Promise.all([
    read('../src/components/ui/AskHeliosPanel.vue'),
    read('../src/components/reminders/GlobalQuickCapture.vue'),
    read('../src/components/workspace/TherapistNotesTab.vue'),
    read('../src/components/workspace/TranscriptTab.vue'),
    read('../src/components/ReflectionWorkspace.vue'),
    read('../src/components/workspace/ClinicalSummaryTab.vue'),
    read('../src/components/workspace/CompletedClinicalRecord.vue'),
    read('../src/components/workspace/ClientCarePanel.vue')
  ])

  const joined = sources.join('\n')
  assert.doesNotMatch(joined, /🎙/)
  assert.doesNotMatch(joined, />\s*Dictate\s*</)
  assert.doesNotMatch(joined, /Start dictation/)
  assert.doesNotMatch(joined, /Record voice/)
})
