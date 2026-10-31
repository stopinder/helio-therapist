import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const inbox = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
const api = await readFile(new URL('../api/zoom/transcripts.js', import.meta.url), 'utf8')

test('Transcript Inbox is an inline triage queue rather than an open-read-back assignment flow', () => {
  assert.match(inbox, /class="transcript-row triage-row"/)
  assert.match(inbox, /v-model="assignmentDrafts\[transcript\.id\]"/)
  assert.match(inbox, /@click="assignFromInbox\(transcript\)"/)
  assert.match(inbox, /'Assigning…' : 'Assign'/)
  assert.match(inbox, /Preview transcript/)
  assert.match(inbox, /Open full transcript/)
  assert.doesNotMatch(inbox, /class="transcript-row" @click="openTranscript\(transcript\)"/)
  assert.match(inbox, /Assigned to .*Clinical Workspace/)
})

test('Transcript triage uses conservative deterministic matching and never silently assigns a suggestion', () => {
  assert.match(inbox, /function suggestedClient\(transcript\)/)
  assert.match(inbox, /normaliseIdentity\(client\.name\|\|client\.display_name\)===title/)
  assert.match(inbox, /Suggested from an exact Zoom title match — confirm before assigning\./)
  assert.match(inbox, /function isVerifiedMatch\(transcript\)/)
  assert.match(inbox, /Verified Zoom\/session match/)
})

test('verified session-linked transcripts bypass Needs attention and can open Clinical Workspace directly', () => {
  assert.match(inbox, /function needsAttention\(transcript\).*?!isVerifiedMatch\(transcript\)/s)
  assert.match(inbox, /openLinkedSessionFromRow/)
  assert.match(inbox, /name:'SessionWorkspace'/)
})

test('Transcript Inbox list is lightweight and loads full transcript detail only on demand', () => {
  const listFields = api.match(/const transcriptListFields = '([^']+)'/)?.[1] || ''
  assert.ok(listFields)
  assert.doesNotMatch(listFields, /original_transcript/)
  assert.match(listFields, /speaker_clues:structured_transcript->speakers/)
  assert.match(listFields, /zoom_generated_summary/)
  assert.match(api, /if \(id\) \{[\s\S]*select\(transcriptFields\)/)
  assert.match(inbox, /\/api\/zoom\/transcripts\?id=/)
  assert.match(inbox, /fetchTranscriptDetail/)
})

test('full transcript detail returns to the same inbox row instead of browser-history navigation', () => {
  assert.match(inbox, /function closeTranscript\(\)/)
  assert.match(inbox, /detailReturnId/)
  assert.match(inbox, /data-transcript-id/)
  assert.match(inbox, /scrollIntoView\(\{block:'center'\}\)/)
})


test('Transcript Inbox surfaces Zoom note and speaker clues without opening Preview', () => {
  assert.match(inbox, /Named speakers:/)
  assert.match(inbox, /<strong>Zoom note:<\/strong>/)
  assert.match(inbox, /function notePreview\(value\)/)
  assert.match(inbox, /No Zoom note excerpt is available/)
})
