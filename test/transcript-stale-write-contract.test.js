import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const apiSource = fs.readFileSync(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')
const inboxSource = fs.readFileSync(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

test('transcript PATCH requires the version last loaded by the therapist', () => {
  assert.match(apiSource, /expectedUpdatedAt/)
  assert.match(apiSource, /existing\.updated_at !== expectedUpdatedAt/)
  assert.match(apiSource, /changed in another tab or window/)
})

test('transcript update is conditional on the expected updated timestamp', () => {
  assert.match(apiSource, /\.eq\('updated_at', expectedUpdatedAt\)/)
  assert.match(apiSource, /changed while you were saving/)
})

test('Transcript Inbox sends the selected transcript version with every PATCH', () => {
  assert.match(inboxSource, /expectedUpdatedAt:selected\.value\.updatedAt/)
})
