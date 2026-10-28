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

test('AppSidebar contains Transcript Inbox link', async () => {
  const sidebar = await readFile(new URL('../src/components/shell/AppSidebar.vue', import.meta.url), 'utf8')
  assert.match(
    sidebar,
    /\{\s*name:\s*['"]Transcript Inbox['"]\s*,\s*path:\s*['"]\/transcripts['"]\s*,\s*icon:\s*Inbox\s*,\s*iconTone:\s*['"]icon-surface-reflection['"]\s*\}/
  )
})

test('Transcript Inbox supports Add New Client', async () => {
  const inbox = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
  assert.match(inbox, /import AddClientModal from '\.\/sidebar\/AddClientModal\.vue'/)
  assert.match(inbox, /<AddClientModal v-if="showAddClient"/)
  assert.match(inbox, /@click="showAddClient = true">Add new client<\/button>/)
  assert.match(inbox, /async function handleAddClient\(payload\)/)
})

test('Transcript Inbox workflow is one-step client assignment with direct Clinical Workspace handoff', async () => {
  const inbox = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')

  assert.doesNotMatch(inbox, /<ol class="review-progress"/)
  assert.doesNotMatch(inbox, /<h2>Session<\/h2>/)
  assert.doesNotMatch(inbox, /Create session/)
  assert.doesNotMatch(inbox, /Link to an existing encounter instead/)

  assert.match(inbox, /Assign client/)
  assert.match(inbox, /clientId:selectedClientId\.value,clearAttention:true/)
  assert.match(inbox, /selected\.sessionRef/)
  assert.match(inbox, /Open Clinical Workspace/)
  assert.match(inbox, /@click="openLinkedSession"/)

  assert.ok(!inbox.includes('<div><strong>Review choices</strong><small>{{ selected.reviewChoicesSavedAt ? \'Saved\' : \'Choose output and retention\' }}</small></div>'))
})
