import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

test('Professional Development keeps hub-and-spoke navigation architecture', () => {
  const layoutContent = readFileSync(join(process.cwd(), 'src/layouts/ProfessionalDevelopmentLayout.vue'), 'utf8')
  assert.strictEqual(layoutContent.includes('<aside'), false, 'Layout should not contain a secondary sidebar')
  assert.strictEqual(layoutContent.includes('isChildPage'), true, 'Layout should define child-page state')
  assert.strictEqual(layoutContent.includes('to="/supervision"'), true, 'Layout should link back to Professional Development')
  assert.strictEqual(layoutContent.includes('Professional Development'), true, 'Back link should name Professional Development')
  assert.strictEqual(layoutContent.includes('sticky top-0'), true, 'Child page header should remain sticky')
})

test('Professional Development routes retain clear page headings', () => {
  const expectations = {
    'SupervisionHome.vue': ['<header', '>Practice</', 'Discovery', 'Practice map'],
    'SupervisionReflections.vue': ['<header', 'Reflections'],
    'SupervisionWorkspace.vue': ['<header', 'Supervision'],
    'SupervisionGrowth.vue': ['<header', 'Development'],
    'SupervisionInsights.vue': ['<header', 'Practice Map']
  }
  for (const [view, requiredText] of Object.entries(expectations)) {
    const content = readFileSync(join(process.cwd(), 'src/views/supervision', view), 'utf8')
    for (const text of requiredText) assert.strictEqual(content.includes(text), true, `${view} should include ${text}`)
  }
})

test('CPD home surfaces discovery without assigning reflective homework', () => {
  const content = readFileSync(join(process.cwd(), 'src/views/supervision/SupervisionHome.vue'), 'utf8')
  assert.strictEqual(content.includes('dailyPauses'), true, 'Home should retain a small rotating quote')
  assert.strictEqual(content.includes('Something worth noticing'), false)
  assert.strictEqual(content.includes('What would help today?'), false)
  assert.strictEqual(content.includes('Follow your curiosity'), false)
  assert.strictEqual(content.includes('What are you carrying'), false)
  assert.strictEqual(content.includes('Stay with this'), false)
  assert.strictEqual(content.includes('Start a reflection'), false)
  assert.strictEqual(content.includes('Helios has not inferred'), false)
  assert.strictEqual(content.includes('Clinical Record'), false)
  assert.strictEqual(content.includes('GreetingHeader'), false)
  assert.strictEqual(content.includes('useGreeting'), false)
  assert.strictEqual(content.includes('const discovery = computed'), true, 'Home should derive a discovery from real recorded recurrence')
})
