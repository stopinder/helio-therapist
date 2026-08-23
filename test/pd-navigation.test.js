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
    'SupervisionHome.vue': ['<header', 'Professional Development'],
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
