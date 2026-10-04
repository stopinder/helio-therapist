import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Growth is derived from saved reflection history and supports grounded longitudinal AI', async () => {
  const content = await readFile(new URL('../src/views/supervision/SupervisionGrowth.vue', import.meta.url), 'utf8')

  assert.match(content, /<h1[^>]*>Growth<\/h1>/)
  assert.match(content, /const recurringThreads = computed/)
  assert.match(content, /const recentMovement = computed/)
  assert.match(content, /const learningEdges = computed/)
  assert.match(content, /const nextSteps = computed/)
  assert.match(content, /reflectiveMapFor/)
  assert.match(content, /innerPosition/)
  assert.match(content, /protectiveIntention/)
  assert.match(content, /datedReflections/)
  assert.match(content, /earlier and more recent halves/)
  assert.match(content, /not whether your practice has improved or worsened/)
  assert.match(content, /Take this to supervision/)
  assert.match(content, /props\.reflections/)
  assert.match(content, /reflection\.theme/)

  assert.match(content, /AI longitudinal reflection/)
  assert.match(content, /generateLongitudinalSummary/)
  assert.match(content, /\/api\/ai\/growth-summary/)
  assert.match(content, /Repeated material/)
  assert.match(content, /Observable changes over time/)
  assert.match(content, /Possible emerging capacities/)
  assert.match(content, /Questions to take to supervision/)
  assert.match(content, /formatEvidence/)
  assert.match(content, /AI-generated — review critically/)

  assert.doesNotMatch(content, /const learningPrompts\s*=\s*\[/)
  assert.doesNotMatch(content, /const developmentRoutes\s*=\s*\[/)
  assert.doesNotMatch(content, /Persistent goals will be introduced/)
})
