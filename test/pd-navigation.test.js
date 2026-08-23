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

test('CPD home puts the three primary practice destinations first', () => {
  const content = readFileSync(join(process.cwd(), 'src/views/supervision/SupervisionHome.vue'), 'utf8')
  const navIndex = content.indexOf('aria-label="Practice destinations"')
  const discoveryIndex = content.indexOf('aria-labelledby="discovery-heading"')

  assert.notStrictEqual(navIndex, -1, 'Home should include primary practice destinations')
  assert.notStrictEqual(discoveryIndex, -1, 'Home should retain discovery content')
  assert.ok(navIndex < discoveryIndex, 'Primary destinations should appear before discovery content')

  const expectedDestinations = [
    ["label: 'Reflections'", "description: 'What has stayed with you.'", "path: '/supervision/reflections'"],
    ["label: 'Map'", "description: 'What is recurring or beginning to take shape.'", "path: '/supervision/insights'"],
    ["label: 'Growth'", "description: 'Your learning edge.'", "path: '/supervision/growth'"]
  ]
  for (const destination of expectedDestinations) {
    for (const text of destination) assert.strictEqual(content.includes(text), true, `Home should include ${text}`)
  }

  assert.strictEqual(content.includes("label: 'Practice Map'"), false)
  assert.strictEqual(content.includes("label: 'Development'"), false)
  assert.strictEqual(content.includes("label: 'Consultation'"), false)
  assert.strictEqual(content.includes("path: '/supervision/workspace'"), false)
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
