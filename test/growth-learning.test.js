import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Growth is data-led, compact, and presents AI developmental synthesis', async () => {
  const content = await readFile(new URL('../src/views/supervision/SupervisionGrowth.vue', import.meta.url), 'utf8')

  assert.match(content, /<h1[^>]*>Growth<\/h1>/)
  assert.match(content, /const recurringThreads = computed/)
  assert.match(content, /const recentMovement = computed/)
  assert.match(content, /const learningEdges = computed/)
  assert.match(content, /const nextSteps = computed/)
  assert.match(content, /reflectiveMapFor/)
  assert.match(content, /innerPosition/)
  assert.match(content, /protectiveIntention/)

  assert.match(content, /AI longitudinal reflection/)
  assert.match(content, /What is changing in your practice\?/)
  assert.match(content, /directPracticeReflections/)
  assert.match(content, /captureSource !== 'practice_reflection'/)
  assert.match(content, /\/api\/ai\/growth-summary/)
  assert.match(content, /Developmental synthesis/)
  assert.match(content, /Developmental thread/)
  assert.match(content, /Why it may matter/)
  assert.match(content, /Tensions worth staying with/)
  assert.match(content, /For supervision/)
  assert.match(content, /Questionnaire\/stance records are excluded/)
  assert.match(content, /AI-generated — review critically/)

  assert.doesNotMatch(content, /Repeated material/)
  assert.doesNotMatch(content, /Observable changes over time/)
  assert.doesNotMatch(content, /Possible emerging capacities/)
  assert.doesNotMatch(content, /const learningPrompts\s*=\s*\[/)
  assert.doesNotMatch(content, /const developmentRoutes\s*=\s*\[/)
})
