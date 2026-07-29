import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('ClientWorkspace.vue integrates live timeline', async () => {
  const content = await readFile(new URL('../src/views/ClientWorkspace.vue', import.meta.url), 'utf8')
  
  // Data loading
  assert.match(content, /import { .*getTimelineEvents } from ["']\.\.\/lib\/clients\.js["']/)
  assert.match(content, /const timelineEvents = ref\(\[\]\)/)
  assert.match(content, /async function loadTimeline\(\)/)
  assert.match(content, /timelineEvents\.value = await getTimelineEvents\({ clientId }\)/)
  
  // Template usage
  assert.match(content, /<TimelineItem/)
  assert.match(content, /v-for="\(event, index\) in timelineEvents"/)
  assert.match(content, /:event-type="event\.event_type"/)
  assert.match(content, /:description="event\.summary"/)
  
  // Loading/Empty states
  assert.match(content, /v-if="timelineLoading"/)
  assert.match(content, /v-else-if="timelineEvents\.length === 0"/)
})

test('TimelineItem.vue handles navigation and event-driven presentation', async () => {
  const content = await readFile(new URL('../src/components/workspace/TimelineItem.vue', import.meta.url), 'utf8')
  
  // Presentation logic
  assert.match(content, /import { timelineEventPresentation } from ["']\.\.\/\.\.\/lib\/clinicalExchange\.js["']/)
  assert.match(content, /const presentation = computed\(\(\) => timelineEventPresentation\(props\.eventType\)\)/)
  
  // Navigation
  assert.match(content, /function handleClick\(\)/)
  assert.match(content, /router\.push\(`\/clients\/\${cId}\/sessions\/\${sId}`\)/)
  assert.match(content, /@click="handleClick"/)
})

test('lib/clients.js includes getTimelineEvents helper', async () => {
  const content = await readFile(new URL('../src/lib/clients.js', import.meta.url), 'utf8')
  
  assert.match(content, /export async function getTimelineEvents\({ clientId }\)/)
  assert.match(content, /\.from\(['"]client_timeline_events['"]\)/)
  assert.match(content, /\.select\(['"]id, event_type, occurred_at, summary, subject_type, subject_id, session_id['"]\)/)
  assert.match(content, /\.eq\(['"]client_id['"], clientId\)/)
  assert.match(content, /\.order\(['"]occurred_at['"], { ascending: false }\)/)
})
