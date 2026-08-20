import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('ClientWorkspace.vue integrates live timeline', async () => {
  const content = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
  
  // Script usage
  assert.match(content, /import.*getTimelineEvents.*from/)
  assert.match(content, /timelineEvents/)
  assert.match(content, /loadTimeline/)

  // Template usage
  assert.match(content, /<TimelineItem/)
  assert.match(content, /timelineEvents/)
  assert.match(content, /:event-type/)
  assert.match(content, /:description/)

  // Loading/Empty states
  assert.match(content, /timelineLoading/)
  assert.match(content, /timelineEvents/)
})

test('TimelineItem.vue handles navigation and event-driven presentation', async () => {
  const content = await readFile(new URL('../src/components/workspace/TimelineItem.vue', import.meta.url), 'utf8')
  
  // Presentation logic
  assert.match(content, /import { timelineEventPresentation } from ["']\.\.\/\.\.\/lib\/clinicalExchange\.js["']/)
  assert.match(content, /const\s+presentation\s*=\s*computed\(\(\)\s*=>\s*timelineEventPresentation\(props\.eventType\)\)/)
  
  // Navigation
  assert.match(content, /function handleClick\(\)/)
  assert.match(content, /router\.push\(`\/clients\/\${cId}\/sessions\/\${sId}`\)/)
  assert.match(content, /@click="handleClick"/)
})

test('lib/clients.js includes getTimelineEvents helper', async () => {
  const content = await readFile(new URL('../src/lib/clients.js', import.meta.url), 'utf8')
  
  assert.match(content, /export\s+async\s+function\s+getTimelineEvents\(\{\s*clientId\s*\}\)/)
  assert.match(content, /authenticatedFetch\(`\/api\/client-timeline\?clientId=\${encodeURIComponent\(clientId\)}`\)/)
})
