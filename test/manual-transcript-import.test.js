import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const apiSource = fs.readFileSync(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')
const viewSource = fs.readFileSync(new URL('../src/views/Transcripts.vue', import.meta.url), 'utf8')

test('manual transcript import is authenticated, bounded and idempotent', () => {
  assert.match(apiSource, /requireAuthenticatedUser\(req\)/)
  assert.match(apiSource, /req\.method === 'POST'/)
  assert.match(apiSource, /MAX_MANUAL_TRANSCRIPT_BYTES = 2 \* 1024 \* 1024/)
  assert.match(apiSource, /\['vtt', 'txt'\]/)
  assert.match(apiSource, /createHash\('sha256'\)/)
  assert.match(apiSource, /zoom_recording_file_id', manualImport\.recordingFileId/)
  assert.match(apiSource, /duplicate: true/)
  assert.match(apiSource, /therapist_user_id: user\.id/)
  assert.match(apiSource, /source: MANUAL_SOURCE/)
  assert.match(apiSource, /status: 'unassigned'/)
})

test('manual file import uses the existing transcript inbox workflow without raw file storage', () => {
  assert.match(viewSource, /Choose file/)
  assert.match(viewSource, /accept="\.vtt,\.txt,text\/vtt,text\/plain"/)
  assert.match(viewSource, /submitTranscriptImport\(file\.name, text\)/)
  assert.match(viewSource, /authenticatedFetch\('\/api\/zoom\/transcripts'/)
  assert.match(viewSource, /method: 'POST'/)
  assert.match(viewSource, /body: JSON\.stringify\(\{ filename, text \}\)/)
  assert.match(viewSource, /inboxKey\.value \+= 1/)
  assert.doesNotMatch(viewSource, /FormData/)
  assert.doesNotMatch(apiSource, /storage\./)
})

test('therapist can paste a Zoom transcript directly into the same protected import path', () => {
  assert.match(viewSource, /Paste transcript/)
  assert.match(viewSource, /v-model="pastedTranscript"/)
  assert.match(viewSource, /Import pasted transcript/)
  assert.match(viewSource, /submitTranscriptImport\('pasted-transcript\.txt', pastedTranscript\.value\)/)
  assert.match(viewSource, /Paste some transcript text before importing\./)
  assert.match(viewSource, /new Blob\(\[text\]\)\.size > MAX_IMPORT_BYTES/)
  assert.match(viewSource, /data\.duplicate \? 'That transcript is already in your inbox\.'/)
})

test('manual import returns safe therapist-facing validation messages', () => {
  assert.match(apiSource, /Choose a Zoom transcript file to import\./)
  assert.match(apiSource, /That transcript file is empty\./)
  assert.match(apiSource, /Import a Zoom transcript in \.vtt or \.txt format\./)
  assert.match(apiSource, /That transcript file is too large to import\./)
  assert.match(viewSource, /Couldn’t import the transcript\. Please try again\./)
})
