import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Overview Today workflow integration for Zoom notes', async () => {
  const overview = await readFile(new URL('../src/views/Overview.vue', import.meta.url), 'utf8')

  // Requirement: Exposes a discoverable Zoom notes action
  assert.match(overview, /Zoom notes/)
  assert.match(overview, /Check for new notes/)

  // Requirement: Invoking it uses the existing reconcile-my-notes endpoint
  assert.match(overview, /authenticatedFetch\('\/api\/zoom\/reconcile-my-notes', \{ method: 'POST' \}\)/)

  // Requirement: success/import count is presented
  assert.match(overview, /note\{\{ zoomImportResult\.count === 1 \? '' : 's' \}\} imported/)
  
  // Requirement: matched import includes session/client navigation IDs and renders "Open session"
  assert.match(overview, /zoomImportResult\.imports\[0\]\.matched/)
  assert.match(overview, /:to="\{ name: 'SessionWorkspace', params: \{ clientId: zoomImportResult\.imports\[0\]\.clientId, sessionId: zoomImportResult\.imports\[0\]\.sessionId \} \}"/)
  assert.match(overview, /Open session →/)

  // Requirement: unmatched import includes transcript ID and renders "View transcript"
  assert.match(overview, /:to="`\/transcripts\?transcript=\$\{zoomImportResult\.imports\[0\]\.transcriptId\}`"/)
  assert.match(overview, /View transcript →/)

  // Requirement: several imports render "Review imported notes"
  assert.match(overview, /v-else-if="zoomImportResult\.count > 1"/)
  assert.match(overview, /to="\/transcripts"/)
  assert.match(overview, /Review imported notes →/)
  
  // Requirement: unmatched notes produce a discoverable matching action
  assert.match(overview, /unmatchedCount === 1 \? '' : 's' \}\} need\{\{ unmatchedCount === 1 \? 's' : '' \}\} matching/)
  assert.match(overview, /Match note/)

  // Requirement: no reconciliation happens automatically on page load
  // We check that it's not in onMounted
  const onMountedContent = overview.match(/onMounted\(async \(\) => \{([\s\S]*?)\}\)/)?.[1] || ''
  assert.doesNotMatch(onMountedContent, /reconcile-my-notes|checkZoomNotes/)
})

test('Sidebar includes Transcript Inbox in primary navigation', async () => {
  const sidebar = await readFile(new URL('../src/components/shell/AppSidebar.vue', import.meta.url), 'utf8')
  
  // Transcripts should be in the sidebar items as 'Transcript Inbox'
  assert.match(sidebar, /name: 'Transcript Inbox'/)
  assert.match(sidebar, /path: '\/transcripts'/)
})
