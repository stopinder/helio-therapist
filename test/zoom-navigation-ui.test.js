import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Transcripts view has a back button', async () => {
  const transcripts = await readFile(new URL('../src/views/Transcripts.vue', import.meta.url), 'utf8')
  assert.match(transcripts, /← Back/)
  assert.match(transcripts, /@click="goBack"/)
  assert.match(transcripts, /function goBack\(\)/)
  assert.match(transcripts, /router\.back\(\)/)
  assert.match(transcripts, /router\.push\('\/'\)/)
})

test('Transcripts view supports direct transcript opening via query param', async () => {
  const transcripts = await readFile(new URL('../src/views/Transcripts.vue', import.meta.url), 'utf8')
  const inbox = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
  assert.match(transcripts, /const openTranscriptId = computed\(\(\) => typeof route\.query\.transcript === 'string' \? route\.query\.transcript : null\)/)
  assert.match(transcripts, /<TranscriptInbox [^>]*:open-transcript-id="openTranscriptId"/)
  assert.match(inbox, /openTranscriptId:\s*\{\s*type:\s*\[String,\s*Number\],\s*default:\s*null\s*\}/)
  assert.match(inbox, /watch\(\s*\(\)\s*=>\s*props\.openTranscriptId,\s*openQueuedTranscript\s*\)/)
})

test('AppSidebar contains Transcript Inbox link', async () => {
  const sidebar = await readFile(new URL('../src/components/shell/AppSidebar.vue', import.meta.url), 'utf8')
  assert.match(sidebar, /\{\s*name:\s*['"]Transcript Inbox['"]\s*,\s*path:\s*['"]\/transcripts['"]\s*,\s*icon:\s*Inbox\s*,\s*iconTone:\s*['"]icon-surface-reflection['"]\s*\}/)
})

test('Transcript Inbox supports Add New Client', async () => {
  const inbox = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
  assert.match(inbox, /import AddClientModal from '\.\/sidebar\/AddClientModal\.vue'/)
  assert.match(inbox, /<AddClientModal v-if="showAddClient"/)
  assert.match(inbox, /@click="showAddClient = true">Add new client<\/button>/)
  assert.match(inbox, /async function handleAddClient\(payload\)/)
})

test('Transcript Inbox uses only client and session as required triage steps', async () => {
  const inbox = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
  assert.match(inbox, /<ol class="review-progress"/)
  assert.match(inbox, /TranscriptSessionLinker/)
  assert.match(inbox, /id:'connected',label:'Connected'/)
  assert.match(inbox, /'connected':'success'/)
  assert.match(inbox, /No further inbox step is required\./)
  assert.doesNotMatch(inbox, /Review transcript handling/)
  assert.doesNotMatch(inbox, /saveReviewChoices/)
})
