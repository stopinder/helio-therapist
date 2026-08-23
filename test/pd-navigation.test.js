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

test('Professional Development routes retain clear page headings after the redesign', () => {
  const expectations = {
    'SupervisionHome.vue': ['<header', 'Your practice', 'Daily pause', 'Something worth noticing', 'Your practice map', 'What would help today?'],
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

test('CPD home prioritises reflection and curiosity over supervision', () => {
  const content = readFileSync(join(process.cwd(), 'src/views/supervision/SupervisionHome.vue'), 'utf8')
  assert.strictEqual(content.includes('A place to become the therapist you want to be.'), true)
  assert.strictEqual(content.includes('dailyPauses'), true, 'Home should contain rotating daily reflective material')
  assert.strictEqual(content.includes('Helios can suggest connections, but you decide what belongs in your map.'), true)
  assert.strictEqual(content.includes('This is one route through the space, not the destination for every reflection.'), true)
  assert.strictEqual(content.includes('GreetingHeader'), false, 'CPD home should not use a generic time-of-day greeting')
  assert.strictEqual(content.includes('useGreeting'), false, 'CPD home should not depend on generic greeting logic')
})
