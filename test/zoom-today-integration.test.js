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
  
  // Requirement: unmatched notes produce a discoverable matching action
  assert.match(overview, /unmatchedCount === 1 \? '' : 's' \}\} need\{\{ unmatchedCount === 1 \? 's' : '' \}\} matching/)
  assert.match(overview, /Match note/)

  // Requirement: no reconciliation happens automatically on page load
  // We check that it's not in onMounted
  const onMountedContent = overview.match(/onMounted\(async \(\) => \{([\s\S]*?)\}\)/)?.[1] || ''
  assert.doesNotMatch(onMountedContent, /reconcile-my-notes|checkZoomNotes/)
})

test('Sidebar does not restore Transcripts as primary navigation', async () => {
  const sidebar = await readFile(new URL('../src/components/shell/AppSidebar.vue', import.meta.url), 'utf8')
  
  // Transcripts should NOT be in the sidebar items
  assert.doesNotMatch(sidebar, /name: 'Transcripts'/)
  assert.doesNotMatch(sidebar, /path: '\/transcripts'/)
})
