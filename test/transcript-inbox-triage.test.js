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


test('Transcript Inbox surfaces structured Zoom note and speaker clues without opening Preview', () => {
  assert.match(inbox, /Named speakers:/)
  assert.match(inbox, /class="zoom-note-card"/)
  assert.match(inbox, /function zoomNoteBlocks\(value\)/)
  assert.match(inbox, /function visibleZoomNoteBlocks\(transcript\)/)
  assert.match(inbox, /function zoomNoteCanExpand\(transcript\)/)
  assert.match(inbox, /No Zoom note excerpt is available/)
})


test('Transcript Inbox supports archive and protected delete directly from the row', () => {
  assert.match(inbox, /@click="archiveFromInbox\(transcript\)"/)
  assert.match(inbox, /@click="deleteFromInbox\(transcript\)"/)
  assert.match(inbox, /canDeleteTranscript\(transcript\)/)
  assert.match(inbox, /expectedUpdatedAt:transcript\.updatedAt,clearAttention:true/)
  assert.match(inbox, /method:'DELETE'/)
  assert.match(inbox, /cannot be undone/)
  assert.match(inbox, /Transcript archived\. Restore it any time from History\./)
  assert.match(inbox, /attentionClearedAt \? 'Archived'/)
  assert.match(inbox, /Archive all/)
})

test('inline archive and delete do not load transcript detail first', () => {
  const archiveStart = inbox.indexOf('async function archiveFromInbox')
  const deleteStart = inbox.indexOf('async function deleteTranscriptRecord')
  const archiveSource = inbox.slice(archiveStart, deleteStart)
  const deleteSource = inbox.slice(deleteStart, inbox.indexOf('async function deleteFromInbox', deleteStart))
  assert.ok(archiveStart > -1 && deleteStart > -1)
  assert.doesNotMatch(archiveSource, /fetchTranscriptDetail|openTranscript/)
  assert.doesNotMatch(deleteSource, /fetchTranscriptDetail|openTranscript/)
})


test('Transcript Inbox can add a missing client directly from an unassigned row', () => {
  assert.match(inbox, /@click="openAddClientForTranscript\(transcript\)"/)
  assert.match(inbox, />Add client<\/button>/)
  assert.match(inbox, /addClientTranscriptId/)
  assert.match(inbox, /suggestedNewClientName\(transcript\)/)
  assert.match(inbox, /assignmentDrafts\.value = \{ \.\.\.assignmentDrafts\.value, \[targetTranscriptId\]: newClient\.id \}/)
  assert.match(inbox, /assignTranscriptToClient\(transcript, newClient\.id/)
  assert.match(inbox, /Added .* and assigned the transcript/)
})

test('Add Client modal is available in both inbox and full transcript views', () => {
  assert.match(inbox, /<\/template>\s*<AddClientModal[\s\S]*?:initial-name="addClientInitialName"/)
  assert.match(inbox, /@close="closeAddClient"/)
})


test('Transcript Inbox visual refinement uses the Helios semantic hierarchy without changing triage actions', () => {
  assert.match(inbox, /class="icon-surface icon-surface-accent header-icon"/)
  assert.match(inbox, /class="button-primary assign-inline"/)
  assert.match(inbox, /class="button-secondary add-client-inline"/)
  assert.match(inbox, /class="quiet-action danger-action"/)
  assert.match(inbox, /var\(--accent\)/)
  assert.match(inbox, /var\(--surface-reflection\)/)
  assert.match(inbox, /max-width: 1040px/)
  assert.match(inbox, />Preview transcript</)
  assert.match(inbox, />Open full transcript</)
})
