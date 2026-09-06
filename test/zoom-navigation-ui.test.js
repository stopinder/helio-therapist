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
  assert.match(sidebar, /\{ name: 'Transcript Inbox', path: '\/transcripts', icon: FileText, iconTone: 'icon-surface-reflection' \}/)
})

test('Transcript Inbox supports Add New Client', async () => {
  const inbox = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
  assert.match(inbox, /import AddClientModal from '\.\/sidebar\/AddClientModal\.vue'/)
  assert.match(inbox, /<AddClientModal v-if="showAddClient"/)
  assert.match(inbox, /@click="showAddClient = true">Add new client<\/button>/)
  assert.match(inbox, /async function handleAddClient\(payload\)/)
})

test('Transcript Inbox workflow does not require Review Choices', async () => {
  const inbox = await readFile(new URL('../src/components/TranscriptInbox.vue', import.meta.url), 'utf8')
  
  // The progress bar should only have two steps now
  assert.match(inbox, /<ol class="review-progress"/)
  const progressListItems = inbox.match(/<li :class="\{ complete: selected\.clientId, current: !selected\.clientId \}">.*?<\/li>/g)
  assert.ok(progressListItems)
  
  // Step 3 (Review choices) should no longer be in the progress bar
  assert.ok(!inbox.includes('<div><strong>Review choices</strong><small>{{ selected.reviewChoicesSavedAt ? \'Saved\' : \'Choose output and retention\' }}</small></div>'))
  
  // Workflow state should have 'ready' instead of 'needs-review' or 'review-saved'
  assert.match(inbox, /id:'ready',label:'Ready to continue'/)
  assert.match(inbox, /'ready':'success'/)
  assert.match(inbox, /'ready':'Open session'/)
  
  // Ready to continue card should be visible when client and session are assigned
  assert.match(inbox, /v-if="selected\.clientId && selected\.sessionRef && !editingSession" class="ready-card"/)
  assert.match(inbox, /<h2>Ready to continue<\/h2>/)
  assert.match(inbox, /@click="openLinkedSession">Open session<\/button>/)
})
