import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const transcriptInboxSource = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

test('Transcript Inbox session labels distinguish between session states and show explicit date/time', async () => {
  assert.match(transcriptInboxSource, /sessionOptionLabel\(session\)/)
  
  // Checking for the explicit labels and structure required
  assert.match(transcriptInboxSource, /'In progress'/)
  assert.match(transcriptInboxSource, /'Planned'/)
  assert.match(transcriptInboxSource, /'Completed'/)
  
  // Checking for the Current session/Completed session prefixes
  assert.match(transcriptInboxSource, /Current session · /)
  assert.match(transcriptInboxSource, /Completed session · /)
})

test('Transcript Inbox displays a confirmation line for the selected session', async () => {
  // Goal: Selected: Current session · In progress · 29 Aug 2026, 17:50
  assert.match(transcriptInboxSource, /Selected:/)
  assert.match(transcriptInboxSource, /selectedSessionDetails/)
  assert.match(transcriptInboxSource, /selectedSessionRef/)
})
